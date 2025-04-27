import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { User, UserRole, UserStatus } from './entities/user.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AdminUserSeeder {
  private readonly logger = new Logger(AdminUserSeeder.name);

  constructor(
    @InjectModel(User)
    private userModel: typeof User,
  ) {}

  async seed() {
    try {
      const users = [
        {
          email: 'admin@jobtowners.com',
          firstName: 'Admin',
          lastName: 'User',
          username: 'admin',
          password: 'Admin@123',
          role: UserRole.ADMIN
        },
        {
          email: 'candidate@jobtowners.com',
          firstName: 'Sample',
          lastName: 'Candidate',
          username: 'candidate',
          password: 'Candidate@123',
          role: UserRole.CANDIDATE
        },
        {
          email: 'employer@jobtowners.com',
          firstName: 'Sample',
          lastName: 'Employer',
          username: 'employer',
          password: 'Employer@123',
          role: UserRole.EMPLOYER
        }
      ];

      for (const userData of users) {
        // Check if user already exists
        const existingUser = await this.userModel.findOne({
          where: { email: userData.email }
        });

        if (existingUser) {
          this.logger.log(`User ${userData.email} already exists, skipping seeding`);
          continue;
        }

        // Create user
        const hashedPassword = await bcrypt.hash(userData.password, 10);
        
        await this.userModel.create({
          firstName: userData.firstName,
          lastName: userData.lastName,
          username: userData.username,
          email: userData.email,
          password: hashedPassword,
          role: userData.role,
          status: UserStatus.ACTIVE,
          emailVerified: true,
          termsAccepted: true
        });

        this.logger.log(`User ${userData.email} seeded successfully`);
      }
    } catch (error) {
      this.logger.error('Error seeding users:', error);
    }
  }
} 