import { Module, forwardRef } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { UserController } from './user.controller';
import { UserProfileController } from './user-profile.controller';
import { UserService } from './user.service';
import { User } from './entities/user.entity';
import { MailModule } from '../mail/mail.module';
import { AuthModule } from '../auth/auth.module';
import { UploadModule } from '../upload/upload.module';
import { ResumeModule } from '../resume/resume.module';
import { SubscriptionModule } from '../subscription/subscription.module';
import { OrderModule } from '../order/order.module';
import { CompanyModule } from '../company/company.module';

@Module({
  imports: [
    SequelizeModule.forFeature([User]),
    MailModule,
    forwardRef(() => AuthModule),
    UploadModule,
    forwardRef(() => ResumeModule),
    forwardRef(() => SubscriptionModule),
    forwardRef(() => OrderModule),
    forwardRef(() => CompanyModule),
  ],
  controllers: [UserController, UserProfileController],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {} 