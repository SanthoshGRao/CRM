import { IsString, IsOptional, IsUUID, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';

export class CreateTeamDto {
  @ApiProperty({ example: 'Sales Team' })
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({ example: 'North India field sales' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({ description: 'User id of this group\'s manager/lead' })
  @IsOptional()
  @IsUUID()
  managerId?: string;
}

export class UpdateTeamDto extends PartialType(CreateTeamDto) {}

export class AddTeamMemberDto {
  @ApiProperty({ description: 'User id to add to this group' })
  @IsUUID()
  userId: string;
}

export class MoveTeamMemberDto {
  @ApiProperty({ description: 'Group id to move the member into' })
  @IsUUID()
  toTeamId: string;
}
