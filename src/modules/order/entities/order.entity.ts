import { 
  Column, Model, Table, DataType, ForeignKey, BelongsTo, HasMany, 
  CreatedAt, UpdatedAt, PrimaryKey, Default 
} from 'sequelize-typescript';
import { User } from '../../user/entities/user.entity';
import { OrderItem } from './order-item.entity';

export enum OrderStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed',
  REFUNDED = 'refunded',
  CANCELLED = 'cancelled'
}

@Table({ tableName: 'orders' })
export class Order extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  id: string;

  @ForeignKey(() => User)
  @Column({
    type: DataType.UUID,
    allowNull: false,
  })
  userId: string;

  @Column({
    type: DataType.DECIMAL(10, 2),
    allowNull: false,
  })
  amount: number;

  @Column({
    type: DataType.STRING,
    allowNull: false,
    defaultValue: 'USD',
  })
  currency: string;

  @Column({
    type: DataType.ENUM(...Object.values(OrderStatus)),
    allowNull: false,
    defaultValue: OrderStatus.PENDING,
  })
  status: OrderStatus;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  paymentIntentId: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  paymentMethodId: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  notes: string;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;

  @BelongsTo(() => User)
  user: User;

  @HasMany(() => OrderItem)
  items: OrderItem[];
} 