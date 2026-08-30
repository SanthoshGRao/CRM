import { Module } from '@nestjs/common';
import { DataController } from './data.controller';
import { DataService } from './data.service';
import { ApiKeysModule } from '../api-keys/api-keys.module';
import { WorkflowsModule } from '../workflows/workflows.module';
import { PipelinesModule } from '../pipelines/pipelines.module';

@Module({
  imports: [ApiKeysModule, WorkflowsModule, PipelinesModule],
  controllers: [DataController],
  providers: [DataService],
})
export class DataModule {}
