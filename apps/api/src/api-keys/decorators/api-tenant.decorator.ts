import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/** Tenant id resolved from the presented API key. */
export const ApiTenantId = createParamDecorator((_data: unknown, ctx: ExecutionContext) => {
  return ctx.switchToHttp().getRequest().tenantId as string;
});
