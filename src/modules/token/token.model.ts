import { Column, Model, Table, DataType, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { User } from '../user/entities/user.entity';

@Table
export class Token extends Model {
  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  token: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  type: string;

  @Column({
    type: DataType.DATE,
    allowNull: false,
  })
  expiresAt: Date;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: false,
  })
  used: boolean;

  @ForeignKey(() => User)
  @Column
  userId: number;

  @BelongsTo(() => User)
  user: User;
} 