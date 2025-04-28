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
import { UserRole, UserStatus } from './entities/user.entity';
import { successResponse } from '../../common/helpers/response.helper';
import { Public } from '../auth/decorators/public.decorator';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { formatUserProfile } from './helpers/profile-formatter.helper';
import { ChangePasswordDto } from './dto/change-password.dto';
import { AdminUpdateUserDto } from './dto/admin-update-user.dto';
import { Request as ExpressRequest } from 'express';
import * as bcrypt from 'bcrypt';
import { QueryTypes } from 'sequelize';

interface RequestWithUser extends ExpressRequest {
  user: {
    sub: string;
    email: string;
    role: string;
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
    const user = await this.userService.findOne(req.user.sub);
    
    // Remove sensitive information
    const userProfile = {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
    };
    
    return successResponse(userProfile, 'User profile retrieved successfully');
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Update current user profile' })
  @ApiResponse({ status: 200, description: 'User profile updated successfully' })
  @ApiBearerAuth()
  async updateProfile(@Req() req, @Body() updateUserDto: UpdateUserDto) {
    try {
      // Check if email is being attempted to be updated
      if ('email' in updateUserDto) {
        throw new BadRequestException('Email cannot be updated');
      }
      
      const updatedUser = await this.userService.updateUserProfile(req.user.sub, updateUserDto);
      return successResponse(updatedUser, 'User profile updated successfully');
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw error;
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
  @Roles(UserRole.ADMIN)
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
  async registerCandidate(@Body() registrationDto: CandidateRegistrationDto) {
    try {
      const user = await this.userService.registerCandidate(registrationDto);
      return {
        success: true,
        message: 'Candidate registered successfully',
        data: {
          id: user.id,
          email: user.email,
          role: user.role,
          status: user.status
        }
      };
    } catch (error) {
      if (error instanceof ConflictException) {
        throw new HttpException({
          success: false,
          message: error.message,
          data: null
        }, HttpStatus.CONFLICT);
      }
      throw new HttpException({
        success: false,
        message: error.message,
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
        // Return a more user-friendly message for duplicate email/username
        return {
          success: false,
          message: error.message,
          statusCode: HttpStatus.CONFLICT
        };
      } else if (error instanceof BadRequestException) {
        // Return validation errors
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
  @Roles(UserRole.ADMIN)
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
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all users (Admin only)' })
  @ApiResponse({ 
    status: 200, 
    description: 'List of all users',
    type: [User] 
  })
  async findAll() {
    const users = await this.userService.findAll();
    const result = users.map(user => {
      const { password, ...userData } = user.toJSON();
      return userData;
    });
    return successResponse(result, 'Users retrieved successfully');
  }

  @Get('pending-approval')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
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
  @ApiResponse({ 
    status: 200, 
    description: 'The user has been found.',
    type: User 
  })
  @ApiResponse({ status: 404, description: 'User not found.' })
  async findOne(@Param('id') id: string) {
    const user = await this.userService.findOne(id);
    const { password, ...result } = user.toJSON();
    return successResponse(result, 'User found');
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
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
  @Roles(UserRole.ADMIN)
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
      verified: user.emailVerified 
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
        const hashedPassword = await bcrypt.hash('Admin@123', 10);
        
        const adminUser = {
          firstName: 'Admin',
          lastName: 'User',
          email: 'admin@jobtowners.com',
          password: hashedPassword,
          role: UserRole.ADMIN,
          status: UserStatus.ACTIVE,
          emailVerified: true,
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
      await this.userService.updatePassword(adminUser.id, 'Admin@123');
      
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
      const hashedPassword = await bcrypt.hash('Admin@123', 10);
      
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
      const hashedPassword = await bcrypt.hash('Admin@123', 10);
      
      const adminUser = {
        firstName: 'Admin',
        lastName: 'User',
        email: 'admin2@jobtowners.com',
        password: hashedPassword,
        role: UserRole.ADMIN,
        status: UserStatus.ACTIVE,
        emailVerified: true,
        termsAccepted: true
      };
      
      await this.userService.create(adminUser);
      return successResponse({ email: 'admin2@jobtowners.com', password: 'Admin@123' }, 'New admin user created successfully');
    } catch (error) {
      throw new BadRequestException('Failed to create new admin user');
    }
  }
} 