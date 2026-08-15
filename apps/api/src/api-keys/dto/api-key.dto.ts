import { IsString, IsOptional, IsArray, IsIn, IsDateString, MaxLength, ArrayMinSize } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export const API_SCOPES = ['read', 'write'] as const;
export type ApiScope = (typeof API_SCOPES)[number];

export class CreateApiKeyDto {
  @ApiProperty({ example: 'Data warehouse sync' })
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({ enum: API_SCOPES, isArray: true, default: ['read'] })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @IsIn(API_SCOPES as unknown as string[], { each: true })
  scopes?: ApiScope[];

  @ApiPropertyOptional({ example: '2027-01-01', description: 'Optional expiry date' })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}
