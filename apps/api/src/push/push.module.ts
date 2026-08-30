import { Global, Module } from '@nestjs/common';
import { PushTokensController } from './push-tokens.controller';
import { PushTokensService } from './push-tokens.service';
import { PushService } from './push.service';
import { NotificationSchedulerService } from './notification-scheduler.service';

/** Global so any record module (tasks, leads, deals, ...) can inject PushService directly. */
@Global()
@Module({
  controllers: [PushTokensController],
  providers: [PushTokensService, PushService, NotificationSchedulerService],
  exports: [PushService],
})
export class PushModule {}
