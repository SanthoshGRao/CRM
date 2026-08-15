import {
  IsString,
  IsOptional,
  IsUUID,
  IsNumber,
  IsDateString,
  Min,
  Max,
  MaxLength,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

/**
 * Every field is optional — anything omitted is carried over from the lead,
 * and the deal pipeline/stage falls back to the tenant's default.
 */
export class ConvertLeadDto {
  @ApiPropertyOptional({ description: 'Deal name; defaults to the lead title' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @ApiPropertyOptional({ description: 'Target deal pipeline; defaults to the tenant default' })
  @IsOptional()
  @IsUUID()
  pipelineId?: string;

  @ApiPropertyOptional({ description: 'Target stage; defaults to the first stage of the pipeline' })
  @IsOptional()
  @IsUUID()
  stageId?: string;

  @ApiPropertyOptional({ description: 'Deal owner; defaults to the lead owner' })
  @IsOptional()
  @IsUUID()
  ownerId?: string;

  @ApiPropertyOptional({ example: 500000, description: 'Deal value; defaults to the lead value' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  value?: number;

  @ApiPropertyOptional({ example: 60, minimum: 0, maximum: 100 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  @Type(() => Number)
  probability?: number;

  @ApiPropertyOptional({ example: '2026-12-31' })
  @IsOptional()
  @IsDateString()
  expectedCloseDate?: string;
}
