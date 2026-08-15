import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateActivityDto } from './dto/create-activity.dto';

const ACTIVITY_INCLUDE = {
  performedBy: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
  relatedContact: { select: { id: true, firstName: true, lastName: true } },
  relatedCompany: { select: { id: true, name: true } },
  relatedLead: { select: { id: true, title: true } },
  relatedDeal: { select: { id: true, name: true } },
} as const;

@Injectable()
export class ActivitiesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    tenantId: string,
    query: {
      page?: number;
      limit?: number;
      search?: string;
      type?: string;
      relatedType?: string;
      relatedContactId?: string;
      relatedCompanyId?: string;
      relatedLeadId?: string;
      relatedDealId?: string;
      performedById?: string;
    },
  ) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 25;

    const where: any = { tenantId };

    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    if (query.type) where.type = { in: query.type.split(',') };
    if (query.relatedType) where.relatedType = query.relatedType;
    if (query.relatedContactId) where.relatedContactId = query.relatedContactId;
    if (query.relatedCompanyId) where.relatedCompanyId = query.relatedCompanyId;
    if (query.relatedLeadId) where.relatedLeadId = query.relatedLeadId;
    if (query.relatedDealId) where.relatedDealId = query.relatedDealId;
    if (query.performedById) where.performedById = query.performedById;

    const [data, total] = await Promise.all([
      this.prisma.activity.findMany({
        where,
        include: ACTIVITY_INCLUDE as any,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.activity.count({ where }),
    ]);

    return {
      data,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async create(dto: CreateActivityDto, tenantId: string, userId: string) {
    return this.prisma.activity.create({
      data: { ...dto, tenantId, performedById: userId } as any,
      include: ACTIVITY_INCLUDE as any,
    });
  }

  /** Counts grouped by activity type, for the communications summary. */
  async statsByType(tenantId: string) {
    const grouped = await this.prisma.activity.groupBy({
      by: ['type'],
      where: { tenantId },
      _count: { id: true },
    });

    return grouped.map((g) => ({ type: g.type, count: g._count.id }));
  }
}
