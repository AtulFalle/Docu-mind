// document.controller.ts

import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UploadedFile,
  UseInterceptors
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiParam
} from '@nestjs/swagger';
import { DocumentService } from './document.service';
import { Document } from './document.schema';

@Controller('documents')
export class DocumentController {
  constructor(private service: DocumentService) {}

  @ApiOperation({ summary: 'Upload a document file' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Document file to upload',
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'The file to upload',
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Document uploaded successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - invalid file or file is infected with malware' })
  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async upload(@UploadedFile() file: Express.Multer.File): Promise<{ docId: string; status: string }> {
    return this.service.upload(file);
  }

  @ApiOperation({ summary: 'List all documents' })
  @ApiResponse({ status: 200, description: 'Return a list of all documents' })
  @Get()
  async findAll(): Promise<Document[]> {
    return this.service.findAll();
  }

  @ApiOperation({ summary: 'Query a document with AI' })
  @ApiParam({ name: 'docId', description: 'Document ID' })
  @ApiBody({
    description: 'Query request',
    schema: {
      type: 'object',
      properties: {
        question: {
          type: 'string',
          description: 'The question to ask about the document',
        },
      },
      required: ['question'],
    },
  })
  @ApiResponse({ status: 200, description: 'Query answered successfully' })
  @ApiResponse({ status: 404, description: 'Document not found' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  @Post(':docId/query')
  async query(@Param('docId') docId: string, @Body() body: { question: string }): Promise<unknown> {
    return this.service.query(docId, body.question);
  }
}