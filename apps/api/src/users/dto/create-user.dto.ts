import { IsEmail, IsString, IsOptional, IsUUID, MinLength, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DEFAULT_ROLE_NAME } from '../../common/rbac/role-definitions';

export class CreateUserDto {
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

  @ApiPropertyOptional({ description: `Role id from GET /users/roles; defaults to ${DEFAULT_ROLE_NAME}` })
  @IsOptional()
  @IsUUID()
  roleId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;
}
