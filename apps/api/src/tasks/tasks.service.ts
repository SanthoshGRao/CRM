import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { WorkflowEngineService } from '../workflows/workflow-engine.service';
import { PushService } from '../push/push.service';
import { applyFilters, FilterFieldMap } from '../common/filters/apply-filters.util';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';

/** Fields the advanced filter builder (and saved views) may query on. */
export const TASK_FILTER_FIELDS: FilterFieldMap = {
  title: 'string',
  status: 'select',
  priority: 'select',
  assignedToId: 'select',
  dueDate: 'date',
  createdAt: 'date',
};

const TASK_INCLUDE = {
  assignedTo: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
  createdBy: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
  lead: { select: { id: true, title: true } },
  deal: { select: { id: true, name: true } },
} as const;

@Injectable()
export class TasksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly workflows: WorkflowEngineService,
    private readonly push: PushService,
  ) {}

  async findAll(
    tenantId: string,
    query: {
      page?: number;
      limit?: number;
      search?: string;
      assignedToId?: string;
      status?: string;
      priority?: string;
      filters?: string;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
    },
    scope: Record<string, unknown> = {},
  ) {
    const {
      search,
      assignedToId,
      status,
      priority,
      sortBy = 'dueDate',
      sortOrder = 'asc',
    } = query;
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 25;

    // `scope` narrows to the caller's own records when their role is OWN-scoped.
    const where: any = { tenantId, ...scope };

    if (search) where.title = { contains: search, mode: 'insensitive' };
    if (assignedToId) where.assignedToId = assignedToId;
    if (status) where.status = status;
    if (priority) where.priority = priority;
    // Advanced conditions (from the filter builder or a saved view) layer on
    // top of, and can override, the quick filters above.
    applyFilters(where, query.filters, TASK_FILTER_FIELDS);

    const [data, total] = await Promise.all([
      this.prisma.task.findMany({
        where,
        include: TASK_INCLUDE,
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.task.count({ where }),
    ]);

    return {
      data,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string, tenantId: string, scope: Record<string, unknown> = {}) {
    const task = await this.prisma.task.findFirst({
      where: { id, tenantId, ...scope },
      include: {
        ...TASK_INCLUDE,
        customFieldValues: {
          include: { field: { include: { options: true } } },
        },
      },
    });

    if (!task) throw new NotFoundException('Task not found');
    return task;
  }

  async create(dto: CreateTaskDto, tenantId: string, userId: string) {
    const task = await this.prisma.task.create({
      data: {
        ...dto,
        tenantId,
        createdById: userId,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
      } as any,
      include: TASK_INCLUDE,
    });

    if (task.relatedLeadId) {
      await this.prisma.activity.create({
        data: {
          tenantId,
          type: 'task_created',
          title: `Task created: ${task.title}`,
          performedById: userId,
          relatedType: 'lead',
          relatedLeadId: task.relatedLeadId,
        },
      });
    } else if (task.relatedDealId) {
      await this.prisma.activity.create({
        data: {
          tenantId,
          type: 'task_created',
          title: `Task created: ${task.title}`,
          performedById: userId,
          relatedType: 'deal',
          relatedDealId: task.relatedDealId,
        },
      });
    }

    this.workflows.dispatch({
      tenantId,
      actorId: userId,
      entity: 'task',
      action: 'created',
      record: task,
    });

    if (task.assignedToId && task.assignedToId !== userId) {
      void this.push.sendToUser(task.assignedToId, {
        title: 'New task assigned to you',
        body: task.title,
        data: { type: 'task_assigned', taskId: task.id },
      });
    }

    return task;
  }

  async update(
    id: string,
    dto: UpdateTaskDto,
    tenantId: string,
    userId: string,
    scope: Record<string, unknown> = {},
  ) {
    const existing = await this.prisma.task.findFirst({ where: { id, tenantId, ...scope } });
    if (!existing) throw new NotFoundException('Task not found');

    const updateData: any = {
      ...dto,
      dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
    };

    if (dto.status === 'completed' && existing.status !== 'completed') {
      updateData.completedAt = new Date();
    }

    const task = await this.prisma.task.update({
      where: { id },
      data: updateData,
      include: TASK_INCLUDE,
    });

    this.workflows.dispatch({
      tenantId,
      actorId: userId,
      entity: 'task',
      action: 'updated',
      record: task,
      previous: existing,
    });

    if (
      task.assignedToId &&
      task.assignedToId !== existing.assignedToId &&
      task.assignedToId !== userId
    ) {
      void this.push.sendToUser(task.assignedToId, {
        title: 'Task assigned to you',
        body: task.title,
        data: { type: 'task_assigned', taskId: task.id },
      });
    }

    return task;
  }

  async remove(
    id: string,
    tenantId: string,
    userId: string,
    scope: Record<string, unknown> = {},
  ) {
    const existing = await this.prisma.task.findFirst({ where: { id, tenantId, ...scope } });
    if (!existing) throw new NotFoundException('Task not found');
    await this.prisma.task.delete({ where: { id } });

    this.workflows.dispatch({
      tenantId,
      actorId: userId,
      entity: 'task',
      action: 'deleted',
      record: existing,
    });

    return { id };
  }

  async bulkUpdate(
    ids: string[],
    data: { assignedToId?: string; status?: string; priority?: string },
    tenantId: string,
  ) {
    await this.prisma.task.updateMany({ where: { id: { in: ids }, tenantId }, data: data as any });
    return { updated: ids.length };
  }

  async bulkDelete(ids: string[], tenantId: string) {
    await this.prisma.task.deleteMany({ where: { id: { in: ids }, tenantId } });
    return { deleted: ids.length };
  }
}
