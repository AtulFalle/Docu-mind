// document.service.ts

import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { v4 as uuid } from 'uuid';
import { StorageService } from './storage.service';
import { VirusService } from './virus.service';
import { QueueService } from './queue.service';

@Injectable()
export class DocumentService {
  constructor(
    private storage: StorageService,
    private queue: QueueService,
    private virus: VirusService,
    private httpService: HttpService,
  ) {}

  async upload(file: Express.Multer.File) {
    const docId = uuid();
    const bucket = 'documents';
    const key = `${docId}.pdf`;

    // 1. virus scan
    const isSafe = await this.virus.scan(file.buffer);
    if (!isSafe) {
      throw new BadRequestException('File is infected with malware and cannot be uploaded');
    }

    // 2. upload to MinIO
    await this.storage.ensureBucket(bucket);
    await this.storage.upload(bucket, key, file.buffer);

    // 3. publish event
    await this.queue.publish({
      event: 'document.uploaded',
      data: {
        docId,
        bucket,
        key,
        type: 'resume'
      }
    });

    return {
      docId,
      status: 'uploaded'
    };
  }

  async query(docId: string, question: string) {
    try {
      // Call ai-service query endpoint
      const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000';
      const response = await firstValueFrom(
        this.httpService.post(`${aiServiceUrl}/query`, {
          docId,
          question,
        })
      );

      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        throw new NotFoundException('Document not found or not processed');
      }
      throw new BadRequestException('Failed to query document');
    }
  }
}