import { IsOptional, IsUUID, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCheckoutDto {
  @ApiPropertyOptional({ description: "Plan to subscribe to. Defaults to the workspace's current plan (renewal)." })
  @IsOptional()
  @IsUUID()
  planId?: string;

  @ApiPropertyOptional({ description: "Seats to buy on that plan. Defaults to the workspace's current seat count, or 1." })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  seats?: number;
}
