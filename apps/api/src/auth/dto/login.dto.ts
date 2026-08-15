import { IsEmail, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'santhosh@company.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'StrongPass@123' })
  @IsString()
  password: string;
}
