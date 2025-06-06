import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { MulterModule } from '@nestjs/platform-express';
import { JobService } from './job.service';
import { JobController } from './job.controller';
import { Job } from './entities/job.entity';
import { User } from '../user/entities/user.entity';
import { Company } from '../company/entities/company.entity';
import { SubscriptionModule } from '../subscription/subscription.module';
import { JwtModule } from '@nestjs/jwt';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { existsSync, mkdirSync } from 'fs';
import { SavedJob } from './entities/saved-job.entity';
import { JobApplication } from '../job-application/entities/job-application.entity';

// Create uploads directory if it doesn't exist
const uploadsDir = './uploads/jobs';
if (!existsSync(uploadsDir)) {
  mkdirSync(uploadsDir, { recursive: true });
}

@Module({
  imports: [
    SequelizeModule.forFeature([Job, User, Company, SavedJob, JobApplication]),
    MulterModule.register({
      storage: diskStorage({
        destination: './uploads/jobs',
        filename: (req, file, cb) => {
          const randomName = uuidv4();
          return cb(null, `${randomName}${extname(file.originalname)}`);
        },
      }),
    }),
    JwtModule.register({}), // Just for decoding tokens, no need for secret
    SubscriptionModule,
  ],
  controllers: [JobController],
  providers: [JobService],
  exports: [JobService],
})
export class JobModule {} 