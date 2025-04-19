import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { User } from '../modules/user/entities/user.entity';
import { AdminUserSeeder } from './seeders/admin-user.seeder';

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
        models: [User],
        autoLoadModels: true,
        synchronize: configService.get('DB_SYNC') === 'true',
        logging: configService.get('DB_LOGGING') === 'true',
      }),
    }),
    SequelizeModule.forFeature([User]),
  ],
  providers: [AdminUserSeeder],
  exports: [AdminUserSeeder],
})
export class DatabaseModule {} 