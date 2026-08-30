import {
  IsEmail, IsString, IsOptional, IsEnum, IsUUID, IsBoolean, IsObject, IsDateString, Matches,
  MinLength, MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType, OmitType } from '@nestjs/swagger';
import { DEFAULT_ROLE_NAME } from '../../common/rbac/role-definitions';

export class CreateTenantDto {
  @ApiProperty({ example: 'Acme Corp', description: 'Customer company name' })
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({ example: 'pro', description: 'Legacy free-text label, kept in sync automatically when planId is set.' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  plan?: string;

  @ApiPropertyOptional({ example: 'e3b0c442-98fc-1c14-9afb-4c8996fb9241', description: 'Plan to start the workspace on a trial subscription for.' })
  @IsOptional()
  @IsUUID()
  planId?: string;

  @ApiPropertyOptional({ enum: ['active', 'suspended', 'pending', 'cancelled'] })
  @IsOptional()
  @IsEnum(['active', 'suspended', 'pending', 'cancelled'])
  status?: string;

  // ── First Owner user for the workspace ──────────────────────
  @ApiProperty({ example: 'Priya' })
  @IsString()
  @MaxLength(50)
  ownerFirstName: string;

  @ApiProperty({ example: 'Sharma' })
  @IsString()
  @MaxLength(50)
  ownerLastName: string;

  @ApiProperty({ example: 'priya@acme.com' })
  @IsEmail()
  ownerEmail: string;

  @ApiProperty({ example: 'StrongPass@123', minLength: 8 })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  ownerPassword: string;
}

export class UpdateTenantDto extends PartialType(
  OmitType(CreateTenantDto, ['ownerFirstName', 'ownerLastName', 'ownerEmail', 'ownerPassword'] as const),
) {}

export class CreateTenantUserDto {
  @ApiProperty({ example: 'Arjun' })
  @IsString()
  @MaxLength(50)
  firstName: string;

  @ApiProperty({ example: 'Nair' })
  @IsString()
  @MaxLength(50)
  lastName: string;

  @ApiProperty({ example: 'arjun@acme.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'StrongPass@123', minLength: 8 })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password: string;

  @ApiPropertyOptional({
    example: 'Developer',
    description: `Role name as it exists in the workspace (Owner, Developer, Manager, Sales Rep, Viewer). Defaults to ${DEFAULT_ROLE_NAME}.`,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  roleName?: string;
}

export class UpsertSubscriptionDto {
  @ApiProperty({ example: 'e3b0c442-98fc-1c14-9afb-4c8996fb9241' })
  @IsUUID()
  planId: string;

  @ApiPropertyOptional({ enum: ['active', 'past_due', 'cancelled', 'trialing'] })
  @IsOptional()
  @IsEnum(['active', 'past_due', 'cancelled', 'trialing'])
  status?: string;

  @ApiPropertyOptional({ description: 'Defaults to now.' })
  @IsOptional()
  @IsDateString()
  currentPeriodStart?: string;

  @ApiPropertyOptional({ description: "Defaults to one billing interval (plan's month/year) after the start." })
  @IsOptional()
  @IsDateString()
  currentPeriodEnd?: string;
}

export class ToggleFeatureDto {
  @ApiProperty({ example: true })
  @IsBoolean()
  enabled: boolean;

  @ApiPropertyOptional({ example: { maxSeats: 25 } })
  @IsOptional()
  @IsObject()
  config?: Record<string, any>;
}

export class CreateDomainDto {
  @ApiProperty({ example: 'crm.acme.com' })
  @IsString()
  @MaxLength(255)
  @Matches(/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/i, {
    message: 'domain must be a valid hostname (e.g. crm.acme.com)',
  })
  domain: string;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;
}

export class UpdateDomainDto {
  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  verified?: boolean;
}
