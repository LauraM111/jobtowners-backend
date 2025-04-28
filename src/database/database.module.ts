import { Module, OnModuleInit } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { User } from '../modules/user/entities/user.entity';
import { AdminUserSeeder } from './seeders/admin-user.seeder';
import { Company } from '../modules/company/entities/company.entity';
import { Sequelize } from 'sequelize-typescript';
import * as fs from 'fs';
import * as path from 'path';
import { DatabaseInitService } from './database-init.service';
import { Logger } from '@nestjs/common';
import { Job } from '../modules/job/entities/job.entity';
import Token from '../modules/auth/entities/token.entity';

@Module({
  imports: [
    SequelizeModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        dialect: 'mysql',
        host: configService.get('DB_HOST'),
        port: configService.get('DB_PORT'),
        username: configService.get('DB_USERNAME'),
        password: configService.get('DB_PASSWORD'),
        database: configService.get('DB_NAME'),
        models: [User, Company, Job, Token],
        autoLoadModels: false,
        synchronize: false,
        sync: {
          force: false,
          alter: false,
        },
        logging: configService.get('NODE_ENV') !== 'production',
        define: {
          charset: 'utf8mb4',
          collate: 'utf8mb4_unicode_ci',
          timestamps: true,
        },
        dialectOptions: {
          supportBigNumbers: true,
          bigNumberStrings: true,
        },
      }),
    }),
    SequelizeModule.forFeature([User]),
  ],
  providers: [AdminUserSeeder, DatabaseInitService],
  exports: [AdminUserSeeder, DatabaseInitService],
})
export class DatabaseModule implements OnModuleInit {
  private readonly logger = new Logger(DatabaseModule.name);
  
  constructor(
    private sequelize: Sequelize,
    private configService: ConfigService,
    private readonly databaseInitService: DatabaseInitService
  ) {}

  async onModuleInit() {
    // Skip auto-sync completely
    
    // Run migrations
    try {
      const migrationsDir = path.join(__dirname, 'migrations');
      
      // Check if migrations directory exists
      if (fs.existsSync(migrationsDir)) {
        const migrationFiles = fs.readdirSync(migrationsDir)
          .filter(file => file.endsWith('.sql'))
          .sort();
        
        for (const file of migrationFiles) {
          const migrationPath = path.join(migrationsDir, file);
          const sql = fs.readFileSync(migrationPath, 'utf8');
          
          try {
            await this.sequelize.query(sql);
            console.log(`Migration ${file} executed successfully`);
          } catch (error) {
            // If the error is about column already existing, we can ignore it
            if (error.message && error.message.includes('Duplicate column name')) {
              console.warn(`Migration ${file} skipped: ${error.message}`);
            } else {
              console.error(`Error executing migration ${file}:`, error);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error running migrations:', error);
    }

    // This will run when the module is initialized
    await this.databaseInitService.initDatabase();
  }
} 