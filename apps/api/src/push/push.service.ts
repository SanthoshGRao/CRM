import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { initializeApp, cert, type App } from 'firebase-admin/app';
import { getMessaging, type SendResponse } from 'firebase-admin/messaging';
import { PrismaService } from '../common/prisma/prisma.service';

export interface PushMessage {
  title: string;
  body: string;
  /** e.g. { type: 'task_assigned', taskId } — read by the app to route a tap. */
  data?: Record<string, string>;
}

@Injectable()
export class PushService implements OnModuleInit {
  private readonly logger = new Logger(PushService.name);
  private app: App | null = null;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  onModuleInit() {
    const raw = this.config.get<string>('app.firebase.serviceAccount');
    if (!raw) {
      this.logger.warn('FIREBASE_SERVICE_ACCOUNT is not set — push notifications are disabled.');
      return;
    }

    try {
      const serviceAccount = JSON.parse(raw);
      this.app = initializeApp({ credential: cert(serviceAccount) });
    } catch (err: any) {
      this.logger.error(`Failed to initialize Firebase Admin: ${err?.message ?? err}`);
    }
  }

  get enabled() {
    return this.app !== null;
  }

  /**
   * Sends to every device registered for a user and prunes tokens FCM reports
   * as dead. Never throws — callers fire this without awaiting it, so a
   * transient FCM error must not surface as an unhandled rejection or fail
   * the request that triggered it (e.g. creating a task).
   */
  async sendToUser(userId: string, message: PushMessage): Promise<void> {
    if (!this.app) return;

    try {
      const tokens = await this.prisma.pushToken.findMany({ where: { userId } });
      if (tokens.length === 0) return;

      const response = await getMessaging(this.app).sendEachForMulticast({
        tokens: tokens.map((t) => t.token),
        notification: { title: message.title, body: message.body },
        data: message.data,
        android: { priority: 'high' },
      });

      const deadTokens: string[] = [];
      response.responses.forEach((r: SendResponse, i: number) => {
        if (!r.success && DEAD_TOKEN_CODES.has(r.error?.code ?? '')) {
          deadTokens.push(tokens[i].token);
        }
        if (!r.success) {
          this.logger.warn(`FCM rejected token for user ${userId}: ${r.error?.code} — ${r.error?.message}`);
        }
      });
      this.logger.log(
        `Push to user ${userId}: ${response.successCount}/${tokens.length} delivered to FCM ("${message.title}")`,
      );
      if (deadTokens.length > 0) {
        await this.prisma.pushToken.deleteMany({ where: { token: { in: deadTokens } } });
      }
    } catch (err: any) {
      this.logger.error(`Push send failed for user ${userId}: ${err?.message ?? err}`);
    }
  }
}

const DEAD_TOKEN_CODES = new Set([
  'messaging/registration-token-not-registered',
  'messaging/invalid-registration-token',
]);
