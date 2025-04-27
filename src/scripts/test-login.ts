import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { AuthService } from '../modules/auth/auth.service';
import { UserService } from '../modules/user/user.service';
import * as bcrypt from 'bcrypt';

async function testLogin() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const authService = app.get(AuthService);
  const userService = app.get(UserService);
  
  try {
    // Test credentials
    const email = 'admin@jobtowners.com';
    const password = 'Admin@123';
    
    // Find user directly
    const user = await userService.findByEmail(email);
    console.log('User found:', {
      id: user.id,
      email: user.email,
      role: user.role,
      passwordHash: user.password.substring(0, 20) + '...' // Show part of the hash for debugging
    });
    
    // Test password manually
    const isPasswordValid = await bcrypt.compare(password, user.password);
    console.log('Password valid (manual check):', isPasswordValid);
    
    // Test through auth service
    const validatedUser = await authService.validateUser(email, password);
    console.log('Auth service validation result:', validatedUser ? 'Success' : 'Failed');
    
    if (!isPasswordValid) {
      // Reset password if validation fails
      console.log('Resetting password...');
      const newHashedPassword = await bcrypt.hash(password, 10);
      await userService.updatePassword(user.id, newHashedPassword);
      console.log('Password reset complete. New hash:', newHashedPassword.substring(0, 20) + '...');
      
      // Verify new password
      const verifyReset = await bcrypt.compare(password, newHashedPassword);
      console.log('New password verification:', verifyReset ? 'Success' : 'Failed');
    }
  } catch (error) {
    console.error('Error during test:', error);
  } finally {
    await app.close();
  }
}

testLogin().catch(console.error); 