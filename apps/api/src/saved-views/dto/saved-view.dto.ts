import { IsString, IsOptional, IsUUID, IsEnum, IsArray, IsBoolean, MaxLength, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';

export const SAVED_VIEW_ENTITY_TYPES = ['contact', 'company', 'lead', 'deal', 'task'] as const;

export class CreateSavedViewDto {
  @ApiProperty({ enum: SAVED_VIEW_ENTITY_TYPES })
  @IsIn(SAVED_VIEW_ENTITY_TYPES)
  entityType: (typeof SAVED_VIEW_ENTITY_TYPES)[number];

  @ApiProperty({ example: 'My open deals' })
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({ description: 'Array of { field, operator, value } conditions' })
  @IsOptional()
  @IsArray()
  filters?: unknown[];

  @ApiPropertyOptional({ description: 'Visible column keys, in order' })
  @IsOptional()
  @IsArray()
  columns?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiPropertyOptional({ enum: ['asc', 'desc'] })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: string;

  @ApiPropertyOptional({ description: 'Visible to the whole workspace, not just its creator' })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;
}

export class UpdateSavedViewDto extends PartialType(CreateSavedViewDto) {}
