import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { Sequelize } from 'sequelize-typescript';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  
  try {
    const sequelize = app.get(Sequelize);
    
    console.log('Altering jobs table...');
    
    // Add new columns to jobs table
    await sequelize.query(`
      ALTER TABLE jobs
      ADD COLUMN IF NOT EXISTS state VARCHAR(255),
      ADD COLUMN IF NOT EXISTS latitude FLOAT,
      ADD COLUMN IF NOT EXISTS longitude FLOAT,
      ADD COLUMN IF NOT EXISTS postalCode VARCHAR(255);
    `);
    
    console.log('Jobs table altered successfully');
  } catch (error) {
    console.error('Error altering jobs table:', error);
  } finally {
    await app.close();
  }
}

bootstrap(); 