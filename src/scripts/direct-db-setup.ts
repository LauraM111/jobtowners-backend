import * as mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables
dotenv.config();

async function setupDatabase() {
  console.log('Setting up database directly...');
  
  try {
    // Create connection without specifying database
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT),
      user: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
    });
    
    console.log('Connection established successfully!');
    
    // Create database if it doesn't exist
    await connection.execute(`CREATE DATABASE IF NOT EXISTS ${process.env.DB_NAME}`);
    console.log(`Database '${process.env.DB_NAME}' created or already exists.`);
    
    // Switch to the database
    await connection.execute(`USE ${process.env.DB_NAME}`);
    
    // Read SQL file with table creation statements
    const sqlFilePath = path.join(__dirname, 'database-schema.sql');
    const sql = fs.readFileSync(sqlFilePath, 'utf8');
    
    // Split SQL statements by semicolon
    const statements = sql.split(';').filter(statement => statement.trim() !== '');
    
    // Execute each statement
    for (const statement of statements) {
      await connection.execute(statement);
      console.log('Executed SQL statement successfully');
    }
    
    // Close connection
    await connection.end();
    console.log('Database setup completed successfully!');
  } catch (error) {
    console.error('Error setting up database:', error);
  }
}

setupDatabase(); 