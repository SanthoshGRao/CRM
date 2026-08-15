import {
  IsString, IsOptional, IsEnum, IsBoolean, IsInt, IsArray, IsObject, ValidateNested, MaxLength, Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional, PartialType, OmitType } from '@nestjs/swagger';

/** CustomFieldValue can only hang off these four entities. */
export const CUSTOM_FIELD_ENTITIES = ['contact', 'company', 'lead', 'deal'] as const;

export const CUSTOM_FIELD_TYPES = [
  'text', 'long_text', 'number', 'currency', 'percentage', 'date', 'datetime',
  'boolean', 'dropdown', 'multi_select', 'phone', 'email', 'url', 'file', 'user',
] as const;

export const CHOICE_FIELD_TYPES = ['dropdown', 'multi_select'];

export class CustomFieldOptionDto {
  @ApiProperty({ example: 'High priority' })
  @IsString()
  @MaxLength(100)
  label: string;

  @ApiPropertyOptional({ example: 'high', description: 'Defaults to a slug of the label' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  value?: string;

  @ApiPropertyOptional({ example: '#ef4444' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  color?: string;
}

export class CreateCustomFieldDto {
  @ApiProperty({ enum: CUSTOM_FIELD_ENTITIES })
  @IsEnum(CUSTOM_FIELD_ENTITIES)
  entityType: (typeof CUSTOM_FIELD_ENTITIES)[number];

  @ApiProperty({ example: 'Account manager' })
  @IsString()
  @MaxLength(100)
  label: string;

  @ApiPropertyOptional({ example: 'account_manager', description: 'Defaults to a slug of the label' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  fieldName?: string;

  @ApiProperty({ enum: CUSTOM_FIELD_TYPES })
  @IsEnum(CUSTOM_FIELD_TYPES)
  fieldType: (typeof CUSTOM_FIELD_TYPES)[number];

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  required?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  defaultValue?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  displayOrder?: number;

  @ApiPropertyOptional({ type: [CustomFieldOptionDto], description: 'Required for dropdown / multi_select' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CustomFieldOptionDto)
  options?: CustomFieldOptionDto[];
}

export class UpdateCustomFieldDto extends PartialType(
  OmitType(CreateCustomFieldDto, ['entityType'] as const),
) {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class SetCustomFieldValuesDto {
  @ApiProperty({
    example: { '9f1c…': 'Priya Sharma' },
    description: 'Map of custom field id to value. Send null or "" to clear a field.',
  })
  // Needs a validator decorator or the global whitelisting pipe strips it.
  @IsObject()
  values: Record<string, string | null>;
}
