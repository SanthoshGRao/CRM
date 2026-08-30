import { IsString, IsOptional, IsUUID, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ImportFileDto {
  @ApiProperty({ example: 'contacts.xlsx' })
  @IsString()
  originalFilename: string;

  @ApiProperty({ description: 'Base64-encoded .xlsx, .xls, or .csv file contents.' })
  @IsString()
  @MinLength(1)
  contentBase64: string;

  @ApiPropertyOptional({ description: 'Leads only — every imported lead lands in this pipeline.' })
  @IsOptional()
  @IsUUID()
  pipelineId?: string;

  @ApiPropertyOptional({ description: 'Leads only — the stage a row lands in when it has no "Stage" column value.' })
  @IsOptional()
  @IsUUID()
  stageId?: string;
}
