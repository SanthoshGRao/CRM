import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class PushTokensService {
  constructor(private readonly prisma: PrismaService) {}

  async register(tenantId: string, userId: string, token: string, platform = 'android') {
    return this.prisma.pushToken.upsert({
      where: { token },
      create: { tenantId, userId, token, platform },
      // A token can outlive a logout/login or move between users on a shared
      // device, so re-registering always reassigns it to whoever is signed in.
      update: { tenantId, userId, platform, lastSeenAt: new Date() },
    });
  }

  async unregister(userId: string, token: string) {
    await this.prisma.pushToken.deleteMany({ where: { userId, token } });
    return { ok: true };
  }
}
