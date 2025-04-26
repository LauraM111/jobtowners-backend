import { SequelizeModuleOptions } from '@nestjs/sequelize';
import { ConfigService } from '@nestjs/config';
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

export const getDatabaseConfig = (configService: ConfigService): SequelizeModuleOptions => {
  // Convert DB_LOGGING to a proper function or boolean
  const dbLogging = configService.get<string>('DB_LOGGING');
  let logging: boolean | ((sql: string, timing?: number) => void) = false;
  
  if (dbLogging === 'true') {
    logging = console.log;
  } else if (dbLogging === 'false') {
    logging = false;
  }
  
  console.log('Database configuration:', {
    host: configService.get<string>('DB_HOST'),
    port: configService.get<number>('DB_PORT'),
    username: configService.get<string>('DB_USERNAME'),
    database: configService.get<string>('DB_NAME'),
    sync: configService.get<string>('DB_SYNC'),
  });
  
  return {
    dialect: 'mysql',
    host: configService.get<string>('DB_HOST'),
    port: configService.get<number>('DB_PORT'),
    username: configService.get<string>('DB_USERNAME'),
    password: configService.get<string>('DB_PASSWORD'),
    database: configService.get<string>('DB_NAME'),
    models: [User, Token, Resume, Education, Experience, Attachment, Company, SubscriptionPlan, Subscription],
    autoLoadModels: true,
    synchronize: configService.get<string>('DB_SYNC') === 'true',
    logging,
    pool: {
      max: 5,
      min: 0,
      acquire: 180000,
      idle: 10000
    },
    retry: {
      max: 15,
      match: [/Deadlock/i, /SequelizeConnectionError/i, /ConnectionError/i, /TimeoutError/i, /SequelizeConnectionRefusedError/i],
    },
    dialectOptions: {
      connectTimeout: 60000,
      supportBigNumbers: true,
      bigNumberStrings: true,
    },
    define: {
      charset: 'utf8mb4',
      collate: 'utf8mb4_unicode_ci',
      timestamps: true,
      underscored: false,
    },
    sync: {
      force: true,
      alter: true,
      hooks: true,
    },
    query: {
      raw: false
    },
  };
}; 