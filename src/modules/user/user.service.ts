import { Injectable, NotFoundException, ConflictException, BadRequestException, Logger } from '@nestjs/common';
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
import { OtpService } from '../auth/otp.service';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    @InjectModel(User)
    private userModel: typeof User,
    private mailService: MailService,
    private otpService: OtpService
  ) {}

  /**
   * Create a new user
   */
  async create(createUserDto: CreateUserDto): Promise<User> {
    // Check if user with email already exists
    const existingUserByEmail = await this.userModel.findOne({
      where: { email: createUserDto.email }
    });

    if (existingUserByEmail) {
      throw new ConflictException('User with this email already exists');
    }

    // Check if user with username already exists
    const existingUserByUsername = await this.userModel.findOne({
      where: { username: createUserDto.username }
    });

    if (existingUserByUsername) {
      throw new ConflictException('User with this username already exists');
    }

    // Create new user
    const user = await this.userModel.create({
      ...createUserDto,
      status: UserStatus.ACTIVE // Admin-created users are active by default
    });

    return user;
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

      // Save images to disk
      const uploadsDir = path.join(process.cwd(), 'uploads', 'documents');
      
      // Create directory if it doesn't exist
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      // Generate unique filenames
      const timestamp = Date.now();
      const studentPermitPath = path.join('documents', `student-permit-${registrationDto.username}-${timestamp}.jpg`);
      const enrollmentProofPath = path.join('documents', `enrollment-proof-${registrationDto.username}-${timestamp}.jpg`);
      
      // Save base64 images to disk
      try {
        const studentPermitData = registrationDto.studentPermitImage.replace(/^data:image\/\w+;base64,/, '');
        const enrollmentProofData = registrationDto.proofOfEnrollmentImage.replace(/^data:image\/\w+;base64,/, '');
        
        fs.writeFileSync(path.join(process.cwd(), 'uploads', studentPermitPath), Buffer.from(studentPermitData, 'base64'));
        fs.writeFileSync(path.join(process.cwd(), 'uploads', enrollmentProofPath), Buffer.from(enrollmentProofData, 'base64'));
      } catch (error) {
        this.logger.error(`Error saving images: ${error.message}`, error.stack);
        throw new BadRequestException('Invalid image data');
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
        studentPermitImage: studentPermitPath,
        proofOfEnrollmentImage: enrollmentProofPath,
        termsAccepted: registrationDto.termsAccepted,
        emailVerified: false, // Set email as unverified initially
      });

      // Send welcome email - don't await, just fire and forget
      this.mailService.sendWelcomeEmail(user).catch(error => {
        this.logger.error(`Failed to send welcome email: ${error.message}`);
      });
      
      // Generate OTP for email verification
      try {
        await this.otpService.createOtp(user.id);
      } catch (error) {
        this.logger.error(`Failed to generate OTP: ${error.message}`);
        // Continue even if OTP generation fails
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
      const user = await this.userModel.findByPk(approvalDto.userId);
      
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
  async findOne(id: number): Promise<User> {
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
    const user = await this.userModel.findOne({
      where: { email },
    });

    if (!user) {
      throw new NotFoundException(`User with email ${email} not found`);
    }

    return user;
  }

  /**
   * Update a user
   */
  async update(id: number, updateUserDto: UpdateUserDto): Promise<User> {
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
  async remove(id: number): Promise<void> {
    const user = await this.findOne(id);
    await user.destroy();
  }

  async findPendingApprovals(): Promise<User[]> {
    return this.userModel.findAll({
      where: { status: UserStatus.INACTIVE }
    });
  }
} 