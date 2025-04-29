import { Module, forwardRef } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { OTPService } from './otp.service';
import OTP from './entities/otp.entity';
import { UserModule } from '../user/user.module';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [
    SequelizeModule.forFeature([OTP]),
    forwardRef(() => UserModule),
    MailModule,
  ],
  providers: [OTPService],
  exports: [OTPService],
})
export class OTPModule {} 