import { Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes, createHash } from 'crypto';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateApiKeyDto } from './dto/api-key.dto';

const KEY_PREFIX = 'crm_live_';

/** Keys are stored as SHA-256 hashes; the raw value is returned exactly once. */
export function hashApiKey(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}

@Injectable()
export class ApiKeysService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId: string) {
    return this.prisma.apiKey.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, name: true, keyPrefix: true, scopes: true, lastUsedAt: true,
        requestCount: true, expiresAt: true, revokedAt: true, createdAt: true,
        createdBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  async create(dto: CreateApiKeyDto, tenantId: string, userId: string) {
    const raw = `${KEY_PREFIX}${randomBytes(24).toString('hex')}`;

    const apiKey = await this.prisma.apiKey.create({
      data: {
        tenantId,
        name: dto.name,
        keyPrefix: raw.slice(0, KEY_PREFIX.length + 6),
        keyHash: hashApiKey(raw),
        scopes: dto.scopes?.length ? dto.scopes : ['read'],
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
        createdById: userId,
      },
      select: {
        id: true, name: true, keyPrefix: true, scopes: true,
        expiresAt: true, createdAt: true,
      },
    });

    // The only time the caller ever sees the full key.
    return { ...apiKey, key: raw };
  }

  async revoke(id: string, tenantId: string) {
    const existing = await this.prisma.apiKey.findFirst({ where: { id, tenantId } });
    if (!existing) throw new NotFoundException('API key not found');

    return this.prisma.apiKey.update({
      where: { id },
      data: { revokedAt: new Date() },
      select: { id: true, name: true, revokedAt: true },
    });
  }

  async remove(id: string, tenantId: string) {
    const existing = await this.prisma.apiKey.findFirst({ where: { id, tenantId } });
    if (!existing) throw new NotFoundException('API key not found');

    await this.prisma.apiKey.delete({ where: { id } });
    return { id };
  }
}
