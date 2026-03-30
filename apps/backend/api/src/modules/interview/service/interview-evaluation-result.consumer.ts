import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Interview } from '../entities/interview.schema';
import { QueueService } from '../../../core/queue.service';

/**
 * Service to handle evaluation result callbacks from the AI service.
 * Listens to RabbitMQ events and updates MongoDB with evaluation results.
 */
@Injectable()
export class InterviewEvaluationResultConsumer implements OnModuleInit {
  private readonly logger = new Logger(InterviewEvaluationResultConsumer.name);

  constructor(
    @InjectModel('interviews') private interviewModel: Model<Interview>,
    private queue: QueueService,
  ) {}

  onModuleInit(): void {
    this.setupEventListeners();
    this.logger.log('InterviewEvaluationResultConsumer initialized');
  }

  /**
   * Setup event listeners for evaluation completion
   */
  private setupEventListeners(): void {
    // Listen for evaluation completed events from RabbitMQ
    this.queue.events.on('interview.evaluation_completed', async (data) => {
      try {
        await this.handleEvaluationCompleted(data);
      } catch (err) {
        this.logger.error(
          `Error in evaluation completion handler: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    });

    this.logger.log('Event listeners setup for evaluation results');
  }

  /**
   * Handle evaluation completed event
   */
  private async handleEvaluationCompleted(data: any): Promise<void> {
    const interviewId = data.interviewId;
    const status = data.status; // 'completed' or 'failed'
    const result = data.result;
    const error = data.error;

    try {
      this.logger.log(
        `Received evaluation result for interview ${interviewId}, status: ${status}`,
      );
      this.logger.debug(`Result data: ${JSON.stringify(result)}`);

      if (!interviewId) {
        this.logger.error('No interviewId in evaluation result');
        return;
      }

      if (status === 'completed' && result) {
        // Successful evaluation
        this.logger.debug(
          `Processing completed evaluation with result fields: ${Object.keys(result).join(', ')}`,
        );
        await this.updateEvaluationResult(interviewId, result);
      } else if (status === 'failed') {
        // Failed evaluation
        this.logger.warn(`Evaluation failed with error: ${error}`);
        await this.updateEvaluationError(interviewId, error);
      } else {
        this.logger.warn(
          `Unknown evaluation status: ${status}, result present: ${!!result}`,
        );
      }
    } catch (err) {
      this.logger.error(
        `Error handling evaluation result for ${interviewId}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  /**
   * Update MongoDB with successful evaluation result
   */
  private async updateEvaluationResult(
    interviewId: string,
    result: any,
  ): Promise<void> {
    try {
      const updateData = {
        'evaluation.status': 'completed',
        'evaluation.result': result,
        'evaluation.completedAt': new Date(),
      };

      this.logger.debug(
        `Updating evaluation result for ${interviewId}. Update data: ${JSON.stringify(updateData)}`,
      );

      const updateResult = await this.interviewModel.updateOne(
        { interviewId },
        { $set: updateData },
      );

      if (updateResult.matchedCount === 0) {
        this.logger.warn(`Interview ${interviewId} not found for result update`);
      } else {
        this.logger.log(
          `Evaluation result updated for interview ${interviewId} (${updateResult.modifiedCount} documents modified)`,
        );
      }
    } catch (err) {
      this.logger.error(
        `Failed to update evaluation result for ${interviewId}: ${err instanceof Error ? err.message : String(err)}`,
      );

      throw err;
    }
  }

  /**
   * Update MongoDB with failed evaluation
   */
  private async updateEvaluationError(
    interviewId: string,
    error: string,
  ): Promise<void> {
    try {
      const updateData = {
        'evaluation.status': 'failed',
        'evaluation.error': error || 'Unknown error',
        'evaluation.completedAt': new Date(),
      };

      const updateResult = await this.interviewModel.updateOne(
        { interviewId },
        { $set: updateData },
      );

      if (updateResult.matchedCount === 0) {
        this.logger.warn(`Interview ${interviewId} not found for error update`);
      } else {
        this.logger.log(
          `Evaluation error recorded for interview ${interviewId}`,
        );
      }
    } catch (err) {
      this.logger.error(
        `Failed to update evaluation error for ${interviewId}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
}
