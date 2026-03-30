import {
  Controller,
  Post,
  Get,
  Param,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { InterviewService } from '../service/interview.service';
import { UploadInterviewDto } from '../dto/upload-interview.dto';
import { InterviewMetadataDto } from '../dto/interview-metadata.dto';

@Controller('interview')
export class InterviewController {
  constructor(private readonly interviewService: InterviewService) {}

  @ApiOperation({ summary: 'Upload an interview video and extract audio' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Interview video file to upload',
    schema: {
      type: 'object',
      properties: {
        video: {
          type: 'string',
          format: 'binary',
          description: 'The video file to upload (mp4, webm, mov)',
        },
      },
      required: ['video'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Interview video uploaded and audio extracted successfully',
    type: UploadInterviewDto,
  })
  @ApiResponse({
    status: 400,
    description:
      'Bad request - invalid file format or missing file',
  })
  @ApiResponse({
    status: 500,
    description:
      'Internal server error - video upload, audio extraction, or storage failure',
  })
  @Post('upload')
  @UseInterceptors(FileInterceptor('video'))
  async upload(
    @UploadedFile() file: Express.Multer.File,
  ): Promise<UploadInterviewDto> {
    return this.interviewService.uploadInterview(file);
  }

  @ApiOperation({ summary: 'Get all interviews' })
  @ApiResponse({
    status: 200,
    description: 'Return a list of all interviews',
    type: [InterviewMetadataDto],
  })
  @Get()
  async findAll(): Promise<InterviewMetadataDto[]> {
    const interviews = await this.interviewService.getAllInterviews();
    return interviews.map((interview) => this.mapToDto(interview));
  }

  @ApiOperation({ summary: 'Get specific interview by ID' })
  @ApiParam({
    name: 'interviewId',
    description: 'Interview ID (UUID)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'Interview details retrieved successfully',
    type: InterviewMetadataDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Interview not found',
  })
  @Get(':interviewId')
  async findOne(
    @Param('interviewId') interviewId: string,
  ): Promise<InterviewMetadataDto> {
    const interview = await this.interviewService.getInterview(interviewId);
    if (!interview) {
      throw new Error(`Interview ${interviewId} not found`);
    }
    return this.mapToDto(interview);
  }

  /**
   * Map Interview entity to DTO
   */
  private mapToDto(interview: any): InterviewMetadataDto {
    return {
      interviewId: interview.interviewId,
      videoPath: interview.videoPath,
      audioPath: interview.audioPath,
      videoBucket: interview.videoBucket,
      audioBucket: interview.audioBucket,
      status: interview.status,
      createdAt: interview.createdAt,
      updatedAt: interview.updatedAt,
    };
  }
}
