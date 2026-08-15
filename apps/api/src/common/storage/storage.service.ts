import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly uploadDir: string;
  private readonly driver: string;

  constructor(private readonly configService: ConfigService) {
    this.driver = this.configService.get<string>('app.storage.driver', 'local');
    const relativeOrAbsolutePath = this.configService.get<string>(
      'app.storage.localPath',
      './uploads',
    );
    this.uploadDir = path.resolve(process.cwd(), relativeOrAbsolutePath);

    if (this.driver === 'local') {
      this.ensureUploadDirExists();
    }
  }

  private ensureUploadDirExists(): void {
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
      this.logger.log(`Created local storage directory: ${this.uploadDir}`);
    }
  }

  /**
   * Securely resolves a target file path within the upload directory.
   * Prevents directory traversal attacks.
   */
  private getSanitizedPath(filename: string): string {
    const safeFilename = path.basename(filename);
    if (filename !== safeFilename) {
      this.logger.warn(`Directory traversal or invalid path detected in filename: ${filename}`);
      throw new BadRequestException('Invalid filename or path traversal detected');
    }

    const resolvedPath = path.resolve(this.uploadDir, safeFilename);

    // Verify boundary restriction
    const normalizedUploadDir = this.uploadDir.endsWith(path.sep)
      ? this.uploadDir
      : this.uploadDir + path.sep;

    if (!resolvedPath.startsWith(normalizedUploadDir) && resolvedPath !== this.uploadDir) {
      this.logger.warn(`Directory traversal attempt blocked for filename: ${filename}`);
      throw new BadRequestException('Invalid file path');
    }

    return resolvedPath;
  }

  /**
   * Save file buffer to local storage.
   */
  async saveFile(
    fileBuffer: Buffer,
    originalFilename: string,
    mimeType: string,
  ): Promise<{ filename: string; originalFilename: string; mimeType: string; url: string }> {
    const ext = path.extname(originalFilename).toLowerCase();
    const uniqueFilename = `${uuidv4()}${ext}`;
    const filePath = this.getSanitizedPath(uniqueFilename);

    await fs.promises.writeFile(filePath, fileBuffer);
    this.logger.log(`Saved file ${uniqueFilename} to local storage (${filePath})`);

    const url = `/api/v1/files/${uniqueFilename}`;
    return {
      filename: uniqueFilename,
      originalFilename,
      mimeType,
      url,
    };
  }

  /**
   * Retrieve file buffer and metadata by filename.
   */
  async getFile(filename: string): Promise<{ buffer: Buffer; filePath: string }> {
    const filePath = this.getSanitizedPath(filename);

    if (!fs.existsSync(filePath)) {
      throw new NotFoundException(`File ${filename} not found`);
    }

    const buffer = await fs.promises.readFile(filePath);
    return { buffer, filePath };
  }

  /**
   * Delete file from local storage.
   */
  async deleteFile(filename: string): Promise<boolean> {
    const filePath = this.getSanitizedPath(filename);

    if (!fs.existsSync(filePath)) {
      return false;
    }

    await fs.promises.unlink(filePath);
    this.logger.log(`Deleted file ${filename} from local storage`);
    return true;
  }
}
