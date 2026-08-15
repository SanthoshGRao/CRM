import {
  IsString,
  IsOptional,
  IsUUID,
  IsEnum,
  IsNumber,
  IsDateString,
  IsDecimal,
  Min,
  Max,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateLeadDto {
  @ApiProperty({ example: 'Rahul Kumar - Real Estate Inquiry' })
  @IsString()
  @MaxLength(200)
  title: string;

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

  @ApiPropertyOptional({ enum: ['website', 'referral', 'cold_call', 'email', 'social', 'advertisement', 'event', 'other'] })
  @IsOptional()
  @IsEnum(['website', 'referral', 'cold_call', 'email', 'social', 'advertisement', 'event', 'other'])
  source?: string;

  @ApiPropertyOptional({ example: 250000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  value?: number;

  @ApiPropertyOptional({ example: 30, minimum: 0, maximum: 100 })
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
