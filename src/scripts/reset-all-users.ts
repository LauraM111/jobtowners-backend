import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { UserService } from '../modules/user/user.service';
import { Sequelize } from 'sequelize-typescript';
import * as bcrypt from 'bcrypt';

async function resetAllUsers() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const userService = app.get(UserService);
  const sequelize = app.get(Sequelize);
  
  try {
    // Define users and their passwords
    const users = [
      { email: 'admin@jobtowners.com', password: 'Admin@123' },
      { email: 'candidate@jobtowners.com', password: 'Candidate@123' },
      { email: 'employer@jobtowners.com', password: 'Employer@123' }
    ];
    
    // Use direct SQL for maximum reliability
    for (const userData of users) {
      // Hash password
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      
      // Update directly with SQL
      await sequelize.query(
        `UPDATE users SET password = ? WHERE email = ?`,
        {
          replacements: [hashedPassword, userData.email],
          type: 'UPDATE'
        }
      );
      
      console.log(`Reset password for ${userData.email}`);
      
      // Verify
      const [results] = await sequelize.query(
        `SELECT id, email FROM users WHERE email = ?`,
        {
          replacements: [userData.email],
          type: 'SELECT'
        }
      );
      
      if (results.length > 0) {
        const user = results[0] as { id: string; email: string };
        console.log(`Verified user: ${user.id}`);
      } else {
        console.log(`User ${userData.email} not found!`);
      }
    }
    
    console.log('All passwords have been reset successfully');
  } catch (error) {
    console.error('Error resetting users:', error);
  } finally {
    await app.close();
  }
}

resetAllUsers().catch(console.error); 