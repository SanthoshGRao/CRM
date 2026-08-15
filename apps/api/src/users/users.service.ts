import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import * as argon2 from 'argon2';
import { PrismaService } from '../common/prisma/prisma.service';
import { DEFAULT_ROLE_NAME, sortRolesByRank } from '../common/rbac/role-definitions';
import { CreateUserDto } from './dto/create-user.dto';

const USER_SELECT = {
  id: true, email: true, firstName: true, lastName: true,
  avatarUrl: true, phone: true, status: true, isEmailVerified: true,
  lastLoginAt: true, createdAt: true,
  userRoles: { include: { role: { select: { id: true, name: true } } } },
} as const;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId: string, query: any) {
    // Query params arrive as strings; Prisma's skip/take require real numbers.
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 25;
    const where = { tenantId };
    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: USER_SELECT as any,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ]);
    return { data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async findOne(id: string, tenantId: string) {
    return this.prisma.user.findFirst({
      where: { id, tenantId },
      select: {
        id: true, email: true, firstName: true, lastName: true,
        avatarUrl: true, phone: true, status: true, isEmailVerified: true,
        lastLoginAt: true, createdAt: true, updatedAt: true,
        userRoles: { include: { role: true } },
      },
    });
  }

  /**
   * Roles available in this workspace, for the "add member" form. Ordered
   * Owner → Viewer and flagged with the one used when no role is chosen, so the
   * form never has to hardcode role names.
   */
  async roles(tenantId: string) {
    const roles = await this.prisma.role.findMany({
      where: { tenantId },
      select: { id: true, name: true, description: true, dataScope: true },
    });

    return sortRolesByRank(roles).map((role) => ({
      ...role,
      isDefault: role.name === DEFAULT_ROLE_NAME,
    }));
  }

  async create(dto: CreateUserDto, tenantId: string, invitedById?: string) {
    const email = dto.email.toLowerCase();

    const existing = await this.prisma.user.findFirst({ where: { tenantId, email } });
    if (existing) throw new ConflictException('Someone with that email is already in this workspace.');

    let roleId = dto.roleId;
    if (roleId) {
      const role = await this.prisma.role.findFirst({ where: { id: roleId, tenantId } });
      if (!role) throw new BadRequestException('That role does not belong to this workspace.');
    } else {
      const fallback =
        (await this.prisma.role.findFirst({ where: { tenantId, name: DEFAULT_ROLE_NAME } })) ??
        (await this.prisma.role.findFirst({ where: { tenantId }, orderBy: { createdAt: 'desc' } }));
      if (!fallback) throw new BadRequestException('This workspace has no roles configured.');
      roleId = fallback.id;
    }

    const passwordHash = await argon2.hash(dto.password, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 4,
    });

    return this.prisma.user.create({
      data: {
        tenantId,
        email,
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
        status: 'active',
        isEmailVerified: true,
        invitedById,
        userRoles: { create: { roleId } },
      },
      select: USER_SELECT as any,
    });
  }

  /**
   * Roles are deliberately not editable: a member's role is chosen once, when
   * they are created. Changing access later means removing and re-adding them.
   */
  async update(id: string, tenantId: string, data: { status?: string; phone?: string }) {
    const user = await this.prisma.user.findFirst({ where: { id, tenantId } });
    if (!user) throw new NotFoundException('User not found');

    return this.prisma.user.update({
      where: { id },
      data: { status: data.status as any, phone: data.phone },
      select: USER_SELECT as any,
    });
  }

  async remove(id: string, tenantId: string, requestingUserId: string) {
    const user = await this.prisma.user.findFirst({ where: { id, tenantId } });
    if (!user) throw new NotFoundException('User not found');

    if (id === requestingUserId) {
      throw new BadRequestException('You cannot remove your own account.');
    }

    const remaining = await this.prisma.user.count({ where: { tenantId } });
    if (remaining <= 1) throw new BadRequestException('A workspace must keep at least one user.');

    await this.prisma.user.delete({ where: { id } });
    return { id };
  }
}
