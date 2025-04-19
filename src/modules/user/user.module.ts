import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { User } from './entities/user.entity';
import { MailModule } from '../mail/mail.module';
import { AdminUserSeeder } from './admin-user-seeder';
import { OtpModule } from '../auth/otp.module';

@Module({
  imports: [
    SequelizeModule.forFeature([User]),
    MailModule,
    OtpModule,
  ],
  controllers: [UserController],
  providers: [UserService, AdminUserSeeder],
  exports: [UserService, AdminUserSeeder],
})
export class UserModule {} 