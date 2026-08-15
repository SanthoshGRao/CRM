import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentAdmin = createParamDecorator((data: string | undefined, ctx: ExecutionContext) => {
  const admin = ctx.switchToHttp().getRequest().admin;
  return data ? admin?.[data] : admin;
});
