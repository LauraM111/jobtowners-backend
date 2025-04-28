import { Sequelize } from 'sequelize';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables
dotenv.config();

async function initDatabase() {
  console.log('Initializing database...');
  
  // Create Sequelize instance
  const sequelize = new Sequelize({
    dialect: 'mysql',
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT),
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    logging: console.log,
  });

  try {
    // Test connection
    await sequelize.authenticate();
    console.log('Database connection established successfully.');

    // First, check if the database exists, if not create it
    try {
      await sequelize.query(`CREATE DATABASE IF NOT EXISTS ${process.env.DB_NAME};`);
      console.log(`Database ${process.env.DB_NAME} created or already exists.`);
    } catch (error) {
      console.warn(`Warning: Could not create database: ${error.message}`);
    }

    // Create tables using raw SQL for more control
    const sqlDir = path.join(__dirname, '../database/sql');
    
    // Check if SQL directory exists
    if (!fs.existsSync(sqlDir)) {
      fs.mkdirSync(sqlDir, { recursive: true });
    }
    
    // Create users table SQL
    const createUsersSql = `
    CREATE TABLE IF NOT EXISTS users (
      id VARCHAR(36) PRIMARY KEY,
      email VARCHAR(255) NOT NULL UNIQUE,
      password VARCHAR(255) NOT NULL,
      firstName VARCHAR(255),
      lastName VARCHAR(255),
      username VARCHAR(255) UNIQUE,
      companyName VARCHAR(255),
      phoneNumber VARCHAR(255),
      role VARCHAR(50) NOT NULL DEFAULT 'user',
      status VARCHAR(50) NOT NULL DEFAULT 'active',
      studentPermitImage VARCHAR(255),
      proofOfEnrollmentImage VARCHAR(255),
      termsAccepted BOOLEAN NOT NULL DEFAULT false,
      emailVerified BOOLEAN NOT NULL DEFAULT false,
      stripeCustomerId VARCHAR(255),
      createdAt DATETIME NOT NULL,
      updatedAt DATETIME NOT NULL,
      deletedAt DATETIME
    );`;
    
    // Create tokens table SQL
    const createTokensSql = `
    CREATE TABLE IF NOT EXISTS tokens (
      id VARCHAR(36) PRIMARY KEY,
      userId VARCHAR(36) NOT NULL,
      token VARCHAR(255) NOT NULL,
      type VARCHAR(50) NOT NULL,
      expiresAt DATETIME NOT NULL,
      createdAt DATETIME NOT NULL,
      updatedAt DATETIME NOT NULL,
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
    );`;
    
    // Create companies table SQL
    const createCompaniesSql = `
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
      email VARCHAR(255),
      phone VARCHAR(255),
      alternatePhone VARCHAR(255),
      address VARCHAR(255),
      city VARCHAR(255),
      state VARCHAR(255),
      country VARCHAR(255),
      postalCode VARCHAR(255),
      latitude FLOAT,
      longitude FLOAT,
      gstNumber VARCHAR(255),
      panNumber VARCHAR(255),
      registrationNumber VARCHAR(255),
      logoUrl VARCHAR(255),
      coverImageUrl VARCHAR(255),
      status VARCHAR(50) NOT NULL DEFAULT 'active',
      createdBy VARCHAR(36) NOT NULL,
      updatedBy VARCHAR(36),
      createdAt DATETIME NOT NULL,
      updatedAt DATETIME NOT NULL,
      deletedAt DATETIME,
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
    );`;
    
    // Create jobs table SQL - without foreign keys initially
    const createJobsSql = `
    CREATE TABLE IF NOT EXISTS jobs (
      id VARCHAR(36) PRIMARY KEY,
      userId VARCHAR(36) NOT NULL,
      companyId VARCHAR(36),
      jobTitle VARCHAR(255) NOT NULL,
      title VARCHAR(255) NOT NULL,
      jobDescription TEXT NOT NULL,
      emailAddress VARCHAR(255) NOT NULL,
      specialisms JSON,
      category VARCHAR(255),
      jobType VARCHAR(50),
      offeredSalary VARCHAR(255),
      careerLevel VARCHAR(255),
      experience VARCHAR(255),
      gender VARCHAR(50),
      industry VARCHAR(255),
      qualification VARCHAR(255),
      applicationDeadlineDate DATETIME,
      country VARCHAR(255),
      city VARCHAR(255),
      completeAddress VARCHAR(255),
      attachmentUrl VARCHAR(255),
      additionalAttachments JSON,
      status VARCHAR(50) NOT NULL DEFAULT 'active',
      verificationStatus VARCHAR(50) NOT NULL DEFAULT 'pending',
      rejectionReason TEXT,
      views INT NOT NULL DEFAULT 0,
      applications INT NOT NULL DEFAULT 0,
      createdAt DATETIME NOT NULL,
      updatedAt DATETIME NOT NULL,
      deletedAt DATETIME
    );`;
    
    // Execute SQL statements
    console.log('Creating users table...');
    await sequelize.query(createUsersSql);
    
    console.log('Creating tokens table...');
    await sequelize.query(createTokensSql);
    
    console.log('Creating companies table...');
    await sequelize.query(createCompaniesSql);
    
    console.log('Creating jobs table...');
    await sequelize.query(createJobsSql);
    
    // Add foreign keys to jobs table
    console.log('Adding foreign keys to jobs table...');
    try {
      await sequelize.query(`
        ALTER TABLE jobs 
        ADD CONSTRAINT fk_jobs_user 
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE;
      `);
      
      await sequelize.query(`
        ALTER TABLE jobs 
        ADD CONSTRAINT fk_jobs_company 
        FOREIGN KEY (companyId) REFERENCES companies(id) ON DELETE SET NULL;
      `);
    } catch (error) {
      console.warn('Warning: Could not add foreign keys to jobs table:', error.message);
      console.log('This is not critical - the application will still work.');
    }
    
    console.log('Database initialization completed successfully.');
  } catch (error) {
    console.error('Error initializing database:', error);
  } finally {
    await sequelize.close();
  }
}

// Run the initialization
initDatabase().catch(error => {
  console.error('Failed to initialize database:', error);
  process.exit(1);
}); 