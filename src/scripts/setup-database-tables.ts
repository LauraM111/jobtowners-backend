import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { Sequelize } from 'sequelize-typescript';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  
  try {
    const sequelize = app.get(Sequelize);
    
    // Disable foreign key checks
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 0;');
    
    // Create users table
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS users (
        id CHAR(36) PRIMARY KEY,
        firstName VARCHAR(255),
        lastName VARCHAR(255),
        username VARCHAR(255) NOT NULL UNIQUE,
        email VARCHAR(255) NOT NULL UNIQUE,
        phoneNumber VARCHAR(255),
        password VARCHAR(255) NOT NULL,
        role ENUM('admin', 'candidate', 'employer') NOT NULL DEFAULT 'candidate',
        status ENUM('active', 'inactive', 'suspended') NOT NULL DEFAULT 'inactive',
        studentPermitImage VARCHAR(255),
        proofOfEnrollmentImage VARCHAR(255),
        termsAccepted BOOLEAN NOT NULL DEFAULT false,
        emailVerified BOOLEAN NOT NULL DEFAULT false,
        stripeCustomerId VARCHAR(255),
        createdAt DATETIME NOT NULL,
        updatedAt DATETIME NOT NULL,
        deletedAt DATETIME
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE utf8mb4_unicode_ci;
    `);
    
    console.log('Users table created successfully');
    
    // Create subscription_plans table
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS subscription_plans (
        id CHAR(36) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        price DECIMAL(10, 2) NOT NULL,
        \`interval\` VARCHAR(255) NOT NULL DEFAULT 'month',
        intervalCount INT NOT NULL DEFAULT 1,
        currency VARCHAR(255) NOT NULL DEFAULT 'usd',
        stripeProductId VARCHAR(255),
        stripePriceId VARCHAR(255),
        features JSON,
        status VARCHAR(255) NOT NULL DEFAULT 'active',
        deletedAt DATETIME,
        createdAt DATETIME NOT NULL,
        updatedAt DATETIME NOT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE utf8mb4_unicode_ci;
    `);
    
    console.log('Subscription plans table created successfully');
    
    // Create subscriptions table
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS subscriptions (
        id CHAR(36) PRIMARY KEY,
        userId CHAR(36) NOT NULL,
        planId CHAR(36) NOT NULL,
        stripeSubscriptionId VARCHAR(255),
        stripeCustomerId VARCHAR(255),
        startDate DATETIME NOT NULL,
        endDate DATETIME,
        status VARCHAR(255) NOT NULL DEFAULT 'active',
        cancelAtPeriodEnd BOOLEAN NOT NULL DEFAULT false,
        canceledAt DATETIME,
        deletedAt DATETIME,
        createdAt DATETIME NOT NULL,
        updatedAt DATETIME NOT NULL,
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
        FOREIGN KEY (planId) REFERENCES subscription_plans(id) ON DELETE CASCADE ON UPDATE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE utf8mb4_unicode_ci;
    `);
    
    console.log('Subscriptions table created successfully');
    
    // Enable foreign key checks
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 1;');
    
  } catch (error) {
    console.error('Error setting up database tables:', error);
  } finally {
    await app.close();
  }
}

bootstrap(); 