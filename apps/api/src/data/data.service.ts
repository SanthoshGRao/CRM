import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

export const DATA_RESOURCES = ['contacts', 'companies', 'leads', 'deals', 'tasks', 'activities'] as const;
export type DataResource = (typeof DATA_RESOURCES)[number];

/** Prisma delegate + the fields searched by `?search=` for each resource. */
const RESOURCE_MAP: Record<DataResource, { model: string; searchFields: string[]; include?: any }> = {
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
  },
  activities: {
    model: 'activity',
    searchFields: ['title', 'description'],
  },
};

@Injectable()
export class DataService {
  constructor(private readonly prisma: PrismaService) {}

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
    const limit = Math.min(Number(query.limit) || 50, 200);
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

  async create(resource: string, tenantId: string, body: Record<string, any>) {
    const { config, model } = this.delegate(resource);
    const data = this.sanitise(body);

    try {
      return await model.create({
        data: { ...data, tenantId },
        ...(config.include ? { include: config.include } : {}),
      });
    } catch (err: any) {
      throw new BadRequestException(this.prismaMessage(err));
    }
  }

  async update(resource: string, id: string, tenantId: string, body: Record<string, any>) {
    const { config, model } = this.delegate(resource);

    const existing = await model.findFirst({ where: { id, tenantId }, select: { id: true } });
    if (!existing) throw new NotFoundException(`No ${resource.replace(/s$/, '')} with id ${id}.`);

    try {
      return await model.update({
        where: { id },
        data: this.sanitise(body),
        ...(config.include ? { include: config.include } : {}),
      });
    } catch (err: any) {
      throw new BadRequestException(this.prismaMessage(err));
    }
  }

  async remove(resource: string, id: string, tenantId: string) {
    const { model } = this.delegate(resource);

    const existing = await model.findFirst({ where: { id, tenantId }, select: { id: true } });
    if (!existing) throw new NotFoundException(`No ${resource.replace(/s$/, '')} with id ${id}.`);

    await model.delete({ where: { id } });
    return { id, deleted: true };
  }

  /** Blocks callers from reassigning ownership fields through the data API. */
  private sanitise(body: Record<string, any>) {
    const { id, tenantId, createdAt, updatedAt, ...rest } = body ?? {};
    return rest;
  }

  private prismaMessage(err: any): string {
    if (err?.code === 'P2002') return 'A record with that unique value already exists.';
    if (err?.code === 'P2003') return 'A referenced record does not exist in this workspace.';
    if (err?.code === 'P2025') return 'Record not found.';
    return err?.message?.split('\n').pop()?.trim() || 'Invalid request body.';
  }
}
