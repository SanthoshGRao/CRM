import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import * as argon2 from 'argon2';
import { PrismaService } from '../common/prisma/prisma.service';
import { DEFAULT_ROLE_NAME, sortRolesByRank } from '../common/rbac/role-definitions';
import { getMaxUsers } from '../common/billing/plan-limits.util';
import { CreateUserDto } from './dto/create-user.dto';

const USER_SELECT = {
  id: true, email: true, firstName: true, lastName: true,
  avatarUrl: true, phone: true, status: true, isEmailVerified: true,
  lastLoginAt: true, createdAt: true,
  userRoles: { include: { role: { select: { id: true, name: true } } } },
} as const;

/**
 * Fields exposed to API-key callers (the data API's `read:users` scope).
 * Deliberately excludes passwordHash, tokens, and timing/verification fields
 * like lastLoginAt/isEmailVerified that a customer integration has no need for.
 */
const API_KEY_USER_SELECT = {
  id: true, email: true, firstName: true, lastName: true,
  avatarUrl: true, status: true,
  userRoles: { select: { role: { select: { name: true } } } },
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
   * Read-only listing for API-key callers (data API `read:users` scope).
   * Never returns password hashes, tokens, or login/verification timestamps.
   */
  async listForApiKey(tenantId: string, query: { page?: any; limit?: any }) {
    const page = Number(query.page) || 1;

    let limit = 50;
    if (query.limit !== undefined && query.limit !== '') {
      limit = Number(query.limit);
      if (!Number.isInteger(limit) || limit < 1 || limit > 200) {
        throw new BadRequestException('limit must be an integer between 1 and 200.');
      }
    }

    const where = { tenantId };
    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: API_KEY_USER_SELECT as any,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data: data.map(this.shapeApiKeyUser),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOneForApiKey(id: string, tenantId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, tenantId },
      select: API_KEY_USER_SELECT as any,
    });
    if (!user) throw new NotFoundException(`No user with id ${id}.`);
    return this.shapeApiKeyUser(user);
  }

  private shapeApiKeyUser(user: any) {
    const { userRoles, ...rest } = user;
    return { ...rest, roles: (userRoles ?? []).map((ur: any) => ({ name: ur.role.name })) };
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

    const subscription = await this.prisma.subscription.findUnique({
      where: { tenantId },
      include: { plan: { select: { features: true } } },
    });
    // maxUsers is the plan tier's ceiling; seats is how many of that ceiling
    // the tenant has actually paid for. A plan with no ceiling (e.g. Free)
    // skips the check entirely — there's nothing to buy more of.
    const maxUsers = getMaxUsers(subscription?.plan.features);
    if (maxUsers !== null) {
      const seatLimit = Math.min(subscription?.seats ?? 1, maxUsers);
      const seatsUsed = await this.prisma.user.count({ where: { tenantId } });
      if (seatsUsed >= seatLimit) {
        throw new BadRequestException(
          `This workspace has ${seatLimit} seat${seatLimit === 1 ? '' : 's'} paid for. Buy more seats in Settings → Billing to add another member.`,
        );
      }
    }

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
