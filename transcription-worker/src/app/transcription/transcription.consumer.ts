import { Injectable, OnModuleInit, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as amqp from 'amqplib';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

import { StorageService } from '../../../../apps/backend/api/src/core/storage.service';
import { WhisperService } from './whisper.service';
import { ParserService } from './parser.service';
import { Interview } from '../../../../apps/backend/api/src/modules/interview/entities/interview.schema';

@Injectable()
export class TranscriptionConsumer implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TranscriptionConsumer.name);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private connection: any = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private channel: any = null;
  private readonly queueName = 'interview.transcription';
  private readonly maxReconnectAttempts = 5;
  private readonly reconnectDelay = 5000;
  private reconnectAttempts = 0;

  constructor(
    private configService: ConfigService,
    private storageService: StorageService,
    private whisperService: WhisperService,
    private parserService: ParserService,
    @InjectModel(Interview.name) private interviewModel: Model<Interview>,
  ) {}

  async onModuleInit() {
    await this.connect();
  }

  async onModuleDestroy() {
    if (this.channel) await this.channel.close();
    if (this.connection) await this.connection.close();
  }

  private resolveRabbitmqUrl(): string {
    const envUrl = this.configService.get<string>('RABBITMQ_URL');
    if (envUrl && envUrl.trim()) return envUrl;

    const host = this.configService.get<string>('RABBITMQ_HOST') || 'rabbitmq';
    const port = this.configService.get<string>('RABBITMQ_PORT') || '5672';
    const user = this.configService.get<string>('RABBITMQ_USER') || 'guest';
    const password = this.configService.get<string>('RABBITMQ_PASSWORD') || 'guest';

    return `amqp://${user}:${password}@${host}:${port}`;
  }

  private async connect() {
    try {
      const url = this.resolveRabbitmqUrl();
      this.logger.log(`Connecting to RabbitMQ at ${url.replace(/:[^:]*@/, ':***@')}`);
      this.connection = await amqp.connect(url);
      
      this.connection.on('close', () => {
        this.logger.warn('RabbitMQ connection closed. Attempting to reconnect...');
        this.channel = null;
        this.connection = null;
        setTimeout(() => this.connect(), this.reconnectDelay);
      });

      this.connection.on('error', (error: any) => {
        this.logger.error(`RabbitMQ connection error: ${error.message}`);
        this.channel = null;
      });

      this.channel = await this.connection.createChannel();
      
      this.channel.on('close', () => {
        this.channel = null;
      });

      this.channel.on('error', (error: any) => {
        this.logger.error(`RabbitMQ channel error: ${error.message}`);
      });

      await this.channel.assertQueue(this.queueName, { durable: true });
      this.channel.prefetch(1);

      this.logger.log(`Subscribed to queue: ${this.queueName}`);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      this.channel.consume(this.queueName, async (msg: any) => {
        if (!msg) return;
        try {
          const payload = JSON.parse(msg.content.toString());
          this.logger.debug(`Received raw message: ${JSON.stringify(payload)}`);
          await this.processJob(payload);
          this.channel?.ack(msg);
        } catch (error: any) {
          this.logger.error(`Failed to process transcription job: ${error.message}`);
          this.channel?.nack(msg, false, false);
        }
      });
      this.reconnectAttempts = 0;
    } catch (error: any) {
      this.logger.error(`Failed to connect to RabbitMQ for TranscriptionConsumer: ${error.message}`);
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        this.reconnectAttempts++;
        setTimeout(() => this.connect(), this.reconnectDelay);
      }
    }
  }

  private async processJob(payload: any) {
    // The payload emitted by InterviewService is wrapped in a data object
    const interviewId = payload.data?.interviewId || payload.interviewId;
    const audioPath = payload.data?.audioPath || payload.audioPath;

    if (!interviewId || !audioPath) {
       this.logger.error(`Invalid payload missing interviewId or audioPath: ${JSON.stringify(payload)}`);
       throw new Error(`Invalid payload: ${JSON.stringify(payload)}`);
    }

    this.logger.log(`Processing transcription job for interview: ${interviewId}`);

    const tmpDir = path.join(process.cwd(), 'data', 'transcriptions');
    await fs.mkdir(tmpDir, { recursive: true }).catch(() => {});
    const localAudioPath = path.join(tmpDir, `${interviewId}.wav`);
    let outputJsonPath = '';

    try {
      await this.interviewModel.findOneAndUpdate(
        { interviewId },
        { status: 'processing' }
      );

      const expectedBucket = payload.data?.audioBucket || 'audio';
      let bucket = expectedBucket;
      let key = audioPath;
      
      if (audioPath.startsWith('minio://')) {
        const parts = audioPath.replace('minio://', '').split('/');
        bucket = parts.shift() || expectedBucket;
        key = parts.join('/');
      } else if (audioPath.includes('/')) {
        const parts = audioPath.split('/');
        bucket = parts.shift() || expectedBucket;
        key = parts.join('/');
      }

      await this.storageService.download(bucket, key, localAudioPath);
      this.logger.log(`File ACTUALLY downloaded and exists at: ${localAudioPath}`);

      outputJsonPath = await this.whisperService.transcribe(localAudioPath, tmpDir, interviewId);

      const segments = await this.parserService.parse(outputJsonPath);
      this.logger.log(`Parsed ${segments.length} whisper segments`);

      await this.interviewModel.findOneAndUpdate(
        { interviewId },
        { 
          status: 'completed',
          transcripts: segments
        }
      );
      this.logger.log(`Successfully completed transcription and stored results for interview: ${interviewId}`);

    } finally {
      try {
        // TEMPORARILY COMMENTED OUT SO YOU CAN VERIFY THE FILE DOWNLOADS
        // await fs.unlink(localAudioPath).catch(() => {});
        if (outputJsonPath) {
          // await fs.unlink(outputJsonPath).catch(() => {});
        }
      } catch (cleanupError: any) {
        this.logger.warn(`Failed to cleanup temp files for ${interviewId}: ${cleanupError.message}`);
      }
    }
  }
}
