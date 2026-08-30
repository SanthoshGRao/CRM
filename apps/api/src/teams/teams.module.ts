import { Module } from '@nestjs/common';
import { TeamsController } from './teams.controller';
import { TeamsApiController } from './teams-api.controller';
import { TeamsService } from './teams.service';
import { ApiKeysModule } from '../api-keys/api-keys.module';

@Module({
  imports: [ApiKeysModule],
  controllers: [TeamsController, TeamsApiController],
  providers: [TeamsService],
  exports: [TeamsService],
})
export class TeamsModule {}
