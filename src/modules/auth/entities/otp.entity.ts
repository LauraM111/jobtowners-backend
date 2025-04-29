import { Column, Model, Table, DataType, ForeignKey, BelongsTo, BeforeCreate } from 'sequelize-typescript';
import { v4 as uuidv4 } from 'uuid';
import { User } from '../../user/entities/user.entity';

@Table({
  tableName: 'otps',
  timestamps: true
})
export default class OTP extends Model {
  @Column({
    type: DataType.UUID,
    primaryKey: true,
    defaultValue: DataType.UUIDV4
  })
  id: string;

  @Column({
    type: DataType.STRING,
    allowNull: false
  })
  code: string;

  @Column({
    type: DataType.DATE,
    allowNull: false
  })
  expiresAt: Date;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: false,
    field: 'used'
  })
  used: boolean;

  @ForeignKey(() => User)
  @Column({
    type: DataType.UUID,
    allowNull: false
  })
  userId: string;

  @BelongsTo(() => User)
  user: User;

  @BeforeCreate
  static generateId(instance: OTP) {
    if (!instance.id) {
      instance.id = uuidv4();
    }
  }
} 