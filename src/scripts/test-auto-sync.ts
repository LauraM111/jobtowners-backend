import { NestFactory } from '@nestjs/core';
import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { User } from '../modules/user/entities/user.entity';

@Module({
  imports: [
    SequelizeModule.forRoot({
      dialect: 'mysql',
      host: 'localhost',
      port: 3306,
      username: 'root',
      password: 'admin@123',
      database: 'jobtowners',
      models: [User],
      autoLoadModels: true,
      synchronize: true, // Enable auto-sync
      logging: console.log,
    }),
    SequelizeModule.forFeature([User]),
  ],
})
class TestModule {}

async function bootstrap() {
  try {
    const app = await NestFactory.create(TestModule);
    console.log('Application started successfully with auto-sync enabled!');
    
    // Wait a moment for tables to be created
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    await app.close();
    console.log('Application closed successfully!');
  } catch (error) {
    console.error('Error starting application:', error);
  }
}

bootstrap(); 