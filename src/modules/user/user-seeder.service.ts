import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { User, UserRole, UserStatus } from './entities/user.entity';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class UserSeederService {
  constructor(
    @InjectModel(User)
    private readonly userModel: typeof User,
  ) {}

  async seed(): Promise<void> {
    try {
      // Check if users already exist
      const usersCount = await this.userModel.count();
      
      if (usersCount > 0) {
        console.log('Users already seeded');
        return;
      }

      console.log('Seeding users...');
      
      // Create admin user
      await this.createAdminUser();
      
      // Create candidate users
      await this.createCandidateUsers();
      
      // Create employer users
      await this.createEmployerUsers();
      
      console.log('Users seeded successfully');
    } catch (error) {
      console.error('Error seeding users:', error);
      throw error;
    }
  }

  private async createAdminUser(): Promise<void> {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('Admin@123', salt);
    
    await this.userModel.create({
      id: uuidv4(),
      firstName: 'Admin',
      lastName: 'User',
      email: 'admin@jobtowners.com',
      password: hashedPassword,
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
      termsAccepted: true,
      emailVerified: true,
    });
    
    console.log('Admin user created');
  }

  private async createCandidateUsers(): Promise<void> {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('Candidate@123', salt);
    
    // Create 3 candidate users
    for (let i = 1; i <= 3; i++) {
      await this.userModel.create({
        id: uuidv4(),
        firstName: `Candidate${i}`,
        lastName: 'User',
        email: `candidate${i}@example.com`,
        phoneNumber: `+123456789${i}`,
        password: hashedPassword,
        role: UserRole.CANDIDATE,
        status: UserStatus.ACTIVE,
        termsAccepted: true,
        emailVerified: true,
      });
    }
    
    console.log('Candidate users created');
  }

  private async createEmployerUsers(): Promise<void> {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('Employer@123', salt);
    
    // Create 3 employer users
    for (let i = 1; i <= 3; i++) {
      await this.userModel.create({
        id: uuidv4(),
        firstName: `Employer${i}`,
        lastName: 'User',
        email: `employer${i}@example.com`,
        phoneNumber: `+987654321${i}`,
        password: hashedPassword,
        role: UserRole.EMPLOYER,
        status: UserStatus.ACTIVE,
        termsAccepted: true,
        emailVerified: true,
        companyName: `Company ${i}`,
      });
    }
    
    console.log('Employer users created');
  }
} 