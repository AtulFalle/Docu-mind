/**
 * This is not a production server yet!
 * This is only a minimal backend to get started.
 */

import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';
import { SwaggerModule, DocumentBuilder, OpenAPIObject } from '@nestjs/swagger';

const DEFAULT_PORT = 3000;

async function bootstrap(): Promise<void> {
  
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');

  const config = new DocumentBuilder()
    .setTitle('Docu-Mind ')
    .setDescription('The DocuMind API description')
    .setVersion('1.0')
    .addTag('documents')
    .build();
  const documentFactory = (): OpenAPIObject => SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, documentFactory);
  
  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : DEFAULT_PORT;
  Logger.log(`app starting on port = ${port}`);
  await app.listen(port);
  
}

bootstrap();
