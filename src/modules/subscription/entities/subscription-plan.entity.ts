import { Column, Model, Table, DataType, BeforeCreate } from 'sequelize-typescript';
import { v4 as uuidv4 } from 'uuid';

export enum PlanInterval {
  MONTHLY = 'month',
  YEARLY = 'year',
  WEEKLY = 'week',
  DAILY = 'day'
}

export enum PlanStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  ARCHIVED = 'archived'
}

@Table({
  tableName: 'subscription_plans',
  timestamps: true
})
export class SubscriptionPlan extends Model {
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
    allowNull: false
  })
  price: number;

  @Column({
    type: DataType.STRING,
    allowNull: false,
    defaultValue: PlanInterval.MONTHLY,
    validate: {
      isIn: [Object.values(PlanInterval)]
    }
  })
  interval: PlanInterval;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    defaultValue: 1
  })
  intervalCount: number;

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
    type: DataType.JSON,
    allowNull: true
  })
  features: any;

  @Column({
    type: DataType.STRING,
    allowNull: false,
    defaultValue: PlanStatus.ACTIVE,
    validate: {
      isIn: [Object.values(PlanStatus)]
    }
  })
  status: PlanStatus;

  @Column({
    type: DataType.DATE,
    allowNull: true
  })
  deletedAt: Date;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    defaultValue: 0,
    comment: 'Number of jobs allowed with this plan'
  })
  numberOfJobs: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    defaultValue: 0,
    comment: 'Number of resume views allowed with this plan'
  })
  resumeViewsCount: number;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: 'Skip Stripe integration for zero-price plans'
  })
  skipStripe: boolean;

  @BeforeCreate
  static generateId(instance: SubscriptionPlan) {
    if (!instance.id) {
      instance.id = uuidv4();
    }
  }
} 