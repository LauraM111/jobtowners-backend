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
import { Job } from '../../job/entities/job.entity';
import { Resume } from '../../resume/entities/resume.entity';

export enum JobApplicationStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  WITHDRAWN = 'withdrawn'
}

@Table({ tableName: 'job_applications' })
export class JobApplication extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  id: string;

  @ForeignKey(() => User)
  @Column(DataType.UUID)
  applicantId: string;

  @BelongsTo(() => User)
  applicant: User;

  @ForeignKey(() => Job)
  @Column(DataType.UUID)
  jobId: string;

  @BelongsTo(() => Job)
  job: Job;

  @ForeignKey(() => Resume)
  @Column(DataType.UUID)
  resumeId: string;

  @BelongsTo(() => Resume)
  resume: Resume;

  @Column({
    type: DataType.ENUM,
    values: Object.values(JobApplicationStatus),
    defaultValue: JobApplicationStatus.PENDING
  })
  status: JobApplicationStatus;

  @Column(DataType.TEXT)
  coverLetter: string;

  @Default(false)
  @Column(DataType.BOOLEAN)
  isResumeViewed: boolean;

  @Column(DataType.DATE)
  viewedAt: Date;

  @Column(DataType.UUID)
  viewedBy: string;

  @Column(DataType.TEXT)
  adminNotes: string;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
} 