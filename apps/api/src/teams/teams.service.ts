import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateTeamDto, UpdateTeamDto } from './dto/team.dto';

/** Fields safe to expose for a group member, whether the caller is a session user or an API key. */
const MEMBER_SELECT = {
  id: true, firstName: true, lastName: true, email: true, avatarUrl: true, status: true,
  userRoles: { select: { role: { select: { name: true } } } },
} as const;

const TEAM_SELECT = {
  id: true, name: true, description: true, managerId: true, createdAt: true, updatedAt: true,
  _count: { select: { members: true } },
} as const;

/**
 * Groups ("Sales Team", "Support Team", …) that an Owner can organize their
 * workspace's users into. `managerId` is a plain field, not a relation — the
 * schema keeps Team decoupled from a hard foreign key on User so a manager
 * can be unset or reassigned freely. Every method takes tenantId explicitly
 * so it works identically from a user session and from an API key.
 */
@Injectable()
export class TeamsService {
  constructor(private readonly prisma: PrismaService) {}

  private shapeMember(member: { user: any }) {
    const { userRoles, ...rest } = member.user;
    return { ...rest, roles: (userRoles ?? []).map((ur: any) => ur.role.name) };
  }

  /** Batches a single lookup for the distinct managerIds on a page of teams. */
  private async attachManagers<T extends { managerId: string | null }>(teams: T[]) {
    const managerIds = [...new Set(teams.map((t) => t.managerId).filter((id): id is string => Boolean(id)))];
    if (managerIds.length === 0) return teams.map((t) => ({ ...t, manager: null }));

    const managers = await this.prisma.user.findMany({
      where: { id: { in: managerIds } },
      select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true },
    });
    const byId = new Map(managers.map((m) => [m.id, m]));

    return teams.map((t) => ({ ...t, manager: t.managerId ? (byId.get(t.managerId) ?? null) : null }));
  }

  async findAll(tenantId: string) {
    const teams = await this.prisma.team.findMany({
      where: { tenantId },
      select: TEAM_SELECT,
      orderBy: { name: 'asc' },
    });
    return this.attachManagers(teams);
  }

  async findOne(id: string, tenantId: string) {
    const team = await this.prisma.team.findFirst({
      where: { id, tenantId },
      select: {
        ...TEAM_SELECT,
        members: { select: { user: { select: MEMBER_SELECT } }, orderBy: { createdAt: 'asc' } },
      },
    });
    if (!team) throw new NotFoundException('Group not found');

    const [withManager] = await this.attachManagers([team]);
    const { members, ...rest } = withManager as typeof team & { manager: any };
    return { ...rest, members: members.map((m) => this.shapeMember(m)) };
  }

  private async assertUserInTenant(userId: string, tenantId: string) {
    const user = await this.prisma.user.findFirst({ where: { id: userId, tenantId }, select: { id: true } });
    if (!user) throw new BadRequestException('That user does not belong to this workspace.');
  }

  async create(dto: CreateTeamDto, tenantId: string) {
    if (dto.managerId) await this.assertUserInTenant(dto.managerId, tenantId);

    const existing = await this.prisma.team.findFirst({ where: { tenantId, name: dto.name } });
    if (existing) throw new ConflictException('A group with that name already exists in this workspace.');

    const team = await this.prisma.team.create({
      data: { tenantId, name: dto.name, description: dto.description, managerId: dto.managerId },
      select: TEAM_SELECT,
    });
    const [withManager] = await this.attachManagers([team]);
    return withManager;
  }

  async update(id: string, tenantId: string, dto: UpdateTeamDto) {
    const team = await this.prisma.team.findFirst({ where: { id, tenantId } });
    if (!team) throw new NotFoundException('Group not found');

    if (dto.managerId) await this.assertUserInTenant(dto.managerId, tenantId);

    if (dto.name && dto.name !== team.name) {
      const clash = await this.prisma.team.findFirst({ where: { tenantId, name: dto.name, NOT: { id } } });
      if (clash) throw new ConflictException('A group with that name already exists in this workspace.');
    }

    const updated = await this.prisma.team.update({
      where: { id },
      data: { name: dto.name, description: dto.description, managerId: dto.managerId },
      select: TEAM_SELECT,
    });
    const [withManager] = await this.attachManagers([updated]);
    return withManager;
  }

  async remove(id: string, tenantId: string) {
    const team = await this.prisma.team.findFirst({ where: { id, tenantId } });
    if (!team) throw new NotFoundException('Group not found');

    // TeamMember rows cascade with the team (onDelete: Cascade in the schema).
    await this.prisma.team.delete({ where: { id } });
    return { id };
  }

  async addMember(teamId: string, tenantId: string, userId: string) {
    const team = await this.prisma.team.findFirst({ where: { id: teamId, tenantId } });
    if (!team) throw new NotFoundException('Group not found');
    await this.assertUserInTenant(userId, tenantId);

    const existing = await this.prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId, userId } },
    });
    if (existing) throw new ConflictException('That user is already a member of this group.');

    await this.prisma.teamMember.create({ data: { teamId, userId } });
    return this.findOne(teamId, tenantId);
  }

  async removeMember(teamId: string, tenantId: string, userId: string) {
    const team = await this.prisma.team.findFirst({ where: { id: teamId, tenantId } });
    if (!team) throw new NotFoundException('Group not found');

    const membership = await this.prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId, userId } },
    });
    if (!membership) throw new NotFoundException('That user is not a member of this group.');

    await this.prisma.teamMember.delete({ where: { id: membership.id } });
    return this.findOne(teamId, tenantId);
  }

  /** Moves a member from one group straight into another, in a single transaction. */
  async moveMember(fromTeamId: string, tenantId: string, userId: string, toTeamId: string) {
    if (fromTeamId === toTeamId) {
      throw new BadRequestException('The member is already in that group.');
    }

    const [fromTeam, toTeam] = await Promise.all([
      this.prisma.team.findFirst({ where: { id: fromTeamId, tenantId } }),
      this.prisma.team.findFirst({ where: { id: toTeamId, tenantId } }),
    ]);
    if (!fromTeam) throw new NotFoundException('Group not found');
    if (!toTeam) throw new BadRequestException('Destination group does not belong to this workspace.');

    const membership = await this.prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId: fromTeamId, userId } },
    });
    if (!membership) throw new NotFoundException('That user is not a member of this group.');

    const alreadyInTarget = await this.prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId: toTeamId, userId } },
    });

    await this.prisma.$transaction([
      this.prisma.teamMember.delete({ where: { id: membership.id } }),
      ...(alreadyInTarget ? [] : [this.prisma.teamMember.create({ data: { teamId: toTeamId, userId } })]),
    ]);

    return this.findOne(toTeamId, tenantId);
  }
}
