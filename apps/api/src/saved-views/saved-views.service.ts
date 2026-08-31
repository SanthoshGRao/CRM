import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateSavedViewDto, UpdateSavedViewDto } from './dto/saved-view.dto';

/** Maps a saved view's (singular) entityType to the (plural) permission resource that gates it. */
const RESOURCE_BY_ENTITY: Record<string, string> = {
  contact: 'contacts',
  company: 'companies',
  lead: 'leads',
  deal: 'deals',
  task: 'tasks',
};

/**
 * Personal and shared list layouts: a saved set of filters, visible columns
 * and sort order for one entity's list page. Anyone who can view an entity
 * can save their own private views of it and read the workspace's public
 * ones; only the creator can rename or delete a view, public or not.
 */
@Injectable()
export class SavedViewsService {
  constructor(private readonly prisma: PrismaService) {}

  private assertCanView(entityType: string, permissions: string[]) {
    const resource = RESOURCE_BY_ENTITY[entityType];
    if (!resource || !permissions.includes(`${resource}.view`)) {
      throw new ForbiddenException(`Missing required permission: ${resource ?? entityType}.view`);
    }
  }

  /** A user's own views for this entity, plus every public one, own-first. */
  async findAll(tenantId: string, userId: string, entityType: string, permissions: string[]) {
    this.assertCanView(entityType, permissions);

    const views = await this.prisma.savedView.findMany({
      where: {
        tenantId,
        entityType: entityType as any,
        OR: [{ createdById: userId }, { isPublic: true }],
      },
      orderBy: [{ createdById: 'desc' }, { name: 'asc' }],
    });

    return views
      .map((v) => ({ ...v, isMine: v.createdById === userId }))
      .sort((a, b) => Number(b.isMine) - Number(a.isMine) || a.name.localeCompare(b.name));
  }

  async create(dto: CreateSavedViewDto, tenantId: string, userId: string, permissions: string[]) {
    this.assertCanView(dto.entityType, permissions);

    return this.prisma.savedView.create({
      data: {
        tenantId,
        createdById: userId,
        entityType: dto.entityType as any,
        name: dto.name,
        filters: (dto.filters ?? []) as any,
        columns: (dto.columns ?? []) as any,
        sortBy: dto.sortBy,
        sortOrder: dto.sortOrder,
        isPublic: dto.isPublic ?? false,
      },
    });
  }

  private async findOwned(id: string, tenantId: string, userId: string) {
    const view = await this.prisma.savedView.findFirst({ where: { id, tenantId } });
    if (!view) throw new NotFoundException('Saved view not found');
    if (view.createdById !== userId) throw new ForbiddenException('Only the creator can modify this view');
    return view;
  }

  async update(id: string, dto: UpdateSavedViewDto, tenantId: string, userId: string) {
    await this.findOwned(id, tenantId, userId);

    return this.prisma.savedView.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.filters !== undefined && { filters: dto.filters as any }),
        ...(dto.columns !== undefined && { columns: dto.columns as any }),
        ...(dto.sortBy !== undefined && { sortBy: dto.sortBy }),
        ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
        ...(dto.isPublic !== undefined && { isPublic: dto.isPublic }),
      },
    });
  }

  async remove(id: string, tenantId: string, userId: string) {
    await this.findOwned(id, tenantId, userId);
    await this.prisma.savedView.delete({ where: { id } });
    return { id };
  }
}
