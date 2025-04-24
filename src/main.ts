import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import helmet from 'helmet';
import { ConfigService } from '@nestjs/config';

// Load .env file
dotenv.config();

// Load .env.local file if it exists
if (fs.existsSync('.env.local')) {
  dotenv.config({ path: '.env.local', override: true });
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  
  // Apply global prefix
  app.setGlobalPrefix('api/v1');
  
  // Enable CORS
  app.enableCors();
  
  // Use Helmet for security headers
  app.use(helmet());
  
  // Apply validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,  // This will strip properties that don't have any decorators
      forbidNonWhitelisted: false,  // This will not throw an error for non-whitelisted properties
      transform: true,  // This will transform payloads to be objects typed according to their DTO classes
    }),
  );
  
  // Setup Swagger
  const config = new DocumentBuilder()
    .setTitle('JobTowners API')
    .setDescription('The JobTowners API description')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);
  
  // Get port from config
  const port = configService.get<number>('PORT') || 3000;
  
  await app.listen(port);
  console.log(`Application is running on: http://localhost:${port}`);
}
bootstrap(); 