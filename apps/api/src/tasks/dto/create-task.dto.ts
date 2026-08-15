import { IsString, IsOptional, IsUUID, IsEnum, IsDateString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTaskDto {
  @ApiProperty({ example: 'Follow up on proposal' })
  @IsString()
  @MaxLength(200)
  title: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  assignedToId?: string;

  @ApiPropertyOptional({ example: '2026-12-31' })
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiPropertyOptional({ enum: ['low', 'medium', 'high', 'urgent'] })
  @IsOptional()
  @IsEnum(['low', 'medium', 'high', 'urgent'])
  priority?: string;

  @ApiPropertyOptional({ enum: ['contact', 'company', 'lead', 'deal', 'task'] })
  @IsOptional()
  @IsEnum(['contact', 'company', 'lead', 'deal', 'task'])
  relatedType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  relatedLeadId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  relatedDealId?: string;
}
