import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { ResumeService } from './resume.service';
import { ResumeController } from './resume.controller';
import { Resume } from './entities/resume.entity';
import { Education } from './entities/education.entity';
import { Experience } from './entities/experience.entity';
import { Attachment } from './entities/attachment.entity';
import { User } from '../user/entities/user.entity';

@Module({
  imports: [
    SequelizeModule.forFeature([Resume, Education, Experience, Attachment, User]),
  ],
  controllers: [ResumeController],
  providers: [ResumeService],
  exports: [ResumeService],
})
export class ResumeModule {} 