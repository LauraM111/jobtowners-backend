import { Module, forwardRef } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { User } from './entities/user.entity';
import { MailModule } from '../mail/mail.module';
import { AdminUserSeeder } from './admin-user-seeder';
import { AuthModule } from '../auth/auth.module';
import { UploadModule } from '../upload/upload.module';

@Module({
  imports: [
    SequelizeModule.forFeature([User]),
    MailModule,
    forwardRef(() => AuthModule),
    UploadModule,
  ],
  controllers: [UserController],
  providers: [UserService, AdminUserSeeder],
  exports: [UserService, AdminUserSeeder],
})
export class UserModule {} 