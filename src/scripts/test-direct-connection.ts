import * as mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function testDirectConnection() {
  console.log('Testing direct database connection...');
  console.log('Database config:', {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USERNAME,
    database: process.env.DB_NAME,
  });
  
  try {
    // First, try to connect to MySQL server without specifying a database
    console.log('Connecting to MySQL server...');
    const rootConnection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT),
      user: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
    });
    
    console.log('Connected to MySQL server successfully!');
    
    // Check if database exists
    console.log(`Checking if database '${process.env.DB_NAME}' exists...`);
    const [databases] = await rootConnection.execute('SHOW DATABASES');
    const databaseExists = Array.isArray(databases) && databases.some(
      (db: any) => db.Database === process.env.DB_NAME
    );
    
    if (!databaseExists) {
      console.log(`Database '${process.env.DB_NAME}' does not exist. Creating it...`);
      await rootConnection.execute(`CREATE DATABASE IF NOT EXISTS ${process.env.DB_NAME}`);
      console.log(`Database '${process.env.DB_NAME}' created successfully!`);
    } else {
      console.log(`Database '${process.env.DB_NAME}' already exists.`);
    }
    
    // Close root connection
    await rootConnection.end();
    
    // Now connect to the specific database
    console.log(`Connecting to database '${process.env.DB_NAME}'...`);
    const dbConnection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT),
      user: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
    });
    
    console.log(`Connected to database '${process.env.DB_NAME}' successfully!`);
    
    // Test query
    console.log('Executing test query...');
    const [tables] = await dbConnection.execute('SHOW TABLES');
    console.log('Tables in database:', tables);
    
    // Close connection
    await dbConnection.end();
    console.log('Connection closed.');
    
    return true;
  } catch (error) {
    console.error('Error connecting to database:', error);
    return false;
  }
}

testDirectConnection(); 