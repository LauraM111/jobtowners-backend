import { NestFactory } from '@nestjs/core';
import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';

@Module({
  imports: [
    SequelizeModule.forRoot({
      dialect: 'mysql',
      host: 'localhost',
      port: 3306,
      username: 'root',
      password: 'admin@123',
      database: 'jobtowners',
      autoLoadModels: false,
      synchronize: false,
      logging: console.log,
    }),
  ],
})
class MinimalAppModule {}

async function bootstrap() {
  try {
    const app = await NestFactory.create(MinimalAppModule);
    console.log('Application started successfully!');
    await app.close();
    console.log('Application closed successfully!');
  } catch (error) {
    console.error('Error starting application:', error);
  }
}

bootstrap(); 