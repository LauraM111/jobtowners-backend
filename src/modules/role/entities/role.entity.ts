import { Column, Model, Table, HasMany, DataType } from 'sequelize-typescript';
import { User } from '../../user/entities/user.entity';

@Table({
  tableName: 'roles',
})
export class Role extends Model {
  @Column({
    primaryKey: true,
    autoIncrement: true,
    type: DataType.INTEGER,
  })
  id: number;

  @Column({
    type: DataType.STRING,
    allowNull: false,
    unique: true,
  })
  name: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  description: string;

  @HasMany(() => User)
  users: User[];
} 