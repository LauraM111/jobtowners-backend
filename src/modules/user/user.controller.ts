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
import { UserRole } from './entities/user.entity';
import { successResponse } from '../../common/helpers/response.helper';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('Users')
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

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
  @ApiOperation({ summary: 'Register a new candidate' })
  @ApiResponse({ 
    status: 201, 
    description: 'The candidate has been successfully registered.',
    type: User 
  })
  @ApiResponse({ status: 400, description: 'Bad request.' })
  @ApiResponse({ status: 409, description: 'User with this email already exists.' })
  async registerCandidate(@Body() registrationDto: CandidateRegistrationDto) {
    try {
      const user = await this.userService.registerCandidate(registrationDto);
      
      // Check if user exists before calling toJSON
      if (user && typeof user.toJSON === 'function') {
        const { password, ...result } = user.toJSON();
        return successResponse({
          ...result,
          emailVerificationRequired: true,
        }, 'Candidate registered successfully. Please verify your email to complete registration.');
      } else {
        // If user doesn't have toJSON method, return the user object directly
        // But still remove the password
        const { password, ...result } = user as any;
        return successResponse({
          ...result,
          emailVerificationRequired: true,
        }, 'Candidate registered successfully. Please verify your email to complete registration.');
      }
    } catch (error) {
      // Log the error for debugging
    //   console.error('Error in registerCandidate:', error);
      
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
    const user = await this.userService.findOne(+id);
    const { password, ...result } = user.toJSON();
    return successResponse(result, 'User retrieved successfully');
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a user' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({ 
    status: 200, 
    description: 'The user has been successfully updated.',
    type: User 
  })
  @ApiResponse({ status: 400, description: 'Bad request.' })
  @ApiResponse({ status: 404, description: 'User not found.' })
  @ApiResponse({ status: 409, description: 'User with this email already exists.' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    const user = await this.userService.update(id, updateUserDto);
    return successResponse(user, 'User updated successfully');
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
    await this.userService.remove(+id);
    return successResponse(null, 'User deleted successfully');
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
  async checkEmailVerificationStatus(@Param('id', ParseIntPipe) id: number) {
    const user = await this.userService.findOne(id);
    return successResponse({ 
      verified: user.emailVerified 
    }, 'Email verification status retrieved successfully');
  }
} 