import { Column, Model, Table, DataType, BeforeCreate, BeforeUpdate, HasMany, BeforeSave } from 'sequelize-typescript';
import * as bcrypt from 'bcrypt';
import { ApiProperty } from '@nestjs/swagger';
import Token from '../../auth/entities/token.entity';
import { v4 as uuidv4 } from 'uuid';

export enum UserType {
  ADMIN = 'admin',
  USER = 'user',
  CANDIDATE = 'candidate',
  EMPLOYER = 'employer'
}

export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended'
}

@Table({
  tableName: 'users',
  timestamps: true,
  paranoid: true
})
export class User extends Model {
  @Column({
    type: DataType.UUID,
    primaryKey: true,
    defaultValue: DataType.UUIDV4
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

  @ApiProperty({ description: 'Password (hashed)' })
  @Column({
    type: DataType.STRING,
    allowNull: false
  })
  password: string;

  @ApiProperty({ example: 'admin', description: 'User type' })
  @Column({
    type: DataType.ENUM(...Object.values(UserType)),
    allowNull: false,
    defaultValue: UserType.USER
  })
  userType: UserType;

  @ApiProperty({ enum: UserStatus, example: UserStatus.INACTIVE, description: 'User status' })
  @Column({
    type: DataType.ENUM(...Object.values(UserStatus)),
    allowNull: false,
    defaultValue: UserStatus.ACTIVE
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

  @ApiProperty({ example: true, description: 'Email verification status' })
  @Column({
    type: DataType.BOOLEAN,
    defaultValue: false
  })
  isEmailVerified: boolean;

  @ApiProperty({ example: 'cus_123456789', description: 'Stripe customer ID' })
  @Column({
    type: DataType.STRING,
    allowNull: true
  })
  stripeCustomerId: string;

  @ApiProperty({ example: 'Acme Inc.', description: 'Company name (for employers)' })
  @Column({
    type: DataType.STRING,
    allowNull: true
  })
  companyName: string;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: false,
  })
  isActive: boolean;

  @HasMany(() => Token)
  tokens: Token[];

  @BeforeCreate
  static generateId(instance: User) {
    if (!instance.id) {
      instance.id = uuidv4();
    }
  }

  @BeforeCreate
  @BeforeUpdate
  static async hashPassword(instance: User) {
    // Only hash the password if it has been modified AND it's not already hashed
    if (instance.changed('password')) {
      // Check if the password is already hashed (bcrypt hashes start with $2a$, $2b$, or $2y$)
      if (!instance.password.startsWith('$2')) {
        const salt = await bcrypt.genSalt(10);
        instance.password = await bcrypt.hash(instance.password, salt);
      }
    }
  }

  async comparePassword(candidatePassword: string): Promise<boolean> {
    return bcrypt.compare(candidatePassword, this.password);
  }

  // Helper method to get full name
  get fullName(): string {
    return `${this.firstName} ${this.lastName}`;
  }
} 