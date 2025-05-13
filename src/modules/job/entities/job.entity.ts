import { Column, Model, Table, DataType, ForeignKey, BelongsTo, BeforeCreate, DeletedAt } from 'sequelize-typescript';
import { v4 as uuidv4 } from 'uuid';
import { User } from '../../user/entities/user.entity';
import { Company } from '../../company/entities/company.entity';

export enum JobType {
  FULL_TIME = 'full-time',
  PART_TIME = 'part-time',
  CONTRACT = 'contract',
  TEMPORARY = 'temporary',
  INTERNSHIP = 'internship',
  FREELANCE = 'freelance'
}

export enum Gender {
  MALE = 'male',
  FEMALE = 'female',
  ANY = 'any'
}

export enum JobStatus {
  ACTIVE = 'active',
  EXPIRED = 'expired',
  CLOSED = 'closed',
  DRAFT = 'draft'
}

export enum VerificationStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected'
}

@Table({
  tableName: 'jobs',
  timestamps: true,
  paranoid: true
})
export class Job extends Model {
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

  @Column({
    type: DataType.STRING,
    allowNull: false
  })
  jobTitle: string;

  @Column({
    type: DataType.STRING,
    allowNull: false
  })
  title: string;

  @Column({
    type: DataType.TEXT,
    allowNull: false
  })
  jobDescription: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
    validate: {
      isEmail: true
    }
  })
  emailAddress: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
    get() {
      const rawValue = this.getDataValue('specialisms');
      return rawValue ? JSON.parse(rawValue) : [];
    },
    set(value: string[]) {
      this.setDataValue('specialisms', value ? JSON.stringify(value) : null);
    }
  })
  specialisms: string[];

  @Column({
    type: DataType.STRING,
    allowNull: true
  })
  category: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
    defaultValue: JobType.FULL_TIME,
    validate: {
      isIn: [Object.values(JobType)]
    }
  })
  jobType: JobType;

  @Column({
    type: DataType.STRING,
    allowNull: true
  })
  offeredSalary: string;

  @Column({
    type: DataType.STRING,
    allowNull: true
  })
  careerLevel: string;

  @Column({
    type: DataType.STRING,
    allowNull: true
  })
  experience: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
    defaultValue: Gender.ANY,
    validate: {
      isIn: [Object.values(Gender)]
    }
  })
  gender: Gender;

  @Column({
    type: DataType.STRING,
    allowNull: true
  })
  industry: string;

  @Column({
    type: DataType.STRING,
    allowNull: true
  })
  qualification: string;

  @Column({
    type: DataType.DATE,
    allowNull: true
  })
  applicationDeadlineDate: Date;

  @Column({
    type: DataType.STRING,
    allowNull: true
  })
  country: string;

  @Column({
    type: DataType.STRING,
    allowNull: true
  })
  city: string;

  @Column({
    type: DataType.STRING,
    allowNull: true
  })
  state: string;

  @Column({
    type: DataType.FLOAT,
    allowNull: true
  })
  latitude: number;

  @Column({
    type: DataType.FLOAT,
    allowNull: true
  })
  longitude: number;

  @Column({
    type: DataType.STRING,
    allowNull: true
  })
  postalCode: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true
  })
  completeAddress: string;

  @Column({
    type: DataType.STRING,
    allowNull: true
  })
  attachmentUrl: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
    get() {
      const rawValue = this.getDataValue('additionalAttachments');
      return rawValue ? JSON.parse(rawValue) : [];
    },
    set(value: string[]) {
      this.setDataValue('additionalAttachments', value ? JSON.stringify(value) : null);
    }
  })
  additionalAttachments: string[];

  @Column({
    type: DataType.STRING,
    allowNull: false,
    defaultValue: JobStatus.ACTIVE,
    validate: {
      isIn: [Object.values(JobStatus)]
    }
  })
  status: JobStatus;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    defaultValue: 0
  })
  views: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    defaultValue: 0
  })
  applications: number;

  @Column({
    type: DataType.STRING,
    allowNull: false,
    defaultValue: VerificationStatus.PENDING,
    validate: {
      isIn: [Object.values(VerificationStatus)]
    }
  })
  verificationStatus: VerificationStatus;

  @Column({
    type: DataType.TEXT,
    allowNull: true
  })
  rejectionReason: string;

  @ForeignKey(() => Company)
  @Column({
    type: DataType.UUID,
    allowNull: true
  })
  companyId: string;

  @BelongsTo(() => Company)
  company: Company;

  @DeletedAt
  deletedAt: Date;

  @BeforeCreate
  static generateId(instance: Job) {
    if (!instance.id) {
      instance.id = uuidv4();
    }
  }
} 