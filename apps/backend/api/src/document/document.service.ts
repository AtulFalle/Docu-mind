// document.service.ts

import { Injectable, BadRequestException, NotFoundException, OnModuleInit, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { v4 as uuid } from 'uuid';
import { StorageService } from './storage.service';
import { VirusService } from './virus.service';
import { QueueService } from './queue.service';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Document } from './document.schema';

@Injectable()
export class DocumentService implements OnModuleInit {
  private readonly logger = new Logger(DocumentService.name);

  constructor(
    @InjectModel('documents') private documentModel: Model<Document>,
    private storage: StorageService,
    private queue: QueueService,
    private virus: VirusService,
    private httpService: HttpService,
  ) {}

  onModuleInit() {
    this.queue.events.on('document.processed', async (data) => {
      if (data && data.docId && data.status) {
        try {
          await this.documentModel.updateOne(
            { docId: data.docId },
            { $set: { status: data.status } }
          );
          this.logger.log(`Document ${data.docId} status updated to ${data.status}`);
        } catch (error) {
          this.logger.error(`Failed to update document status for docId ${data.docId}: ${error}`);
        }
      }
    });
  }

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

    // 3. save to MongoDB
    await this.documentModel.create({
      docId,
      fileName: file.originalname,
      bucket,
      key,
      status: 'uploaded'
    });

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

  async findAll() {
    return this.documentModel.find().sort({ createdAt: -1 }).exec();
  }
}