import { Sequelize } from 'sequelize-typescript';
import * as dotenv from 'dotenv';

dotenv.config();

async function resetDatabase() {
  const sequelize = new Sequelize({
    dialect: 'mysql',
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT, 10),
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  try {
    console.log('Dropping all tables...');
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 0');
    
    // Get all tables
    const [tables] = await sequelize.query(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = '${process.env.DB_NAME}'`
    );
    
    // Drop each table
    for (const table of tables as any[]) {
      const tableName = table.table_name || table.TABLE_NAME;
      await sequelize.query(`DROP TABLE IF EXISTS \`${tableName}\``);
      console.log(`Dropped table: ${tableName}`);
    }
    
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 1');
    console.log('All tables dropped successfully');
    
    await sequelize.close();
  } catch (error) {
    console.error('Error resetting database:', error);
    await sequelize.close();
  }
}

resetDatabase(); 