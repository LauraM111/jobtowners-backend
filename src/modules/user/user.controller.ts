import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Put,
  ParseIntPipe,
  UseGuards,
  HttpCode,
  HttpStatus,
  ConflictException,
  BadRequestException,
  Patch,
  Req,
  NotFoundException,
  HttpException,
  Request,
  Query,
  UseInterceptors,
  UploadedFile,
  DefaultValuePipe,
  UsePipes,
  ValidationPipe,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBearerAuth } from '@nestjs/swagger';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { CandidateRegistrationDto } from './dto/candidate-registration.dto';
import { EmployerRegistrationDto } from './dto/employer-registration.dto';
import { UserApprovalDto } from './dto/user-approval.dto';
import { User } from './entities/user.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserType, UserStatus } from './entities/user.entity';
import { successResponse } from '../../common/helpers/response.helper';
import { Public } from '../auth/decorators/public.decorator';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { formatUserProfile } from './helpers/profile-formatter.helper';
import { ChangePasswordDto } from './dto/change-password.dto';
import { AdminUpdateUserDto } from './dto/admin-update-user.dto';
import { Request as ExpressRequest } from 'express';
import * as bcrypt from 'bcrypt';
import { QueryTypes } from 'sequelize';
import { UpdateCandidateProfileDto } from './dto/update-candidate-profile.dto';
import { UpdateEmployerProfileDto } from './dto/update-employer-profile.dto';

interface RequestWithUser extends ExpressRequest {
  user: {
    sub: string;
    email: string;
    userType: string;
  };
}

@ApiTags('Users')
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'User profile retrieved successfully' })
  async getProfile(@Request() req) {
    try {
      const userId = req.user?.sub;
      
      if (!userId) {
        throw new UnauthorizedException('User not authenticated');
      }
      
      const user = await this.userService.findById(userId);
      
      console.log("getProfile user",user);

      if (!user) {
        throw new NotFoundException('User not found');
      }
      
      // Return sanitized user profile
      return successResponse(this.sanitizeUser(user), 'User profile retrieved successfully');
    } catch (error) {
      console.error('Error getting user profile:', error.message);
      throw error;
    }
  }

  @Patch('profile')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Update current user profile' })
  @ApiResponse({ status: 200, description: 'User profile updated successfully' })
  @ApiBearerAuth()
  async updateProfile(@Req() req, @Body() updateProfileDto: UpdateProfileDto) {
    try {
      const userId = req.user.sub || req.user.userId;
      const userType = req.user.userType;
      
      // Check if email is being attempted to be updated
      if ('email' in updateProfileDto) {
        throw new BadRequestException('Email cannot be updated through this endpoint');
      }
      
      const updatedUser = await this.userService.updateUserProfile(userId, userType, updateProfileDto);
      return successResponse(updatedUser, 'User profile updated successfully');
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to update profile: ' + error.message);
    }
  }

  @Put('change-password')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Change user password' })
  @ApiResponse({ status: 200, description: 'Password changed successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - Current password is incorrect or new password is invalid' })
  @ApiResponse({ status: 401, description: 'Unauthorized - User not authenticated' })
  async changePassword(
    @Req() req: RequestWithUser,
    @Body() changePasswordDto: ChangePasswordDto
  ) {
    const userId = req.user.sub;
    
    await this.userService.changePassword(
      userId, 
      changePasswordDto.currentPassword, 
      changePasswordDto.newPassword
    );
    
    return successResponse(null, 'Password changed successfully');
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserType.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new user (Admin only)' })
  @ApiResponse({ 
    status: 201, 
    description: 'The user has been successfully created.',
    type: User 
  })
  @ApiResponse({ status: 400, description: 'Bad request.' })
  @ApiResponse({ status: 409, description: 'User with this email already exists.' })
  async create(@Body() createUserDto: CreateUserDto) {
    const user = await this.userService.create(createUserDto);
    const { password, ...result } = user.toJSON();
    return successResponse(result, 'User created successfully');
  }

  @Public()
  @Post('register/candidate')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new candidate user' })
  @ApiResponse({ status: 201, description: 'User registered successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  async registerCandidate(@Body() registrationDto: CandidateRegistrationDto) {
    try {
      const user = await this.userService.registerCandidate(registrationDto);
      return {
        success: true,
        message: 'Candidate registered successfully',
        data: {
          id: user.id,
          email: user.email,
          userType: user.userType,
          status: user.status
        }
      };
    } catch (error) {
      // Log the error for debugging
      console.error('Error in registerCandidate:', error);
      
      if (error instanceof ConflictException) {
        throw new HttpException({
          success: false,
          message: 'An account with this email already exists. Please try to reset your password if you forgot it.',
          data: null
        }, HttpStatus.CONFLICT);
      }
      
      // Handle Sequelize validation errors (duplicate email)
      if (error.name === 'SequelizeValidationError' || 
          error.name === 'SequelizeUniqueConstraintError' ||
          (error.message && error.message.includes('Validation error'))) {
        throw new HttpException({
          success: false,
          message: 'An account with this email already exists. Please try to reset your password if you forgot it.',
          data: null
        }, HttpStatus.CONFLICT);
      }
      
      throw new HttpException({
        success: false,
        message: error.message || 'Failed to register candidate',
        data: null
      }, HttpStatus.BAD_REQUEST);
    }
  }

  @Public()
  @Post('register/employer')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new employer' })
  @ApiResponse({ 
    status: 201, 
    description: 'The employer has been successfully registered.',
    type: User 
  })
  @ApiResponse({ status: 400, description: 'Bad request.' })
  @ApiResponse({ status: 409, description: 'User with this email already exists.' })
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  async registerEmployer(@Body() registrationDto: EmployerRegistrationDto) {
    try {
      const user = await this.userService.registerEmployer(registrationDto);
      
      // Check if user exists before calling toJSON
      if (user && typeof user.toJSON === 'function') {
        const { password, ...result } = user.toJSON();
        return successResponse(result, 'Employer registered successfully. Your account is pending approval.');
      } else {
        // If user doesn't have toJSON method, return the user object directly
        // But still remove the password
        const { password, ...result } = user as any;
        return successResponse(result, 'Employer registered successfully. Your account is pending approval.');
      }
    } catch (error) {
      // Log the error for debugging
      console.error('Error in registerEmployer:', error);
      
      // Handle specific errors with custom responses
      if (error instanceof ConflictException) {
        return {
          success: false,
          message: 'An account with this email already exists. Please try to reset your password if you forgot it.',
          statusCode: HttpStatus.CONFLICT
        };
      }
      
      // Handle Sequelize validation errors (duplicate email)
      if (error.name === 'SequelizeValidationError' || 
          error.name === 'SequelizeUniqueConstraintError' ||
          (error.message && error.message.includes('Validation error'))) {
        return {
          success: false,
          message: 'An account with this email already exists. Please try to reset your password if you forgot it.',
          statusCode: HttpStatus.CONFLICT
        };
      }
      
      if (error instanceof BadRequestException) {
        // Check if the BadRequestException is wrapping a duplicate email error
        if (error.message && (
            error.message.includes('Failed to register employer') ||
            error.message.includes('email already exists') ||
            error.message.includes('duplicate') ||
            error.message.toLowerCase().includes('unique constraint')
          )) {
          return {
            success: false,
            message: 'An account with this email already exists. Please try to reset your password if you forgot it.',
            statusCode: HttpStatus.CONFLICT
          };
        }
        
        return {
          success: false,
          message: error.message,
          statusCode: HttpStatus.BAD_REQUEST
        };
      }
      
      // Re-throw other errors to be handled by the global exception filter
      throw error;
    }
  }

  @Post('approve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserType.ADMIN)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Approve or change user status (Admin only)' })
  @ApiResponse({ 
    status: 200, 
    description: 'The user status has been successfully updated.',
    type: User 
  })
  @ApiResponse({ status: 404, description: 'User not found.' })
  async approveUser(@Body() approvalDto: UserApprovalDto) {
    const user = await this.userService.approveUser(approvalDto);
    const { password, ...result } = user.toJSON();
    return successResponse(result, `User status updated to ${approvalDto.status}`);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserType.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all users (Admin only)' })
  @ApiResponse({ 
    status: 200, 
    description: 'List of all users',
    type: [User] 
  })
  async findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('userTypes') userTypesString?: string
  ) {
    // Parse user types from query parameter
    let userTypes: UserType[] = [];
    
    if (userTypesString) {
      try {
        // If it's a comma-separated string
        userTypes = userTypesString.split(',') as UserType[];
      } catch (error) {
        throw new BadRequestException('Invalid userTypes format');
      }
    } else {
      // Default to only candidates and employers if no userTypes specified
      userTypes = [UserType.CANDIDATE, UserType.EMPLOYER];
    }
    
    const { users, total } = await this.userService.findAll(page, limit, userTypes);
    
    const result = users.map(user => {
      const { password, ...userData } = user.toJSON();
      return userData;
    });
    
    return successResponse({
      users: result,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    }, 'Users retrieved successfully');
  }

  @Get('pending-approval')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserType.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all users pending approval (Admin only)' })
  @ApiResponse({ 
    status: 200, 
    description: 'List of all users pending approval',
    type: [User] 
  })
  async findPendingApprovals() {
    const users = await this.userService.findPendingApprovals();
    const result = users.map(user => {
      const { password, ...userData } = user.toJSON();
      return userData;
    });
    return successResponse(result, 'Pending approval users retrieved successfully');
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiResponse({ status: 200, description: 'User retrieved successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async findOne(@Param('id') id: string) {
    try {
      // Special case for 'me' - this is a fallback in case someone hits /users/me directly
      if (id === 'me') {
        throw new BadRequestException('Use /api/v1/users/profile to get your own profile');
      }
      
      const user = await this.userService.findById(id);

      return successResponse(this.sanitizeUser(user), 'User retrieved successfully');
    } catch (error) {
      console.log("error",error);
      console.error(`Error finding user ${id}:`, error.message);
      throw error;
    }
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserType.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a user (Admin only)' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({ 
    status: 200, 
    description: 'The user has been successfully updated.',
    type: User 
  })
  @ApiResponse({ status: 400, description: 'Bad request.' })
  @ApiResponse({ status: 404, description: 'User not found.' })
  @ApiResponse({ status: 409, description: 'User with this email already exists.' })
  async adminUpdate(@Param('id') id: string, @Body() adminUpdateUserDto: AdminUpdateUserDto) {
    const user = await this.userService.adminUpdateUser(id, adminUpdateUserDto);
    return user;
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserType.ADMIN)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete user (Admin only)' })
  @ApiResponse({ status: 204, description: 'The user has been successfully deleted.' })
  @ApiResponse({ status: 404, description: 'User not found.' })
  async remove(@Param('id') id: string) {
    await this.userService.remove(id);
    return { message: 'User deleted successfully' };
  }

  @Get(':id/email-verification-status')
  @Public()
  @ApiOperation({ summary: 'Check email verification status' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({ 
    status: 200, 
    description: 'Email verification status',
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  async checkEmailVerificationStatus(@Param('id') id: string) {
    const user = await this.userService.findOne(id);
    return successResponse({ 
      verified: user.isEmailVerified 
    }, 'Email verification status retrieved successfully');
  }

  @Get(':id/profile')
  async getUserProfile(@Param('id') id: string) {
    const user = await this.userService.findOne(id);
    return user;
  }

  @Public()
  @Post('create-admin')
  @ApiOperation({ summary: 'Create admin user (temporary)' })
  @ApiResponse({ status: 201, description: 'Admin user created successfully' })
  async createAdmin() {
    try {
      // Check if admin exists
      try {
        await this.userService.findByEmail('admin@jobtowners.com');
        return successResponse(null, 'Admin user already exists');
      } catch (error) {
        // Create admin user
        const hashedPassword = await bcrypt.hash('Admin@123##', 10);
        
        const adminUser = {
          firstName: 'Admin',
          lastName: 'User',
          email: 'admin@jobtowners.com',
          password: hashedPassword,
          userType: UserType.ADMIN,
          status: UserStatus.ACTIVE,
          isEmailVerified: true,
          termsAccepted: true
        };
        
        await this.userService.create(adminUser);
        return successResponse(null, 'Admin user created successfully');
      }
    } catch (error) {
      throw new BadRequestException('Failed to create admin user');
    }
  }

  @Public()
  @Post('reset-admin-password')
  @ApiOperation({ summary: 'Reset admin password (temporary)' })
  @ApiResponse({ status: 200, description: 'Admin password reset successfully' })
  async resetAdminPassword() {
    try {
      // Find admin user
      let adminUser;
      try {
        adminUser = await this.userService.findByEmail('admin@jobtowners.com');
      } catch (error) {
        throw new NotFoundException('Admin user not found');
      }
      
      // Reset password directly using updatePassword method
      await this.userService.updatePassword(adminUser.id, 'Admin@123##');
      
      return successResponse(null, 'Admin password reset successfully');
    } catch (error) {
      console.error('Error resetting admin password:', error);
      throw new BadRequestException('Failed to reset admin password');
    }
  }

  @Public()
  @Post('reset-admin-password-sql')
  @ApiOperation({ summary: 'Reset admin password with SQL (temporary)' })
  @ApiResponse({ status: 200, description: 'Admin password reset successfully' })
  async resetAdminPasswordSql() {
    try {
      // Inject Sequelize in the constructor
      const sequelize = this.userService['sequelize']; // Access the sequelize instance from userService
      
      if (!sequelize) {
        throw new BadRequestException('Sequelize instance not available');
      }
      
      // Reset password with direct SQL query
      const hashedPassword = await bcrypt.hash('Admin@123##', 10);
      
      await sequelize.query(
        `UPDATE users SET password = ? WHERE email = 'admin@jobtowners.com'`,
        {
          replacements: [hashedPassword],
          type: QueryTypes.UPDATE
        }
      );
      
      return successResponse(null, 'Admin password reset successfully');
    } catch (error) {
      console.error('Error resetting admin password:', error);
      throw new BadRequestException('Failed to reset admin password');
    }
  }

  @Public()
  @Post('create-new-admin')
  @ApiOperation({ summary: 'Create new admin user (temporary)' })
  @ApiResponse({ status: 201, description: 'New admin user created successfully' })
  async createNewAdmin() {
    try {
      // Create a new admin user with a different email
      const hashedPassword = await bcrypt.hash('Admin@123##', 10);
      
      const adminUser = {
        firstName: 'Admin',
        lastName: 'User',
        email: 'admin2@jobtowners.com',
        password: hashedPassword,
        userType: UserType.ADMIN,
        status: UserStatus.ACTIVE,
        isEmailVerified: true,
        termsAccepted: true
      };
      
      await this.userService.create(adminUser);
      return successResponse({ email: 'admin2@jobtowners.com', password: 'Admin@123##' }, 'New admin user created successfully');
    } catch (error) {
      throw new BadRequestException('Failed to create new admin user');
    }
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'User profile retrieved successfully' })
  async getCurrentUser(@Request() req) {
    try {
      // Get the user ID from the JWT token
      const userId = req.user?.sub;
      
      if (!userId) {
        throw new UnauthorizedException('User not authenticated');
      }
      
      // Get the user profile
      const user = await this.userService.findById(userId);
      
      if (!user) {
        throw new NotFoundException('User not found');
      }
      
      // Remove sensitive information
      const userProfile = {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phoneNumber: user.phoneNumber,
        userType: user.userType,
        status: user.status,
        isEmailVerified: user.isEmailVerified,
        companyName: user.companyName,
        createdAt: user.createdAt
      };
      
      return successResponse(userProfile, 'User profile retrieved successfully');
    } catch (error) {
      console.error('Error getting current user:', error.message);
      throw error;
    }
  }

  @Patch('candidate/update/profile')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Update candidate profile' })
  @ApiResponse({ status: 200, description: 'Candidate profile updated successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 403, description: 'Forbidden - User is not a candidate' })
  @ApiBearerAuth()
  async updateCandidateProfile(
    @Req() req,
    @Body() updateCandidateProfileDto: UpdateCandidateProfileDto
  ) {
    try {
      const userId = req.user.sub || req.user.userId;
      const userType = req.user.userType;
      
      // Verify user is a candidate
      if (userType !== UserType.CANDIDATE) {
        throw new ForbiddenException('Only candidates can update candidate profiles');
      }
      
      // Check if email is being attempted to be updated
      if ('email' in updateCandidateProfileDto) {
        throw new BadRequestException('Email cannot be updated through this endpoint');
      }
      
      const updatedUser = await this.userService.updateCandidateProfile(userId, updateCandidateProfileDto);
      return successResponse(this.sanitizeUser(updatedUser), 'Candidate profile updated successfully');
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof ForbiddenException) {
        throw error;
      }
      throw new BadRequestException('Failed to update profile: ' + error.message);
    }
  }

  @Patch('employer/update/profile')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Update employer profile' })
  @ApiResponse({ status: 200, description: 'Employer profile updated successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 403, description: 'Forbidden - User is not an employer' })
  @ApiBearerAuth()
  async updateEmployerProfile(
    @Req() req,
    @Body() updateEmployerProfileDto: UpdateEmployerProfileDto
  ) {
    try {
      const userId = req.user.sub || req.user.userId;
      const userType = req.user.userType;
      
      // Verify user is an employer
      if (userType !== UserType.EMPLOYER) {
        throw new ForbiddenException('Only employers can update employer profiles');
      }
      
      // Check if email is being attempted to be updated
      if ('email' in updateEmployerProfileDto) {
        throw new BadRequestException('Email cannot be updated through this endpoint');
      }
      
      const updatedUser = await this.userService.updateEmployerProfile(userId, updateEmployerProfileDto);
      return successResponse(this.sanitizeUser(updatedUser), 'Employer profile updated successfully');
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof ForbiddenException) {
        throw error;
      }
      throw new BadRequestException('Failed to update profile: ' + error.message);
    }
  }

  @Get('admin/users/deleted-users')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserType.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all deleted users (Admin only)' })
  @ApiResponse({ 
    status: 200, 
    description: 'List of all deleted users',
    type: [User] 
  })
  async findDeletedUsers(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('userTypes') userTypesString?: string
  ) {
    // Parse user types from query parameter
    let userTypes: UserType[] = [];
    
    if (userTypesString) {
      try {
        // If it's a comma-separated string
        userTypes = userTypesString.split(',') as UserType[];
      } catch (error) {
        throw new BadRequestException('Invalid userTypes format');
      }
    } else {
      // Default to only candidates and employers if no userTypes specified
      userTypes = [UserType.CANDIDATE, UserType.EMPLOYER];
    }
    
    const { users, total } = await this.userService.findDeletedUsers(page, limit, userTypes);
    
    const result = users.map(user => {
      const { password, ...userData } = user.toJSON();
      return userData;
    });
    
    return successResponse({
      users: result,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    }, 'Deleted users retrieved successfully');
  }

  @Patch('admin/users/deleted-users/:id/restore')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserType.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Restore a deleted user (Admin only)' })
  @ApiParam({ name: 'id', description: 'User ID to restore' })
  @ApiResponse({ 
    status: 200, 
    description: 'User has been successfully restored',
    type: User 
  })
  @ApiResponse({ status: 404, description: 'User not found or not deleted' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async restoreDeletedUser(@Param('id') id: string) {
    try {
      const restoredUser = await this.userService.restoreDeletedUser(id);
      return successResponse(this.sanitizeUser(restoredUser), 'User restored successfully');
    } catch (error) {
      console.error(`Error restoring user ${id}:`, error.message);
      throw error;
    }
  }

  // Helper method to sanitize user data before sending response
  private sanitizeUser(user: any): any {
    console.log("user",user)
    const sanitized = user.toJSON ? user.toJSON() : { ...user };
    delete sanitized.password;
    return sanitized;
  }
} 