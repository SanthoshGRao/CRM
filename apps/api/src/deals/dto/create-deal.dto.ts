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
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateDealDto {
  @ApiProperty({ example: 'Acme Corp - Annual Contract' })
  @IsString()
  @MaxLength(200)
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  contactId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  companyId?: string;

  @ApiProperty()
  @IsUUID()
  pipelineId: string;

  @ApiProperty()
  @IsUUID()
  stageId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  ownerId?: string;

  @ApiPropertyOptional({ example: 500000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  value?: number;

  @ApiPropertyOptional({ example: 50, minimum: 0, maximum: 100 })
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
