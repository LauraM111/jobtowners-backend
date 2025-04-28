import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { Role } from './entities/role.entity';

@Module({
  imports: [
    SequelizeModule.forFeature([Role]),
  ],
  exports: [SequelizeModule],
})
export class RoleModule {} 