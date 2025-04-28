import { registerAs } from '@nestjs/config';
import { SequelizeModuleOptions } from '@nestjs/sequelize';
import { ConfigService } from '@nestjs/config';
import * as dotenv from 'dotenv';
import { Sequelize } from 'sequelize-typescript';
import Token from '../modules/auth/entities/token.entity';
import { User } from '../modules/user/entities/user.entity';
import { Resume } from '../modules/resume/entities/resume.entity';
import { Education } from '../modules/resume/entities/education.entity';
import { Experience } from '../modules/resume/entities/experience.entity';
import { Attachment } from '../modules/resume/entities/attachment.entity';
import { Company } from '../modules/company/entities/company.entity';
import { SubscriptionPlan } from '../modules/subscription/entities/subscription-plan.entity';
import { Subscription } from '../modules/subscription/entities/subscription.entity';
import { Job } from '../modules/job/entities/job.entity';

dotenv.config();

export default registerAs('database', (): SequelizeModuleOptions => ({
  dialect: 'mysql',
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT, 10),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  autoLoadModels: true,
  synchronize: process.env.DB_SYNC === 'true',
  logging: process.env.DB_LOGGING === 'true' ? console.log : false,
  define: {
    timestamps: true,
    paranoid: true, // Soft deletes
  },
  dialectOptions: {
    // For MySQL 8.0+
    authPlugins: {
      mysql_native_password: () => () => Buffer.from([0])
    },
    connectTimeout: 60000
  },
}));

export const getDatabaseConfig = (configService: ConfigService): SequelizeModuleOptions => {
  return {
    dialect: 'mysql',
    host: configService.get('DB_HOST'),
    port: configService.get<number>('DB_PORT'),
    username: configService.get('DB_USERNAME'),
    password: configService.get('DB_PASSWORD'),
    database: configService.get('DB_NAME'),
    models: [
      User, 
      Token,
      Company, 
      SubscriptionPlan,
      Subscription,
      Job, 
      Resume, 
      Education, 
      Experience, 
      Attachment
    ],
    autoLoadModels: false,
    synchronize: false, // We'll handle sync manually in AppModule
    logging: true,
    define: {
      charset: 'utf8mb4',
      collate: 'utf8mb4_unicode_ci',
      timestamps: true,
      // Ensure consistent UUID handling
      defaultScope: {
        attributes: { exclude: ['deletedAt'] }
      }
    },
    dialectOptions: {
      supportBigNumbers: true,
      bigNumberStrings: true,
      connectTimeout: 60000,
    },
    pool: {
      max: 10,
      min: 0,
      acquire: 60000,
      idle: 10000,
    },
  };
}; 