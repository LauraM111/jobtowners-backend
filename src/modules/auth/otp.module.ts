import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { OtpService } from './otp.service';
import { User } from '../user/entities/user.entity';
import { MailModule } from '../mail/mail.module';
import OTP from './entities/otp.entity';

@Module({
  imports: [
    SequelizeModule.forFeature([OTP, User]),
    MailModule,
  ],
  providers: [OtpService],
  exports: [OtpService],
})
export class OtpModule {} 