import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { Sequelize } from 'sequelize-typescript';
import { AdminUserSeeder } from '../modules/user/admin-user-seeder';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  
  try {
    console.log('Starting database reset and seed...');
    
    // Get the Sequelize instance
    const sequelize = app.get(Sequelize);
    
    // Drop and recreate all tables
    console.log('Dropping and recreating all tables...');
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 0');
    await sequelize.sync({ force: true });
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 1');
    console.log('Database reset completed');
    
    // Run the seeder
    console.log('Starting user seeding...');
    const seeder = app.get(AdminUserSeeder);
    await seeder.seed();
    console.log('User seeding completed');
    
  } catch (error) {
    console.error('Error during reset and seed:', error);
  } finally {
    // Wait a bit before closing to ensure all operations complete
    setTimeout(async () => {
      await app.close();
      console.log('Application closed');
    }, 2000);
  }
}

bootstrap(); 