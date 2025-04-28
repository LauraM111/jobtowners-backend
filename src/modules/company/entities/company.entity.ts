import { 
  Table, Column, Model, DataType, 
  CreatedAt, UpdatedAt, BelongsTo, ForeignKey, BeforeCreate 
} from 'sequelize-typescript';
import { CompanyStatus } from '../enums/company-status.enum';
import { User } from '../../user/entities/user.entity';
import { v4 as uuidv4 } from 'uuid';

@Table({
  tableName: 'companies',
  timestamps: true,
  paranoid: true
})
export class Company extends Model {
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

  // Basic Company Information
  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  companyName: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
    unique: true,
  })
  slug: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  description: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  industryType: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  website: string;

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  foundedYear: number;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  companySize: string;

  // Contact Details
  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  email: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  phone: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  alternatePhone: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  contactPerson: string;

  // Address
  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  addressLine1: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  addressLine2: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  city: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  state: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  country: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  postalCode: string;

  @Column({
    type: DataType.FLOAT,
    allowNull: true,
  })
  latitude: number;

  @Column({
    type: DataType.FLOAT,
    allowNull: true,
  })
  longitude: number;

  // Registration and Legal
  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  gstNumber: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  panNumber: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  registrationNumber: string;

  // Media & Branding
  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  logoUrl: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  coverImageUrl: string;

  // Status & Meta
  @Column({
    type: DataType.STRING,
    defaultValue: CompanyStatus.ACTIVE,
    allowNull: false,
    validate: {
      isIn: [Object.values(CompanyStatus)]
    }
  })
  status: CompanyStatus;

  @Column({
    type: DataType.UUID,
    allowNull: false,
  })
  createdBy: string;

  @Column({
    type: DataType.UUID,
    allowNull: true,
  })
  updatedBy: string;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  deletedAt: Date;
} 