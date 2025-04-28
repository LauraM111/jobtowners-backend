import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import * as bcrypt from 'bcrypt';
import { User, UserType } from '../../modules/user/entities/user.entity';

@Injectable()
export class UserSeeder {
  constructor(
    @InjectModel(User)
    private userModel: typeof User,
  ) {}

  async seed(): Promise<void> {
    try {
      console.log('Starting user seeding...');
      
      // Create users if they don't exist
      const users = [
        {
          email: 'admin@jobtowners.com',
          password: 'Admin@123##',
          firstName: 'Admin',
          lastName: 'User',
          userType: UserType.ADMIN,
          isEmailVerified: true,
          isActive: true,
        },
        {
          email: 'user@jobtowners.com',
          password: 'Admin@123##',
          firstName: 'Regular',
          lastName: 'User',
          userType: UserType.USER,
          isEmailVerified: true,
          isActive: true,
        },
        {
          email: 'candidate@jobtowners.com',
          password: 'Admin@123##',
          firstName: 'Job',
          lastName: 'Seeker',
          userType: UserType.CANDIDATE,
          isEmailVerified: true,
          isActive: true,
        },
        {
          email: 'employer@jobtowners.com',
          password: 'Admin@123##',
          firstName: 'Company',
          lastName: 'Owner',
          userType: UserType.EMPLOYER,
          isEmailVerified: true,
          isActive: true,
          companyName: 'Example Company',
        },
      ];

      for (const userData of users) {
        const existingUser = await this.userModel.findOne({
          where: { email: userData.email }
        });

        if (!existingUser) {
          // Hash password
          const salt = await bcrypt.genSalt(10);
          const hashedPassword = await bcrypt.hash(userData.password, salt);

          // Create user
          await this.userModel.create({
            email: userData.email,
            password: hashedPassword,
            firstName: userData.firstName,
            lastName: userData.lastName,
            userType: userData.userType,
            isEmailVerified: userData.isEmailVerified,
            isActive: userData.isActive,
            companyName: userData.companyName || null,
          });

          console.log(`Created user: ${userData.email} with type: ${userData.userType}`);
        } else {
          console.log(`User already exists: ${userData.email}`);
        }
      }

      console.log('User seeding completed');
    } catch (error) {
      console.error('Error in UserSeeder:', error);
      throw error;
    }
  }
} 