import * as mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';

dotenv.config();

async function resetDatabase() {
  console.log('Starting database reset...');
  
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
  });
  
  try {
    console.log('Dropping database if exists...');
    await connection.query(`DROP DATABASE IF EXISTS ${process.env.DB_NAME}`);
    
    console.log('Creating database...');
    await connection.query(`CREATE DATABASE ${process.env.DB_NAME} 
                           CHARACTER SET utf8mb4 
                           COLLATE utf8mb4_unicode_ci`);
    
    console.log('Database reset completed successfully!');
  } catch (error) {
    console.error('Error resetting database:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

resetDatabase()
  .then(() => process.exit(0))
  .catch(() => process.exit(1)); 