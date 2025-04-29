import { Module, forwardRef } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { User } from './entities/user.entity';
import { MailModule } from '../mail/mail.module';
import { AuthModule } from '../auth/auth.module';
import { UploadModule } from '../upload/upload.module';
import { ResumeModule } from '../resume/resume.module';
import { CompanyModule } from '../company/company.module';

@Module({
  imports: [
    SequelizeModule.forFeature([User]),
    MailModule,
    forwardRef(() => AuthModule),
    UploadModule,
    forwardRef(() => ResumeModule),
    forwardRef(() => CompanyModule),
  ],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {} 