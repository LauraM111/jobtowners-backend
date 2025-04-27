import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { UserService } from '../modules/user/user.service';
import * as bcrypt from 'bcrypt';

async function debugAuth() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const userService = app.get(UserService);
  
  try {
    // Test credentials
    const email = 'candidate@jobtowners.com';
    const password = 'Candidate@123';
    
    // 1. Find the user
    const user = await userService.findByEmail(email);
    console.log('User details:', {
      id: user.id,
      email: user.email,
      role: user.role,
      passwordHash: user.password
    });
    
    // 2. Test password comparison
    const isValid = await bcrypt.compare(password, user.password);
    console.log('Password valid (direct bcrypt):', isValid);
    
    // 3. Test the user entity's comparePassword method
    const isValidEntity = await user.comparePassword(password);
    console.log('Password valid (entity method):', isValidEntity);
    
    // 4. Create a new hash and compare
    const newHash = await bcrypt.hash(password, 10);
    console.log('New hash:', newHash);
    const compareNew = await bcrypt.compare(password, newHash);
    console.log('New hash valid:', compareNew);
    
    // 5. Update the password with a fresh hash
    console.log('Updating password with fresh hash...');
    await userService.updatePassword(user.id, newHash);
    
    // 6. Verify the update
    const updatedUser = await userService.findByEmail(email);
    console.log('Updated password hash:', updatedUser.password);
    const isValidAfterUpdate = await bcrypt.compare(password, updatedUser.password);
    console.log('Password valid after update:', isValidAfterUpdate);
    
  } catch (error) {
    console.error('Error during debugging:', error);
  } finally {
    await app.close();
  }
}

debugAuth().catch(console.error); 