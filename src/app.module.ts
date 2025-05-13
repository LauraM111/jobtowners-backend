import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SequelizeModule } from '@nestjs/sequelize';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { UserModule } from './modules/user/user.module';
import { AuthModule } from './modules/auth/auth.module';
import { CommonModule } from './common/common.module';
import { HealthModule } from './modules/health/health.module';
import { MailModule } from './modules/mail/mail.module';
import { AppController } from './app.controller';
import configuration from './config/configuration';
import { JwtAuthGuard } from './modules/auth/guards/jwt-auth.guard';
import { getDatabaseConfig } from './config/database.config';
import { UploadModule } from './modules/upload/upload.module';
import { ResumeModule } from './modules/resume/resume.module';
import { CompanyModule } from './modules/company/company.module';
import { SubscriptionModule } from './modules/subscription/subscription.module';
import { JobModule } from './modules/job/job.module';
import { Sequelize } from 'sequelize-typescript';
import { UserSeeder } from './database/seeders/user.seeder';
import { DatabaseInitService } from './database/database-init.service';
import { JobApplicationModule } from './modules/job-application/job-application.module';
import { CandidatePaymentModule } from './modules/candidate-payment/candidate-payment.module';
import { MessagingModule } from './modules/messaging/messaging.module';
import { ContactModule } from './modules/contact/contact.module';
import { CommunityModule } from './modules/community/community.module';
import { PaymentController } from './modules/payment/payment.controller';
import { StatsModule } from './modules/stats/stats.module';
import { PlacesModule } from './modules/places/places.module';

// Import entities from their correct locations
import { User } from './modules/user/entities/user.entity';
import Token from './modules/auth/entities/token.entity';
import { Resume } from './modules/resume/entities/resume.entity';
import { Education } from './modules/resume/entities/education.entity';
import { Experience } from './modules/resume/entities/experience.entity';
import { Attachment } from './modules/resume/entities/attachment.entity';
import { Company } from './modules/company/entities/company.entity';
import { SubscriptionPlan } from './modules/subscription/entities/subscription-plan.entity';
import { Subscription } from './modules/subscription/entities/subscription.entity';
import { Job } from './modules/job/entities/job.entity';
import { JobApplication } from './modules/job-application/entities/job-application.entity';
import { CandidatePlan } from './modules/candidate-payment/entities/candidate-plan.entity';
import { CandidateOrder } from './modules/candidate-payment/entities/candidate-order.entity';
import { ApplicationLimit } from './modules/candidate-payment/entities/application-limit.entity';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    
    // Database - use the database config with sync disabled
    SequelizeModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        dialect: 'mysql',
        host: configService.get('DB_HOST'),
        port: configService.get('DB_PORT'),
        username: configService.get('DB_USERNAME'),
        password: configService.get('DB_PASSWORD'),
        database: configService.get('DB_NAME'),
        models: [
          User, 
          Token, 
          Resume,
          Education,
          Experience,
          Attachment,
          Company,
          SubscriptionPlan,
          Subscription,
          Job,
          JobApplication,
          CandidatePlan,
          CandidateOrder,
          ApplicationLimit
        ],
        autoLoadModels: true,
        synchronize: false, // Disable auto-sync to prevent errors
        logging: configService.get('NODE_ENV') === 'development' ? console.log : false,
      }),
      inject: [ConfigService],
    }),
    
    // Import SequelizeModule for User model specifically for the seeder
    SequelizeModule.forFeature([User]),
    
    // Modules
    UserModule,
    AuthModule,
    CommonModule,
    HealthModule,
    MailModule,
    UploadModule,
    ResumeModule,
    CompanyModule,
    SubscriptionModule,
    JobModule,
    JobApplicationModule,
    CandidatePaymentModule,
    MessagingModule,
    ContactModule,
    CommunityModule,
    StatsModule,
    PlacesModule,
  ],
  controllers: [
    AppController,
    PaymentController,
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    UserSeeder,
    DatabaseInitService,
  ],
})
export class AppModule {
  constructor(
    private sequelize: Sequelize,
    private userSeeder: UserSeeder,
    private databaseInitService: DatabaseInitService
  ) {
    // The service will automatically initialize tables on module init
  }
} 