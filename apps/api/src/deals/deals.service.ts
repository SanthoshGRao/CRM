import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { PipelinesService } from '../pipelines/pipelines.service';
import { WorkflowEngineService } from '../workflows/workflow-engine.service';
import { PushService } from '../push/push.service';
import { CreateDealDto } from './dto/create-deal.dto';
import { UpdateDealDto } from './dto/update-deal.dto';

const DEAL_INCLUDE = {
  contact: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
  company: { select: { id: true, name: true } },
  stage: { select: { id: true, name: true, color: true } },
  owner: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
  pipeline: { select: { id: true, name: true } },
} as const;

@Injectable()
export class DealsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pipelines: PipelinesService,
    private readonly workflows: WorkflowEngineService,
    private readonly push: PushService,
  ) {}

  async findAll(
    tenantId: string,
    query: {
      page?: number;
      limit?: number;
      search?: string;
      stageId?: string;
      ownerId?: string;
      status?: string;
      pipelineId?: string;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
    },
    scope: Record<string, unknown> = {},
  ) {
    const {
      search,
      stageId,
      ownerId,
      status,
      pipelineId,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 25;

    // `scope` narrows to the caller's own records when their role is OWN-scoped.
    const where: any = { tenantId, ...scope };

    if (search) where.name = { contains: search, mode: 'insensitive' };
    if (stageId) where.stageId = stageId;
    if (ownerId) where.ownerId = ownerId;
    if (status) where.status = status;
    if (pipelineId) where.pipelineId = pipelineId;

    const [data, total] = await Promise.all([
      this.prisma.deal.findMany({
        where,
        include: DEAL_INCLUDE,
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.deal.count({ where }),
    ]);

    return {
      data,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findAllByStage(tenantId: string, pipelineId: string) {
    const stages = await this.prisma.pipelineStage.findMany({
      where: { pipelineId },
      orderBy: { displayOrder: 'asc' },
    });

    const dealsByStage = await Promise.all(
      stages.map(async (stage) => {
        const deals = await this.prisma.deal.findMany({
          where: { tenantId, stageId: stage.id },
          include: DEAL_INCLUDE,
          orderBy: { updatedAt: 'desc' },
          take: 100,
        });
        return { stage, deals };
      }),
    );

    return dealsByStage;
  }

  async findOne(id: string, tenantId: string, scope: Record<string, unknown> = {}) {
    const deal = await this.prisma.deal.findFirst({
      where: { id, tenantId, ...scope },
      include: {
        ...DEAL_INCLUDE,
        activities: {
          orderBy: { createdAt: 'desc' },
          take: 50,
          include: { performedBy: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } } },
        },
        tasks: { where: { status: { not: 'completed' } }, orderBy: { dueDate: 'asc' } },
        customFieldValues: { include: { field: { include: { options: true } } } },
      },
    });

    if (!deal) throw new NotFoundException('Deal not found');
    return deal;
  }

  async create(dto: CreateDealDto, tenantId: string, userId: string) {
    let pipelineId = dto.pipelineId;
    let stageId = dto.stageId;

    if (!pipelineId || !stageId) {
      const defaultPipeline = await this.pipelines.findDefault(tenantId, 'deal');
      if (!defaultPipeline || !defaultPipeline.stages || defaultPipeline.stages.length === 0) {
        throw new BadRequestException('No pipeline or stages configured for deals.');
      }
      pipelineId = pipelineId ?? defaultPipeline.id;
      stageId = stageId ?? defaultPipeline.stages[0].id;
    }

    const deal = await this.prisma.deal.create({
      data: {
        ...dto,
        tenantId,
        pipelineId,
        stageId,
        expectedCloseDate: dto.expectedCloseDate ? new Date(dto.expectedCloseDate) : undefined,
      },
      include: DEAL_INCLUDE,
    });

    await this.prisma.activity.create({
      data: {
        tenantId,
        type: 'record_created',
        title: `Deal created: ${deal.name}`,
        performedById: userId,
        relatedType: 'deal',
        relatedDealId: deal.id,
      },
    });

    this.workflows.dispatch({
      tenantId,
      actorId: userId,
      entity: 'deal',
      action: 'created',
      record: deal,
    });

    if (deal.ownerId && deal.ownerId !== userId) {
      void this.push.sendToUser(deal.ownerId, {
        title: 'New deal assigned to you',
        body: deal.name,
        data: { type: 'deal_assigned', dealId: deal.id },
      });
    }

    return deal;
  }

  async update(
    id: string,
    dto: UpdateDealDto,
    tenantId: string,
    userId: string,
    scope: Record<string, unknown> = {},
  ) {
    const existing = await this.prisma.deal.findFirst({ where: { id, tenantId, ...scope } });
    if (!existing) throw new NotFoundException('Deal not found');

    const oldStageId = existing.stageId;

    const updateData: any = {
      ...dto,
      expectedCloseDate: dto.expectedCloseDate ? new Date(dto.expectedCloseDate) : undefined,
    };

    if (dto.status === 'won' || dto.status === 'lost') {
      updateData.closedAt = new Date();
    }

    const deal = await this.prisma.deal.update({
      where: { id },
      data: updateData,
      include: DEAL_INCLUDE,
    });

    if (dto.stageId && dto.stageId !== oldStageId) {
      await this.prisma.activity.create({
        data: {
          tenantId,
          type: 'stage_changed',
          title: `Deal moved to ${(deal as any).stage?.name ?? 'new stage'}`,
          performedById: userId,
          relatedType: 'deal',
          relatedDealId: deal.id,
          metadata: { fromStageId: oldStageId, toStageId: dto.stageId },
        },
      });
    } else {
      await this.prisma.activity.create({
        data: {
          tenantId,
          type: 'record_updated',
          title: `Deal updated: ${deal.name}`,
          performedById: userId,
          relatedType: 'deal',
          relatedDealId: deal.id,
        },
      });
    }

    this.workflows.dispatch({
      tenantId,
      actorId: userId,
      entity: 'deal',
      action: 'updated',
      record: deal,
      previous: existing,
    });

    if (deal.ownerId && deal.ownerId !== existing.ownerId && deal.ownerId !== userId) {
      void this.push.sendToUser(deal.ownerId, {
        title: 'Deal assigned to you',
        body: deal.name,
        data: { type: 'deal_assigned', dealId: deal.id },
      });
    }

    return deal;
  }

  async remove(
    id: string,
    tenantId: string,
    userId: string,
    scope: Record<string, unknown> = {},
  ) {
    const existing = await this.prisma.deal.findFirst({ where: { id, tenantId, ...scope } });
    if (!existing) throw new NotFoundException('Deal not found');
    await this.prisma.deal.delete({ where: { id } });

    this.workflows.dispatch({
      tenantId,
      actorId: userId,
      entity: 'deal',
      action: 'deleted',
      record: existing,
    });

    return { id };
  }

  async bulkUpdate(
    ids: string[],
    data: { ownerId?: string; stageId?: string; status?: string },
    tenantId: string,
  ) {
    await this.prisma.deal.updateMany({ where: { id: { in: ids }, tenantId }, data: data as any });
    return { updated: ids.length };
  }

  async bulkDelete(ids: string[], tenantId: string) {
    await this.prisma.deal.deleteMany({ where: { id: { in: ids }, tenantId } });
    return { deleted: ids.length };
  }
}
