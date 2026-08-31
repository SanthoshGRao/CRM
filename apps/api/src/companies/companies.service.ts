import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { WorkflowEngineService } from '../workflows/workflow-engine.service';
import { applyFilters, FilterFieldMap } from '../common/filters/apply-filters.util';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';

/** Fields the advanced filter builder (and saved views) may query on. */
export const COMPANY_FILTER_FIELDS: FilterFieldMap = {
  name: 'string',
  industry: 'string',
  website: 'string',
  email: 'string',
  phone: 'string',
  city: 'string',
  state: 'string',
  country: 'string',
  employees: 'number',
  annualRevenue: 'number',
  status: 'select',
  ownerId: 'select',
  createdAt: 'date',
};

const COMPANY_INCLUDE = {
  owner: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
} as const;

@Injectable()
export class CompaniesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly workflows: WorkflowEngineService,
  ) {}

  async findAll(
    tenantId: string,
    query: {
      page?: number;
      limit?: number;
      search?: string;
      ownerId?: string;
      status?: string;
      isCustomer?: string | boolean;
      filters?: string;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
    },
    scope: Record<string, unknown> = {},
  ) {
    const {
      search,
      ownerId,
      status,
      isCustomer,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 25;

    // `scope` narrows to the caller's own records when their role is OWN-scoped.
    const where: any = { tenantId, ...scope };

    if (search) {
      where.name = { contains: search, mode: 'insensitive' };
    }
    // A company is a real customer once it has at least one deal it accepted (status: won).
    if (isCustomer === 'true' || isCustomer === true) {
      where.deals = { some: { status: 'won' } };
    }
    if (ownerId) where.ownerId = ownerId;
    if (status) where.status = status;
    // Advanced conditions (from the filter builder or a saved view) layer on
    // top of, and can override, the quick filters above.
    applyFilters(where, query.filters, COMPANY_FILTER_FIELDS);

    const include =
      isCustomer === 'true' || isCustomer === true
        ? { ...COMPANY_INCLUDE, deals: { where: { status: 'won' as const }, select: { id: true, name: true, value: true } } }
        : COMPANY_INCLUDE;

    const [data, total] = await Promise.all([
      this.prisma.company.findMany({
        where,
        include,
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.company.count({ where }),
    ]);

    return {
      data,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string, tenantId: string, scope: Record<string, unknown> = {}) {
    const company = await this.prisma.company.findFirst({
      where: { id, tenantId, ...scope },
      include: {
        ...COMPANY_INCLUDE,
        contacts: { select: { id: true, firstName: true, lastName: true, email: true }, take: 20, orderBy: { createdAt: 'desc' } },
        leads: { select: { id: true, title: true, status: true }, take: 20, orderBy: { createdAt: 'desc' } },
        deals: { select: { id: true, name: true, status: true, value: true }, take: 20, orderBy: { createdAt: 'desc' } },
        activities: {
          orderBy: { createdAt: 'desc' },
          take: 50,
          include: { performedBy: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } } },
        },
        customFieldValues: { include: { field: { include: { options: true } } } },
      },
    });

    if (!company) throw new NotFoundException('Company not found');
    return company;
  }

  async create(dto: CreateCompanyDto, tenantId: string, userId: string) {
    const company = await this.prisma.company.create({
      data: { ...dto, tenantId },
      include: COMPANY_INCLUDE,
    });

    await this.prisma.activity.create({
      data: {
        tenantId,
        type: 'record_created',
        title: `Company created: ${company.name}`,
        performedById: userId,
        relatedType: 'company',
        relatedCompanyId: company.id,
      },
    });

    this.workflows.dispatch({
      tenantId,
      actorId: userId,
      entity: 'company',
      action: 'created',
      record: company,
    });

    return company;
  }

  async update(
    id: string,
    dto: UpdateCompanyDto,
    tenantId: string,
    userId: string,
    scope: Record<string, unknown> = {},
  ) {
    const existing = await this.prisma.company.findFirst({ where: { id, tenantId, ...scope } });
    if (!existing) throw new NotFoundException('Company not found');

    const company = await this.prisma.company.update({
      where: { id },
      data: { ...dto } as any,
      include: COMPANY_INCLUDE,
    });

    await this.prisma.activity.create({
      data: {
        tenantId,
        type: 'record_updated',
        title: `Company updated: ${company.name}`,
        performedById: userId,
        relatedType: 'company',
        relatedCompanyId: company.id,
      },
    });

    this.workflows.dispatch({
      tenantId,
      actorId: userId,
      entity: 'company',
      action: 'updated',
      record: company,
      previous: existing,
    });

    return company;
  }

  async remove(
    id: string,
    tenantId: string,
    userId: string,
    scope: Record<string, unknown> = {},
  ) {
    const existing = await this.prisma.company.findFirst({ where: { id, tenantId, ...scope } });
    if (!existing) throw new NotFoundException('Company not found');
    await this.prisma.company.delete({ where: { id } });

    this.workflows.dispatch({
      tenantId,
      actorId: userId,
      entity: 'company',
      action: 'deleted',
      record: existing,
    });

    return { id };
  }

  async bulkUpdate(ids: string[], data: { ownerId?: string; status?: string }, tenantId: string) {
    await this.prisma.company.updateMany({ where: { id: { in: ids }, tenantId }, data: data as any });
    return { updated: ids.length };
  }

  async bulkDelete(ids: string[], tenantId: string) {
    await this.prisma.company.deleteMany({ where: { id: { in: ids }, tenantId } });
    return { deleted: ids.length };
  }
}
