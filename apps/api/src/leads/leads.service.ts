import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { PipelinesService } from '../pipelines/pipelines.service';
import { WorkflowEngineService } from '../workflows/workflow-engine.service';
import { PushService } from '../push/push.service';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { ConvertLeadDto } from './dto/convert-lead.dto';

const LEAD_INCLUDE = {
  contact: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
  company: { select: { id: true, name: true } },
  stage: { select: { id: true, name: true, color: true } },
  owner: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
  pipeline: { select: { id: true, name: true } },
  convertedDeal: { select: { id: true, name: true, status: true } },
} as const;

@Injectable()
export class LeadsService {
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

    if (search) {
      where.title = { contains: search, mode: 'insensitive' };
    }
    if (stageId) where.stageId = stageId;
    if (ownerId) where.ownerId = ownerId;
    if (status) where.status = status;
    if (pipelineId) where.pipelineId = pipelineId;

    const [data, total] = await Promise.all([
      this.prisma.lead.findMany({
        where,
        include: LEAD_INCLUDE,
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.lead.count({ where }),
    ]);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findAllByStage(tenantId: string, pipelineId: string) {
    const stages = await this.prisma.pipelineStage.findMany({
      where: { pipelineId },
      orderBy: { displayOrder: 'asc' },
    });

    const leadsByStage = await Promise.all(
      stages.map(async (stage) => {
        const leads = await this.prisma.lead.findMany({
          where: { tenantId, stageId: stage.id },
          include: LEAD_INCLUDE,
          orderBy: { updatedAt: 'desc' },
          take: 100,
        });
        return { stage, leads };
      }),
    );

    return leadsByStage;
  }

  async findOne(id: string, tenantId: string, scope: Record<string, unknown> = {}) {
    const lead = await this.prisma.lead.findFirst({
      where: { id, tenantId, ...scope },
      include: {
        ...LEAD_INCLUDE,
        activities: {
          orderBy: { createdAt: 'desc' },
          take: 50,
          include: {
            performedBy: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
          },
        },
        tasks: {
          where: { status: { not: 'completed' } },
          orderBy: { dueDate: 'asc' },
        },
        customFieldValues: {
          include: { field: { include: { options: true } } },
        },
      },
    });

    if (!lead) {
      throw new NotFoundException(`Lead not found`);
    }

    return lead;
  }

  async create(dto: CreateLeadDto, tenantId: string, userId: string) {
    let pipelineId = dto.pipelineId;
    let stageId = dto.stageId;

    if (!pipelineId || !stageId) {
      const defaultPipeline = await this.pipelines.findDefault(tenantId, 'lead');
      if (!defaultPipeline || !defaultPipeline.stages || defaultPipeline.stages.length === 0) {
        throw new BadRequestException('No pipeline or stages configured for leads.');
      }
      pipelineId = pipelineId ?? defaultPipeline.id;
      stageId = stageId ?? defaultPipeline.stages[0].id;
    }

    const leadData: any = {
      ...dto,
      tenantId,
      pipelineId,
      stageId,
      status: 'new',
      value: dto.value ? dto.value : undefined,
      expectedCloseDate: dto.expectedCloseDate ? new Date(dto.expectedCloseDate) : undefined,
    };

    const lead = await this.prisma.lead.create({
      data: leadData,
      include: LEAD_INCLUDE,
    });

    // Log activity
    await this.prisma.activity.create({
      data: {
        tenantId,
        type: 'record_created',
        title: `Lead created: ${lead.title}`,
        performedById: userId,
        relatedType: 'lead',
        relatedLeadId: lead.id,
      },
    });

    // Update last activity timestamp
    await this.prisma.lead.update({
      where: { id: lead.id },
      data: { lastActivityAt: new Date() },
    });

    this.workflows.dispatch({
      tenantId,
      actorId: userId,
      entity: 'lead',
      action: 'created',
      record: lead,
    });

    if (lead.ownerId && lead.ownerId !== userId) {
      void this.push.sendToUser(lead.ownerId, {
        title: 'New lead assigned to you',
        body: lead.title,
        data: { type: 'lead_assigned', leadId: lead.id },
      });
    }

    return lead;
  }

  async update(
    id: string,
    dto: UpdateLeadDto,
    tenantId: string,
    userId: string,
    scope: Record<string, unknown> = {},
  ) {
    const existing = await this.prisma.lead.findFirst({ where: { id, tenantId, ...scope } });
    if (!existing) throw new NotFoundException(`Lead not found`);

    const oldStageId = existing.stageId;

    const updateData: any = {
      ...dto,
      value: dto.value !== undefined ? dto.value : undefined,
      expectedCloseDate: dto.expectedCloseDate ? new Date(dto.expectedCloseDate) : undefined,
    };

    const lead = await this.prisma.lead.update({
      where: { id },
      data: updateData,
      include: LEAD_INCLUDE,
    });

    // Log stage change
    if (dto.stageId && dto.stageId !== oldStageId) {
      await this.prisma.activity.create({
        data: {
          tenantId,
          type: 'stage_changed',
          title: `Lead moved to ${(lead as any).stage?.name ?? 'new stage'}`,
          performedById: userId,
          relatedType: 'lead',
          relatedLeadId: lead.id,
          metadata: { fromStageId: oldStageId, toStageId: dto.stageId },
        },
      });
    }

    await this.prisma.lead.update({
      where: { id },
      data: { lastActivityAt: new Date() },
    });

    this.workflows.dispatch({
      tenantId,
      actorId: userId,
      entity: 'lead',
      action: 'updated',
      record: lead,
      previous: existing,
    });

    if (lead.ownerId && lead.ownerId !== existing.ownerId && lead.ownerId !== userId) {
      void this.push.sendToUser(lead.ownerId, {
        title: 'Lead assigned to you',
        body: lead.title,
        data: { type: 'lead_assigned', leadId: lead.id },
      });
    }

    return lead;
  }

  /**
   * Turns a lead into an open deal: the contact, company, owner, value and close
   * date carry over, the lead is stamped `converted` and linked to the new deal.
   * A lead can only be converted once.
   */
  async convert(
    id: string,
    dto: ConvertLeadDto,
    tenantId: string,
    userId: string,
    scope: Record<string, unknown> = {},
  ) {
    const lead = await this.prisma.lead.findFirst({ where: { id, tenantId, ...scope } });
    if (!lead) throw new NotFoundException('Lead not found');

    if (lead.convertedDealId) {
      throw new ConflictException('This lead has already been converted to a deal');
    }

    const { pipelineId, stage } = await this.resolveDealStage(tenantId, dto);

    const deal = await this.prisma.$transaction(async (tx) => {
      const created = await tx.deal.create({
        data: {
          tenantId,
          name: dto.name?.trim() || lead.title,
          contactId: lead.contactId,
          companyId: lead.companyId,
          pipelineId,
          stageId: stage.id,
          ownerId: dto.ownerId ?? lead.ownerId,
          value: dto.value ?? lead.value ?? 0,
          probability: dto.probability ?? lead.probability ?? stage.probability,
          expectedCloseDate: dto.expectedCloseDate
            ? new Date(dto.expectedCloseDate)
            : lead.expectedCloseDate,
          status: 'open',
        },
        include: {
          contact: { select: { id: true, firstName: true, lastName: true } },
          company: { select: { id: true, name: true } },
          stage: { select: { id: true, name: true, color: true } },
          owner: { select: { id: true, firstName: true, lastName: true } },
          pipeline: { select: { id: true, name: true } },
        },
      });

      await tx.lead.update({
        where: { id: lead.id },
        data: {
          status: 'converted',
          convertedAt: new Date(),
          convertedDealId: created.id,
          lastActivityAt: new Date(),
        },
      });

      await tx.activity.createMany({
        data: [
          {
            tenantId,
            type: 'record_created',
            title: `Deal created from lead: ${lead.title}`,
            performedById: userId,
            relatedType: 'deal',
            relatedDealId: created.id,
            metadata: { leadId: lead.id },
          },
          {
            tenantId,
            type: 'status_changed',
            title: `Lead converted to deal: ${created.name}`,
            performedById: userId,
            relatedType: 'lead',
            relatedLeadId: lead.id,
            metadata: { dealId: created.id },
          },
        ],
      });

      return created;
    });

    // Conversion is both a new deal and a lead status change — automation
    // rules watching either side should see it.
    this.workflows.dispatch({
      tenantId,
      actorId: userId,
      entity: 'deal',
      action: 'created',
      record: deal,
    });
    this.workflows.dispatch({
      tenantId,
      actorId: userId,
      entity: 'lead',
      action: 'updated',
      record: { ...lead, status: 'converted', convertedDealId: deal.id },
      previous: lead,
    });

    return deal;
  }

  /** Picks the deal pipeline + stage to drop a converted lead into. */
  private async resolveDealStage(tenantId: string, dto: ConvertLeadDto) {
    const pipeline = dto.pipelineId
      ? await this.prisma.pipeline.findFirst({
          where: { id: dto.pipelineId, tenantId, entityType: 'deal' },
          include: { stages: { orderBy: { displayOrder: 'asc' } } },
        })
      : ((await this.pipelines.findDefault(tenantId, 'deal')) as any);

    if (!pipeline) throw new BadRequestException('Deal pipeline not found');

    const stages = pipeline.stages ?? [];
    const stage = dto.stageId ? stages.find((s: any) => s.id === dto.stageId) : stages[0];

    if (!stage) {
      throw new BadRequestException(
        dto.stageId
          ? 'Stage does not belong to the selected deal pipeline'
          : 'The deal pipeline has no stages',
      );
    }

    return { pipelineId: pipeline.id as string, stage };
  }

  async remove(
    id: string,
    tenantId: string,
    userId: string,
    scope: Record<string, unknown> = {},
  ) {
    const existing = await this.prisma.lead.findFirst({ where: { id, tenantId, ...scope } });
    if (!existing) throw new NotFoundException(`Lead not found`);
    await this.prisma.lead.delete({ where: { id } });

    this.workflows.dispatch({
      tenantId,
      actorId: userId,
      entity: 'lead',
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
    await this.prisma.lead.updateMany({
      where: { id: { in: ids }, tenantId },
      data: data as any,
    });
    return { updated: ids.length };
  }

  async bulkDelete(ids: string[], tenantId: string) {
    await this.prisma.lead.deleteMany({
      where: { id: { in: ids }, tenantId },
    });
    return { deleted: ids.length };
  }
}
