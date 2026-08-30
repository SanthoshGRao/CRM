import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { PipelinesService } from '../pipelines/pipelines.service';
import { WorkflowEngineService } from '../workflows/workflow-engine.service';
import { WorkflowEntity } from '../workflows/workflow-types';

export const DATA_RESOURCES = ['contacts', 'companies', 'leads', 'deals', 'tasks', 'activities'] as const;
export type DataResource = (typeof DATA_RESOURCES)[number];

/** Prisma delegate + the fields searched by `?search=` for each resource. */
const RESOURCE_MAP: Record<
  DataResource,
  { model: string; searchFields: string[]; include?: any; actorField?: string }
> = {
  contacts: {
    model: 'contact',
    searchFields: ['firstName', 'lastName', 'email'],
    include: { company: { select: { id: true, name: true } } },
  },
  companies: {
    model: 'company',
    searchFields: ['name', 'industry', 'email'],
  },
  leads: {
    model: 'lead',
    searchFields: ['title'],
    include: {
      stage: { select: { id: true, name: true } },
      company: { select: { id: true, name: true } },
      contact: { select: { id: true, firstName: true, lastName: true } },
    },
  },
  deals: {
    model: 'deal',
    searchFields: ['name'],
    include: {
      stage: { select: { id: true, name: true } },
      company: { select: { id: true, name: true } },
      contact: { select: { id: true, firstName: true, lastName: true } },
    },
  },
  tasks: {
    model: 'task',
    searchFields: ['title', 'description'],
    // Required on the model but meaningless to a key-authenticated caller — default it.
    actorField: 'createdById',
  },
  activities: {
    model: 'activity',
    searchFields: ['title', 'description'],
    actorField: 'performedById',
  },
};

/** Maps plural resource names to the singular entity keys the workflow engine uses. */
const RESOURCE_TO_ENTITY: Partial<Record<DataResource, WorkflowEntity>> = {
  contacts: 'contact',
  companies: 'company',
  leads: 'lead',
  deals: 'deal',
  tasks: 'task',
};

@Injectable()
export class DataService {
  private readonly logger = new Logger(DataService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly pipelines: PipelinesService,
    private readonly workflows: WorkflowEngineService,
  ) {}

  private delegate(resource: string) {
    const config = RESOURCE_MAP[resource as DataResource];
    if (!config) {
      throw new NotFoundException(
        `Unknown resource "${resource}". Available: ${DATA_RESOURCES.join(', ')}.`,
      );
    }
    return { config, model: (this.prisma as any)[config.model] };
  }

  async list(
    resource: string,
    tenantId: string,
    query: {
      page?: number; limit?: number; search?: string;
      updatedSince?: string; createdSince?: string;
      sortBy?: string; sortOrder?: 'asc' | 'desc';
    },
  ) {
    const { config, model } = this.delegate(resource);

    const page = Number(query.page) || 1;

    let limit = 50;
    if (query.limit !== undefined && (query.limit as unknown) !== '') {
      limit = Number(query.limit);
      if (!Number.isInteger(limit) || limit < 1 || limit > 200) {
        throw new BadRequestException('limit must be an integer between 1 and 200.');
      }
    }

    const sortBy = query.sortBy || 'createdAt';
    const sortOrder = query.sortOrder === 'asc' ? 'asc' : 'desc';

    // tenantId is injected here and nowhere else — the key cannot widen its scope.
    const where: any = { tenantId };

    if (query.search) {
      where.OR = config.searchFields.map((f) => ({
        [f]: { contains: query.search, mode: 'insensitive' },
      }));
    }
    if (query.updatedSince) {
      const date = new Date(query.updatedSince);
      if (Number.isNaN(date.getTime())) throw new BadRequestException('updatedSince must be a valid date.');
      where.updatedAt = { gte: date };
    }
    if (query.createdSince) {
      const date = new Date(query.createdSince);
      if (Number.isNaN(date.getTime())) throw new BadRequestException('createdSince must be a valid date.');
      where.createdAt = { gte: date };
    }

    let data: any[];
    try {
      data = await model.findMany({
        where,
        ...(config.include ? { include: config.include } : {}),
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      });
    } catch {
      throw new BadRequestException(`Cannot sort by "${sortBy}".`);
    }

    const total = await model.count({ where });

    return { data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async get(resource: string, id: string, tenantId: string) {
    const { config, model } = this.delegate(resource);

    const record = await model.findFirst({
      where: { id, tenantId },
      ...(config.include ? { include: config.include } : {}),
    });

    if (!record) throw new NotFoundException(`No ${resource.replace(/s$/, '')} with id ${id}.`);
    return record;
  }

  async create(resource: string, tenantId: string, body: Record<string, any>, actorId: string | null = null) {
    const { config, model } = this.delegate(resource);
    const data = this.sanitise(body);

    // Some models require an "actor" (who performed/created this) that a
    // key-authenticated caller has no natural value for — default to whoever
    // issued the key, so activities/tasks can be written without a user session.
    if (config.actorField && !data[config.actorField]) {
      if (!actorId) {
        throw new BadRequestException(
          `"${config.actorField}" is required to create a ${resource.replace(/s$/, '')}. ` +
            'Pass it explicitly, or reissue this API key from a user account.',
        );
      }
      data[config.actorField] = actorId;
    }

    if ((resource === 'leads' || resource === 'deals') && (!data.pipelineId || !data.stageId)) {
      const entityType = resource === 'leads' ? 'lead' : 'deal';
      const defaultPipeline = await this.pipelines.findDefault(tenantId, entityType);
      if (defaultPipeline && defaultPipeline.stages && defaultPipeline.stages.length > 0) {
        data.pipelineId = data.pipelineId ?? defaultPipeline.id;
        data.stageId = data.stageId ?? defaultPipeline.stages[0].id;
      }
    }

    try {
      const record = await model.create({
        data: { ...data, tenantId },
        ...(config.include ? { include: config.include } : {}),
      });

      const entity = RESOURCE_TO_ENTITY[resource as DataResource];
      if (entity) {
        this.workflows.dispatch({
          tenantId,
          actorId: actorId ?? record.id,
          entity,
          action: 'created',
          record,
        });
      }

      return record;
    } catch (err: any) {
      throw this.toValidationError(err);
    }
  }

  async update(resource: string, id: string, tenantId: string, body: Record<string, any>) {
    const { config, model } = this.delegate(resource);

    const existing = await model.findFirst({ where: { id, tenantId } });
    if (!existing) throw new NotFoundException(`No ${resource.replace(/s$/, '')} with id ${id}.`);

    try {
      const record = await model.update({
        where: { id },
        data: this.sanitise(body),
        ...(config.include ? { include: config.include } : {}),
      });

      const entity = RESOURCE_TO_ENTITY[resource as DataResource];
      if (entity) {
        this.workflows.dispatch({
          tenantId,
          actorId: existing.ownerId ?? existing.createdById ?? existing.performedById ?? record.id,
          entity,
          action: 'updated',
          record,
          previous: existing,
        });
      }

      return record;
    } catch (err: any) {
      throw this.toValidationError(err);
    }
  }

  async remove(resource: string, id: string, tenantId: string) {
    const { model } = this.delegate(resource);

    const existing = await model.findFirst({ where: { id, tenantId } });
    if (!existing) throw new NotFoundException(`No ${resource.replace(/s$/, '')} with id ${id}.`);

    await model.delete({ where: { id } });

    const entity = RESOURCE_TO_ENTITY[resource as DataResource];
    if (entity) {
      this.workflows.dispatch({
        tenantId,
        actorId: existing.ownerId ?? existing.createdById ?? existing.performedById ?? id,
        entity,
        action: 'deleted',
        record: existing,
      });
    }

    return { id, deleted: true };
  }

  /** Blocks callers from reassigning ownership fields through the data API. */
  private sanitise(body: Record<string, any>) {
    const { id, tenantId, createdAt, updatedAt, ...rest } = body ?? {};
    return rest;
  }

  /**
   * Maps a raw Prisma error to a stable, field-level 400 contract. Prisma's own
   * messages name its internal relation/argument shape (e.g. "Argument
   * `relatedType` is missing") — useful for logs, but not something a client
   * should ever see, since it lets probing reconstruct the schema. The raw
   * error is logged server-side; only the mapped, field-scoped detail goes out.
   */
  private toValidationError(err: any): BadRequestException {
    const raw = String(err?.message ?? err).split('\n').pop()?.trim() ?? String(err);
    this.logger.warn(`Data API write rejected: ${raw}`);

    return new BadRequestException({
      error: 'Bad Request',
      statusCode: 400,
      message: 'Validation failed',
      details: [this.prismaDetail(err, raw)],
    });
  }

  private prismaDetail(err: any, raw: string): { field: string; code: string; message: string } {
    if (err?.code === 'P2002') {
      const field = err?.meta?.target?.[0] ?? 'value';
      return { field, code: 'unique', message: `A record with that ${field} already exists.` };
    }
    if (err?.code === 'P2003') {
      const field = String(err?.meta?.field_name ?? '').replace(/_fkey.*$/, '').replace(/^.*_/, '') || 'reference';
      return {
        field,
        code: 'invalid_reference',
        message: `${field} refers to a record that does not exist in this workspace.`,
      };
    }
    if (err?.code === 'P2025') {
      return { field: 'id', code: 'not_found', message: 'Record not found.' };
    }

    const missing = raw.match(/Argument `(\w+)` is missing/);
    if (missing) {
      return { field: missing[1], code: 'required', message: `${missing[1]} is required.` };
    }
    const unknown = raw.match(/Unknown argument `(\w+)`/);
    if (unknown) {
      return { field: unknown[1], code: 'unknown_field', message: `${unknown[1]} is not a recognized field.` };
    }
    const invalid =
      raw.match(/Argument `(\w+)`:? ?Invalid value/) ?? raw.match(/Invalid value for argument `(\w+)`/);
    if (invalid) {
      return { field: invalid[1], code: 'invalid', message: `${invalid[1]} has an invalid value.` };
    }

    return { field: 'body', code: 'invalid', message: 'The request body is invalid.' };
  }
}
