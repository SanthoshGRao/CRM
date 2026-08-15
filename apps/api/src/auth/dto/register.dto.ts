import { IsEmail, IsString, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: 'Santhosh' })
  @IsString()
  @MaxLength(50)
  firstName: string;

  @ApiProperty({ example: 'Kumar' })
  @IsString()
  @MaxLength(50)
  lastName: string;

  @ApiProperty({ example: 'santhosh@company.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'StrongPass@123', minLength: 8 })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password: string;

  @ApiProperty({ example: 'Acme Corp' })
  @IsString()
  @MaxLength(100)
  companyName: string;
}
