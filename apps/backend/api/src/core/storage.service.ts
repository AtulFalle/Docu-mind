// storage.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { Client } from 'minio';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private client: Client | null = null;
  private readonly storageEnabled: boolean;

  constructor() {
    this.storageEnabled = process.env.STORAGE_ENABLED !== 'false';
    if (this.storageEnabled) {
      this.initializeClient();
    } else {
      this.logger.warn('Storage service disabled via STORAGE_ENABLED=false');
    }
  }

  private initializeClient(): void {
    try {
      this.client = new Client({
        endPoint: process.env.MINIO_ENDPOINT || 'minio',
        port: parseInt(process.env.MINIO_PORT || '9000'),
        useSSL: process.env.MINIO_USE_SSL === 'true',
        accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
        secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
      });
      this.logger.log('MinIO client initialized successfully');
    } catch (error) {
      this.logger.error(`Failed to initialize MinIO client: ${error instanceof Error ? error.message : 'Unknown error'}`);
      this.client = null;
    }
  }

  async upload(bucket: string, key: string, file: Buffer): Promise<void> {
    if (!this.storageEnabled) {
      this.logger.debug('Storage disabled - skipping upload');
      return;
    }

    if (!this.client) {
      throw new Error('MinIO client not available');
    }

    try {
      await this.client.putObject(bucket, key, file);
      this.logger.debug(`File uploaded to ${bucket}/${key}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to upload file to MinIO: ${errorMessage}`);
      throw new Error(`Storage upload failed: ${errorMessage}`);
    }
  }

  async download(bucket: string, key: string, destPath: string): Promise<void> {
    if (!this.storageEnabled) {
      this.logger.debug('Storage disabled - skipping download');
      return;
    }

    if (!this.client) {
      throw new Error('MinIO client not available');
    }

    try {
      await this.client.fGetObject(bucket, key, destPath);
      this.logger.log(`File downloaded from ${bucket}/${key} to ${destPath}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to download file from MinIO: ${errorMessage}`);
      throw new Error(`Storage download failed: ${errorMessage}`);
    }
  }

  async ensureBucket(bucket: string): Promise<void> {
    if (!this.storageEnabled) {
      this.logger.debug('Storage disabled - skipping bucket creation');
      return;
    }

    if (!this.client) {
      throw new Error('MinIO client not available');
    }

    try {
      const exists = await this.client.bucketExists(bucket);
      if (!exists) {
        await this.client.makeBucket(bucket);
        this.logger.debug(`Bucket ${bucket} created`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to ensure bucket exists: ${errorMessage}`);
      throw new Error(`Storage bucket operation failed: ${errorMessage}`);
    }
  }

  async delete(bucket: string, key: string): Promise<void> {
    if (!this.storageEnabled) {
      this.logger.debug('Storage disabled - skipping delete');
      return;
    }

    if (!this.client) {
      throw new Error('MinIO client not available');
    }

    try {
      await this.client.removeObject(bucket, key);
      this.logger.debug(`File deleted from ${bucket}/${key}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to delete file from MinIO: ${errorMessage}`);
      throw new Error(`Storage delete failed: ${errorMessage}`);
    }
  }
}