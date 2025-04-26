import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { UserService } from '../modules/user/user.service';
import { UserRole, UserStatus } from '../modules/user/entities/user.entity';
import * as bcrypt from 'bcrypt';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  
  try {
    const userService = app.get(UserService);
    
    // Check if admin exists
    try {
      await userService.findByEmail('admin@jobtowners.com');
      console.log('Admin user already exists');
    } catch (error) {
      // Create admin user
      const hashedPassword = await bcrypt.hash('Admin@123', 10);
      
      const adminUser = {
        firstName: 'Admin',
        lastName: 'User',
        username: 'admin',
        email: 'admin@jobtowners.com',
        password: hashedPassword,
        role: UserRole.ADMIN,
        status: UserStatus.ACTIVE,
        emailVerified: true,
        termsAccepted: true
      };
      
      await userService.create(adminUser);
      console.log('Admin user created successfully');
    }
  } catch (error) {
    console.error('Error creating admin user:', error);
  } finally {
    await app.close();
  }
}

bootstrap(); 