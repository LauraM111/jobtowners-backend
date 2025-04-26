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
      // Check if admin user already exists
      const existingAdmin = await this.userModel.findOne({
        where: { email: 'admin@jobtowners.com' }
      });

      if (existingAdmin) {
        this.logger.log('Admin user already exists, skipping seeding');
        return;
      }

      // Create admin user
      const hashedPassword = await bcrypt.hash('Admin@123', 10);
      
      await this.userModel.create({
        firstName: 'Admin',
        lastName: 'User',
        username: 'admin',
        email: 'admin@jobtowners.com',
        password: hashedPassword,
        role: UserRole.ADMIN,
        status: UserStatus.ACTIVE,
        emailVerified: true,
        termsAccepted: true
      });

      this.logger.log('Admin user seeded successfully');
    } catch (error) {
      this.logger.error('Error seeding admin user:', error);
    }
  }
} 