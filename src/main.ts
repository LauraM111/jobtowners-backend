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
  
  // Global prefix
  app.setGlobalPrefix('api/v1');
  
  app.enableCors({
    origin: [process.env.FRONTEND_URL || 'https://jobtowners.co'],
    credentials: true,
  });
  
  // Use Helmet for security headers
  app.use(helmet());
  
  // Enable validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  
  // Setup Swagger
  const config = new DocumentBuilder()
    .setTitle('JobTowners API')
    .setDescription('JobTowners API Documentation')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);
  
  // Start the server
  const port = configService.get<number>('PORT') || 3000;
  await app.listen(port);
  console.log(`Application is running on: http://localhost:${port}`);
}
bootstrap(); 