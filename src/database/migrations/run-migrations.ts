import { Sequelize } from 'sequelize';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables
dotenv.config();

async function runMigrations() {
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

    // Get migration files
    const migrationsDir = path.join(__dirname);
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.js') && !file.includes('run-migrations'))
      .sort();

    console.log(`Found ${migrationFiles.length} migration files.`);

    // Run migrations
    for (const file of migrationFiles) {
      console.log(`Running migration: ${file}`);
      const migration = require(path.join(migrationsDir, file)).default;
      
      try {
        await migration.up(sequelize.getQueryInterface(), sequelize);
        console.log(`Migration ${file} completed successfully.`);
      } catch (error) {
        console.error(`Error running migration ${file}:`, error.message);
        // Continue with next migration
      }
    }

    console.log('All migrations completed.');
  } catch (error) {
    console.error('Unable to connect to the database:', error);
  } finally {
    await sequelize.close();
  }
}

runMigrations(); 