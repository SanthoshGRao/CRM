import { Body, Controller, Delete, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { PushTokensService } from './push-tokens.service';
import { RegisterPushTokenDto } from './dto/register-push-token.dto';

@ApiTags('push-tokens')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('push-tokens')
export class PushTokensController {
  constructor(private readonly pushTokens: PushTokensService) {}

  @Post()
  register(
    @Body() dto: RegisterPushTokenDto,
    @CurrentUser('id') userId: string,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.pushTokens.register(tenantId, userId, dto.token, dto.platform);
  }

  @Delete(':token')
  unregister(@Param('token') token: string, @CurrentUser('id') userId: string) {
    return this.pushTokens.unregister(userId, token);
  }
}
