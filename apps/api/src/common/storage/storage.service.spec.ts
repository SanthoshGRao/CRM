import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { StorageService } from './storage.service';
import { BadRequestException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

describe('StorageService', () => {
  let service: StorageService;
  const testUploadDir = path.resolve(process.cwd(), './test-uploads');

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StorageService,
        {
          provide: ConfigService,
          useValue: {
            get: (key: string, defaultValue?: any) => {
              if (key === 'app.storage.driver') return 'local';
              if (key === 'app.storage.localPath') return './test-uploads';
              return defaultValue;
            },
          },
        },
      ],
    }).compile();

    service = module.get<StorageService>(StorageService);
  });

  afterAll(async () => {
    if (fs.existsSync(testUploadDir)) {
      await fs.promises.rm(testUploadDir, { recursive: true, force: true });
    }
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should save a file to local disk and retrieve it', async () => {
    const content = Buffer.from('Hello CRM Local Storage');
    const result = await service.saveFile(content, 'test.txt', 'text/plain');

    expect(result.filename).toBeDefined();
    expect(result.originalFilename).toBe('test.txt');
    expect(result.url).toContain('/api/v1/files/');

    const retrieved = await service.getFile(result.filename);
    expect(retrieved.buffer.toString()).toBe('Hello CRM Local Storage');

    await service.deleteFile(result.filename);
  });

  it('should prevent directory traversal attack', async () => {
    await expect(service.getFile('../../../etc/passwd')).rejects.toThrow(BadRequestException);
  });
});
