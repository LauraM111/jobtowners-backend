import { Column, Model, Table, DataType, ForeignKey, BelongsTo, HasMany, BeforeCreate } from 'sequelize-typescript';
import { v4 as uuidv4 } from 'uuid';
import { User } from '../../user/entities/user.entity';
import { JobApplication } from '../../job-application/entities/job-application.entity';
import { Message } from './message.entity';

@Table({
  tableName: 'conversations',
  timestamps: true
})
export class Conversation extends Model {
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
  employerId: string;

  @BelongsTo(() => User, 'employerId')
  employer: User;

  @ForeignKey(() => User)
  @Column({
    type: DataType.UUID,
    allowNull: false
  })
  candidateId: string;

  @BelongsTo(() => User, 'candidateId')
  candidate: User;

  @ForeignKey(() => JobApplication)
  @Column({
    type: DataType.UUID,
    allowNull: false
  })
  jobApplicationId: string;

  @BelongsTo(() => JobApplication)
  jobApplication: JobApplication;

  @Column({
    type: DataType.DATE,
    allowNull: true
  })
  lastMessageAt: Date;

  @HasMany(() => Message)
  messages: Message[];

  @BeforeCreate
  static generateId(instance: Conversation) {
    if (!instance.id) {
      instance.id = uuidv4();
    }
  }
} 