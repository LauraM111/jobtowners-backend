import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { UserService } from '../modules/user/user.service';
import * as bcrypt from 'bcrypt';

async function resetAllPasswords() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const userService = app.get(UserService);
  
  try {
    // Define users and their passwords
    const users = [
      { email: 'admin@jobtowners.com', password: 'Admin@123' },
      { email: 'candidate@jobtowners.com', password: 'Candidate@123' },
      { email: 'employer@jobtowners.com', password: 'Employer@123' }
    ];
    
    for (const userData of users) {
      // Find user
      const user = await userService.findByEmail(userData.email);
      if (!user) {
        console.log(`User ${userData.email} not found, skipping`);
        continue;
      }
      
      console.log(`Resetting password for ${userData.email}...`);
      
      // Hash and update password
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      await userService.update(user.id, { password: hashedPassword });
      
      console.log(`Password reset complete for ${userData.email}`);
    }
    
    console.log('All passwords have been reset successfully');
  } catch (error) {
    console.error('Error resetting passwords:', error);
  } finally {
    await app.close();
  }
}

resetAllPasswords().catch(console.error); 