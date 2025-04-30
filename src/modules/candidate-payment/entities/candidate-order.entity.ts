import { Column, Model, Table, DataType, ForeignKey, BelongsTo, BeforeCreate } from 'sequelize-typescript';
import { v4 as uuidv4 } from 'uuid';
import { User } from '../../user/entities/user.entity';
import { CandidatePlan } from './candidate-plan.entity';

@Table({
  tableName: 'candidate_orders',
  timestamps: true
})
export class CandidateOrder extends Model {
  @Column({
    type: DataType.UUID,
    primaryKey: true,
    defaultValue: DataType.UUIDV4
  })
  id: string;

  @ForeignKey(() => User)
  @Column({
    type: DataType.UUID,
    allowNull: false
  })
  userId: string;

  @BelongsTo(() => User)
  user: User;

  @ForeignKey(() => CandidatePlan)
  @Column({
    type: DataType.UUID,
    allowNull: false
  })
  planId: string;

  @BelongsTo(() => CandidatePlan)
  plan: CandidatePlan;

  @Column({
    type: DataType.DECIMAL(10, 2),
    allowNull: false
  })
  amount: number;

  @Column({
    type: DataType.STRING,
    allowNull: false,
    defaultValue: 'usd'
  })
  currency: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
    defaultValue: 'pending'
  })
  status: string;

  @Column({
    type: DataType.STRING,
    allowNull: true
  })
  stripePaymentIntentId: string;

  @Column({
    type: DataType.STRING,
    allowNull: true
  })
  stripeCustomerId: string;

  @Column({
    type: DataType.DATE,
    allowNull: true
  })
  paymentDate: Date;

  @BeforeCreate
  static generateId(instance: CandidateOrder) {
    if (!instance.id) {
      instance.id = uuidv4();
    }
  }
} 