import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { UserService } from '../modules/user/user.service';
import * as bcrypt from 'bcrypt';

async function fixCandidatePassword() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const userService = app.get(UserService);
  
  try {
    // Find candidate user
    const email = 'candidate@jobtowners.com';
    const password = 'Candidate@123';
    
    const user = await userService.findByEmail(email);
    console.log(`Found candidate user: ${user.id}`);
    
    // Generate new password hash
    const hashedPassword = await bcrypt.hash(password, 10);
    console.log(`Generated new hash: ${hashedPassword.substring(0, 20)}...`);
    
    // Use the updatePassword method we fixed earlier
    await userService.updatePassword(user.id, hashedPassword);
    
    console.log('Password updated successfully');
    
    // Verify the new password
    const updatedUser = await userService.findByEmail(email);
    const isValid = await bcrypt.compare(password, updatedUser.password);
    console.log(`Password verification: ${isValid ? 'Success' : 'Failed'}`);
    
    if (!isValid) {
      console.log('Current password hash:', updatedUser.password);
      console.log('Expected hash from same password:', hashedPassword);
    }
  } catch (error) {
    console.error('Error fixing candidate password:', error);
  } finally {
    await app.close();
  }
}

fixCandidatePassword().catch(console.error); 