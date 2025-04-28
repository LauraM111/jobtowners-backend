import { Injectable, OnModuleInit } from '@nestjs/common';
import { Sequelize } from 'sequelize-typescript';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class DatabaseInitService implements OnModuleInit {
  constructor(
    private sequelize: Sequelize,
    private configService: ConfigService
  ) {}

  async onModuleInit() {
    if (this.configService.get('NODE_ENV') === 'development') {
      console.log('Initializing database tables...');
      await this.initializeTables();
    }
  }

  async initializeTables() {
    try {
      // Disable foreign key checks temporarily
      await this.sequelize.query('SET FOREIGN_KEY_CHECKS = 0');
      
      // Create tables in the correct order
      await this.sequelize.query(`
        CREATE TABLE IF NOT EXISTS roles (
          id INT AUTO_INCREMENT PRIMARY KEY,
          name VARCHAR(255) NOT NULL UNIQUE,
          description VARCHAR(255),
          createdAt DATETIME NOT NULL,
          updatedAt DATETIME NOT NULL
        ) ENGINE=InnoDB;
      `);
      
      await this.sequelize.query(`
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
      
      await this.sequelize.query(`
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
      
      await this.sequelize.query(`
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
      
      await this.sequelize.query(`
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
      
      await this.sequelize.query(`
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
      
      
      await this.sequelize.query(`
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
      
     
      await this.sequelize.query(`
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
      
      await this.sequelize.query(`
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
      
      await this.sequelize.query(`
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
      
      await this.sequelize.query(`
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
      await this.sequelize.query('SET FOREIGN_KEY_CHECKS = 1');
      
      console.log('Database tables initialized successfully');
    } catch (error) {
      console.error('Error initializing database tables:', error);
      throw error;
    }
  }
} 