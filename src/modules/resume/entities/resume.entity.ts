import { Column, Model, Table, DataType, HasMany, ForeignKey, BelongsTo, BeforeCreate } from 'sequelize-typescript';
import { v4 as uuidv4 } from 'uuid';
import { User } from '../../user/entities/user.entity';
import { Education } from './education.entity';
import { Experience } from './experience.entity';
import { Attachment } from './attachment.entity';

export enum Gender {
  MALE = 'Male',
  FEMALE = 'Female',
  OTHER = 'Other'
}

@Table({
  tableName: 'resumes',
  timestamps: true
})
export class Resume extends Model<Resume> {
  @Column({
    type: DataType.UUID,
    primaryKey: true,
    defaultValue: DataType.UUIDV4
  })
  id: string;

  // Personal Details
  @Column({
    type: DataType.STRING,
    allowNull: false
  })
  firstName: string;

  @Column({
    type: DataType.STRING,
    allowNull: false
  })
  lastName: string;

  @Column({
    type: DataType.STRING,
    allowNull: false
  })
  email: string;

  @Column({
    type: DataType.STRING,
    allowNull: true
  })
  phone: string;

  @Column({
    type: DataType.DATEONLY,
    allowNull: true
  })
  dob: Date;

  @Column({
    type: DataType.ENUM(...Object.values(Gender)),
    allowNull: true
  })
  gender: Gender;

  @Column({
    type: DataType.STRING,
    allowNull: true
  })
  maritalStatus: string;

  @Column({
    type: DataType.STRING,
    allowNull: true
  })
  nationality: string;

  @Column({
    type: DataType.STRING,
    allowNull: true
  })
  language: string;

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
    type: DataType.STRING,
    allowNull: true
  })
  country: string;

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
    type: DataType.DECIMAL(10, 2),
    allowNull: true
  })
  offeredSalary: number;

  @Column({
    type: DataType.FLOAT,
    allowNull: true
  })
  yearsOfExperience: number;

  @Column({
    type: DataType.STRING,
    allowNull: true
  })
  qualification: string;

  @Column({
    type: DataType.STRING,
    allowNull: true
  })
  professionalSkills: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true
  })
  addressDetails: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true
  })
  passionAndFutureGoals: string;

  // Media
  @Column({
    type: DataType.STRING,
    allowNull: true
  })
  videoUrl: string;

  @Column({
    type: DataType.STRING,
    allowNull: true
  })
  cvUrl: string;

  @Column({
    type: DataType.STRING,
    allowNull: true
  })
  title: string;

  // Relations
  @ForeignKey(() => User)
  @Column({
    type: DataType.UUID,
    allowNull: false,
  })
  userId: string;

  @BelongsTo(() => User)
  user: User;

  @HasMany(() => Education)
  education: Education[];

  @HasMany(() => Experience)
  experiences: Experience[];

  @HasMany(() => Attachment)
  attachments: Attachment[];

  @BeforeCreate
  static generateId(instance: Resume) {
    if (!instance.id) {
      instance.id = uuidv4();
    }
  }
} 