import { Injectable, NotFoundException, ConflictException, BadRequestException, Logger, Inject, forwardRef, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import * as bcrypt from 'bcrypt';
import { User, UserType, UserStatus } from './entities/user.entity';
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
import { AuthService } from '../auth/auth.service';
import { AdminUpdateUserDto } from './dto/admin-update-user.dto';
import { ResumeService } from '../resume/resume.service';
import { CompanyService } from '../company/company.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { Op } from 'sequelize';
import { UpdateCandidateProfileDto } from './dto/update-candidate-profile.dto';
import { UpdateEmployerProfileDto } from './dto/update-employer-profile.dto';

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
    @Inject(forwardRef(() => AuthService))
    private authService: AuthService,
    private resumeService: ResumeService,
    private companyService: CompanyService,
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
    
    // Hash password with the same method used in the seeder
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

      // Ensure terms are accepted
      if (!registrationDto.termsAccepted) {
        throw new BadRequestException('You must accept the terms to register');
      }

      // Initialize variables outside the try block so they're accessible in the create call
      let studentPermitUrl = null;
      let enrollmentProofUrl = null;

      // Handle optional images
      try {
        // Check if studentPermitImage exists before processing
        if (registrationDto.studentPermitImage) {
          studentPermitUrl = await this.uploadService.uploadBase64File(
            registrationDto.studentPermitImage,
            'student-permits',
            'jpg'
          );
        }
        
        // Check if proofOfEnrollmentImage exists before processing
        if (registrationDto.proofOfEnrollmentImage) {
          enrollmentProofUrl = await this.uploadService.uploadBase64File(
            registrationDto.proofOfEnrollmentImage,
            'enrollment-proofs',
            'jpg'
          );
        }
      } catch (error) {
        throw new BadRequestException(`Failed to upload images: ${error.message}`);
      }

      // Create new user
      const user = await this.userModel.create({
        firstName: registrationDto.firstName,
        lastName: registrationDto.lastName,
        email: registrationDto.email,
        phoneNumber: registrationDto.phoneNumber,
        password: registrationDto.password,
        userType: UserType.CANDIDATE,
        status: UserStatus.INACTIVE, // New users are inactive until approved
        studentPermitImage: studentPermitUrl,
        proofOfEnrollmentImage: enrollmentProofUrl,
        termsAccepted: registrationDto.termsAccepted,
        isEmailVerified: false, // Set email as unverified initially
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
      throw new BadRequestException('Failed to register candidate: ' + error.message);
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

      // Ensure terms are accepted
      if (!registrationDto.termsAccepted) {
        throw new BadRequestException('You must accept the terms to register');
      }

      // Create new user
      const user = await this.userModel.create({
        firstName: registrationDto.firstName,
        lastName: registrationDto.lastName,
        email: registrationDto.email,
        phoneNumber: registrationDto.phoneNumber,
        password: registrationDto.password,
        userType: UserType.EMPLOYER,
        status: UserStatus.INACTIVE, // New users are inactive until approved
        termsAccepted: registrationDto.termsAccepted,
        isEmailVerified: false, // Set email as unverified initially
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
   * Find all users with pagination and filtering
   */
  async findAll(page = 1, limit = 10, userTypes?: UserType[]): Promise<{ users: User[]; total: number }> {
    const offset = (page - 1) * limit;
    
    // Build the where clause
    const where: any = {};
    
    // Add user type filter if provided
    if (userTypes && userTypes.length > 0) {
      where.userType = {
        [Op.in]: userTypes
      };
    }
    
    // Find users with pagination
    const { count, rows } = await this.userModel.findAndCountAll({
      where,
      limit,
      offset,
      order: [['createdAt', 'DESC']],
      attributes: { exclude: ['password'] } // Exclude password from the response
    });
    
    return {
      users: rows,
      total: count
    };
  }

  /**
   * Find a user by ID
   */
  async findById(id: string): Promise<User> {
    const user = await this.userModel.findByPk(id, {
      paranoid: false,  
    });
    return user;
  }
  

  /**
   * Find a user by ID (alias for findById)
   */
  async findOne(id: string): Promise<User> {
    return this.findById(id);
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
  async update(id: string, updateData: Partial<User>): Promise<User> {
    const user = await this.findById(id);
    
    if (!user) {
      throw new NotFoundException('User not found');
    }
    
    // Update user with provided fields
    await user.update(updateData);
    
    return this.findById(id);
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

  async verifyEmail(userId: number): Promise<User> {
    const user = await this.findOne(userId.toString());
    
    if (!user) {
      throw new NotFoundException('User not found');
    }
    
    user.isEmailVerified = true;
    await user.save();
    
    return user;
  }

  /**
   * Update a user's password
   */
  async updatePassword(userId: string, newPassword: string): Promise<void> {
    // If newPassword is already hashed, use it directly
    await this.userModel.update(
      { password: newPassword },
      { where: { id: userId } }
    );
  }

  /**
   * Change a user's password with current password verification
   */
  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<User> {
    const user = await this.findOne(userId);
    
    // Verify current password
    const isPasswordValid = await user.comparePassword(currentPassword);
    if (!isPasswordValid) {
      throw new BadRequestException('Current password is incorrect');
    }
    
    // Set the new password (will be hashed by the BeforeUpdate hook)
    user.password = newPassword;
    
    // Save the user
    await user.save();
    
    return user;
  }

  /**
   * Get user profile
   */
  async getUserProfile(userId: string): Promise<User> {
    const user = await this.userModel.findByPk(userId, {
      attributes: { exclude: ['password'] } // Exclude password from the response
    });
    
    if (!user) {
      throw new NotFoundException('User not found');
    }
    
    return user;
  }

  /**
   * Format user profile based on user type
   */
  async formatUserProfile(user: User): Promise<any> {
    // Base profile data for all user types
    const profileData = {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phoneNumber: user.phoneNumber,
      userType: user.userType,
      isEmailVerified: user.isEmailVerified,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };
    
    // Add user type specific data
    if (user.userType === UserType.CANDIDATE) {
      // For candidates, include education info if available
      const resume = await this.resumeService.findByUserId(user.id);
      if (resume) {
        profileData['education'] = resume.education;
        profileData['experiences'] = resume.experiences;
        profileData['skills'] = resume.professionalSkills;
      }
    } else if (user.userType === UserType.EMPLOYER) {
      // For employers, include company info if available
      profileData['companyName'] = user.companyName;
      
      // Get companies owned by this user
      const companies = await this.companyService.findByUserId(user.id);
      if (companies && companies.length > 0) {
        profileData['companies'] = companies.map(company => ({
          id: company.id,
          name: company.companyName,
          logo: company.logoUrl
        }));
      }
    }
    
    return profileData;
  }

  /**
   * Update user profile with type-specific validation
   */
  async updateUserProfile(userId: string, userType: UserType, updateProfileDto: UpdateProfileDto): Promise<any> {
    const user = await this.findById(userId);
    
    if (!user) {
      throw new NotFoundException('User not found');
    }
    
    // Validate fields based on user type
    if (userType === UserType.CANDIDATE) {
      // Candidate-specific validation
      // For example, candidates might have different field requirements
    } else if (userType === UserType.EMPLOYER) {
      // Employer-specific validation
      // For example, employers might be able to update company name
    }
    
    // Update user with provided fields
    await user.update(updateProfileDto);
    
    // Return formatted profile
    return this.formatUserProfile(user);
  }

  /**
   * Admin update a user (can update email, role, status)
   */
  async adminUpdateUser(id: string, adminUpdateUserDto: AdminUpdateUserDto): Promise<User> {
    const user = await this.findOne(id);
    
    // Check if email is being changed and if it's already in use
    if (adminUpdateUserDto.email && adminUpdateUserDto.email !== user.email) {
      const existingUser = await this.userModel.findOne({
        where: { email: adminUpdateUserDto.email }
      });
      
      if (existingUser) {
        throw new ConflictException('Email already in use');
      }
    }
    
    // Update user
    await user.update(adminUpdateUserDto);
    
    return this.findOne(id);
  }

  /**
   * Get all companies owned by an employer
   */
  async getEmployerCompanies(employerId: string): Promise<any[]> {
    const user = await this.userModel.findByPk(employerId);
    
    if (!user) {
      throw new NotFoundException('User not found');
    }
    
    if (user.userType !== 'employer') {
      throw new BadRequestException('User is not an employer');
    }
    
    // This assumes you have a CompanyService injected
    return this.companyService.findByUserId(employerId, {});
  }

  /**
   * Update candidate profile
   */
  async updateCandidateProfile(userId: string, updateCandidateProfileDto: UpdateCandidateProfileDto): Promise<User> {
    const user = await this.findById(userId);
    
    if (!user) {
      throw new NotFoundException('User not found');
    }
    
    if (user.userType !== UserType.CANDIDATE) {
      throw new ForbiddenException('Only candidates can update candidate profiles');
    }
    
    // Update user with provided data
    await user.update(updateCandidateProfileDto);
    
    return this.findById(userId);
  }

  /**
   * Update employer profile
   */
  async updateEmployerProfile(userId: string, updateEmployerProfileDto: UpdateEmployerProfileDto): Promise<User> {
    const user = await this.findById(userId);
    
    if (!user) {
      throw new NotFoundException('User not found');
    }
    
    if (user.userType !== UserType.EMPLOYER) {
      throw new ForbiddenException('Only employers can update employer profiles');
    }
    
    // Update user with provided data
    await user.update(updateEmployerProfileDto);
    
    return this.findById(userId);
  }

  async findDeletedUsers(page: number = 1, limit: number = 10, userTypes: UserType[] = []) {
    const offset = (page - 1) * limit;
    
    const whereClause: any = {
      deletedAt: {
        [Op.ne]: null // Only get soft-deleted users
      }
    };
    
    if (userTypes.length > 0) {
      whereClause.userType = {
        [Op.in]: userTypes
      };
    }
    
    const { count, rows } = await this.userModel.findAndCountAll({
      where: whereClause,
      limit,
      offset,
      order: [['deletedAt', 'DESC']], // Most recently deleted first
      paranoid: false // Include soft-deleted records
    });
    
    return {
      users: rows,
      total: count
    };
  }

  async restoreDeletedUser(id: string): Promise<User> {
    // First, find the deleted user (including soft deleted ones)
    const deletedUser = await this.userModel.findOne({
      where: { id },
      paranoid: false // This includes soft deleted records
    });

    if (!deletedUser) {
      throw new NotFoundException('User not found');
    }

    if (!deletedUser.deletedAt) {
      throw new BadRequestException('User is not deleted and cannot be restored');
    }

    // Restore the user by setting deletedAt to null
    await deletedUser.restore();

    // Reload the user to get the updated data
    await deletedUser.reload();

    return deletedUser;
  }
} 