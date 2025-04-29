import { Column, Model, Table, DataType, ForeignKey, BelongsTo, BeforeCreate } from 'sequelize-typescript';
import { v4 as uuidv4 } from 'uuid';
import { User } from '../../user/entities/user.entity';

export enum TokenType {
  EMAIL_VERIFICATION = 'email_verification',
  PASSWORD_RESET = 'password_reset',
  REFRESH = 'refresh'
}

@Table({
  tableName: 'tokens',
  timestamps: true
})
export default class Token extends Model {
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
  token: string;

  @Column({
    type: DataType.STRING,
    allowNull: false
  })
  type: string;

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
  static generateId(instance: Token) {
    if (!instance.id) {
      instance.id = uuidv4();
    }
  }
} 