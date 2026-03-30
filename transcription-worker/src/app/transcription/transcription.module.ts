import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';

import { TranscriptionConsumer } from './transcription.consumer';
import { WhisperService } from './whisper.service';
import { ParserService } from './parser.service';
import { StorageService } from '../../../../apps/backend/api/src/core/storage.service';
import { Interview, InterviewSchema } from '../../../../apps/backend/api/src/modules/interview/entities/interview.schema';

@Module({
  imports: [
    ConfigModule,
    MongooseModule.forFeature([{ name: Interview.name, schema: InterviewSchema }])
  ],
  providers: [
    TranscriptionConsumer,
    WhisperService,
    ParserService,
    StorageService
  ],
})
export class TranscriptionModule {}
