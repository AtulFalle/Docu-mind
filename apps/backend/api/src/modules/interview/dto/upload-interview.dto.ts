import { ApiProperty } from '@nestjs/swagger';

export class UploadInterviewDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Unique interview identifier',
  })
  interviewId!: string;

  @ApiProperty({
    example: 'uploaded',
    description: 'Interview processing status',
  })
  status!: string;

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
    example: '550e8400-e29b-41d4-a716-446655440000.mp4',
    description: 'Original video filename',
  })
  fileName!: string;
}
