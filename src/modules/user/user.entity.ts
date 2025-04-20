import { Column, Model, Table, DataType, BeforeCreate } from 'sequelize-typescript';
import { v4 as uuidv4 } from 'uuid';

@Table({
  tableName: 'users',
  timestamps: true
})
export class User extends Model {
  @Column({
    type: DataType.UUID,
    primaryKey: true,
    defaultValue: DataType.UUIDV4
  })
  id: string;

  @Column({
    type: DataType.STRING,
    unique: true,
    allowNull: false
  })
  email: string;

  @Column({
    type: DataType.STRING,
    allowNull: false
  })
  password: string;

  @Column({
    type: DataType.STRING,
    allowNull: true
  })
  firstName: string;

  @Column({
    type: DataType.STRING,
    allowNull: true
  })
  lastName: string;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: false
  })
  isVerified: boolean;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: false
  })
  isActive: boolean;

  @BeforeCreate
  static generateId(instance: User) {
    if (!instance.id) {
      instance.id = uuidv4();
    }
  }
} 