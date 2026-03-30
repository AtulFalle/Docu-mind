/**
 * This is not a production server yet!
 * This is only a minimal backend to get started.
 */

import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

const DEFAULT_PORT = 3000;

async function bootstrap(): Promise<void> {
  
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');

  // Setup Swagger Documentation
  const config = new DocumentBuilder()
    .setTitle('DocuMind API')
    .setDescription('Interview evaluation and document management API')
    .setVersion('1.0')
    .addTag('documents', 'Document management endpoints')
    .addTag('interview', 'Interview management and evaluation endpoints')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  // Setup Swagger UI at /swagger endpoint (not prefixed with /api)
  SwaggerModule.setup('swagger', app, document);
  Logger.log('Swagger UI available at http://localhost:3000/swagger');
  
  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : DEFAULT_PORT;
  Logger.log(`App starting on port = ${port}`);
  await app.listen(port);
  Logger.log(`✅ NestJS API running at http://localhost:${port}/api`);
  Logger.log(`✅ Swagger UI available at http://localhost:${port}/swagger`);
}

bootstrap();
