import { CanActivate, ExecutionContext, ForbiddenException, HttpException, HttpStatus, Injectable } from '@nestjs/common';

/**
 * Hard-blocks CRM API access for a tenant whose subscription isn't entitled
 * (no subscription, lapsed trial, unrenewed period, past_due or cancelled).
 * `JwtStrategy` computes `isEntitled`/`entitlementReason` on every request;
 * this guard just enforces it. Apply next to `JwtAuthGuard` on every
 * tenant-facing controller — never on `auth`, `health`, `platform/*`
 * (separate `PlatformJwtGuard`, no `request.user`), or the billing module
 * itself (its routes are the allowlist a blocked tenant still needs).
 */
@Injectable()
export class SubscriptionGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Not authenticated');
    }

    if (!user.isEntitled) {
      throw new HttpException(
        {
          code: 'SUBSCRIPTION_REQUIRED',
          reason: user.entitlementReason ?? 'no_subscription',
          message: 'This workspace needs an active subscription to continue.',
        },
        HttpStatus.PAYMENT_REQUIRED,
      );
    }

    return true;
  }
}
