import {
  Injectable, CanActivate, ExecutionContext, UnauthorizedException, ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../common/prisma/prisma.service';
import { hashApiKey } from '../api-keys.service';
import { REQUIRED_SCOPE_KEY } from '../decorators/require-scope.decorator';

/**
 * Authenticates a customer integration via `X-API-Key` (or `Authorization:
 * Bearer crm_live_…`). The resolved tenant is attached to the request and every
 * downstream query is scoped to it, so a key can only ever read its own CRM.
 */
@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const raw = this.extractKey(request);

    if (!raw) {
      throw new UnauthorizedException('Provide your API key in the X-API-Key header.');
    }

    const apiKey = await this.prisma.apiKey.findUnique({
      where: { keyHash: hashApiKey(raw) },
      include: { tenant: { select: { id: true, name: true, slug: true, status: true } } },
    });

    if (!apiKey) throw new UnauthorizedException('Invalid API key.');
    if (apiKey.revokedAt) throw new UnauthorizedException('This API key has been revoked.');
    if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
      throw new UnauthorizedException('This API key has expired.');
    }
    if (apiKey.tenant.status !== 'active') {
      throw new ForbiddenException('This workspace is not active.');
    }

    const required = this.reflector.getAllAndOverride<string>(REQUIRED_SCOPE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (required && !apiKey.scopes.includes(required)) {
      throw new ForbiddenException(`This API key is missing the "${required}" scope.`);
    }

    // Fire-and-forget usage tracking; never block the response on it.
    this.prisma.apiKey
      .update({
        where: { id: apiKey.id },
        data: { lastUsedAt: new Date(), requestCount: { increment: 1 } },
      })
      .catch(() => undefined);

    request.apiKey = { id: apiKey.id, scopes: apiKey.scopes };
    request.tenantId = apiKey.tenantId;
    request.tenant = apiKey.tenant;

    return true;
  }

  private extractKey(request: any): string | null {
    const header = request.headers?.['x-api-key'];
    if (typeof header === 'string' && header.trim()) return header.trim();

    const auth = request.headers?.authorization;
    if (typeof auth === 'string' && auth.startsWith('Bearer crm_live_')) {
      return auth.slice(7).trim();
    }

    return null;
  }
}
