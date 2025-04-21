import { Injectable, NotFoundException, ConflictException, BadRequestException, Logger, Inject, forwardRef } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import * as bcrypt from 'bcrypt';
import { User, UserRole, UserStatus } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { CandidateRegistrationDto } from './dto/candidate-registration.dto';
import { EmployerRegistrationDto } from './dto/employer-registration.dto';
import { UserApprovalDto } from './dto/user-approval.dto';
import { MailService } from '../mail/mail.service';
import * as fs from 'fs';
import * as path from 'path';
import { TokenService } from '../auth/token.service';
import { UploadService } from '../upload/upload.service';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    @InjectModel(User)
    private userModel: typeof User,
    private mailService: MailService,
    @Inject(forwardRef(() => TokenService))
    private tokenService: TokenService,
    private uploadService: UploadService,
  ) {}

  /**
   * Create a new user
   */
  async create(createUserDto: CreateUserDto): Promise<User> {
    const { email, password } = createUserDto;
    
    // Check if user already exists
    const existingUser = await this.userModel.findOne({ 
      where: { email } 
    });
    
    if (existingUser) {
      throw new ConflictException('Email already exists');
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create new user
    return this.userModel.create({
      ...createUserDto,
      password: hashedPassword,
    });
  }

  async registerCandidate(registrationDto: CandidateRegistrationDto): Promise<User> {
    try {
      // Check if user with email already exists
      const existingUserByEmail = await this.userModel.findOne({
        where: { email: registrationDto.email }
      });

      if (existingUserByEmail) {
        throw new ConflictException('User with this email already exists');
      }

      // Check if user with username already exists
      const existingUserByUsername = await this.userModel.findOne({
        where: { username: registrationDto.username }
      });

      if (existingUserByUsername) {
        throw new ConflictException('User with this username already exists');
      }

      // Ensure terms are accepted
      if (!registrationDto.termsAccepted) {
        throw new BadRequestException('You must accept the terms to register');
      }

      // Upload images to DigitalOcean Spaces
      let studentPermitUrl = '';
      let enrollmentProofUrl = '';
      
      try {
        studentPermitUrl = await this.uploadService.uploadBase64File(
          registrationDto.studentPermitImage,
          'documents',
          'jpg'
        );
        
        enrollmentProofUrl = await this.uploadService.uploadBase64File(
          registrationDto.proofOfEnrollmentImage,
          'documents',
          'jpg'
        );
      } catch (error) {
        this.logger.error(`Error uploading images: ${error.message}`, error.stack);
        throw new BadRequestException('Failed to upload images');
      }

      // Create new user
      const user = await this.userModel.create({
        firstName: registrationDto.firstName,
        lastName: registrationDto.lastName,
        username: registrationDto.username,
        email: registrationDto.email,
        phoneNumber: registrationDto.phoneNumber,
        password: registrationDto.password,
        role: UserRole.CANDIDATE,
        status: UserStatus.INACTIVE, // New users are inactive until approved
        studentPermitImage: studentPermitUrl,
        proofOfEnrollmentImage: enrollmentProofUrl,
        termsAccepted: registrationDto.termsAccepted,
        emailVerified: false, // Set email as unverified initially
      });

      // Send welcome email - don't await, just fire and forget
      this.mailService.sendWelcomeEmail(user).catch(error => {
        this.logger.error(`Failed to send welcome email: ${error.message}`);
      });
      
      // Generate verification token and send verification email
      try {
        await this.tokenService.createVerificationToken(user);
      } catch (error) {
        this.logger.error(`Failed to send verification email: ${error.message}`);
        // Continue even if email sending fails
      }
      
      return user;
    } catch (error) {
      // Handle specific errors
      if (error instanceof ConflictException || error instanceof BadRequestException) {
        throw error;
      }
      
      // Handle other errors
      this.logger.error(`Error registering candidate: ${error.message}`, error.stack);
      throw new BadRequestException('Failed to register candidate');
    }
  }

  async registerEmployer(registrationDto: EmployerRegistrationDto): Promise<User> {
    try {
      // Check if user with email already exists
      const existingUserByEmail = await this.userModel.findOne({
        where: { email: registrationDto.email }
      });

      if (existingUserByEmail) {
        throw new ConflictException('User with this email already exists');
      }

      // Check if user with username already exists
      const existingUserByUsername = await this.userModel.findOne({
        where: { username: registrationDto.username }
      });

      if (existingUserByUsername) {
        throw new ConflictException('User with this username already exists');
      }

      // Ensure terms are accepted
      if (!registrationDto.termsAccepted) {
        throw new BadRequestException('You must accept the terms to register');
      }

      // Create new user
      const user = await this.userModel.create({
        firstName: registrationDto.firstName,
        lastName: registrationDto.lastName,
        username: registrationDto.username,
        email: registrationDto.email,
        phoneNumber: registrationDto.phoneNumber,
        password: registrationDto.password,
        role: UserRole.EMPLOYER,
        status: UserStatus.INACTIVE, // New users are inactive until approved
        termsAccepted: registrationDto.termsAccepted
      });

      // Send welcome email - don't await, just fire and forget
      this.mailService.sendWelcomeEmail(user).catch(error => {
        this.logger.error(`Failed to send welcome email: ${error.message}`);
      });

      return user;
    } catch (error) {
      // Handle specific errors
      if (error instanceof ConflictException || error instanceof BadRequestException) {
        throw error;
      }
      
      // Handle other errors
      this.logger.error(`Error registering employer: ${error.message}`, error.stack);
      throw new BadRequestException('Failed to register employer');
    }
  }

  async approveUser(approvalDto: UserApprovalDto): Promise<User> {
    try {
      const user = await this.findOne(approvalDto.userId);
      
      if (!user) {
        throw new NotFoundException(`User with ID ${approvalDto.userId} not found`);
      }

      user.status = approvalDto.status;
      await user.save();

      // Send notification email
      if (approvalDto.status === UserStatus.ACTIVE) {
        // Send approval email - don't await, just fire and forget
        this.mailService.sendApprovalEmail(user).catch(error => {
          this.logger.error(`Failed to send approval email: ${error.message}`);
        });
      } else if (approvalDto.status === UserStatus.SUSPENDED) {
        // Create a notification message
        const message = 'Your account has been suspended. Please contact support for more information.';
        
        // Send notification email - don't await, just fire and forget
        this.mailService.sendNotificationEmail(user.email, user.firstName, message).catch(error => {
          this.logger.error(`Failed to send suspension notification: ${error.message}`);
        });
      }

      return user;
    } catch (error) {
      // Handle specific errors
      if (error instanceof NotFoundException) {
        throw error;
      }
      
      // Handle other errors
      this.logger.error(`Error approving user: ${error.message}`, error.stack);
      throw new BadRequestException('Failed to approve user');
    }
  }

  /**
   * Find all users
   */
  async findAll(): Promise<User[]> {
    return this.userModel.findAll();
  }

  /**
   * Find a user by ID
   */
  async findOne(id: string): Promise<User> {
    const user = await this.userModel.findByPk(id);

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return user;
  }

  /**
   * Find a user by email (including password for auth)
   */
  async findByEmail(email: string): Promise<User> {
    const user = await this.userModel.findOne({ where: { email } });

    if (!user) {
      throw new NotFoundException(`User with email ${email} not found`);
    }

    return user;
  }

  /**
   * Update a user
   */
  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.findOne(id);
    
    // Check if email is being updated and if it's already in use
    if (updateUserDto.email && updateUserDto.email !== user.email) {
      const existingUser = await this.userModel.findOne({
        where: { email: updateUserDto.email }
      });
      
      if (existingUser) {
        throw new ConflictException('User with this email already exists');
      }
    }
    
    // Check if username is being updated and if it's already in use
    if (updateUserDto.username && updateUserDto.username !== user.username) {
      const existingUser = await this.userModel.findOne({
        where: { username: updateUserDto.username }
      });
      
      if (existingUser) {
        throw new ConflictException('User with this username already exists');
      }
    }
    
    await user.update(updateUserDto);
    return user;
  }

  /**
   * Delete a user
   */
  async remove(id: string): Promise<void> {
    const user = await this.findOne(id);
    await user.destroy();
  }

  async findPendingApprovals(): Promise<User[]> {
    return this.userModel.findAll({
      where: { status: UserStatus.INACTIVE }
    });
  }

  async verifyUser(userId: string): Promise<User> {
    const user = await this.findOne(userId);
    user.emailVerified = true;
    await user.save();
    return user;
  }

  /**
   * Update a user's password
   */
  async updatePassword(userId: string, newPassword: string): Promise<User> {
    const user = await this.findOne(userId);
    
    // Set the new password (will be hashed by the BeforeUpdate hook)
    user.password = newPassword;
    
    // Save the user
    await user.save();
    
    return user;
  }
} 