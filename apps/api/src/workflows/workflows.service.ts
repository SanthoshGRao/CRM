import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateWorkflowDto } from './dto/create-workflow.dto';
import { UpdateWorkflowDto } from './dto/update-workflow.dto';
import { WorkflowEngineService } from './workflow-engine.service';
import {
  ENTITY_LABEL_FIELD,
  WorkflowAction,
  WorkflowCondition,
  WorkflowEntity,
} from './workflow-types';

@Injectable()
export class WorkflowsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly engine: WorkflowEngineService,
  ) {}

  async findAll(tenantId: string, query: { page?: number; limit?: number; isActive?: string }) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 25;

    const where: any = { tenantId };
    if (query.isActive === 'true') where.isActive = true;
    if (query.isActive === 'false') where.isActive = false;

    const [data, total] = await Promise.all([
      this.prisma.workflow.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: { _count: { select: { executions: true } } },
      }),
      this.prisma.workflow.count({ where }),
    ]);

    return {
      data,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string, tenantId: string) {
    const workflow = await this.prisma.workflow.findFirst({
      where: { id, tenantId },
      include: {
        executions: { orderBy: { createdAt: 'desc' }, take: 20 },
      },
    });

    if (!workflow) throw new NotFoundException('Workflow not found');
    return workflow;
  }

  async create(dto: CreateWorkflowDto, tenantId: string) {
    return this.prisma.workflow.create({
      data: {
        tenantId,
        name: dto.name,
        description: dto.description,
        isActive: dto.isActive ?? false,
        triggerType: dto.triggerType,
        triggerConfig: (dto.triggerConfig ?? {}) as any,
        conditions: (dto.conditions ?? []) as any,
        actions: (dto.actions ?? []) as any,
      },
    });
  }

  async update(id: string, dto: UpdateWorkflowDto, tenantId: string) {
    const existing = await this.prisma.workflow.findFirst({ where: { id, tenantId } });
    if (!existing) throw new NotFoundException('Workflow not found');

    return this.prisma.workflow.update({
      where: { id },
      data: { ...dto } as any,
    });
  }

  async remove(id: string, tenantId: string) {
    const existing = await this.prisma.workflow.findFirst({ where: { id, tenantId } });
    if (!existing) throw new NotFoundException('Workflow not found');

    await this.prisma.workflow.delete({ where: { id } });
    return { id };
  }

  /** Run history, newest first — the answer to "did this rule actually fire?". */
  async executions(id: string, tenantId: string, limit = 20) {
    const workflow = await this.prisma.workflow.findFirst({ where: { id, tenantId } });
    if (!workflow) throw new NotFoundException('Workflow not found');

    return this.prisma.workflowExecution.findMany({
      where: { workflowId: id, tenantId },
      orderBy: { createdAt: 'desc' },
      take: Math.min(Number(limit) || 20, 50),
    });
  }

  /**
   * Dry run against a real record: reports which conditions hold and what the
   * actions *would* do. Nothing is written and no side effect leaves the API.
   */
  async simulate(id: string, tenantId: string, recordId?: string) {
    const workflow = await this.prisma.workflow.findFirst({ where: { id, tenantId } });
    if (!workflow) throw new NotFoundException('Workflow not found');

    const entity = ((workflow.triggerConfig as any)?.entity ?? 'lead') as WorkflowEntity;
    const delegate = (this.prisma as any)[entity];
    if (!delegate) throw new BadRequestException(`Unsupported entity "${entity}"`);

    const record = recordId
      ? await delegate.findFirst({ where: { id: recordId, tenantId } })
      : await delegate.findFirst({ where: { tenantId }, orderBy: { createdAt: 'desc' } });

    if (!record) {
      return {
        sampled: null,
        matched: false,
        message: `No ${entity} records exist yet to test against. Create one first.`,
        conditions: [],
        actions: [],
      };
    }

    // Sanitized the same way the engine does, so malformed rows report as
    // "no rules" instead of surfacing half-formed entries to the UI.
    const conditions = this.engine.asArray<WorkflowCondition>(workflow.conditions);
    const actions = this.engine
      .asArray<WorkflowAction>(workflow.actions)
      .filter((a) => typeof a.type === 'string');

    const check = this.engine.evaluateConditions(conditions, record);

    return {
      sampled: {
        id: record.id,
        label: String(record[ENTITY_LABEL_FIELD[entity]] ?? record.id),
        entity,
      },
      matched: check.passed,
      message: !check.passed
        ? `Conditions do not hold for this ${entity}, so nothing would run.`
        : actions.length === 0
          ? 'Conditions hold, but this rule has no valid actions saved.'
          : `Conditions hold for this ${entity} — the actions below would run.`,
      conditions: check.results,
      actions: actions.map((a) => ({ type: a.type, config: a.config ?? {} })),
      isActive: workflow.isActive,
    };
  }
}
