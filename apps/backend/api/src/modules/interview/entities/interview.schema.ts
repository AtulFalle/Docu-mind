import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

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
}

export const InterviewSchema = SchemaFactory.createForClass(Interview);
