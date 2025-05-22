import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { CompanyController } from './company.controller';
import { CompanyService } from './company.service';
import { Company } from './entities/company.entity';
import { UserModule } from '../user/user.module';
import { UploadModule } from '../upload/upload.module';

@Module({
  imports: [
    SequelizeModule.forFeature([Company]),
    forwardRef(() => UserModule),
    UploadModule,
  ],
  controllers: [CompanyController],
  providers: [CompanyService],
  exports: [CompanyService],
})
export class CompanyModule {} 