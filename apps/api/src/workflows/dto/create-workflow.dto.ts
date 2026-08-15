import {
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsArray,
  IsObject,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export const TRIGGER_TYPES = [
  'record_created',
  'record_updated',
  'record_deleted',
  'field_changed',
  'stage_changed',
  'time_based',
] as const;

export const ACTION_TYPES = [
  'assign_record',
  'create_task',
  'send_email',
  'send_whatsapp',
  'update_field',
  'move_stage',
  'notify_user',
  'webhook',
] as const;

export const CONDITION_OPERATORS = [
  'equals',
  'not_equals',
  'contains',
  'greater_than',
  'less_than',
  'is_empty',
  'is_not_empty',
] as const;

/**
 * Conditions and actions must be declared as nested classes, not `unknown[]`.
 * The global ValidationPipe runs with `whitelist` and `enableImplicitConversion`,
 * and an array whose element type it cannot reflect gets coerced element-by-element
 * into empty arrays — which silently saved rules that could never run.
 */
export class WorkflowConditionDto {
  @ApiProperty({ example: 'status' })
  @IsString()
  field: string;

  @ApiProperty({ enum: CONDITION_OPERATORS })
  @IsEnum(CONDITION_OPERATORS)
  operator: (typeof CONDITION_OPERATORS)[number];

  @ApiPropertyOptional({ example: 'qualified' })
  @IsOptional()
  @IsString()
  value?: string;
}

export class WorkflowActionDto {
  @ApiProperty({ enum: ACTION_TYPES })
  @IsEnum(ACTION_TYPES)
  type: (typeof ACTION_TYPES)[number];

  @ApiPropertyOptional({ example: { title: 'Call {{label}}', dueInDays: 1 } })
  @IsOptional()
  @IsObject()
  config?: Record<string, any>;
}

export class CreateWorkflowDto {
  @ApiProperty({ example: 'Assign new leads to sales' })
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: TRIGGER_TYPES })
  @IsEnum(TRIGGER_TYPES)
  triggerType: (typeof TRIGGER_TYPES)[number];

  @ApiPropertyOptional({ example: { entity: 'lead' } })
  @IsOptional()
  @IsObject()
  triggerConfig?: Record<string, unknown>;

  @ApiPropertyOptional({ type: [WorkflowConditionDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WorkflowConditionDto)
  conditions?: WorkflowConditionDto[];

  @ApiPropertyOptional({ type: [WorkflowActionDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WorkflowActionDto)
  actions?: WorkflowActionDto[];

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
