import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { UserService } from '../modules/user/user.service';
import * as bcrypt from 'bcrypt';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  
  try {
    const userService = app.get(UserService);
    
    // Find admin user
    try {
      const adminUser = await userService.findByEmail('admin@jobtowners.com');
      console.log('Admin user found, resetting password...');
      
      // Reset password
      const hashedPassword = await bcrypt.hash('Admin@123', 10);
      adminUser.password = hashedPassword;
      await adminUser.save();
      
      console.log('Admin password reset successfully');
    } catch (error) {
      console.error('Admin user not found:', error.message);
    }
  } catch (error) {
    console.error('Error resetting admin password:', error);
  } finally {
    await app.close();
  }
}

bootstrap(); 