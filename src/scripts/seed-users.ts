import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { AdminUserSeeder } from '../modules/user/admin-user-seeder';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  
  try {
    console.log('Starting user seeding...');
    
    // Disable database sync in AppModule temporarily
    const sequelize = app.get('SEQUELIZE');
    
    // Run the seeder
    const seeder = app.get(AdminUserSeeder);
    await seeder.seed();
    
    console.log('User seeding completed');
  } catch (error) {
    console.error('Error during seeding:', error);
  } finally {
    // Make sure to wait a bit before closing to allow all operations to complete
    setTimeout(async () => {
      await app.close();
      console.log('Application closed');
    }, 1000);
  }
}

bootstrap(); 