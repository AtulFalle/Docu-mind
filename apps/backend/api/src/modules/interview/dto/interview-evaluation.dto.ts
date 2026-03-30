import { ApiProperty } from '@nestjs/swagger';

export class InterviewEvaluationResultDto {
  @ApiProperty({
    example: 8.5,
    description: 'Technical competency score (1-10 scale)',
  })
  technical!: number;

  @ApiProperty({
    example: 7.5,
    description: 'Communication skills score (1-10 scale)',
  })
  communication!: number;

  @ApiProperty({
    example: 8.0,
    description: 'Confidence level score (1-10 scale)',
  })
  confidence!: number;

  @ApiProperty({
    example: 7.8,
    description: 'Consistency in answers score (1-10 scale)',
  })
  consistency!: number;

  @ApiProperty({
    example: 2.5,
    description: 'AI risk indicator score (1-10 scale, higher = more risk)',
  })
  aiRisk!: number;

  @ApiProperty({
    example: ['Strong technical foundation', 'Clear communication', 'Good problem-solving'],
    description: 'List of identified strengths',
    type: [String],
  })
  strengths!: string[];

  @ApiProperty({
    example: ['Limited experience with frameworks', 'Some hesitation in responses'],
    description: 'List of identified weaknesses',
    type: [String],
  })
  weaknesses!: string[];

  @ApiProperty({
    example: 'Candidate demonstrates solid technical knowledge with good communication skills. Shows confidence in problem-solving but may lack framework-specific experience.',
    description: 'Overall summary of the evaluation',
  })
  summary!: string;
}

export class InterviewEvaluationStatusDto {
  @ApiProperty({
    example: 'pending',
    description: 'Evaluation status',
    enum: ['pending', 'completed', 'failed'],
  })
  status!: 'pending' | 'completed' | 'failed';

  @ApiProperty({
    description: 'Evaluation result (present if status is completed)',
    type: InterviewEvaluationResultDto,
    required: false,
  })
  result?: InterviewEvaluationResultDto;

  @ApiProperty({
    example: 'Ollama service timeout after 120 seconds',
    description: 'Error message if status is failed',
    required: false,
  })
  error?: string;

  @ApiProperty({
    example: '2024-03-30T12:05:00.000Z',
    description: 'Timestamp when evaluation was requested',
  })
  requestedAt?: Date;

  @ApiProperty({
    example: '2024-03-30T12:06:30.000Z',
    description: 'Timestamp when evaluation was completed',
    required: false,
  })
  completedAt?: Date;
}
