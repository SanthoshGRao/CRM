import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/** The CRM user who issued the presented API key — the default "actor" for writes that need one. */
export const ApiKeyActorId = createParamDecorator((_data: unknown, ctx: ExecutionContext) => {
  return ctx.switchToHttp().getRequest().apiKey?.createdById as string | null;
});
