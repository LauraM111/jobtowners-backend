import * as mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';
import { exec } from 'child_process';
import { promisify } from 'util';

const execPromise = promisify(exec);

// Load environment variables
dotenv.config();

async function fixDatabase() {
  console.log('Starting database fix process...');
  
  // Check if MySQL is running
  try {
    console.log('Checking if MySQL is running...');
    await execPromise('sudo service mysql status');
    console.log('MySQL is running.');
  } catch (error) {
    console.log('MySQL is not running. Attempting to start...');
    try {
      await execPromise('sudo service mysql start');
      console.log('MySQL started successfully.');
    } catch (startError) {
      console.error('Failed to start MySQL:', startError.message);
      console.log('Please start MySQL manually and try again.');
      return;
    }
  }
  
  try {
    // Create connection without specifying database
    console.log('Connecting to MySQL server...');
    const rootConnection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT),
      user: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
    });
    
    console.log('Connected to MySQL server successfully!');
    
    // Create database if it doesn't exist
    console.log(`Checking if database '${process.env.DB_NAME}' exists...`);
    await rootConnection.execute(`CREATE DATABASE IF NOT EXISTS ${process.env.DB_NAME}`);
    console.log(`Database '${process.env.DB_NAME}' created or already exists.`);
    
    // Close root connection
    await rootConnection.end();
    
    // Connect to the specific database
    console.log(`Connecting to database '${process.env.DB_NAME}'...`);
    const dbConnection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT),
      user: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
    });
    
    console.log(`Connected to database '${process.env.DB_NAME}' successfully!`);
    
    // Disable foreign key checks
    console.log('Disabling foreign key checks...');
    await dbConnection.execute('SET FOREIGN_KEY_CHECKS = 0;');
    
    // Create users table
    console.log('Creating users table...');
    await dbConnection.execute(`
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
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('Users table created successfully!');
    
    // Create tokens table
    console.log('Creating tokens table...');
    await dbConnection.execute(`
      CREATE TABLE IF NOT EXISTS tokens (
        id CHAR(36) PRIMARY KEY,
        userId CHAR(36) NOT NULL,
        token VARCHAR(255) NOT NULL,
        type VARCHAR(50) NOT NULL,
        expiresAt DATETIME NOT NULL,
        createdAt DATETIME NOT NULL,
        updatedAt DATETIME NOT NULL,
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('Tokens table created successfully!');
    
    // Create subscription_plans table
    console.log('Creating subscription_plans table...');
    await dbConnection.execute(`
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
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('Subscription plans table created successfully!');
    
    // Create subscriptions table
    console.log('Creating subscriptions table...');
    await dbConnection.execute(`
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
        INDEX (userId),
        INDEX (planId)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('Subscriptions table created successfully!');
    
    // Enable foreign key checks
    console.log('Enabling foreign key checks...');
    await dbConnection.execute('SET FOREIGN_KEY_CHECKS = 1;');
    
    // Create admin user
    console.log('Creating admin user...');
    const adminExists = await dbConnection.execute(`
      SELECT * FROM users WHERE email = 'admin@jobtowners.com' LIMIT 1
    `);
    
    if (!adminExists[0] || (Array.isArray(adminExists[0]) && adminExists[0].length === 0)) {
      const adminId = require('uuid').v4();
      const bcrypt = require('bcrypt');
      const hashedPassword = await bcrypt.hash('Admin@123', 10);
      const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
      
      await dbConnection.execute(`
        INSERT INTO users (
          id, firstName, lastName, username, email, password, 
          role, status, termsAccepted, emailVerified, createdAt, updatedAt
        ) VALUES (
          ?, 'Admin', 'User', 'admin', 'admin@jobtowners.com', ?, 
          'admin', 'active', 1, 1, ?, ?
        )
      `, [adminId, hashedPassword, now, now]);
      
      console.log('Admin user created successfully!');
    } else {
      console.log('Admin user already exists.');
    }
    
    // Close connection
    await dbConnection.end();
    console.log('Database setup completed successfully!');
    
  } catch (error) {
    console.error('Error fixing database:', error);
  }
}

fixDatabase(); 