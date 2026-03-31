import { 
  Column, 
  Model, 
  Table, 
  DataType, 
  ForeignKey, 
  BelongsTo, 
  CreatedAt, 
  UpdatedAt, 
  PrimaryKey, 
  Default 
} from 'sequelize-typescript';
import { User } from '../../user/entities/user.entity';

@Table({ tableName: 'application_notifications' })
export class ApplicationNotification extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  id: string;

  @ForeignKey(() => User)
  @Column({
    type: DataType.UUID,
    allowNull: false,
    unique: true,
  })
  employerId: string;

  @BelongsTo(() => User)
  employer: User;

  @Column({
    type: DataType.DATE,
    allowNull: false,
    defaultValue: DataType.NOW,
  })
  lastCheckedAt: Date;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    defaultValue: 0,
  })
  lastNotificationCount: number;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}
