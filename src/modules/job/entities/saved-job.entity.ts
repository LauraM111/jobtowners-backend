import { Column, Model, Table, DataType, ForeignKey, BelongsTo, BeforeCreate } from 'sequelize-typescript';
import { v4 as uuidv4 } from 'uuid';
import { User } from '../../user/entities/user.entity';
import { Job } from './job.entity';

@Table({
  tableName: 'saved_jobs',
  timestamps: true
})
export class SavedJob extends Model {
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

  @ForeignKey(() => Job)
  @Column({
    type: DataType.UUID,
    allowNull: false
  })
  jobId: string;

  @BelongsTo(() => Job)
  job: Job;

  @BeforeCreate
  static generateId(instance: SavedJob) {
    if (!instance.id) {
      instance.id = uuidv4();
    }
  }
} 