import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { Sequelize } from 'sequelize-typescript';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  
  try {
    const sequelize = app.get(Sequelize);
    
    // First, check the column types
    console.log('Checking column types...');
    
    const [userIdType] = await sequelize.query(`
      SELECT COLUMN_TYPE 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = '${process.env.DB_NAME}' 
      AND TABLE_NAME = 'users' 
      AND COLUMN_NAME = 'id'
    `);
    
    const [tokenUserIdType] = await sequelize.query(`
      SELECT COLUMN_TYPE 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = '${process.env.DB_NAME}' 
      AND TABLE_NAME = 'tokens' 
      AND COLUMN_NAME = 'userId'
    `);
    
    console.log('User id type:', userIdType);
    console.log('Token userId type:', tokenUserIdType);
    
    // Drop the foreign key constraint if it exists
    try {
      await sequelize.query(`
        ALTER TABLE tokens 
        DROP FOREIGN KEY tokens_ibfk_1
      `);
      console.log('Dropped foreign key constraint');
    } catch (error) {
      console.log('No foreign key constraint to drop or error:', error.message);
    }
    
    // Drop the tokens table
    try {
      await sequelize.query(`DROP TABLE IF EXISTS tokens`);
      console.log('Dropped tokens table');
    } catch (error) {
      console.error('Error dropping tokens table:', error.message);
    }
    
    // Create the tokens table with the correct column type
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS tokens (
        id CHAR(36) PRIMARY KEY,
        token VARCHAR(255) NOT NULL,
        type VARCHAR(50) NOT NULL,
        expiresAt DATETIME NOT NULL,
        used TINYINT(1) DEFAULT false,
        userId CHAR(36) NOT NULL,
        createdAt DATETIME NOT NULL,
        updatedAt DATETIME NOT NULL,
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE utf8mb4_unicode_ci;
    `);
    
    console.log('Created tokens table with correct column types');
    
    await app.close();
    console.log('Done!');
  } catch (error) {
    console.error('Error fixing token entity:', error);
    await app.close();
  }
}

bootstrap(); 