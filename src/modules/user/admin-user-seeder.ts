import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { User, UserRole, UserStatus } from './entities/user.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AdminUserSeeder {
  constructor(
    @InjectModel(User)
    private userModel: typeof User,
  ) {}

  async seed() {
    // Check if admin user already exists
    const existingAdmin = await this.userModel.findOne({
      where: { email: 'admin@jobtowners.com' }
    });

    if (existingAdmin) {
      console.log('Admin user already exists, skipping seeder');
      return;
    }

    // Create admin user
    const salt = await bcrypt.genSalt();
    const hashedPassword = await bcrypt.hash('Admin123!', salt);

    await this.userModel.create({
      firstName: 'Admin',
      lastName: 'User',
      username: 'admin',
      email: 'admin@jobtowners.com',
      password: hashedPassword,
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
      termsAccepted: true
    });

    console.log('Admin user created successfully');
  }
} 