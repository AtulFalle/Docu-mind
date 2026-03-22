// queue.service.ts

import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as amqp from 'amqplib';
import { EventEmitter } from 'events';

@Injectable()
export class QueueService implements OnModuleInit {
  public readonly events = new EventEmitter();
  private readonly logger = new Logger(QueueService.name);
  private channel: any = null;
  private connection: any = null;
  private readonly queueEnabled: boolean;
  private readonly rabbitmqUrl: string;
  private reconnectAttempts = 0;
  private readonly maxReconnectAttempts = 5;
  private readonly reconnectDelay = 5000;

  constructor(private configService: ConfigService) {
    this.queueEnabled = this.configService.get<string>('QUEUE_ENABLED', 'true') !== 'false';
    this.rabbitmqUrl = this.resolveRabbitmqUrl();
  }

  private resolveRabbitmqUrl(): string {
    const envUrl = this.configService.get<string>('RABBITMQ_URL');
    if (envUrl && envUrl.trim()) {
      return envUrl;
    }

    const host = this.configService.get<string>('RABBITMQ_HOST') || 'rabbitmq';
    const port = this.configService.get<string>('RABBITMQ_PORT') || '5672';
    const user = this.configService.get<string>('RABBITMQ_USER') || 'guest';
    const password = this.configService.get<string>('RABBITMQ_PASSWORD') || 'guest';

    return `amqp://${user}:${password}@${host}:${port}`;
  }

  async onModuleInit() {
    if (!this.queueEnabled) {
      this.logger.warn('Queue service disabled via QUEUE_ENABLED=false');
      return;
    }

    await this.connect();
  }

  private async connect(): Promise<void> {
    try {
      this.logger.log(`Connecting to RabbitMQ at ${this.rabbitmqUrl}...`);
      
      this.connection = await amqp.connect(this.rabbitmqUrl);
      
      // Handle connection close
      this.connection.on('close', () => {
        this.logger.warn('RabbitMQ connection closed. Attempting to reconnect...');
        this.channel = null;
        this.connection = null;
        this.reconnectAttempts = 0;
        setTimeout(() => this.connect(), this.reconnectDelay);
      });

      // Handle connection errors
      this.connection.on('error', (error: any) => {
        this.logger.error(`RabbitMQ connection error: ${error.message}`);
        this.channel = null;
      });

      this.channel = await this.connection.createChannel();
      
      // Handle channel close
      this.channel.on('close', () => {
        this.logger.warn('RabbitMQ channel closed');
        this.channel = null;
      });

      // Handle channel errors
      this.channel.on('error', (error: any) => {
        this.logger.error(`RabbitMQ channel error: ${error.message}`);
      });

      await this.channel.assertQueue('document_queue', { durable: true });
      
      await this.channel.assertQueue('document_status_queue', { durable: true });
      this.channel.consume('document_status_queue', (msg: any) => {
        if (msg) {
          try {
            const content = JSON.parse(msg.content.toString());
            this.events.emit(content.event, content.data);
            this.channel.ack(msg);
          } catch (e) {
            this.logger.error(`Error processing status message: ${e}`);
            this.channel.nack(msg, false, false);
          }
        }
      });
      
      this.logger.log('RabbitMQ connection established successfully');
      this.reconnectAttempts = 0;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to connect to RabbitMQ: ${errorMessage}`);
      
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        this.reconnectAttempts++;
        this.logger.log(
          `Reconnecting... (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`
        );
        setTimeout(() => this.connect(), this.reconnectDelay);
      } else {
        this.logger.error('[CRITICAL] Max reconnection attempts reached. Queue service disabled.');
        this.channel = null;
      }
    }
  }

  async publish(event: any): Promise<void> {
    if (!this.queueEnabled) {
      this.logger.debug('Queue disabled via QUEUE_ENABLED=false - skipping message publish');
      return;
    }

    if (!this.channel) {
      this.logger.warn('RabbitMQ channel unavailable. Attempting immediate reconnect before publish...');
      await this.connect();
    }

    if (!this.channel) {
      this.logger.error('Unable to publish message: RabbitMQ channel still unavailable after reconnect');
      return;
    }

    const message = {
      ...event,
      timestamp: new Date().toISOString(),
      id: Math.random().toString(36).substring(2, 11),
    };

    try {
      this.channel.sendToQueue(
        'document_queue',
        Buffer.from(JSON.stringify(message)),
        {
          persistent: true,
          contentType: 'application/json',
        },
      );
      this.logger.log(`Message published to queue with ID: ${message.id}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to publish message to queue: ${errorMessage}`);
      // don't throw - queue failures shouldn't break the upload flow
    }
  }
}