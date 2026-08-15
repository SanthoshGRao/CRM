import {
  IsEmail, IsString, IsOptional, IsEnum, MinLength, MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType, OmitType } from '@nestjs/swagger';
import { DEFAULT_ROLE_NAME } from '../../common/rbac/role-definitions';

export class CreateTenantDto {
  @ApiProperty({ example: 'Acme Corp', description: 'Customer company name' })
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({ example: 'pro' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  plan?: string;

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
    example: 'Admin',
    description: `Role name as it exists in the workspace (Owner, Admin, Manager, Sales Rep, Viewer). Defaults to ${DEFAULT_ROLE_NAME}.`,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  roleName?: string;
}
