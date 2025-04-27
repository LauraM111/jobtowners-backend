import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { Sequelize } from 'sequelize-typescript';
import * as bcrypt from 'bcrypt';

async function directPasswordUpdate() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const sequelize = app.get(Sequelize);
  
  try {
    const email = 'candidate@jobtowners.com';
    const password = 'Candidate@123';
    
    // Generate hash
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Execute direct SQL update
    await sequelize.query(
      `UPDATE users SET password = ? WHERE email = ?`,
      {
        replacements: [hashedPassword, email],
        type: 'UPDATE'
      }
    );
    
    console.log(`Password for ${email} updated directly via SQL`);
    
    // Verify with a select query
    const [results] = await sequelize.query(
      `SELECT id, email, password FROM users WHERE email = ?`,
      {
        replacements: [email],
        type: 'SELECT'
      }
    );
    
    if (results.length > 0) {
      const user = results[0] as { id: string; email: string; password: string };
      console.log(`User found: ${user.id}`);
      console.log(`Password hash: ${user.password.substring(0, 20)}...`);
      
      // Verify the password
      const isValid = await bcrypt.compare(password, user.password);
      console.log(`Password verification: ${isValid ? 'Success' : 'Failed'}`);
    }
  } catch (error) {
    console.error('Error updating password directly:', error);
  } finally {
    await app.close();
  }
}

directPasswordUpdate().catch(console.error); 