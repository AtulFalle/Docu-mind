import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export interface InterviewEvaluation {
  status: 'pending' | 'completed' | 'failed';
  result?: {
    technical: number;
    communication: number;
    confidence: number;
    consistency: number;
    aiRisk: number;
    strengths: string[];
    weaknesses: string[];
    summary: string;
  };
  error?: string;
  requestedAt?: Date;
  completedAt?: Date;
}

@Schema({ timestamps: true })
export class Interview extends Document {
  @Prop({ required: true, type: String })
  interviewId!: string;

  @Prop({ required: true, type: String })
  videoPath!: string;

  @Prop({ required: true, type: String })
  videoBucket!: string;

  @Prop({ required: true, type: String })
  audioPath!: string;

  @Prop({ required: true, type: String })
  audioBucket!: string;

  @Prop({
    required: true,
    type: String,
    enum: ['uploaded', 'processing', 'transcribed', 'completed', 'failed'],
    default: 'uploaded',
  })
  status!: string;

  @Prop({ type: Date })
  createdAt?: Date;

  @Prop({ type: Date })
  updatedAt?: Date;

  @Prop({
    type: [{
      start: { type: Number, required: true },
      end: { type: Number, required: true },
      text: { type: String, required: true }
    }],
    default: []
  })
  transcripts!: Array<{ start: number; end: number; text: string }>;

  @Prop({
    type: {
      status: {
        type: String,
        enum: ['pending', 'completed', 'failed'],
        required: true,
      },
      result: {
        type: {
          technical: { type: Number, required: true },
          communication: { type: Number, required: true },
          confidence: { type: Number, required: true },
          consistency: { type: Number, required: true },
          aiRisk: { type: Number, required: true },
          strengths: { type: [String], required: true },
          weaknesses: { type: [String], required: true },
          summary: { type: String, required: true },
        },
        required: false,
      },
      error: { type: String, required: false },
      requestedAt: { type: Date, required: false },
      completedAt: { type: Date, required: false },
    },
    required: false,
  })
  evaluation?: InterviewEvaluation;
}

export const InterviewSchema = SchemaFactory.createForClass(Interview);
