import { ApiProperty } from '@nestjs/swagger';

export class InterviewMetadataDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Unique interview identifier',
  })
  interviewId!: string;

  @ApiProperty({
    example: 'video/550e8400-e29b-41d4-a716-446655440000.mp4',
    description: 'Path to stored video file in MinIO',
  })
  videoPath!: string;

  @ApiProperty({
    example: 'audio/550e8400-e29b-41d4-a716-446655440000.wav',
    description: 'Path to extracted audio file in MinIO',
  })
  audioPath!: string;

  @ApiProperty({
    example: 'video',
    description: 'MinIO bucket for video storage',
  })
  videoBucket!: string;

  @ApiProperty({
    example: 'audio',
    description: 'MinIO bucket for audio storage',
  })
  audioBucket!: string;

  @ApiProperty({
    example: 'uploaded',
    description: 'Interview processing status',
    enum: ['uploaded', 'processing', 'completed', 'failed'],
  })
  status!: string;

  @ApiProperty({
    example: '2024-03-30T12:00:00.000Z',
    description: 'Timestamp when interview was created',
  })
  createdAt!: Date;

  @ApiProperty({
    example: '2024-03-30T12:00:00.000Z',
    description: 'Timestamp when interview was last updated',
  })
  updatedAt!: Date;
}
