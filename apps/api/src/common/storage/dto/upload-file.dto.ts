import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UploadFileDto {
  @ApiProperty({ example: 'document.pdf', description: 'Original name of the file' })
  @IsString()
  @IsNotEmpty()
  originalFilename: string;

  @ApiProperty({ description: 'Base64 encoded content of the file' })
  @IsString()
  @IsNotEmpty()
  contentBase64: string;

  @ApiProperty({ example: 'application/pdf', required: false })
  @IsOptional()
  @IsString()
  mimeType?: string;
}
