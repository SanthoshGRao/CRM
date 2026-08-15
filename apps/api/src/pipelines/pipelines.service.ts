import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

type EntityType = 'lead' | 'deal';

const DEFAULT_STAGES: Record<EntityType, Array<{ name: string; color: string; probability: number; displayOrder: number; isWon?: boolean; isLost?: boolean }>> = {
  lead: [
    { name: 'New', color: '#94a3b8', probability: 10, displayOrder: 1 },
    { name: 'Contacted', color: '#60a5fa', probability: 20, displayOrder: 2 },
    { name: 'Qualified', color: '#a78bfa', probability: 40, displayOrder: 3 },
    { name: 'Proposal', color: '#f59e0b', probability: 60, displayOrder: 4 },
    { name: 'Negotiation', color: '#fb923c', probability: 80, displayOrder: 5 },
    { name: 'Won', color: '#22c55e', probability: 100, displayOrder: 6, isWon: true },
    { name: 'Lost', color: '#ef4444', probability: 0, displayOrder: 7, isLost: true },
  ],
  deal: [
    { name: 'Discovery', color: '#94a3b8', probability: 10, displayOrder: 1 },
    { name: 'Proposal Sent', color: '#60a5fa', probability: 30, displayOrder: 2 },
    { name: 'Negotiation', color: '#f59e0b', probability: 60, displayOrder: 3 },
    { name: 'Contract Sent', color: '#a78bfa', probability: 85, displayOrder: 4 },
    { name: 'Won', color: '#22c55e', probability: 100, displayOrder: 5, isWon: true },
    { name: 'Lost', color: '#ef4444', probability: 0, displayOrder: 6, isLost: true },
  ],
};

const PIPELINE_INCLUDE = {
  stages: { orderBy: { displayOrder: 'asc' } },
} as const;

@Injectable()
export class PipelinesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId: string, entityType?: EntityType) {
    const where: any = { tenantId };
    if (entityType) where.entityType = entityType;

    let pipelines = await this.prisma.pipeline.findMany({
      where,
      include: PIPELINE_INCLUDE as any,
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
    });

    // A tenant always needs at least one pipeline per entity type, otherwise
    // leads/deals can never be created (pipelineId + stageId are required).
    const missing = (entityType ? [entityType] : (['lead', 'deal'] as EntityType[])).filter(
      (type) => !pipelines.some((p) => p.entityType === type),
    );

    if (missing.length > 0) {
      await Promise.all(missing.map((type) => this.createDefault(tenantId, type)));
      pipelines = await this.prisma.pipeline.findMany({
        where,
        include: PIPELINE_INCLUDE as any,
        orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
      });
    }

    return pipelines;
  }

  async findOne(id: string, tenantId: string) {
    const pipeline = await this.prisma.pipeline.findFirst({
      where: { id, tenantId },
      include: PIPELINE_INCLUDE as any,
    });

    if (!pipeline) throw new NotFoundException('Pipeline not found');
    return pipeline;
  }

  /** Default pipeline for an entity type, creating one if the tenant has none. */
  async findDefault(tenantId: string, entityType: EntityType) {
    const existing = await this.prisma.pipeline.findFirst({
      where: { tenantId, entityType },
      include: PIPELINE_INCLUDE as any,
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
    });

    return existing ?? (await this.createDefault(tenantId, entityType));
  }

  private async createDefault(tenantId: string, entityType: EntityType) {
    return this.prisma.pipeline.create({
      data: {
        tenantId,
        name: entityType === 'lead' ? 'Sales Pipeline' : 'Deal Pipeline',
        entityType,
        isDefault: true,
        stages: { createMany: { data: DEFAULT_STAGES[entityType] } },
      },
      include: PIPELINE_INCLUDE as any,
    });
  }
}
