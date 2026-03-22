/**
 * This is not a production server yet!
 * This is only a minimal backend to get started.
 */

import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

async function bootstrap() {
  
  const app = await NestFactory.create(AppModule);

  const config = new DocumentBuilder()
    .setTitle('DocuMind ')
    .setDescription('The DocuMind API description')
    .setVersion('1.0')
    .addTag('documents')
    .build();
  const documentFactory = () => SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, documentFactory);
  Logger.log('app starting on port 3000');
  await app.listen(process.env.PORT ?? 3000);
  
}

bootstrap();
