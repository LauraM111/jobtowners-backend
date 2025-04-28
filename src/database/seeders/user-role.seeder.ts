import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import * as bcrypt from 'bcrypt';
import { User } from '../../modules/user/entities/user.entity';
import { Role } from '../../modules/role/entities/role.entity';

@Injectable()
export class UserRoleSeeder {
  constructor(
    @InjectModel(User)
    private userModel: typeof User,
    @InjectModel(Role)
    private roleModel: typeof Role,
  ) {}

  async seed(): Promise<void> {
    try {
      console.log('Starting user and role seeding...');
      
      // Create roles if they don't exist
      const roles = [
        { name: 'admin', description: 'Administrator' },
        { name: 'user', description: 'Regular User' },
        { name: 'candidate', description: 'Job Seeker' },
        { name: 'employer', description: 'Employer' },
      ];

      for (const roleData of roles) {
        const existingRole = await this.roleModel.findOne({
          where: { name: roleData.name }
        });

        if (!existingRole) {
          await this.roleModel.create(roleData);
          console.log(`Created role: ${roleData.name}`);
        } else {
          console.log(`Role already exists: ${roleData.name}`);
        }
      }

      // Create users if they don't exist
      const users = [
        {
          email: 'admin@jobtowners.com',
          password: 'Admin123!',
          firstName: 'Admin',
          lastName: 'User',
          roleName: 'admin',
          isEmailVerified: true,
          isActive: true,
        },
        {
          email: 'user@jobtowners.com',
          password: 'Admin@123##',
          firstName: 'Regular',
          lastName: 'User',
          roleName: 'user',
          isEmailVerified: true,
          isActive: true,
        },
        {
          email: 'candidate@jobtowners.com',
          password: 'Admin@123##',
          firstName: 'Job',
          lastName: 'Seeker',
          roleName: 'candidate',
          isEmailVerified: true,
          isActive: true,
        },
        {
          email: 'employer@jobtowners.com',
          password: 'Admin@123##',
          firstName: 'Company',
          lastName: 'Owner',
          roleName: 'employer',
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
          // Get role ID
          const role = await this.roleModel.findOne({
            where: { name: userData.roleName }
          });

          if (!role) {
            console.error(`Role not found: ${userData.roleName}`);
            continue;
          }

          // Hash password
          const salt = await bcrypt.genSalt(10);
          const hashedPassword = await bcrypt.hash(userData.password, salt);

          // Create user
          await this.userModel.create({
            email: userData.email,
            password: hashedPassword,
            firstName: userData.firstName,
            lastName: userData.lastName,
            roleId: role.id,
            isEmailVerified: userData.isEmailVerified,
            isActive: userData.isActive,
            companyName: userData.companyName || null,
          });

          console.log(`Created user: ${userData.email} with role: ${userData.roleName}`);
        } else {
          console.log(`User already exists: ${userData.email}`);
        }
      }

      console.log('User and role seeding completed');
    } catch (error) {
      console.error('Error in UserRoleSeeder:', error);
      throw error;
    }
  }
} 