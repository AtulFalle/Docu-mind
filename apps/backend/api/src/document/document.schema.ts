// document.schema.ts

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type document = HydratedDocument<Document>;

@Schema({ timestamps: true })
export class Document {
  @Prop({required: true})
  docId!: string;

  @Prop()
  fileName!: string;

  @Prop()
  bucket!: string;

  @Prop()
  key!: string;

  @Prop({ default: 'uploaded' })
  status!: 'uploaded' | 'processing' | 'completed' | 'failed';
}

export const DocumentSchema = SchemaFactory.createForClass(Document);