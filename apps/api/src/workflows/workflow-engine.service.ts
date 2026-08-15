import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { PrismaService } from '../common/prisma/prisma.service';
import {
  ActionOutcome,
  ENTITY_FIELDS,
  ENTITY_LABEL_FIELD,
  NUMERIC_FIELDS,
  OWNER_FIELD,
  STAGED_ENTITIES,
  UserTarget,
  WorkflowAction,
  WorkflowCondition,
  WorkflowEntity,
  WorkflowEvent,
} from './workflow-types';

const WEBHOOK_TIMEOUT_MS = 5_000;

/** Actions that write back to the triggering record, impossible once it is gone. */
const MUTATING_ACTIONS = new Set(['assign_record', 'update_field', 'move_stage']);

/**
 * Runs automation rules when records change.
 *
 * Every write here goes through Prisma directly rather than the record services,
 * which is deliberate: services dispatch events, so routing engine writes through
 * them would let a rule retrigger itself forever.
 */
@Injectable()
export class WorkflowEngineService {
  private readonly logger = new Logger(WorkflowEngineService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Entry point for record services. Returns immediately and never throws —
   * a broken rule must not fail the request that triggered it.
   */
  dispatch(event: WorkflowEvent): void {
    void this.run(event).catch((err) =>
      this.logger.error(`Workflow dispatch failed for ${event.entity}.${event.action}: ${err.message}`),
    );
  }

  /** Runs every active rule that matches, recording an execution for each. */
  private async run(event: WorkflowEvent) {
    const workflows = await this.prisma.workflow.findMany({
      where: { tenantId: event.tenantId, isActive: true },
    });

    for (const workflow of workflows) {
      if (!this.matchesTrigger(workflow, event)) continue;
      await this.execute(workflow, event).catch((err) =>
        this.logger.error(`Workflow "${workflow.name}" failed: ${err.message}`),
      );
    }
  }

  // ─── Matching ──────────────────────────────────────────────────────────────

  matchesTrigger(workflow: { triggerType: string; triggerConfig: any }, event: WorkflowEvent): boolean {
    const config = (workflow.triggerConfig ?? {}) as Record<string, any>;
    if (config.entity && config.entity !== event.entity) return false;

    switch (workflow.triggerType) {
      case 'record_created':
        return event.action === 'created';
      case 'record_updated':
        return event.action === 'updated';
      case 'record_deleted':
        return event.action === 'deleted';
      case 'stage_changed': {
        const moved =
          event.action === 'updated' &&
          Boolean(event.record.stageId) &&
          event.previous?.stageId !== event.record.stageId;
        if (!moved) return false;
        // Optionally narrow to arrivals at one specific stage.
        return config.toStage ? event.record.stageId === config.toStage : true;
      }
      case 'field_changed': {
        const field = config.field;
        if (!field || event.action !== 'updated') return false;
        return this.asText(event.previous?.[field]) !== this.asText(event.record[field]);
      }
      // `time_based` needs a scheduler the API does not run yet.
      default:
        return false;
    }
  }

  evaluateConditions(conditions: unknown, record: Record<string, any>) {
    const results = this.asArray<WorkflowCondition>(conditions).map((condition) => {
      const actual = record[condition.field];
      return {
        ...condition,
        actual: this.asText(actual),
        passed: this.testCondition(condition, actual),
      };
    });

    return { passed: results.every((r) => r.passed), results };
  }

  private testCondition(condition: WorkflowCondition, actual: unknown): boolean {
    const expected = condition.value ?? '';
    const numeric = NUMERIC_FIELDS.has(condition.field);

    switch (condition.operator) {
      case 'is_empty':
        return actual === null || actual === undefined || actual === '';
      case 'is_not_empty':
        return !(actual === null || actual === undefined || actual === '');
      case 'equals':
        return this.asText(actual).toLowerCase() === expected.trim().toLowerCase();
      case 'not_equals':
        return this.asText(actual).toLowerCase() !== expected.trim().toLowerCase();
      case 'contains':
        return this.asText(actual).toLowerCase().includes(expected.trim().toLowerCase());
      case 'greater_than':
        return numeric || !Number.isNaN(Number(expected))
          ? Number(actual ?? 0) > Number(expected)
          : this.asText(actual) > expected;
      case 'less_than':
        return numeric || !Number.isNaN(Number(expected))
          ? Number(actual ?? 0) < Number(expected)
          : this.asText(actual) < expected;
      default:
        return false;
    }
  }

  // ─── Execution ─────────────────────────────────────────────────────────────

  private async execute(
    workflow: { id: string; name: string; conditions: any; actions: any },
    event: WorkflowEvent,
  ) {
    const startedAt = new Date();
    const conditions = this.asArray<WorkflowCondition>(workflow.conditions);
    const actions = this.asArray<WorkflowAction>(workflow.actions);
    const check = this.evaluateConditions(conditions, event.record);

    const triggerData = {
      entity: event.entity,
      action: event.action,
      recordId: event.record.id,
      recordLabel: this.labelFor(event.entity, event.record),
    };

    // A rule whose conditions did not hold is recorded too — "why didn't this
    // run?" is the question users actually have.
    if (!check.passed) {
      await this.prisma.workflowExecution.create({
        data: {
          workflowId: workflow.id,
          tenantId: event.tenantId,
          status: 'skipped',
          triggerData,
          result: { conditions: check.results } as any,
          errorMessage: 'Conditions were not met',
          startedAt,
          completedAt: new Date(),
        },
      });
      return;
    }

    const outcomes: ActionOutcome[] = [];
    for (const action of actions) {
      outcomes.push(await this.runAction(action, event));
    }

    const failed = outcomes.filter((o) => o.status === 'failed');

    await this.prisma.$transaction([
      this.prisma.workflowExecution.create({
        data: {
          workflowId: workflow.id,
          tenantId: event.tenantId,
          status: failed.length > 0 ? 'failed' : 'success',
          triggerData,
          result: { conditions: check.results, actions: outcomes } as any,
          errorMessage: failed.length > 0 ? failed.map((f) => f.detail).join('; ') : null,
          startedAt,
          completedAt: new Date(),
        },
      }),
      this.prisma.workflow.update({
        where: { id: workflow.id },
        data: { runCount: { increment: 1 }, lastRunAt: new Date() },
      }),
    ]);

    await this.logActivity(workflow.name, event, outcomes);
  }

  private async runAction(action: WorkflowAction, event: WorkflowEvent): Promise<ActionOutcome> {
    const config = action.config ?? {};

    if (event.action === 'deleted' && MUTATING_ACTIONS.has(action.type)) {
      return {
        type: action.type,
        status: 'skipped',
        detail: 'The record was deleted, so it can no longer be changed.',
      };
    }

    try {
      switch (action.type) {
        case 'create_task':
          return await this.createTask(config, event);
        case 'assign_record':
          return await this.assignRecord(config, event);
        case 'update_field':
          return await this.updateField(config, event);
        case 'move_stage':
          return await this.moveStage(config, event);
        case 'notify_user':
          return await this.notifyUser(config, event);
        case 'send_email':
          return await this.sendEmail(config, event);
        case 'webhook':
          return await this.callWebhook(config, event);
        case 'send_whatsapp':
          return {
            type: action.type,
            status: 'skipped',
            detail: 'No WhatsApp provider is configured for this deployment.',
          };
        default:
          return { type: action.type, status: 'skipped', detail: `Unknown action "${action.type}".` };
      }
    } catch (err: any) {
      return { type: action.type, status: 'failed', detail: err?.message ?? 'Action failed' };
    }
  }

  // ─── Actions ───────────────────────────────────────────────────────────────

  private async createTask(config: any, event: WorkflowEvent): Promise<ActionOutcome> {
    const label = this.labelFor(event.entity, event.record);
    const title = this.render(config.title || `Follow up: {{label}}`, event.record, label);
    const dueInDays = Number(config.dueInDays ?? 0);

    const task = await this.prisma.task.create({
      data: {
        tenantId: event.tenantId,
        title,
        description: config.description
          ? this.render(config.description, event.record, label)
          : undefined,
        assignedToId: this.resolveUser(config.assignTo, event),
        createdById: event.actorId,
        dueDate: dueInDays > 0 ? new Date(Date.now() + dueInDays * 86_400_000) : undefined,
        priority: config.priority ?? 'medium',
        // A deleted record can no longer be linked to — the FK would fail.
        ...(event.action === 'deleted'
          ? {}
          : {
              relatedType:
                event.entity === 'lead' || event.entity === 'deal' ? event.entity : undefined,
              relatedLeadId: event.entity === 'lead' ? event.record.id : undefined,
              relatedDealId: event.entity === 'deal' ? event.record.id : undefined,
            }),
      } as any,
    });

    return { type: 'create_task', status: 'success', detail: `Created task "${task.title}"` };
  }

  private async assignRecord(config: any, event: WorkflowEvent): Promise<ActionOutcome> {
    const userId = this.resolveUser(config.userId ?? config.assignTo, event);
    if (!userId) {
      return { type: 'assign_record', status: 'skipped', detail: 'No user to assign to.' };
    }

    await this.updateRecord(event, { [OWNER_FIELD[event.entity]]: userId });
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    return {
      type: 'assign_record',
      status: 'success',
      detail: `Assigned to ${user ? `${user.firstName} ${user.lastName}` : userId}`,
    };
  }

  private async updateField(config: any, event: WorkflowEvent): Promise<ActionOutcome> {
    const field = String(config.field ?? '');
    if (!ENTITY_FIELDS[event.entity].includes(field)) {
      return {
        type: 'update_field',
        status: 'skipped',
        detail: `"${field}" is not a field a workflow can set on a ${event.entity}.`,
      };
    }

    await this.updateRecord(event, { [field]: this.coerce(field, config.value) });
    return { type: 'update_field', status: 'success', detail: `Set ${field} to "${config.value}"` };
  }

  private async moveStage(config: any, event: WorkflowEvent): Promise<ActionOutcome> {
    if (!STAGED_ENTITIES.includes(event.entity)) {
      return { type: 'move_stage', status: 'skipped', detail: `A ${event.entity} has no pipeline stage.` };
    }

    const stage = await this.prisma.pipelineStage.findFirst({
      where: { id: String(config.stageId ?? ''), pipeline: { tenantId: event.tenantId } },
    });
    if (!stage) {
      return { type: 'move_stage', status: 'failed', detail: 'The configured stage no longer exists.' };
    }

    await this.updateRecord(event, { stageId: stage.id, pipelineId: stage.pipelineId });
    return { type: 'move_stage', status: 'success', detail: `Moved to ${stage.name}` };
  }

  private async notifyUser(config: any, event: WorkflowEvent): Promise<ActionOutcome> {
    const userId = this.resolveUser(config.userId ?? config.notify, event);
    if (!userId) {
      return { type: 'notify_user', status: 'skipped', detail: 'No user to notify.' };
    }

    const label = this.labelFor(event.entity, event.record);
    await this.prisma.notification.create({
      data: {
        tenantId: event.tenantId,
        userId,
        type: 'workflow',
        title: this.render(config.title || `${event.entity} update`, event.record, label),
        body: this.render(config.body || `${label} was ${event.action}.`, event.record, label),
        link: `/${event.entity}s/${event.record.id}`,
      },
    });

    return { type: 'notify_user', status: 'success', detail: 'Notification created' };
  }

  private async sendEmail(config: any, event: WorkflowEvent): Promise<ActionOutcome> {
    const { host, port, user, pass, from } = this.config.get('app.email') ?? ({} as any);
    if (!user || !pass) {
      return {
        type: 'send_email',
        status: 'skipped',
        detail: 'SMTP is not configured (set SMTP_USER and SMTP_PASS to enable email).',
      };
    }

    const to = await this.resolveEmail(config.to, event);
    if (!to) {
      return { type: 'send_email', status: 'skipped', detail: 'No recipient address could be resolved.' };
    }

    const label = this.labelFor(event.entity, event.record);
    const transport = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });

    await transport.sendMail({
      from,
      to,
      subject: this.render(config.subject || `Update on ${label}`, event.record, label),
      text: this.render(config.body || `${label} was ${event.action}.`, event.record, label),
    });

    return { type: 'send_email', status: 'success', detail: `Emailed ${to}` };
  }

  private async callWebhook(config: any, event: WorkflowEvent): Promise<ActionOutcome> {
    const url = String(config.url ?? '');
    if (!/^https?:\/\//i.test(url)) {
      return { type: 'webhook', status: 'skipped', detail: 'No valid URL configured.' };
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), WEBHOOK_TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          entity: event.entity,
          action: event.action,
          record: event.record,
        }),
        signal: controller.signal,
      });

      return {
        type: 'webhook',
        status: response.ok ? 'success' : 'failed',
        detail: `POST ${url} → ${response.status}`,
      };
    } finally {
      clearTimeout(timer);
    }
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  /** Writes to the triggering record without going back through its service. */
  private async updateRecord(event: WorkflowEvent, data: Record<string, any>) {
    const delegate = (this.prisma as any)[event.entity];
    await delegate.update({ where: { id: event.record.id }, data });
    Object.assign(event.record, data);
  }

  private resolveUser(target: UserTarget | undefined, event: WorkflowEvent): string | null {
    if (!target) return null;
    if (target === 'actor') return event.actorId;
    if (target === 'record_owner') return event.record[OWNER_FIELD[event.entity]] ?? null;
    return target;
  }

  private async resolveEmail(target: string | undefined, event: WorkflowEvent): Promise<string | null> {
    if (!target) return null;
    if (target.includes('@')) return target;

    if (target === 'record_owner') {
      const ownerId = event.record[OWNER_FIELD[event.entity]];
      if (!ownerId) return null;
      const owner = await this.prisma.user.findUnique({ where: { id: ownerId } });
      return owner?.email ?? null;
    }

    if (target === 'record_contact') {
      if (event.record.email) return event.record.email;
      if (!event.record.contactId) return null;
      const contact = await this.prisma.contact.findUnique({ where: { id: event.record.contactId } });
      return contact?.email ?? null;
    }

    return null;
  }

  /** Leaves a trail on the record so automated changes are not mysterious. */
  private async logActivity(name: string, event: WorkflowEvent, outcomes: ActionOutcome[]) {
    const applied = outcomes.filter((o) => o.status === 'success');
    if (applied.length === 0) return;
    if (event.entity !== 'lead' && event.entity !== 'deal') return;
    if (event.action === 'deleted') return;

    await this.prisma.activity
      .create({
        data: {
          tenantId: event.tenantId,
          type: 'record_updated',
          title: `Automation "${name}" ran`,
          description: applied.map((o) => o.detail).join(' · '),
          performedById: event.actorId,
          relatedType: event.entity,
          relatedLeadId: event.entity === 'lead' ? event.record.id : undefined,
          relatedDealId: event.entity === 'deal' ? event.record.id : undefined,
        },
      })
      .catch(() => undefined);
  }

  /** Replaces `{{field}}` placeholders, plus `{{label}}` for the record's name. */
  private render(template: string, record: Record<string, any>, label: string): string {
    return String(template).replace(/\{\{\s*(\w+)\s*\}\}/g, (_match, key) =>
      key === 'label' ? label : this.asText(record[key]),
    );
  }

  private labelFor(entity: WorkflowEntity, record: Record<string, any>): string {
    return this.asText(record[ENTITY_LABEL_FIELD[entity]]) || `${entity} ${record.id}`;
  }

  private coerce(field: string, value: unknown) {
    if (NUMERIC_FIELDS.has(field)) return Number(value);
    if (field.endsWith('Date') && value) return new Date(String(value));
    return value;
  }

  private asText(value: unknown): string {
    if (value === null || value === undefined) return '';
    if (value instanceof Date) return value.toISOString();
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  }

  /**
   * Conditions and actions are free-form JSON. Rows written before the DTO
   * validated their shape can hold junk, so anything that is not a plain object
   * is dropped rather than fed into the action switch. Public so callers that
   * read a workflow's rules (the simulator) sanitize them the same way.
   */
  asArray<T>(value: unknown): T[] {
    if (!Array.isArray(value)) return [];
    return value.filter(
      (item): item is T => Boolean(item) && typeof item === 'object' && !Array.isArray(item),
    );
  }
}
