import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { User, UserRole, UserStatus } from './entities/user.entity';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class AdminUserSeeder {
  constructor(
    @InjectModel(User)
    private readonly userModel: typeof User,
  ) {}

  async seed(): Promise<void> {
    try {
      console.log('Starting user seeding process...');
      
      // Create admin user
      await this.seedAdminUser();
      
      // Create candidate users
      await this.seedCandidateUsers();
      
      // Create employer users
      await this.seedEmployerUsers();
      
      console.log('Users seeded successfully');
    } catch (error) {
      console.error('Error seeding users:', error);
    }
  }

  private async seedAdminUser(): Promise<void> {
    try {
      // Check if admin user already exists
      const adminExists = await this.userModel.findOne({
        where: {
          role: UserRole.ADMIN,
        },
      });

      if (adminExists) {
        console.log('Admin user already exists, skipping creation');
        return;
      }

      console.log('Creating admin user...');
      
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
      
      console.log('Admin user created successfully');
    } catch (error) {
      console.error('Error creating admin user:', error);
    }
  }

  private async seedCandidateUsers(): Promise<void> {
    try {
      // Check if candidate users already exist
      const candidateExists = await this.userModel.findOne({
        where: {
          role: UserRole.CANDIDATE,
        },
      });

      if (candidateExists) {
        console.log('Candidate users already exist, skipping creation');
        return;
      }

      console.log('Creating candidate users...');
      
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
      
      console.log('Candidate users created successfully');
    } catch (error) {
      console.error('Error creating candidate users:', error);
    }
  }

  private async seedEmployerUsers(): Promise<void> {
    try {
      // Check if employer users already exist
      const employerExists = await this.userModel.findOne({
        where: {
          role: UserRole.EMPLOYER,
        },
      });

      if (employerExists) {
        console.log('Employer users already exist, skipping creation');
        return;
      }

      console.log('Creating employer users...');
      
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
      
      console.log('Employer users created successfully');
    } catch (error) {
      console.error('Error creating employer users:', error);
    }
  }
} 