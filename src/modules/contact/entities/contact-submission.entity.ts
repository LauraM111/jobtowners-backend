import {
  Table,
  Column,
  Model,
  DataType,
  CreatedAt,
  UpdatedAt,
  PrimaryKey,
  ForeignKey,
  BelongsTo,
  Default,
} from 'sequelize-typescript';
import { User } from '../../user/entities/user.entity';

export enum ContactSubmissionStatus {
  NEW = 'new',
  READ = 'read',
  RESPONDED = 'responded',
}

@Table({ tableName: 'contact_submissions' })
export class ContactSubmission extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  id: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  name: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  email: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  phoneNumber: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  subject: string;

  @Column({
    type: DataType.TEXT,
    allowNull: false,
  })
  message: string;

  @Column({
    type: DataType.ENUM(...Object.values(ContactSubmissionStatus)),
    allowNull: false,
    defaultValue: ContactSubmissionStatus.NEW,
  })
  status: ContactSubmissionStatus;

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  respondedAt: Date;

  @ForeignKey(() => User)
  @Column({
    type: DataType.UUID,
    allowNull: true,
  })
  respondedBy: string;

  @BelongsTo(() => User, 'respondedBy')
  responder: User;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
} 