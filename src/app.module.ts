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
import { AdminUserSeeder } from './modules/user/admin-user-seeder';
import { getDatabaseConfig } from './config/database.config';
import { UploadModule } from './modules/upload/upload.module';
import { ResumeModule } from './modules/resume/resume.module';
import { CompanyModule } from './modules/company/company.module';
import { SubscriptionModule } from './modules/subscription/subscription.module';
import { DatabaseModule } from './database/database.module';

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

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    
    // Database
    SequelizeModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: getDatabaseConfig,
      inject: [ConfigService],
    }),
    
    // Database initialization module
    DatabaseModule,
    
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
  ],
  controllers: [AppController],
  providers: [
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {
  constructor(private readonly adminUserSeeder: AdminUserSeeder) {
    this.seedDatabase();
  }

  private async seedDatabase() {
    try {
      await this.adminUserSeeder.seed();
    } catch (error) {
      console.error('Error seeding database:', error);
    }
  }
} 