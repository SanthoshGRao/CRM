import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Req,
  Res,
  BadRequestException,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { FastifyRequest, FastifyReply } from 'fastify';
import * as path from 'path';
import { StorageService } from './storage.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { UploadFileDto } from './dto/upload-file.dto';

const ALLOWED_MIME_TYPES: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.pdf': 'application/pdf',
  '.txt': 'text/plain; charset=utf-8',
  '.csv': 'text/csv; charset=utf-8',
  '.json': 'application/json',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xls': 'application/vnd.ms-excel',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
};

@ApiTags('files')
@Controller('files')
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  @Get(':filename')
  @ApiOperation({ summary: 'Retrieve or download a stored file' })
  @ApiResponse({ status: 200, description: 'File content' })
  @ApiResponse({ status: 404, description: 'File not found' })
  async getFile(@Param('filename') filename: string, @Res() res: FastifyReply) {
    const { buffer } = await this.storageService.getFile(filename);
    const ext = path.extname(filename).toLowerCase();
    const mimeType = ALLOWED_MIME_TYPES[ext] || 'application/octet-stream';

    res
      .header('Content-Type', mimeType)
      .header('X-Content-Type-Options', 'nosniff')
      .header('Cache-Control', 'public, max-age=86400')
      .send(buffer);
  }

  @Post('upload')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Upload a file using base64 encoding' })
  @ApiBody({ type: UploadFileDto })
  async uploadFileBase64(@Body() dto: UploadFileDto) {
    const ext = path.extname(dto.originalFilename).toLowerCase();

    // Extension security check
    if (!ALLOWED_MIME_TYPES[ext]) {
      throw new BadRequestException(`File extension ${ext} is not permitted.`);
    }

    // Convert base64 to Buffer
    const cleanBase64 = dto.contentBase64.replace(/^data:[^;]+;base64,/, '');
    const fileBuffer = Buffer.from(cleanBase64, 'base64');

    // Size limit check (10MB limit)
    const MAX_SIZE = 10 * 1024 * 1024;
    if (fileBuffer.length > MAX_SIZE) {
      throw new BadRequestException('File size exceeds 10MB limit.');
    }

    const mimeType = dto.mimeType || ALLOWED_MIME_TYPES[ext];

    const result = await this.storageService.saveFile(
      fileBuffer,
      dto.originalFilename,
      mimeType,
    );

    return {
      statusCode: HttpStatus.CREATED,
      data: result,
    };
  }
}
