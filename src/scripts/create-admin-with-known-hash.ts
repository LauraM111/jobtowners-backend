import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { UserService } from '../modules/user/user.service';
import { UserRole, UserStatus } from '../modules/user/entities/user.entity';
import { Sequelize } from 'sequelize-typescript';
import { v4 as uuidv4 } from 'uuid';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  
  try {
    const sequelize = app.get(Sequelize);
    
    // Use a known working hash for 'Admin@123'
    const knownWorkingHash = '$2b$10$XtMTHZpfxzgNqIj4eCZQAeqIjzWv1s6q9RCgBZHmCsY6qFNxHSfeK';
    
    // Create a new admin user with the known hash
    await sequelize.query(
      `INSERT INTO users (
        id, 
        firstName, 
        lastName, 
        username, 
        email, 
        password, 
        role, 
        status, 
        termsAccepted, 
        emailVerified, 
        createdAt, 
        updatedAt
      ) VALUES (
        ?, 
        'Admin', 
        'User', 
        'admin4', 
        'admin4@jobtowners.com', 
        ?, 
        'admin', 
        'active', 
        1, 
        1, 
        NOW(), 
        NOW()
      )`,
      {
        replacements: [uuidv4(), knownWorkingHash],
        type: 'INSERT'
      }
    );
    
    console.log('New admin user created successfully with known working hash');
    console.log('Email: admin4@jobtowners.com');
    console.log('Password: Admin@123');
  } catch (error) {
    console.error('Error creating admin user:', error);
  } finally {
    await app.close();
  }
}

bootstrap(); 