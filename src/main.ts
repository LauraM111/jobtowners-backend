import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import helmet from 'helmet';
import { ConfigService } from '@nestjs/config';
import * as bodyParser from 'body-parser';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

// Load .env file
dotenv.config();

// Load .env.local file if it exists
if (fs.existsSync('.env.local')) {
  dotenv.config({ path: '.env.local', override: true });
}

const execAsync = promisify(exec);

async function bootstrap() {
  try {
    // Run database initialization first
    console.log('Initializing database...');
    try {
      await execAsync('npm run init-db');
      console.log('Database initialized successfully.');
    } catch (error) {
      console.error('Error initializing database:', error.message);
      // Continue anyway, as the app might still work with an existing database
    }
    

    const app = await NestFactory.create<NestExpressApplication>(AppModule, {
      bodyParser: false, // Disable the built-in body parser
    });
  
    // Use raw body parser for webhook routes
    app.use('/api/v1/webhooks/stripe', bodyParser.raw({ type: 'application/json' }));
  
    // Use JSON body parser for all other routes
    app.use(bodyParser.json({ limit: '50mb' }));
    app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));
  
    const configService = app.get(ConfigService);
  
    // Apply global prefix
    app.setGlobalPrefix('api/v1');
  
    // Enable CORS with more detailed configuration
    app.enableCors({
      origin: process.env.NODE_ENV === 'production'
        ? ['https://your-production-domain.com','https://www.jobtowners.com','https://jobtowners.com','admin.jobtowners.com','https://admin.jobtowners.com',"https://www.admin.jobtowners.com"]
        : ['http://localhost:3000','localhost:3000', 'localhost:5173','http://localhost:5173','https://jobtowners.com','https://jobtowners.com','https://admin.jobtowners.com','https://admin.jobtowners.com'], // Correct dev URL
      credentials: true,
      methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
      allowedHeaders: 'Content-Type,Authorization,X-Requested-With,Accept',
    });
  
    // Serve static files
    app.useStaticAssets(join(__dirname, '..', 'uploads'), {
      prefix: '/uploads',
    });
  
    // Use Helmet for security headers
    app.use(helmet());
  
    // Configure global validation pipe to strip unknown properties
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true, // This will strip properties that don't have decorators
        forbidNonWhitelisted: false, // This will allow unknown properties without throwing errors
        transform: true,
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
    console.log(`Application is running on: ${await app.getUrl()}`);
  } catch (error) {
    console.error('Failed to start application:', error);
    process.exit(1);
  }
}
bootstrap(); 