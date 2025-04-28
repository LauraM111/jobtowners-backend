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
import { JobModule } from './modules/job/job.module';
import { Sequelize } from 'sequelize-typescript';

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

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    
    // Database - use the database config
    SequelizeModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: getDatabaseConfig,
      inject: [ConfigService],
    }),
    
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
  constructor(
    private readonly adminUserSeeder: AdminUserSeeder,
    private sequelize: Sequelize
  ) {
    this.syncDatabase();
    this.seedDatabase();
  }

  private async syncDatabase() {
    try {
      if (process.env.NODE_ENV === 'development' && process.env.DB_SYNC === 'true') {
        console.log('Syncing database models...');
        
        // First sync without foreign key checks
        await this.sequelize.query('SET FOREIGN_KEY_CHECKS = 0');
        
        // Force sync to recreate tables
        await this.sequelize.sync({ force: true });
        
        // Re-enable foreign key checks
        await this.sequelize.query('SET FOREIGN_KEY_CHECKS = 1');
        
        console.log('Database sync completed');
      }
    } catch (error) {
      console.error('Error syncing database:', error);
    }
  }

  private async seedDatabase() {
    try {
      await this.adminUserSeeder.seed();
    } catch (error) {
      console.error('Error seeding database:', error);
    }
  }
} 