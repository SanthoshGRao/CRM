import { IsIn, IsOptional, IsString, MinLength } from 'class-validator';

export class RegisterPushTokenDto {
  @IsString()
  @MinLength(10)
  token!: string;

  @IsOptional()
  @IsIn(['android', 'ios'])
  platform?: string;
}
