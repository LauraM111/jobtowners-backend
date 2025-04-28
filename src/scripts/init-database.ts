import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { Sequelize } from 'sequelize-typescript';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  
  try {
    const sequelize = app.get(Sequelize);
    
    // Sync database models
    await sequelize.sync({ force: true });
    
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
  } finally {
    await app.close();
  }
}

bootstrap(); 