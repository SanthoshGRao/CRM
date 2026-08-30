import {
  IsString, IsOptional, IsNumber, IsBoolean, IsObject, IsIn, Min, MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';

export class CreatePlanDto {
  @ApiProperty({ example: 'Pro' })
  @IsString()
  @MaxLength(50)
  name: string;

  @ApiPropertyOptional({ example: 'For growing sales teams' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiProperty({ example: 2499 })
  @IsNumber()
  @Min(0)
  price: number;

  @ApiPropertyOptional({ example: 'INR' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  currency?: string;

  @ApiPropertyOptional({ enum: ['month', 'year'], example: 'month' })
  @IsOptional()
  @IsIn(['month', 'year'])
  interval?: string;

  @ApiPropertyOptional({ example: { seats: 10, storageGb: 50 } })
  @IsOptional()
  @IsObject()
  features?: Record<string, any>;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdatePlanDto extends PartialType(CreatePlanDto) {}
