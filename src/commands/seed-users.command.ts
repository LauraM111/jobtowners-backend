import { Command, CommandRunner } from 'nest-commander';
import { AdminUserSeeder } from '../modules/user/admin-user-seeder';

@Command({ name: 'seed:users', description: 'Seed users into the database' })
export class SeedUsersCommand extends CommandRunner {
  constructor(private readonly adminUserSeeder: AdminUserSeeder) {
    super();
  }

  async run(): Promise<void> {
    try {
      console.log('Starting user seeding...');
      await this.adminUserSeeder.seed();
      console.log('User seeding completed successfully');
    } catch (error) {
      console.error('Error seeding users:', error);
    }
  }
} 