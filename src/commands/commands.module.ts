import { Module } from '@nestjs/common';
import { SeedUsersCommand } from './seed-users.command';
import { UserModule } from '../modules/user/user.module';

@Module({
  imports: [UserModule],
  providers: [SeedUsersCommand],
})
export class CommandsModule {} 