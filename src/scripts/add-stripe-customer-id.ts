import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { Sequelize } from 'sequelize-typescript';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  
  try {
    const sequelize = app.get(Sequelize);
    
    // Add stripeCustomerId column to users table
    await sequelize.query(`
      ALTER TABLE users 
      ADD COLUMN stripeCustomerId VARCHAR(255) NULL;
    `);
    
    console.log('Successfully added stripeCustomerId column to users table');
  } catch (error) {
    console.error('Error adding stripeCustomerId column:', error);
  } finally {
    await app.close();
  }
}

bootstrap(); 