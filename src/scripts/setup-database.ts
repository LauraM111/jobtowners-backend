import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { Sequelize } from 'sequelize-typescript';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  
  try {
    const sequelize = app.get(Sequelize);
    
    console.log('Setting up database...');
    
    // Disable foreign key checks temporarily
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 0');
    
    // Create tables in the correct order
    console.log('Creating users table...');
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        firstName VARCHAR(255),
        lastName VARCHAR(255),
        phoneNumber VARCHAR(255),
        userType ENUM('admin', 'user', 'candidate', 'employer') NOT NULL DEFAULT 'user',
        status ENUM('active', 'inactive', 'suspended') NOT NULL DEFAULT 'inactive',
        studentPermitImage VARCHAR(255),
        proofOfEnrollmentImage VARCHAR(255),
        termsAccepted BOOLEAN DEFAULT false,
        isEmailVerified BOOLEAN DEFAULT false,
        isActive BOOLEAN DEFAULT false,
        stripeCustomerId VARCHAR(255),
        companyName VARCHAR(255),
        createdAt DATETIME NOT NULL,
        updatedAt DATETIME NOT NULL,
        deletedAt DATETIME
      ) ENGINE=InnoDB;
    `);
    
    console.log('Creating tokens table...');
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS tokens (
        id VARCHAR(36) PRIMARY KEY,
        token VARCHAR(255) NOT NULL,
        type VARCHAR(255) NOT NULL,
        expiresAt DATETIME NOT NULL,
        used BOOLEAN DEFAULT false,
        userId INT NOT NULL,
        createdAt DATETIME NOT NULL,
        updatedAt DATETIME NOT NULL,
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB;
    `);
    
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS resumes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        firstName VARCHAR(255) NOT NULL,
        lastName VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        phone VARCHAR(255),
        dob DATE,
        gender ENUM('Male', 'Female', 'Other'),
        maritalStatus VARCHAR(255),
        nationality VARCHAR(255),
        language VARCHAR(255),
        city VARCHAR(255),
        state VARCHAR(255),
        country VARCHAR(255),
        latitude FLOAT,
        longitude FLOAT,
        offeredSalary DECIMAL(10,2),
        yearsOfExperience FLOAT,
        qualification VARCHAR(255),
        professionalSkills VARCHAR(255),
        addressDetails TEXT,
        passionAndFutureGoals TEXT,
        videoUrl VARCHAR(255),
        cvUrl VARCHAR(255),
        userId INT NOT NULL,
        createdAt DATETIME NOT NULL,
        updatedAt DATETIME NOT NULL,
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB;
    `);
    
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS education (
        id INT AUTO_INCREMENT PRIMARY KEY,
        institution VARCHAR(255) NOT NULL,
        degree VARCHAR(255) NOT NULL,
        fieldOfStudy VARCHAR(255),
        startDate DATE,
        endDate DATE,
        description TEXT,
        resumeId INT NOT NULL,
        createdAt DATETIME NOT NULL,
        updatedAt DATETIME NOT NULL,
        FOREIGN KEY (resumeId) REFERENCES resumes(id) ON DELETE CASCADE
      ) ENGINE=InnoDB;
    `);
    
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS experiences (
        id INT AUTO_INCREMENT PRIMARY KEY,
        company VARCHAR(255) NOT NULL,
        position VARCHAR(255) NOT NULL,
        startDate DATE,
        endDate DATE,
        description TEXT,
        resumeId INT NOT NULL,
        createdAt DATETIME NOT NULL,
        updatedAt DATETIME NOT NULL,
        FOREIGN KEY (resumeId) REFERENCES resumes(id) ON DELETE CASCADE
      ) ENGINE=InnoDB;
    `);
    
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS attachments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        fileUrl VARCHAR(255) NOT NULL,
        fileType VARCHAR(255),
        resumeId INT NOT NULL,
        createdAt DATETIME NOT NULL,
        updatedAt DATETIME NOT NULL,
        FOREIGN KEY (resumeId) REFERENCES resumes(id) ON DELETE CASCADE
      ) ENGINE=InnoDB;
    `);
    
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS companies (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        logo VARCHAR(255),
        website VARCHAR(255),
        industry VARCHAR(255),
        size VARCHAR(255),
        foundedYear INT,
        userId INT NOT NULL,
        createdAt DATETIME NOT NULL,
        updatedAt DATETIME NOT NULL,
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB;
    `);
    
    console.log('Creating subscription_plans table...');
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS subscription_plans (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        price DECIMAL(10,2) NOT NULL,
        duration INT NOT NULL,
        features TEXT,
        stripePriceId VARCHAR(255),
        createdAt DATETIME NOT NULL,
        updatedAt DATETIME NOT NULL
      ) ENGINE=InnoDB;
    `);
    
    console.log('Creating subscriptions table...');
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS subscriptions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        userId INT NOT NULL,
        planId INT NOT NULL,
        startDate DATETIME NOT NULL,
        endDate DATETIME NOT NULL,
        status VARCHAR(255) NOT NULL,
        stripeSubscriptionId VARCHAR(255),
        createdAt DATETIME NOT NULL,
        updatedAt DATETIME NOT NULL,
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (planId) REFERENCES subscription_plans(id) ON DELETE CASCADE
      ) ENGINE=InnoDB;
    `);
    
    console.log('Creating jobs table...');
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS jobs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        requirements TEXT,
        responsibilities TEXT,
        location VARCHAR(255),
        salary DECIMAL(10,2),
        jobType VARCHAR(255),
        companyId INT NOT NULL,
        createdAt DATETIME NOT NULL,
        updatedAt DATETIME NOT NULL,
        FOREIGN KEY (companyId) REFERENCES companies(id) ON DELETE CASCADE
      ) ENGINE=InnoDB;
    `);
    
    // Re-enable foreign key checks
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 1');
    
    console.log('Database setup completed successfully');
  } catch (error) {
    console.error('Error setting up database:', error);
  } finally {
    await app.close();
  }
}

bootstrap(); 