import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { AuthService } from '../modules/auth/auth.service';
import * as bcrypt from 'bcrypt';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  
  try {
    const authService = app.get(AuthService);
    
    // Test login with admin credentials
    const email = 'admin@jobtowners.com';
    const password = 'Admin@123';
    
    console.log(`Testing login with email: ${email}, password: ${password}`);
    
    // Test validateUser method directly
    const user = await authService.validateUser(email, password);
    
    if (user) {
      console.log('Login successful!');
      console.log('User:', user);
    } else {
      console.log('Login failed!');
      
      // Try to find the user
      try {
        const userService = app.get('UserService');
        const foundUser = await userService.findByEmail(email);
        
        console.log('User found in database:', foundUser.id);
        
        // Test password comparison directly
        const isPasswordValid = await bcrypt.compare(password, foundUser.password);
        console.log('Password valid:', isPasswordValid);
        console.log('Stored password hash:', foundUser.password);
        
        // Generate a new hash for comparison
        const newHash = await bcrypt.hash(password, 10);
        console.log('New hash for same password:', newHash);
        
        // Compare the new hash with the stored hash
        const hashesMatch = await bcrypt.compare(foundUser.password, newHash);
        console.log('Hashes match:', hashesMatch);
      } catch (error) {
        console.error('Error finding user:', error.message);
      }
    }
  } catch (error) {
    console.error('Error testing login:', error);
  } finally {
    await app.close();
  }
}

bootstrap(); 