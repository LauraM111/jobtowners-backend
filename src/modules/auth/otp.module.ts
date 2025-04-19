import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { OtpService } from './otp.service';
import { OTP } from './entities/otp.entity';
import { User } from '../user/entities/user.entity';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [
    SequelizeModule.forFeature([OTP, User]),
    MailModule,
  ],
  providers: [OtpService],
  exports: [OtpService],
})
export class OtpModule {} 