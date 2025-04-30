import { Column, Model, Table, DataType, ForeignKey, BelongsTo, BeforeCreate } from 'sequelize-typescript';
import { v4 as uuidv4 } from 'uuid';
import { User } from '../../user/entities/user.entity';

@Table({
  tableName: 'application_limits',
  timestamps: true
})
export class ApplicationLimit extends Model {
  @Column({
    type: DataType.UUID,
    primaryKey: true,
    defaultValue: DataType.UUIDV4
  })
  id: string;

  @ForeignKey(() => User)
  @Column({
    type: DataType.UUID,
    allowNull: false,
    unique: true
  })
  userId: string;

  @BelongsTo(() => User)
  user: User;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    defaultValue: 15
  })
  dailyLimit: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    defaultValue: 0
  })
  applicationsUsedToday: number;

  @Column({
    type: DataType.DATEONLY,
    allowNull: false
  })
  lastResetDate: Date;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: false,
    defaultValue: false
  })
  hasPaid: boolean;

  @BeforeCreate
  static generateId(instance: ApplicationLimit) {
    if (!instance.id) {
      instance.id = uuidv4();
    }
  }
} 