import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getKpis(tenantId: string, scope: Record<string, unknown> = {}) {
    // `scope` is keyed on ownerId; tasks and activities use different columns.
    const ownerId = (scope as any).ownerId;
    const taskScope = ownerId ? { assignedToId: ownerId } : {};
    const activityScope = ownerId ? { performedById: ownerId } : {};

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfThisWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());

    const [
      totalLeads,
      newLeads,
      qualifiedLeads,
      openDeals,
      wonDeals,
      totalRevenue,
      tasksDueToday,
      activitiesThisWeek,
    ] = await Promise.all([
      this.prisma.lead.count({ where: { tenantId, ...scope } }),
      this.prisma.lead.count({
        where: { tenantId, ...scope, createdAt: { gte: startOfThisMonth } },
      }),
      this.prisma.lead.count({ where: { tenantId, ...scope, status: 'qualified' } }),
      this.prisma.deal.count({ where: { tenantId, ...scope, status: 'open' } }),
      this.prisma.deal.count({
        where: { tenantId, ...scope, status: 'won', closedAt: { gte: startOfThisMonth } },
      }),
      this.prisma.deal.aggregate({
        where: { tenantId, ...scope, status: 'won' },
        _sum: { value: true },
      }),
      this.prisma.task.count({
        where: {
          tenantId,
          ...taskScope,
          status: { in: ['pending', 'in_progress'] },
          dueDate: {
            gte: startOfToday,
            lt: new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000),
          },
        },
      }),
      this.prisma.activity.count({
        where: { tenantId, ...activityScope, createdAt: { gte: startOfThisWeek } },
      }),
    ]);

    const totalLeadsForConversion = await this.prisma.lead.count({ where: { tenantId, ...scope } });
    const convertedLeads = await this.prisma.lead.count({
      where: { tenantId, ...scope, status: 'converted' },
    });
    const conversionRate =
      totalLeadsForConversion > 0
        ? Math.round((convertedLeads / totalLeadsForConversion) * 100)
        : 0;

    return {
      totalLeads,
      newLeads,
      qualifiedLeads,
      openDeals,
      wonDeals,
      totalRevenue: Number(totalRevenue._sum.value ?? 0),
      conversionRate,
      tasksDueToday,
      activitiesThisWeek,
    };
  }

  async getPipelineData(tenantId: string, scope: Record<string, unknown> = {}) {
    const pipelines = await this.prisma.pipeline.findMany({
      where: { tenantId },
      include: {
        stages: {
          orderBy: { displayOrder: 'asc' },
          include: {
            _count: {
              select: {
                leads: { where: { tenantId, ...scope } },
                deals: { where: { tenantId, ...scope } },
              },
            },
          },
        },
      },
    });

    return pipelines.map((pipeline) => ({
      id: pipeline.id,
      name: pipeline.name,
      entityType: pipeline.entityType,
      stages: pipeline.stages.map((stage) => ({
        id: stage.id,
        name: stage.name,
        color: stage.color,
        probability: stage.probability,
        count: pipeline.entityType === 'lead' ? stage._count.leads : stage._count.deals,
      })),
    }));
  }

  async getRecentActivities(tenantId: string, limit = 20, scope: Record<string, unknown> = {}) {
    const ownerId = (scope as any).ownerId;

    return this.prisma.activity.findMany({
      where: { tenantId, ...(ownerId ? { performedById: ownerId } : {}) },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        performedBy: {
          select: { id: true, firstName: true, lastName: true, avatarUrl: true },
        },
      },
    });
  }

  async getLeadSourceBreakdown(tenantId: string, scope: Record<string, unknown> = {}) {
    const result = await this.prisma.lead.groupBy({
      by: ['source'],
      where: { tenantId, ...scope },
      _count: { id: true },
    });

    return result.map((r) => ({
      source: r.source ?? 'unknown',
      count: r._count.id,
    }));
  }
}
