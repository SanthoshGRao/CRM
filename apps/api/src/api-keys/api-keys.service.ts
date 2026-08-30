import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes, createHash } from 'crypto';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateApiKeyDto } from './dto/api-key.dto';
import { encryptApiKey, decryptApiKey } from './api-key-crypto.util';

const KEY_PREFIX = 'crm_live_';

/** Keys are authenticated against a SHA-256 hash; `keyCiphertext` (below) is what lets a key be re-copied later. */
export function hashApiKey(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}

@Injectable()
export class ApiKeysService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  private get encryptionSecret(): string {
    return this.config.get<string>('app.apiKeys.encryptionSecret')!;
  }

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
        keyCiphertext: encryptApiKey(raw, this.encryptionSecret),
        scopes: dto.scopes?.length ? dto.scopes : ['read'],
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
        createdById: userId,
      },
      select: {
        id: true, name: true, keyPrefix: true, scopes: true,
        expiresAt: true, createdAt: true,
      },
    });

    return { ...apiKey, key: raw };
  }

  /** Re-fetches the full secret so it can be copied again — not just once at creation. */
  async reveal(id: string, tenantId: string) {
    const existing = await this.prisma.apiKey.findFirst({
      where: { id, tenantId },
      select: { id: true, name: true, keyCiphertext: true },
    });
    if (!existing) throw new NotFoundException('API key not found');
    if (!existing.keyCiphertext) {
      throw new NotFoundException(
        'This key was created before copy-again support was added. Revoke it and create a new one.',
      );
    }

    return {
      id: existing.id,
      name: existing.name,
      key: decryptApiKey(existing.keyCiphertext, this.encryptionSecret),
    };
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
