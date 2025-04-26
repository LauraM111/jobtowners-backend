import { Injectable } from '@nestjs/common';
import { Sequelize } from 'sequelize-typescript';
import { InjectConnection } from '@nestjs/sequelize';

@Injectable()
export class DatabaseInitService {
  constructor(
    @InjectConnection()
    private readonly sequelize: Sequelize,
  ) {}

  async initDatabase() {
    try {
      // Disable foreign key checks before sync
      await this.sequelize.query('SET FOREIGN_KEY_CHECKS = 0');
      console.log('Disabled foreign key checks for sync');
      
      // Perform any additional initialization here
      
      // Enable foreign key checks after sync
      await this.sequelize.query('SET FOREIGN_KEY_CHECKS = 1');
      console.log('Enabled foreign key checks after database initialization');
    } catch (error) {
      console.error('Error during database initialization:', error);
    }
  }
} 