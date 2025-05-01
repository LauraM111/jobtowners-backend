import { Controller, Get, Param, UseGuards, Request, NotFoundException, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserService } from './user.service';
import { ResumeService } from '../resume/resume.service';
import { SubscriptionService } from '../subscription/subscription.service';
import { OrderService } from '../order/order.service';
import { successResponse } from '../../common/helpers/response.helper';

@ApiTags('User Profiles')
@Controller('user-profiles')
@UseGuards(JwtAuthGuard)
export class UserProfileController {
  constructor(
    private readonly userService: UserService,
    private readonly resumeService: ResumeService,
    private readonly subscriptionService: SubscriptionService,
    private readonly orderService: OrderService
  ) {}

  @Get('my-complete-profile')
  @ApiOperation({ summary: 'Get current user\'s complete profile with all related data' })
  @ApiResponse({ status: 200, description: 'Profile retrieved successfully' })
  @ApiBearerAuth()
  async getMyCompleteProfile(@Request() req) {
    try {
      const userId = req.user.sub;
      const userType = req.user.userType;
      
      // Get basic user data
      const user = await this.userService.findById(userId);
      
      if (!user) {
        throw new NotFoundException('User not found');
      }
      
      // Initialize response object
      const profileData: any = {
        user: {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          phoneNumber: user.phoneNumber,
          userType: user.userType,
          status: user.status,
          createdAt: user.createdAt,
          isEmailVerified: user.isEmailVerified,
          companyName: user.companyName
        }
      };
      
      // Get resume data for candidates
      if (userType === 'candidate') {
        try {
          const resume = await this.resumeService.findByUserId(userId);
          profileData.resume = resume;
        } catch (error) {
          console.log('No resume found for user');
          profileData.resume = null;
        }
        
        // Get order history for candidates
        try {
          const orders = await this.orderService.findByUserId(userId);
          profileData.orders = orders;
        } catch (error) {
          console.log('No orders found for user');
          profileData.orders = [];
        }
      }
      
      // Get subscription data for employers
      if (userType === 'employer') {
        try {
          const subscriptions = await this.subscriptionService.findActiveSubscriptionsByUserId(userId);
          profileData.subscriptions = subscriptions;
        } catch (error) {
          console.log('No subscriptions found for user');
          profileData.subscriptions = [];
        }
      }
      
      return successResponse(profileData, 'Profile retrieved successfully');
    } catch (error) {
      console.error('Error retrieving profile:', error);
      throw new BadRequestException(error.message);
    }
  }

  @Get('candidate-details/:candidateId')
  @Roles('employer', 'admin')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Get candidate details including resume (for employers and admins)' })
  @ApiResponse({ status: 200, description: 'Candidate details retrieved successfully' })
  @ApiParam({ name: 'candidateId', description: 'ID of the candidate' })
  @ApiBearerAuth()
  async getCandidateDetails(@Param('candidateId') candidateId: string) {
    try {
      // Get basic user data
      const user = await this.userService.findById(candidateId);
      
      if (!user) {
        throw new NotFoundException('Candidate not found');
      }
      
      if (user.userType !== 'candidate') {
        throw new BadRequestException('User is not a candidate');
      }
      
      // Initialize response object
      const candidateData: any = {
        user: {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          phoneNumber: user.phoneNumber,
          status: user.status,
          createdAt: user.createdAt
        }
      };
      
      // Get resume data
      try {
        const resume = await this.resumeService.findByUserId(candidateId);
        candidateData.resume = resume;
      } catch (error) {
        console.log('No resume found for candidate');
        candidateData.resume = null;
      }
      
      return successResponse(candidateData, 'Candidate details retrieved successfully');
    } catch (error) {
      console.error('Error retrieving candidate details:', error);
      throw new BadRequestException(error.message);
    }
  }

  @Get('employer-details/:employerId')
  @ApiOperation({ summary: 'Get employer details including subscription info' })
  @ApiResponse({ status: 200, description: 'Employer details retrieved successfully' })
  @ApiParam({ name: 'employerId', description: 'ID of the employer' })
  @ApiBearerAuth()
  async getEmployerDetails(@Param('employerId') employerId: string) {
    try {
      // Get basic user data
      const user = await this.userService.findById(employerId);
      
      if (!user) {
        throw new NotFoundException('Employer not found');
      }
      
      if (user.userType !== 'employer') {
        throw new BadRequestException('User is not an employer');
      }
      
      // Initialize response object
      const employerData: any = {
        user: {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          phoneNumber: user.phoneNumber,
          status: user.status,
          createdAt: user.createdAt,
          companyName: user.companyName
        }
      };
      
      // Get company data
      try {
        const companies = await this.userService.getEmployerCompanies(employerId);
        employerData.companies = companies;
      } catch (error) {
        console.log('No companies found for employer');
        employerData.companies = [];
      }
      
      // Get subscription data
      try {
        const subscriptions = await this.subscriptionService.findActiveSubscriptionsByUserId(employerId);
        employerData.subscriptions = subscriptions;
      } catch (error) {
        console.log('No subscriptions found for employer');
        employerData.subscriptions = [];
      }
      
      return successResponse(employerData, 'Employer details retrieved successfully');
    } catch (error) {
      console.error('Error retrieving employer details:', error);
      throw new BadRequestException(error.message);
    }
  }

  @Get('admin/user-complete-details/:userId')
  @Roles('admin')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Admin endpoint to get complete user details' })
  @ApiResponse({ status: 200, description: 'User details retrieved successfully' })
  @ApiParam({ name: 'userId', description: 'ID of the user' })
  @ApiBearerAuth()
  async getAdminUserDetails(@Param('userId') userId: string) {
    try {
      console.log(`Getting complete details for user ID: ${userId}`);
      
      // Get basic user data
      const user = await this.userService.findById(userId);
      
      if (!user) {
        throw new NotFoundException('User not found');
      }
      
      console.log(`Found user: ${user.firstName} ${user.lastName}, type: ${user.userType}`);
      
      // Initialize response object
      const userData: any = {
        user: {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          phoneNumber: user.phoneNumber,
          userType: user.userType,
          status: user.status,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
          isEmailVerified: user.isEmailVerified,
          companyName: user.companyName,
          stripeCustomerId: user.stripeCustomerId
        }
      };
      
      // For candidates, include more detailed information
      if (user.userType === 'candidate') {
        console.log('User is a candidate, fetching additional data...');
        
        // Get resume with all related data
        try {
          console.log('Fetching resume data...');
          
          // First try the raw query approach for debugging
          const rawResumeData = await this.resumeService.findByUserIdWithRawQuery(userId);
          console.log('Raw resume data found:', rawResumeData ? 'Yes' : 'No');
          
          // Then try the regular approach
          let resume = await this.resumeService.findByUserId(userId);
          console.log('ORM resume found:', resume ? 'Yes' : 'No');
          
          if (!resume && rawResumeData) {
            console.log('Resume found with raw query but not with ORM, using raw data');
            userData.resume = rawResumeData;
          } else if (resume) {
            console.log('Using ORM resume data');
            userData.resume = resume;
            
            // Fetch related data separately if not included
            if (!userData.resume.education || userData.resume.education.length === 0) {
              console.log('Fetching education data separately...');
              userData.resume.education = await this.resumeService.getEducation(userId);
              console.log(`Found ${userData.resume.education?.length || 0} education entries`);
            }
            
            if (!userData.resume.experiences || userData.resume.experiences.length === 0) {
              console.log('Fetching experience data separately...');
              userData.resume.experiences = await this.resumeService.getExperience(userId);
              console.log(`Found ${userData.resume.experiences?.length || 0} experience entries`);
            }
            
            if (!userData.resume.attachments || userData.resume.attachments.length === 0) {
              console.log('Fetching attachments separately...');
              userData.resume.attachments = await this.resumeService.getAttachments(userId);
              console.log(`Found ${userData.resume.attachments?.length || 0} attachments`);
            }
          } else {
            console.log('No resume found, creating a default one...');
            try {
              resume = await this.resumeService.createDefaultResumeIfNotExists(userId);
              console.log(`Created default resume with ID: ${resume.id}`);
              userData.resume = resume;
            } catch (createError) {
              console.error('Error creating default resume:', createError);
              userData.resume = null;
            }
          }
        } catch (error) {
          console.error('Error fetching/creating resume:', error);
          userData.resume = null;
        }
        
        // Get all orders (not just active ones)
        try {
          console.log('Fetching orders...');
          let orders = await this.orderService.findByUserId(userId);
          
          // If no orders exist, create a sample one for testing
          if (!orders || orders.length === 0) {
            console.log('No orders found, creating a sample one...');
            try {
              orders = await this.orderService.createSampleOrderIfNoneExist(userId);
              console.log(`Created sample order for user: ${userId}`);
            } catch (createError) {
              console.error('Error creating sample order:', createError);
            }
          }
          
          userData.orders = orders || [];
          console.log(`Found/created ${orders?.length || 0} orders`);
        } catch (error) {
          console.error('Error fetching/creating orders:', error);
          userData.orders = [];
        }
        
        // Get candidate plans/subscriptions if applicable
        try {
          console.log('Fetching candidate plans...');
          const candidatePlans = await this.subscriptionService.findAllSubscriptionsByUserId(userId);
          userData.candidatePlans = candidatePlans;
          console.log(`Found ${candidatePlans?.length || 0} candidate plans`);
        } catch (error) {
          console.error('Error fetching candidate plans:', error);
          userData.candidatePlans = [];
        }
      }
      
      // For employers, get subscription and company data
      if (user.userType === 'employer') {
        try {
          const subscriptions = await this.subscriptionService.findAllSubscriptionsByUserId(userId);
          userData.subscriptions = subscriptions;
        } catch (error) {
          console.log('Error fetching subscriptions:', error.message);
          userData.subscriptions = [];
        }
        
        try {
          const companies = await this.userService.getEmployerCompanies(userId);
          userData.companies = companies;
        } catch (error) {
          console.log('Error fetching companies:', error.message);
          userData.companies = [];
        }
      }
      
      return successResponse(userData, 'User details retrieved successfully');
    } catch (error) {
      console.error('Error retrieving user details:', error);
      throw new BadRequestException(error.message);
    }
  }
} 