import { Column, Model, Table, DataType, HasMany, BeforeCreate } from 'sequelize-typescript';
import { v4 as uuidv4 } from 'uuid';
import { CandidateOrder } from './candidate-order.entity';

@Table({
  tableName: 'candidate_plans',
  timestamps: true,
  paranoid: true
})
export class CandidatePlan extends Model {
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
  name: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true
  })
  description: string;

  @Column({
    type: DataType.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 15.00
  })
  price: number;

  @Column({
    type: DataType.STRING,
    allowNull: false,
    defaultValue: 'usd'
  })
  currency: string;

  @Column({
    type: DataType.STRING,
    allowNull: true
  })
  stripeProductId: string;

  @Column({
    type: DataType.STRING,
    allowNull: true
  })
  stripePriceId: string;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    defaultValue: 15
  })
  dailyApplicationLimit: number;

  @Column({
    type: DataType.STRING,
    allowNull: false,
    defaultValue: 'active'
  })
  status: string;

  @HasMany(() => CandidateOrder)
  orders: CandidateOrder[];

  @BeforeCreate
  static generateId(instance: CandidatePlan) {
    if (!instance.id) {
      instance.id = uuidv4();
    }
  }
} 