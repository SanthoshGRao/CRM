import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { WorkflowEngineService } from '../workflows/workflow-engine.service';
import { CreateContactDto } from './dto/create-contact.dto';
import { UpdateContactDto } from './dto/update-contact.dto';

const CONTACT_INCLUDE = {
  company: { select: { id: true, name: true } },
  owner: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
} as const;

@Injectable()
export class ContactsService {
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
      companyId?: string;
      ownerId?: string;
      status?: string;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
    },
    scope: Record<string, unknown> = {},
  ) {
    const {
      search,
      companyId,
      ownerId,
      status,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 25;

    // `scope` narrows to the caller's own records when their role is OWN-scoped.
    const where: any = { tenantId, ...scope };

    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (companyId) where.companyId = companyId;
    if (ownerId) where.ownerId = ownerId;
    if (status) where.status = status;

    const [data, total] = await Promise.all([
      this.prisma.contact.findMany({
        where,
        include: CONTACT_INCLUDE,
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.contact.count({ where }),
    ]);

    return {
      data,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string, tenantId: string, scope: Record<string, unknown> = {}) {
    const contact = await this.prisma.contact.findFirst({
      where: { id, tenantId, ...scope },
      include: {
        ...CONTACT_INCLUDE,
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

    if (!contact) throw new NotFoundException('Contact not found');
    return contact;
  }

  async create(dto: CreateContactDto, tenantId: string, userId: string) {
    const contact = await this.prisma.contact.create({
      data: { ...dto, tenantId },
      include: CONTACT_INCLUDE,
    });

    await this.prisma.activity.create({
      data: {
        tenantId,
        type: 'record_created',
        title: `Contact created: ${contact.firstName} ${contact.lastName}`,
        performedById: userId,
        relatedType: 'contact',
        relatedContactId: contact.id,
      },
    });

    this.workflows.dispatch({
      tenantId,
      actorId: userId,
      entity: 'contact',
      action: 'created',
      record: contact,
    });

    return contact;
  }

  async update(
    id: string,
    dto: UpdateContactDto,
    tenantId: string,
    userId: string,
    scope: Record<string, unknown> = {},
  ) {
    const existing = await this.prisma.contact.findFirst({ where: { id, tenantId, ...scope } });
    if (!existing) throw new NotFoundException('Contact not found');

    const contact = await this.prisma.contact.update({
      where: { id },
      data: { ...dto, lastActivityAt: new Date() } as any,
      include: CONTACT_INCLUDE,
    });

    await this.prisma.activity.create({
      data: {
        tenantId,
        type: 'record_updated',
        title: `Contact updated: ${contact.firstName} ${contact.lastName}`,
        performedById: userId,
        relatedType: 'contact',
        relatedContactId: contact.id,
      },
    });

    this.workflows.dispatch({
      tenantId,
      actorId: userId,
      entity: 'contact',
      action: 'updated',
      record: contact,
      previous: existing,
    });

    return contact;
  }

  async remove(
    id: string,
    tenantId: string,
    userId: string,
    scope: Record<string, unknown> = {},
  ) {
    const existing = await this.prisma.contact.findFirst({ where: { id, tenantId, ...scope } });
    if (!existing) throw new NotFoundException('Contact not found');
    await this.prisma.contact.delete({ where: { id } });

    this.workflows.dispatch({
      tenantId,
      actorId: userId,
      entity: 'contact',
      action: 'deleted',
      record: existing,
    });

    return { id };
  }

  async bulkUpdate(ids: string[], data: { ownerId?: string; status?: string }, tenantId: string) {
    await this.prisma.contact.updateMany({ where: { id: { in: ids }, tenantId }, data: data as any });
    return { updated: ids.length };
  }

  async bulkDelete(ids: string[], tenantId: string) {
    await this.prisma.contact.deleteMany({ where: { id: { in: ids }, tenantId } });
    return { deleted: ids.length };
  }
}
