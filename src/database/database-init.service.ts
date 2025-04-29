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
      
      // Create users table
      await this.sequelize.query(`
        CREATE TABLE IF NOT EXISTS users (
          id VARCHAR(36) PRIMARY KEY,
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
        ) ENGINE=InnoDB CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
      `);
      
      // Create tokens table with foreign key included in the CREATE TABLE statement
      await this.sequelize.query(`
        CREATE TABLE IF NOT EXISTS tokens (
          id VARCHAR(36) PRIMARY KEY,
          token VARCHAR(255) NOT NULL,
          type VARCHAR(255) NOT NULL,
          expiresAt DATETIME NOT NULL,
          used BOOLEAN DEFAULT false,
          userId VARCHAR(36) NOT NULL,
          createdAt DATETIME NOT NULL,
          updatedAt DATETIME NOT NULL,
          CONSTRAINT fk_tokens_user FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
        ) ENGINE=InnoDB CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
      `);
      
      // Create OTPs table with foreign key included in the CREATE TABLE statement
      await this.sequelize.query(`
        CREATE TABLE IF NOT EXISTS otps (
          id VARCHAR(36) PRIMARY KEY,
          code VARCHAR(255) NOT NULL,
          expiresAt DATETIME NOT NULL,
          used BOOLEAN DEFAULT false,
          userId VARCHAR(36) NOT NULL,
          createdAt DATETIME NOT NULL,
          updatedAt DATETIME NOT NULL,
          CONSTRAINT fk_otps_user FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
        ) ENGINE=InnoDB CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
      `);
      
      // Create resumes table
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
          userId VARCHAR(36) NOT NULL,
          createdAt DATETIME NOT NULL,
          updatedAt DATETIME NOT NULL,
          CONSTRAINT fk_resumes_user FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
        ) ENGINE=InnoDB CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
      `);
      
      // Create education table
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
      
      // Create experiences table
      await this.sequelize.query(`
        CREATE TABLE IF NOT EXISTS experiences (
          id INT AUTO_INCREMENT PRIMARY KEY,
          position VARCHAR(255) NOT NULL,
          companyName VARCHAR(255) NOT NULL,
          startDate DATE,
          endDate DATE,
          description TEXT,
          resumeId INT NOT NULL,
          createdAt DATETIME NOT NULL,
          updatedAt DATETIME NOT NULL,
          FOREIGN KEY (resumeId) REFERENCES resumes(id) ON DELETE CASCADE
        ) ENGINE=InnoDB;
      `);
      
      // Create attachments table
      await this.sequelize.query(`
        CREATE TABLE IF NOT EXISTS attachments (
          id INT AUTO_INCREMENT PRIMARY KEY,
          fileName VARCHAR(255) NOT NULL,
          fileUrl VARCHAR(255) NOT NULL,
          resumeId INT NOT NULL,
          createdAt DATETIME NOT NULL,
          updatedAt DATETIME NOT NULL,
          FOREIGN KEY (resumeId) REFERENCES resumes(id) ON DELETE CASCADE
        ) ENGINE=InnoDB;
      `);
      
      // Create companies table
      await this.sequelize.query(`
        CREATE TABLE IF NOT EXISTS companies (
          id VARCHAR(36) PRIMARY KEY,
          userId VARCHAR(36) NOT NULL,
          companyName VARCHAR(255) NOT NULL,
          slug VARCHAR(255) UNIQUE,
          description TEXT,
          industryType VARCHAR(255),
          website VARCHAR(255),
          foundedYear INT,
          companySize VARCHAR(255),
          email VARCHAR(255) NOT NULL,
          phone VARCHAR(255),
          alternatePhone VARCHAR(255),
          contactPerson VARCHAR(255),
          addressLine1 VARCHAR(255) NOT NULL,
          addressLine2 VARCHAR(255),
          city VARCHAR(255) NOT NULL,
          state VARCHAR(255) NOT NULL,
          country VARCHAR(255) NOT NULL,
          postalCode VARCHAR(255) NOT NULL,
          latitude FLOAT,
          longitude FLOAT,
          gstNumber VARCHAR(255),
          panNumber VARCHAR(255),
          registrationNumber VARCHAR(255),
          logoUrl VARCHAR(255),
          coverImageUrl VARCHAR(255),
          status VARCHAR(255) NOT NULL DEFAULT 'active',
          createdBy VARCHAR(36) NOT NULL,
          updatedBy VARCHAR(36),
          createdAt DATETIME NOT NULL,
          updatedAt DATETIME NOT NULL,
          deletedAt DATETIME,
          CONSTRAINT fk_companies_user FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
        ) ENGINE=InnoDB CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
      `);
      
      // Create subscription_plans table
      await this.sequelize.query(`
        CREATE TABLE IF NOT EXISTS subscription_plans (
          id VARCHAR(36) PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          description TEXT,
          price DECIMAL(10,2) NOT NULL,
          \`interval\` VARCHAR(255) NOT NULL DEFAULT 'month',
          intervalCount INT NOT NULL DEFAULT 1,
          currency VARCHAR(255) NOT NULL DEFAULT 'usd',
          stripeProductId VARCHAR(255),
          stripePriceId VARCHAR(255),
          features JSON,
          status VARCHAR(255) NOT NULL DEFAULT 'active',
          numberOfJobs INT NOT NULL DEFAULT 0,
          resumeViewsCount INT NOT NULL DEFAULT 0,
          createdAt DATETIME NOT NULL,
          updatedAt DATETIME NOT NULL,
          deletedAt DATETIME
        ) ENGINE=InnoDB CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
      `);
      
      // Create subscriptions table
      await this.sequelize.query(`
        CREATE TABLE IF NOT EXISTS subscriptions (
          id VARCHAR(36) PRIMARY KEY,
          userId VARCHAR(36) NOT NULL,
          planId VARCHAR(36) NOT NULL,
          stripeSubscriptionId VARCHAR(255),
          stripeCustomerId VARCHAR(255),
          startDate DATETIME NOT NULL,
          endDate DATETIME,
          status VARCHAR(255) NOT NULL DEFAULT 'active',
          cancelAtPeriodEnd BOOLEAN NOT NULL DEFAULT false,
          canceledAt DATETIME,
          createdAt DATETIME NOT NULL,
          updatedAt DATETIME NOT NULL,
          deletedAt DATETIME,
          CONSTRAINT fk_subscriptions_user FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
          CONSTRAINT fk_subscriptions_plan FOREIGN KEY (planId) REFERENCES subscription_plans(id) ON DELETE CASCADE
        ) ENGINE=InnoDB CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
      `);
      
      // Create jobs table
      await this.sequelize.query(`
        CREATE TABLE IF NOT EXISTS jobs (
          id VARCHAR(36) PRIMARY KEY,
          userId VARCHAR(36) NOT NULL,
          jobTitle VARCHAR(255) NOT NULL,
          title VARCHAR(255) NOT NULL,
          jobDescription TEXT NOT NULL,
          emailAddress VARCHAR(255) NOT NULL,
          specialisms TEXT,
          category VARCHAR(255),
          jobType VARCHAR(255) NOT NULL DEFAULT 'full-time',
          offeredSalary VARCHAR(255),
          careerLevel VARCHAR(255),
          experience VARCHAR(255),
          gender VARCHAR(255) DEFAULT 'any',
          industry VARCHAR(255),
          qualification VARCHAR(255),
          applicationDeadlineDate DATETIME,
          country VARCHAR(255),
          city VARCHAR(255),
          completeAddress TEXT,
          attachmentUrl VARCHAR(255),
          additionalAttachments TEXT,
          status VARCHAR(255) NOT NULL DEFAULT 'active',
          views INT NOT NULL DEFAULT 0,
          applications INT NOT NULL DEFAULT 0,
          verificationStatus VARCHAR(255) NOT NULL DEFAULT 'pending',
          rejectionReason TEXT,
          companyId VARCHAR(36),
          createdAt DATETIME NOT NULL,
          updatedAt DATETIME NOT NULL,
          deletedAt DATETIME,
          CONSTRAINT fk_jobs_user FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
          CONSTRAINT fk_jobs_company FOREIGN KEY (companyId) REFERENCES companies(id) ON DELETE SET NULL
        ) ENGINE=InnoDB CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
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