import * as mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';
import { exec } from 'child_process';
import { promisify } from 'util';

const execPromise = promisify(exec);

// Load environment variables
dotenv.config();

async function checkMySQLService() {
  try {
    console.log('Checking MySQL service status...');
    await execPromise('sudo service mysql status');
    console.log('MySQL service is running.');
    return true;
  } catch (error) {
    console.log('MySQL service is not running. Attempting to start...');
    try {
      await execPromise('sudo service mysql start');
      console.log('MySQL service started successfully.');
      return true;
    } catch (startError) {
      console.error('Failed to start MySQL service:', startError.message);
      return false;
    }
  }
}

async function initializeDatabase() {
  console.log('Starting database initialization...');
  
  // Check MySQL service
  const isServiceRunning = await checkMySQLService();
  if (!isServiceRunning) {
    console.error('Cannot proceed without MySQL service running.');
    return false;
  }
  
  try {
    // Try to connect to MySQL server without specifying a database
    console.log('Connecting to MySQL server...');
    const rootConnection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT),
      user: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      connectTimeout: 60000,
    });
    
    console.log('Connected to MySQL server successfully!');
    
    // Create database if it doesn't exist
    console.log(`Creating database '${process.env.DB_NAME}' if it doesn't exist...`);
    await rootConnection.execute(`CREATE DATABASE IF NOT EXISTS ${process.env.DB_NAME}`);
    console.log(`Database '${process.env.DB_NAME}' created or already exists.`);
    
    // Close root connection
    await rootConnection.end();
    console.log('Database initialization completed successfully!');
    return true;
  } catch (error) {
    console.error('Error initializing database:', error);
    
    // Check if it's an authentication error
    if (error.message && error.message.includes('Access denied')) {
      console.log('Authentication error detected. This might be due to incorrect credentials.');
      console.log('Please check your DB_USERNAME and DB_PASSWORD in the .env file.');
    }
    
    // Check if it's a connection error
    if (error.message && error.message.includes('ECONNREFUSED')) {
      console.log('Connection refused. This might be due to MySQL not running or incorrect host/port.');
      console.log('Please check your DB_HOST and DB_PORT in the .env file.');
    }
    
    return false;
  }
}

// Run the initialization
initializeDatabase().then(success => {
  if (success) {
    console.log('Database initialization completed successfully!');
    process.exit(0);
  } else {
    console.error('Database initialization failed!');
    process.exit(1);
  }
}); 