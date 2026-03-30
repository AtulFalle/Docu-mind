import { Module, Logger } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { InterviewController } from './controller/interview.controller';
import { InterviewService } from './service/interview.service';
import { InterviewEvaluationResultConsumer } from './service/interview-evaluation-result.consumer';
import { AudioProcessor } from './processors/audio.processor';
import { Interview, InterviewSchema } from './entities/interview.schema';
import { StorageService } from '../../core/storage.service';
import { QueueService } from '../../core/queue.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: 'interviews',
        schema: InterviewSchema,
        collection: 'interviews',
      },
    ]),
  ],
  controllers: [InterviewController],
  providers: [InterviewService, InterviewEvaluationResultConsumer, AudioProcessor, StorageService, QueueService],
  exports: [InterviewService],
})
export class InterviewModule {
  private readonly logger = new Logger(InterviewModule.name);

  constructor() {
    this.logger.log('InterviewModule initialized');
  }
}
