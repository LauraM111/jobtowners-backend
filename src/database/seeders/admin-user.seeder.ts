import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { User, UserRole, UserStatus } from '../../modules/user/entities/user.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AdminUserSeeder {
  constructor(
    @InjectModel(User)
    private userModel: typeof User,
  ) {}

  async seed() {
    const users = [
      {
        email: 'admin@jobtowners.com',
        firstName: 'Admin',
        lastName: 'User',
        username: 'admin',
        password: 'Admin123!',
        role: UserRole.ADMIN
      },
      {
        email: 'candidate@jobtowners.com',
        firstName: 'Sample',
        lastName: 'Candidate',
        username: 'candidate',
        password: 'Candidate123!',
        role: UserRole.CANDIDATE
      },
      {
        email: 'employer@jobtowners.com',
        firstName: 'Sample',
        lastName: 'Employer',
        username: 'employer',
        password: 'Employer123!',
        role: UserRole.EMPLOYER
      }
    ];

    for (const userData of users) {
      // Check if user already exists
      const existingUser = await this.userModel.findOne({
        where: { email: userData.email }
      });

      if (existingUser) {
        console.log(`User ${userData.email} already exists, skipping`);
        continue;
      }

      // Create user
      const salt = await bcrypt.genSalt();
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

      console.log(`User ${userData.email} created successfully`);
    }
  }
} 