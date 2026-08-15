import { IsEmail, IsString, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AdminLoginDto {
  @ApiProperty({ example: 'admin@yourcompany.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'StrongPass@123' })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password: string;
}
