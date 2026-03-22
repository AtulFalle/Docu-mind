import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { HttpModule } from '@nestjs/axios';
import { DocumentSchema } from './document.schema';
import { DocumentController } from './document.controller';
import { DocumentService } from './document.service';
import { QueueService } from './queue.service';
import { StorageService } from './storage.service';
import { VirusService } from './virus.service';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot(),
    HttpModule,
    MongooseModule.forFeature([
      {
        name: 'documents',
        schema: DocumentSchema,
      },
    ]),
  ],
  controllers: [DocumentController],
  providers: [DocumentService, QueueService, StorageService, VirusService],
})
export class DocumentModule {}
