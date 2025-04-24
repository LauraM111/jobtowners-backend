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
      inject: [ConfigService],
      useFactory: getDatabaseConfig,
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