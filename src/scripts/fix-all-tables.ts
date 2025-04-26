import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { Sequelize } from 'sequelize-typescript';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  
  try {
    const sequelize = app.get(Sequelize);
    
    // Disable foreign key checks
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 0;');
    
    // Drop all tables
    console.log('Dropping all tables...');
    await sequelize.query('DROP TABLE IF EXISTS tokens;');
    await sequelize.query('DROP TABLE IF EXISTS subscriptions;');
    await sequelize.query('DROP TABLE IF EXISTS subscription_plans;');
    await sequelize.query('DROP TABLE IF EXISTS attachments;');
    await sequelize.query('DROP TABLE IF EXISTS experiences;');
    await sequelize.query('DROP TABLE IF EXISTS education;');
    await sequelize.query('DROP TABLE IF EXISTS resumes;');
    await sequelize.query('DROP TABLE IF EXISTS companies;');
    await sequelize.query('DROP TABLE IF EXISTS users;');
    
    // Create users table
    console.log('Creating users table...');
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
    
    // Create tokens table
    console.log('Creating tokens table...');
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS tokens (
        id CHAR(36) PRIMARY KEY,
        token VARCHAR(255) NOT NULL,
        type VARCHAR(50) NOT NULL,
        expiresAt DATETIME NOT NULL,
        used BOOLEAN DEFAULT false,
        userId CHAR(36) NOT NULL,
        createdAt DATETIME NOT NULL,
        updatedAt DATETIME NOT NULL,
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE utf8mb4_unicode_ci;
    `);
    
    // Create companies table
    console.log('Creating companies table...');
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS companies (
        id CHAR(36) PRIMARY KEY,
        companyName VARCHAR(255) NOT NULL,
        slug VARCHAR(255),
        description TEXT,
        industry VARCHAR(255),
        companySize VARCHAR(255),
        foundedYear INT,
        website VARCHAR(255),
        email VARCHAR(255),
        phone VARCHAR(255),
        address TEXT,
        city VARCHAR(255),
        state VARCHAR(255),
        zipCode VARCHAR(255),
        country VARCHAR(255),
        latitude DECIMAL(10, 8),
        longitude DECIMAL(11, 8),
        socialMediaLinks JSON,
        benefits TEXT,
        culture TEXT,
        mission TEXT,
        vision TEXT,
        logoUrl VARCHAR(255),
        coverImageUrl VARCHAR(255),
        status VARCHAR(255) DEFAULT 'active',
        createdBy CHAR(36),
        updatedBy CHAR(36),
        createdAt DATETIME NOT NULL,
        updatedAt DATETIME NOT NULL,
        deletedAt DATETIME,
        FOREIGN KEY (createdBy) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE utf8mb4_unicode_ci;
    `);
    
    // Create resumes table
    console.log('Creating resumes table...');
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS resumes (
        id CHAR(36) PRIMARY KEY,
        firstName VARCHAR(255) NOT NULL,
        lastName VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        phone VARCHAR(255),
        gender VARCHAR(255),
        dateOfBirth DATE,
        nationality VARCHAR(255),
        currentLocation VARCHAR(255),
        address TEXT,
        postalCode VARCHAR(255),
        city VARCHAR(255),
        country VARCHAR(255),
        latitude DECIMAL(10, 8),
        longitude DECIMAL(11, 8),
        jobTitle VARCHAR(255),
        professionalSummary TEXT,
        skills TEXT,
        languages TEXT,
        hobbies TEXT,
        cvUrl VARCHAR(255),
        videoUrl VARCHAR(255),
        profilePicture VARCHAR(255),
        qualification VARCHAR(255),
        professionalSkills TEXT,
        addressDetails TEXT,
        passionAndFutureGoals TEXT,
        userId CHAR(36) NOT NULL,
        createdAt DATETIME NOT NULL,
        updatedAt DATETIME NOT NULL,
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE utf8mb4_unicode_ci;
    `);
    
    // Create education table
    console.log('Creating education table...');
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS education (
        id CHAR(36) PRIMARY KEY,
        degreeName VARCHAR(255) NOT NULL,
        universityName VARCHAR(255) NOT NULL,
        fromYear VARCHAR(255) NOT NULL,
        toYear VARCHAR(255) NOT NULL,
        description TEXT,
        resumeId CHAR(36) NOT NULL,
        createdAt DATETIME NOT NULL,
        updatedAt DATETIME NOT NULL,
        FOREIGN KEY (resumeId) REFERENCES resumes(id) ON DELETE CASCADE ON UPDATE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE utf8mb4_unicode_ci;
    `);
    
    // Create experiences table
    console.log('Creating experiences table...');
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS experiences (
        id CHAR(36) PRIMARY KEY,
        position VARCHAR(255) NOT NULL,
        company VARCHAR(255) NOT NULL,
        fromYear VARCHAR(255) NOT NULL,
        toYear VARCHAR(255) NOT NULL,
        description TEXT,
        resumeId CHAR(36) NOT NULL,
        createdAt DATETIME NOT NULL,
        updatedAt DATETIME NOT NULL,
        FOREIGN KEY (resumeId) REFERENCES resumes(id) ON DELETE CASCADE ON UPDATE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE utf8mb4_unicode_ci;
    `);
    
    // Create attachments table
    console.log('Creating attachments table...');
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS attachments (
        id CHAR(36) PRIMARY KEY,
        fileName VARCHAR(255) NOT NULL,
        fileUrl VARCHAR(255) NOT NULL,
        description TEXT,
        resumeId CHAR(36) NOT NULL,
        createdAt DATETIME NOT NULL,
        updatedAt DATETIME NOT NULL,
        FOREIGN KEY (resumeId) REFERENCES resumes(id) ON DELETE CASCADE ON UPDATE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE utf8mb4_unicode_ci;
    `);
    
    // Create subscription_plans table
    console.log('Creating subscription_plans table...');
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
    
    // Create subscriptions table
    console.log('Creating subscriptions table...');
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
    
    // Create admin user
    console.log('Creating admin user...');
    const adminId = require('uuid').v4();
    const bcrypt = require('bcrypt');
    const hashedPassword = await bcrypt.hash('Admin@123', 10);
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    
    await sequelize.query(`
      INSERT INTO users (
        id, firstName, lastName, username, email, password, 
        role, status, termsAccepted, emailVerified, createdAt, updatedAt
      ) VALUES (
        '${adminId}', 'Admin', 'User', 'admin', 'admin@jobtowners.com', '${hashedPassword}', 
        'admin', 'active', 1, 1, '${now}', '${now}'
      )
    `);
    
    // Enable foreign key checks
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 1;');
    
    console.log('All tables created successfully!');
    
    await app.close();
  } catch (error) {
    console.error('Error fixing tables:', error);
    await app.close();
  }
}

bootstrap(); 