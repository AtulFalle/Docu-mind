import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { v4 as uuid } from 'uuid';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { Interview } from '../entities/interview.schema';
import { StorageService } from '../../../core/storage.service';
import { QueueService } from '../../../core/queue.service';
import { AudioProcessor } from '../processors/audio.processor';
import { UploadInterviewDto } from '../dto/upload-interview.dto';

const ALLOWED_MIME_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];
const ALLOWED_EXTENSIONS = ['.mp4', '.webm', '.mov'];

@Injectable()
export class InterviewService implements OnModuleInit {
  private readonly logger = new Logger(InterviewService.name);
  private readonly videoBucket = 'video';
  private readonly audioBucket = 'audio';

  constructor(
    @InjectModel('interviews') private interviewModel: Model<Interview>,
    private storage: StorageService,
    private queue: QueueService,
    private audioProcessor: AudioProcessor,
  ) {}

  onModuleInit(): void {
    this.logger.log('InterviewService initialized');
  }

  /**
   * Upload interview video and extract audio
   */
  async uploadInterview(
    file: Express.Multer.File,
  ): Promise<UploadInterviewDto> {
    const interviewId = uuid();
    let tempVideoPath: string | null = null;
    let tempAudioPath: string | null = null;

    try {
      // Validate file
      this.validateVideoFile(file);
      this.logger.log(
        `Starting interview upload for interviewId: ${interviewId}, fileName: ${file.originalname}`,
      );

      // Create unique filenames
      const videoFileName = `${interviewId}${this.getFileExtension(file.originalname)}`;
      const audioFileName = `${interviewId}.wav`;

      // Ensure buckets exist
      await this.storage.ensureBucket(this.videoBucket);
      await this.storage.ensureBucket(this.audioBucket);

      // Upload video to MinIO
      const videoPath = `${this.videoBucket}/${videoFileName}`;
      this.logger.debug(`Uploading video to MinIO: ${videoPath}`);
      await this.storage.upload(this.videoBucket, videoFileName, file.buffer);
      this.logger.log(`Video uploaded successfully: ${videoPath}`);

      // Create temporary files for FFmpeg processing
      tempVideoPath = path.join(os.tmpdir(), `video-${interviewId}.tmp`);
      tempAudioPath = path.join(os.tmpdir(), audioFileName);

      fs.writeFileSync(tempVideoPath, file.buffer);
      this.logger.debug(`Temporary video file created: ${tempVideoPath}`);

      // Extract audio using FFmpeg
      await this.audioProcessor.extractWavAudio(tempVideoPath, tempAudioPath);
      this.logger.log(`Audio extracted successfully: ${tempAudioPath}`);

      // Upload extracted audio to MinIO
      const audioBuffer = fs.readFileSync(tempAudioPath);
      const audioPath = `${this.audioBucket}/${audioFileName}`;
      this.logger.debug(`Uploading audio to MinIO: ${audioPath}`);
      await this.storage.upload(this.audioBucket, audioFileName, audioBuffer);
      this.logger.log(`Audio uploaded successfully: ${audioPath}`);

      // Save interview metadata to MongoDB
      const interview = await this.interviewModel.create({
        interviewId,
        videoPath,
        videoBucket: this.videoBucket,
        audioPath,
        audioBucket: this.audioBucket,
        status: 'uploaded',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      this.logger.log(`Interview record created in MongoDB: ${interviewId}`);

      // Trigger async processing job
      await this.triggerAudioProcessing(interviewId, audioPath);
      this.logger.log(`Audio processing job triggered for interviewId: ${interviewId}`);

      return {
        interviewId,
        status: 'uploaded',
        videoPath,
        audioPath,
        fileName: file.originalname,
      };
    } catch (error) {
      this.logger.error(
        `Interview upload failed for interviewId: ${interviewId}, error: ${error instanceof Error ? error.message : String(error)}`,
      );

      // Attempt cleanup
      await this.cleanupOnFailure(interviewId);

      // Re-throw with appropriate exception
      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new InternalServerErrorException(
        `Failed to upload interview: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    } finally {
      // Cleanup temporary files
      if (tempVideoPath && fs.existsSync(tempVideoPath)) {
        fs.unlinkSync(tempVideoPath);
        this.logger.debug(`Temporary video file cleaned up: ${tempVideoPath}`);
      }
      if (tempAudioPath && fs.existsSync(tempAudioPath)) {
        fs.unlinkSync(tempAudioPath);
        this.logger.debug(`Temporary audio file cleaned up: ${tempAudioPath}`);
      }
    }
  }

  /**
   * Trigger async audio processing job via RabbitMQ
   */
  private async triggerAudioProcessing(
    interviewId: string,
    audioPath: string,
  ): Promise<void> {
    try {
      await this.queue.publish({
        event: 'interview.audio_uploaded',
        data: {
          interviewId,
          audioPath,
          audioBucket: this.audioBucket,
          videoBucket: this.videoBucket,
        },
      }, 'interview.transcription');
    } catch (error) {
      this.logger.error(
        `Failed to publish audio processing job: ${error instanceof Error ? error.message : String(error)}`,
      );
      // Don't throw - job publishing failure shouldn't fail the upload
      // The interview can be reprocessed later if needed
    }
  }

  /**
   * Cleanup resources on upload failure
   */
  private async cleanupOnFailure(interviewId: string): Promise<void> {
    try {
      // Delete video if uploaded
      const videoFileName = `${interviewId}`;
      await this.storage.delete(this.videoBucket, videoFileName).catch(() => {
        // Silently ignore deletion errors
      });

      // Delete audio if extracted and uploaded
      const audioFileName = `${interviewId}.wav`;
      await this.storage.delete(this.audioBucket, audioFileName).catch(() => {
        // Silently ignore deletion errors
      });

      // Delete database record if created
      await this.interviewModel.deleteOne({ interviewId }).catch(() => {
        // Silently ignore deletion errors
      });

      this.logger.log(`Cleanup completed for interviewId: ${interviewId}`);
    } catch (error) {
      this.logger.warn(
        `Cleanup failed for interviewId: ${interviewId}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Validate uploaded video file
   */
  private validateVideoFile(file: Express.Multer.File): void {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(
        `Invalid video format. Allowed formats: ${ALLOWED_EXTENSIONS.join(', ')}`,
      );
    }

    const ext = this.getFileExtension(file.originalname).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      throw new BadRequestException(
        `Invalid video file extension. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}`,
      );
    }
  }

  /**
   * Get file extension including the dot
   */
  private getFileExtension(fileName: string): string {
    const ext = path.extname(fileName);
    return ext || '.mp4';
  }

  /**
   * Get interview by ID
   */
  async getInterview(interviewId: string): Promise<Interview | null> {
    return this.interviewModel.findOne({ interviewId }).lean();
  }

  /**
   * Get all interviews
   */
  async getAllInterviews(): Promise<Interview[]> {
    return this.interviewModel.find().lean();
  }

  /**
   * Update interview status
   */
  async updateInterviewStatus(
    interviewId: string,
    status: 'uploaded' | 'processing' | 'completed' | 'failed',
  ): Promise<void> {
    await this.interviewModel.updateOne(
      { interviewId },
      { status, updatedAt: new Date() },
    );
    this.logger.log(`Interview ${interviewId} status updated to ${status}`);
  }

  /**
   * Request evaluation for an interview
   */
  async requestEvaluation(interviewId: string): Promise<{ status: string; message: string }> {
    try {
      // Fetch interview from MongoDB
      const interview = await this.interviewModel.findOne({ interviewId }).lean();

      if (!interview) {
        throw new Error(`Interview ${interviewId} not found`);
      }

      // Check if interview has been completed and has transcripts
      if (interview.status !== 'completed') {
        throw new Error(`Interview ${interviewId} is not in completed status. Current status: ${interview.status}`);
      }

      if (!interview.transcripts || interview.transcripts.length === 0) {
        throw new Error(`Interview ${interviewId} has no transcripts available`);
      }

      // Update evaluation status to pending using $set for consistency
      await this.interviewModel.updateOne(
        { interviewId },
        {
          $set: {
            'evaluation.status': 'pending',
            'evaluation.requestedAt': new Date(),
          },
        },
      );
      this.logger.log(`Evaluation status set to pending for interviewId: ${interviewId}`);

      // Publish evaluation job to RabbitMQ
      await this.queue.publish({
        event: 'interview.evaluation_requested',
        data: {
          interviewId,
        },
      }, 'interview.evaluation');

      this.logger.log(`Evaluation job queued for interviewId: ${interviewId}`);

      return {
        status: 'pending',
        message: 'Evaluation job has been queued for processing',
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to request evaluation for ${interviewId}: ${errorMessage}`);
      throw new Error(`Failed to request evaluation: ${errorMessage}`);
    }
  }

  /**
   * Get evaluation status for an interview
   */
  async getEvaluationStatus(interviewId: string): Promise<{
    status: 'pending' | 'completed' | 'failed';
    result?: object;
    error?: string;
    requestedAt?: Date;
    completedAt?: Date;
  }> {
    try {
      const interview = await this.interviewModel.findOne({ interviewId }).lean();

      if (!interview) {
        throw new Error(`Interview ${interviewId} not found`);
      }

      if (!interview.evaluation) {
        return {
          status: 'pending',
          error: 'No evaluation has been requested',
        };
      }

      return {
        status: interview.evaluation.status,
        result: interview.evaluation.result,
        error: interview.evaluation.error,
        requestedAt: interview.evaluation.requestedAt,
        completedAt: interview.evaluation.completedAt,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to get evaluation status for ${interviewId}: ${errorMessage}`);
      throw new Error(`Failed to get evaluation status: ${errorMessage}`);
    }
  }
}
