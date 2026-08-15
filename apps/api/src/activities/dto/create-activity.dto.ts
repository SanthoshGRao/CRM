import { IsString, IsOptional, IsUUID, IsEnum, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export const ACTIVITY_TYPES = [
  'call',
  'email',
  'whatsapp',
  'sms',
  'meeting',
  'note',
] as const;

export class CreateActivityDto {
  @ApiProperty({ enum: ACTIVITY_TYPES })
  @IsEnum(ACTIVITY_TYPES)
  type: (typeof ACTIVITY_TYPES)[number];

  @ApiProperty({ example: 'Called about the renewal quote' })
  @IsString()
  @MaxLength(200)
  title: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: ['contact', 'company', 'lead', 'deal', 'task'] })
  @IsEnum(['contact', 'company', 'lead', 'deal', 'task'])
  relatedType: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  relatedContactId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  relatedCompanyId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  relatedLeadId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  relatedDealId?: string;
}
