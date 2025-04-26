import * as mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function testConnection() {
  console.log('Testing database connection...');
  console.log('Database config:', {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USERNAME,
    database: process.env.DB_NAME,
  });
  
  try {
    // Create connection
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT),
      user: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
    });
    
    console.log('Connection established successfully!');
    
    // Check if database exists
    const [rows] = await connection.execute('SHOW DATABASES LIKE ?', [process.env.DB_NAME]);
    if (Array.isArray(rows) && rows.length === 0) {
      console.log(`Database '${process.env.DB_NAME}' does not exist. Creating it...`);
      await connection.execute(`CREATE DATABASE IF NOT EXISTS ${process.env.DB_NAME}`);
      console.log(`Database '${process.env.DB_NAME}' created successfully!`);
    } else {
      console.log(`Database '${process.env.DB_NAME}' already exists.`);
    }
    
    // Switch to the database
    await connection.execute(`USE ${process.env.DB_NAME}`);
    
    // Test query
    const [tables] = await connection.execute('SHOW TABLES');
    console.log('Tables in database:', tables);
    
    // Close connection
    await connection.end();
    console.log('Connection closed.');
  } catch (error) {
    console.error('Error connecting to database:', error);
  }
}

testConnection(); 