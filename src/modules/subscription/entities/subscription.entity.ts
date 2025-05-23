import { Column, Model, Table, DataType, ForeignKey, BelongsTo, BeforeCreate, DeletedAt } from 'sequelize-typescript';
import { v4 as uuidv4 } from 'uuid';
import { User } from '../../user/entities/user.entity';
import { SubscriptionPlan } from './subscription-plan.entity';

export enum SubscriptionStatus {
  ACTIVE = 'active',
  CANCELED = 'canceled',
  PAST_DUE = 'past_due',
  UNPAID = 'unpaid',
  INCOMPLETE = 'incomplete',
  INCOMPLETE_EXPIRED = 'incomplete_expired',
  TRIALING = 'trialing'
}

@Table({
  tableName: 'subscriptions',
  timestamps: true,
  paranoid: true,
})
export class Subscription extends Model {
  @Column({
    type: DataType.UUID,
    defaultValue: DataType.UUIDV4,
    primaryKey: true,
  })
  id: string;

  @ForeignKey(() => User)
  @Column({
    type: DataType.UUID,
    allowNull: false,
  })
  userId: string;

  @BelongsTo(() => User)
  user: User;

  @ForeignKey(() => SubscriptionPlan)
  @Column({
    type: DataType.UUID,
    allowNull: false,
  })
  planId: string;

  @BelongsTo(() => SubscriptionPlan)
  plan: SubscriptionPlan;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  stripeSubscriptionId: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  stripeCustomerId: string;

  @Column({
    type: DataType.DATE,
    allowNull: false,
  })
  startDate: Date;

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  endDate: Date;

  @Column({
    type: DataType.STRING,
    allowNull: false,
    defaultValue: 'active',
  })
  status: string;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  })
  cancelAtPeriodEnd: boolean;

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  canceledAt: Date;

  @DeletedAt
  deletedAt: Date;

  @BeforeCreate
  static generateId(instance: Subscription) {
    if (!instance.id) {
      instance.id = uuidv4();
    }
  }
} 