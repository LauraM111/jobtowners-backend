import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { UserSeeder } from '../database/seeders/user.seeder';
import './seeders/candidate-plan.seeder';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  
  try {
    console.log('Running seeders...');
    
    // Get the UserSeeder from the app context
    const userSeeder = app.get(UserSeeder);
    
    // Run the seeder
    await userSeeder.seed();
    
    console.log('Running candidate plan seeder...');
    await import('./seeders/candidate-plan.seeder');
    
    console.log('Seeders completed successfully');
  } catch (error) {
    console.error('Error running seeders:', error);
  } finally {
    await app.close();
  }
}

bootstrap(); 