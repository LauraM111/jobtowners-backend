import { Column, Model, Table, DataType, BeforeCreate, BeforeUpdate, HasMany } from 'sequelize-typescript';
import * as bcrypt from 'bcrypt';
import { ApiProperty } from '@nestjs/swagger';
import { v4 as uuidv4 } from 'uuid';

export enum UserRole {
  ADMIN = 'admin',
  CANDIDATE = 'candidate',
  EMPLOYER = 'employer'
}

export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended'
}

// Function to get the Company model to avoid circular dependency
function getCompanyModel() {
  // This will be evaluated at runtime, not during import
  return require('../../company/entities/company.entity').Company;
}

@Table({
  tableName: 'users',
  timestamps: true
})
export class User extends Model {
  @ApiProperty({ example: 1, description: 'Unique identifier' })
  @Column({
    type: DataType.UUID,
    defaultValue: DataType.UUIDV4,
    primaryKey: true,
  })
  id: string;

  @ApiProperty({ example: 'John', description: 'First name' })
  @Column({
    type: DataType.STRING,
    allowNull: true
  })
  firstName: string;

  @ApiProperty({ example: 'Doe', description: 'Last name' })
  @Column({
    type: DataType.STRING,
    allowNull: true
  })
  lastName: string;

  @ApiProperty({ example: 'johndoe', description: 'Username' })
  @Column({
    type: DataType.STRING,
    allowNull: false,
    unique: true
  })
  username: string;

  @ApiProperty({ example: 'john.doe@example.com', description: 'Email address' })
  @Column({
    type: DataType.STRING,
    allowNull: false,
    unique: true
  })
  email: string;

  @ApiProperty({ example: '+1234567890', description: 'Phone number' })
  @Column({
    type: DataType.STRING,
    allowNull: true
  })
  phoneNumber: string;

  @Column({
    type: DataType.STRING,
    allowNull: false
  })
  password: string;

  @ApiProperty({ enum: UserRole, example: UserRole.CANDIDATE, description: 'User role' })
  @Column({
    type: DataType.ENUM(...Object.values(UserRole)),
    allowNull: false,
    defaultValue: UserRole.CANDIDATE
  })
  role: UserRole;

  @ApiProperty({ enum: UserStatus, example: UserStatus.INACTIVE, description: 'User status' })
  @Column({
    type: DataType.ENUM(...Object.values(UserStatus)),
    allowNull: false,
    defaultValue: UserStatus.INACTIVE
  })
  status: UserStatus;

  @ApiProperty({ example: 'path/to/student-permit.jpg', description: 'Student permit image path' })
  @Column({
    type: DataType.STRING,
    allowNull: true
  })
  studentPermitImage: string;

  @ApiProperty({ example: 'path/to/enrollment-proof.jpg', description: 'Proof of enrollment image path' })
  @Column({
    type: DataType.STRING,
    allowNull: true
  })
  proofOfEnrollmentImage: string;

  @ApiProperty({ example: true, description: 'Terms acceptance' })
  @Column({
    type: DataType.BOOLEAN,
    allowNull: false,
    defaultValue: false
  })
  termsAccepted: boolean;

  @ApiProperty({ example: '2023-01-01T00:00:00Z', description: 'Account creation date' })
  @Column({
    type: DataType.DATE,
    allowNull: false,
    defaultValue: DataType.NOW
  })
  createdAt: Date;

  @ApiProperty({ example: '2023-01-01T00:00:00Z', description: 'Account last update date' })
  @Column({
    type: DataType.DATE,
    allowNull: false,
    defaultValue: DataType.NOW
  })
  updatedAt: Date;

  @ApiProperty({ example: null, description: 'Account deletion date' })
  @Column({
    type: DataType.DATE,
    allowNull: true
  })
  deletedAt: Date;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: false,
  })
  emailVerified: boolean;

  @Column({
    type: DataType.STRING,
    allowNull: true
  })
  stripeCustomerId: string;

  @BeforeCreate
  @BeforeUpdate
  static async hashPassword(instance: User) {
    // Only hash the password if it has been modified
    if (instance.changed('password')) {
      const salt = await bcrypt.genSalt(10);
      instance.password = await bcrypt.hash(instance.password, salt);
    }
  }

  async comparePassword(candidatePassword: string): Promise<boolean> {
    return bcrypt.compare(candidatePassword, this.password);
  }

  // Helper method to get full name
  get fullName(): string {
    return `${this.firstName} ${this.lastName}`;
  }

  @BeforeCreate
  static generateId(instance: User) {
    if (!instance.id) {
      instance.id = uuidv4();
    }
  }
} 