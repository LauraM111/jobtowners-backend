import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { UserService } from '../modules/user/user.service';
import { Sequelize } from 'sequelize-typescript';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  
  try {
    const sequelize = app.get(Sequelize);
    
    // Use a known working hash for 'Admin@123'
    const knownWorkingHash = '$2b$10$XtMTHZpfxzgNqIj4eCZQAeqIjzWv1s6q9RCgBZHmCsY6qFNxHSfeK';
    
    // Update the admin password directly in the database
    await sequelize.query(
      `UPDATE users SET password = ? WHERE email = 'admin@jobtowners.com'`,
      {
        replacements: [knownWorkingHash],
        type: 'UPDATE'
      }
    );
    
    console.log('Admin password updated successfully with known working hash');
    
    // Verify the admin user exists
    const userService = app.get(UserService);
    try {
      const adminUser = await userService.findByEmail('admin@jobtowners.com');
      console.log('Admin user found:', adminUser.id);
    } catch (error) {
      console.error('Admin user not found:', error.message);
    }
  } catch (error) {
    console.error('Error updating admin password:', error);
  } finally {
    await app.close();
  }
}

bootstrap(); 