import { Global, Module } from '@nestjs/common';
import { WorkflowsController } from './workflows.controller';
import { WorkflowsService } from './workflows.service';
import { WorkflowEngineService } from './workflow-engine.service';

/**
 * Global because every record module dispatches events into the engine;
 * importing it explicitly in each one would be noise.
 */
@Global()
@Module({
  controllers: [WorkflowsController],
  providers: [WorkflowsService, WorkflowEngineService],
  exports: [WorkflowsService, WorkflowEngineService],
})
export class WorkflowsModule {}
