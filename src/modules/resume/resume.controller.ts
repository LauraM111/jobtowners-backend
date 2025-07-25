import { 
  Controller, Get, Post, Body, Patch, Param, Delete, 
  UseGuards, Request, NotFoundException, ForbiddenException, BadRequestException, UnauthorizedException, InternalServerErrorException 
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ResumeService } from './resume.service';
import { CreateResumeDto } from './dto/create-resume.dto';
import { UpdateResumeDto } from './dto/update-resume.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserType } from '../user/entities/user.entity';
import { successResponse } from '../../common/helpers/response.helper';
import { PersonalDetailsDto } from './dto/personal-details.dto';
import { UploadVideoDto } from './dto/upload-video.dto';
import { UploadCvDto } from './dto/upload-cv.dto';
import { CreateAttachmentDto } from './dto/create-attachment.dto';
import { CreateEducationDto } from './dto/create-education.dto';
import { CreateExperienceDto } from './dto/create-experience.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Resume')
@Controller('resume')
@UseGuards(JwtAuthGuard)
export class ResumeController {
  constructor(private readonly resumeService: ResumeService) {}

  @Get('personal-details')
  @ApiOperation({ summary: 'Get current user\'s personal details and resume data' })
  @ApiResponse({ status: 200, description: 'Personal details retrieved successfully' })
  @ApiBearerAuth()
  async getPersonalDetails(@Request() req) {
    const personalDetails = await this.resumeService.getPersonalDetails(req.user.sub);
    
    if (!personalDetails) {
      return successResponse(null, 'No personal details found for this user');
    }
    
    return successResponse(personalDetails, 'Personal details retrieved successfully');
  }

  @Patch('personal-details')
  @ApiOperation({ summary: 'Update current user\'s personal details' })
  @ApiResponse({ status: 200, description: 'Personal details updated successfully' })
  @ApiBearerAuth()
  async updatePersonalDetails(@Request() req, @Body() personalDetailsDto: PersonalDetailsDto) {
    try {
      const userId = req.user?.sub;
      
      if (!userId) {
        throw new UnauthorizedException('User not authenticated');
      }
      
      console.log(`Updating personal details for user ${userId}:`, personalDetailsDto);
      
      // Directly update or create the resume with personal details
      const updatedDetails = await this.resumeService.updatePersonalDetails(userId, personalDetailsDto);
      
      if (!updatedDetails) {
        throw new InternalServerErrorException('Failed to update personal details');
      }
      
      console.log(`Personal details updated successfully for user ${userId}`);
      return successResponse(updatedDetails, 'Personal details updated successfully');
    } catch (error) {
      console.error('Error updating personal details:', error);
      
      if (error instanceof NotFoundException) {
        throw error;
      }
      
      throw new BadRequestException(`Failed to update personal details: ${error.message}`);
    }
  }

  @Get('me')
  @ApiOperation({ summary: 'Get current user\'s resume' })
  @ApiResponse({ status: 200, description: 'Resume retrieved successfully' })
  @ApiBearerAuth()
  async findMine(@Request() req) {
    const userId = req.user.sub;
    if (!userId) {
      throw new BadRequestException('User ID is required');
    }
    const resume = await this.resumeService.findOne(userId, true);
    return successResponse(resume, 'Resume retrieved successfully');
  }

  @Post()
  @ApiOperation({ summary: 'Create a new resume' })
  @ApiResponse({ status: 201, description: 'Resume created successfully' })
  @ApiBearerAuth()
  async create(
    @CurrentUser('id') userId: string,
    @Body() createResumeDto: CreateResumeDto
  ) {
    const resume = await this.resumeService.create(userId, createResumeDto);
    return successResponse(resume, 'Resume created successfully');
  }

  @Get()
  @Roles(UserType.ADMIN)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Get all resumes (admin only)' })
  @ApiResponse({ status: 200, description: 'Resumes retrieved successfully' })
  @ApiBearerAuth()
  async findAll() {
    const resumes = await this.resumeService.findAll();
    return successResponse(resumes, 'Resumes retrieved successfully');
  }

  @Patch()
  @ApiOperation({ summary: 'Update current user\'s resume' })
  @ApiResponse({ status: 200, description: 'Resume updated successfully' })
  @ApiBearerAuth()
  async update(@Request() req, @Body() updateResumeDto: UpdateResumeDto) {
    const resume = await this.resumeService.update(req.user.sub, updateResumeDto);
    return successResponse(resume, 'Resume updated successfully');
  }

  @Delete()
  @ApiOperation({ summary: 'Delete current user\'s resume' })
  @ApiResponse({ status: 200, description: 'Resume deleted successfully' })
  @ApiBearerAuth()
  async remove(@Request() req) {
    await this.resumeService.remove(req.user.sub);
    return successResponse(null, 'Resume deleted successfully');
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a resume by ID' })
  @ApiResponse({ status: 200, description: 'Resume retrieved successfully' })
  @ApiBearerAuth()
  async findOne(@Param('id') id: string) {
    const resume = await this.resumeService.findOne(id);
    
    if (!resume) {
      throw new NotFoundException(`Resume with ID ${id} not found`);
    }
    
    return successResponse(resume, 'Resume retrieved successfully');
  }

  @Patch('video')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update resume video URL' })
  @ApiResponse({ status: 200, description: 'Video URL updated successfully' })
  @ApiResponse({ status: 404, description: 'Resume not found' })
  async updateVideoUrl(@Request() req, @Body() data: { videoUrl: string }) {
    try {
      const userId = req.user?.sub;
      
      if (!userId) {
        throw new UnauthorizedException('User not authenticated');
      }
      
      // First, check if the user has a resume
      let resume = await this.resumeService.findByUserId(userId);
      
      // If no resume exists, create a basic one
      if (!resume) {
        console.log(`No resume found for user ${userId}, creating a new one`);
        
        // Create a basic resume DTO with required fields
        const createResumeDto: CreateResumeDto = {
          firstName: '',
          lastName: '',
          email: '',
          // Add any other required fields with default values
        };
        
        resume = await this.resumeService.create(userId, createResumeDto);
        
        if (!resume) {
          throw new InternalServerErrorException('Failed to create resume');
        }
      }
      
      // Now update the video URL
      const updatedResume = await this.resumeService.updateVideoUrl(resume.id, data.videoUrl);
      
      return successResponse(updatedResume, 'Resume video URL updated successfully');
    } catch (error) {
      console.error('Error updating resume video URL:', error.message);
      
      if (error instanceof NotFoundException) {
        throw error;
      }
      
      throw new BadRequestException(`Failed to update video URL: ${error.message}`);
    }
  }

  @Patch('cv/student/upload/replace')
  @ApiOperation({ summary: 'Upload or update resume CV document' })
  @ApiResponse({ status: 200, description: 'CV updated successfully' })
  @ApiBearerAuth()
  async uploadCv(@Request() req, @Body() uploadCvDto: UploadCvDto) {
    const resume = await this.resumeService.updateCv(req.user.sub, uploadCvDto.cvUrl);
    return successResponse(resume, 'Resume CV updated successfully');
  }

  @Delete('video')
  @ApiOperation({ summary: 'Delete resume video' })
  @ApiResponse({ status: 200, description: 'Video deleted successfully' })
  @ApiBearerAuth()
  async deleteVideo(@Request() req) {
    const resume = await this.resumeService.deleteVideo(req.user.sub);
    return successResponse(resume, 'Resume video deleted successfully');
  }

  @Delete('cv/student/delete')
  @ApiOperation({ summary: 'Delete resume CV document' })
  @ApiResponse({ status: 200, description: 'CV deleted successfully' })
  @ApiBearerAuth()
  async deleteCv(@Request() req) {
    const resume = await this.resumeService.deleteCv(req.user.sub);
    return successResponse(resume, 'Resume CV deleted successfully');
  }

  @Post('attachments')
  @ApiOperation({ summary: 'Add an attachment to resume' })
  @ApiResponse({ status: 201, description: 'Attachment added successfully' })
  @ApiBearerAuth()
  async addAttachment(@Request() req, @Body() createAttachmentDto: CreateAttachmentDto) {
    const attachment = await this.resumeService.addAttachment(req.user.sub, createAttachmentDto);
    return successResponse(attachment, 'Attachment added successfully');
  }

  @Get('attachments')
  @ApiOperation({ summary: 'Get all attachments for current user\'s resume' })
  @ApiResponse({ status: 200, description: 'Attachments retrieved successfully' })
  @ApiBearerAuth()
  async getAttachments(@Request() req) {
    const attachments = await this.resumeService.getAttachments(req.user.sub);
    return successResponse(attachments, 'Attachments retrieved successfully');
  }

  @Delete('attachments/:id')
  @ApiOperation({ summary: 'Delete an attachment from resume' })
  @ApiResponse({ status: 200, description: 'Attachment deleted successfully' })
  @ApiBearerAuth()
  async deleteAttachment(@Request() req, @Param('id') id: string) {
    await this.resumeService.deleteAttachment(req.user.sub, id);
    return successResponse(null, 'Attachment deleted successfully');
  }

  @Post('education')
  @ApiOperation({ summary: 'Add education to resume' })
  @ApiResponse({ status: 201, description: 'Education added successfully' })
  @ApiBearerAuth()
  async addEducation(@Request() req, @Body() createEducationDto: CreateEducationDto) {
    console.log(createEducationDto);
    const education = await this.resumeService.addEducation(req.user.sub, createEducationDto);
    return successResponse(education, 'Education added successfully');
  }

  @Get('education')
  @ApiOperation({ summary: 'Get all education entries for current user\'s resume' })
  @ApiResponse({ status: 200, description: 'Education entries retrieved successfully' })
  @ApiBearerAuth()
  async getEducation(@Request() req) {
    const education = await this.resumeService.getEducation(req.user.sub);
    return successResponse(education, 'Education entries retrieved successfully');
  }

  @Patch('education/:id')
  @ApiOperation({ summary: 'Update an education entry' })
  @ApiResponse({ status: 200, description: 'Education updated successfully' })
  @ApiBearerAuth()
  async updateEducation(
    @Request() req, 
    @Param('id') id: string, 
    @Body() updateEducationDto: CreateEducationDto
  ) {
    const education = await this.resumeService.updateEducation(req.user.sub, id, updateEducationDto);
    return successResponse(education, 'Education updated successfully');
  }

  @Delete('education/:id')
  @ApiOperation({ summary: 'Delete an education entry' })
  @ApiResponse({ status: 200, description: 'Education deleted successfully' })
  @ApiBearerAuth()
  async deleteEducation(@Request() req, @Param('id') id: string) {
    await this.resumeService.deleteEducation(req.user.sub, id);
    return successResponse(null, 'Education deleted successfully');
  }

  @Post('experience')
  @ApiOperation({ summary: 'Add work experience to resume' })
  @ApiResponse({ status: 201, description: 'Experience added successfully' })
  @ApiBearerAuth()
  async addExperience(@Request() req, @Body() createExperienceDto: CreateExperienceDto) {
    const experience = await this.resumeService.addExperience(req.user.sub, createExperienceDto);
    return successResponse(experience, 'Experience added successfully');
  }

  @Get('experience')
  @ApiOperation({ summary: 'Get all work experience entries for current user\'s resume' })
  @ApiResponse({ status: 200, description: 'Experience entries retrieved successfully' })
  @ApiBearerAuth()
  async getExperience(@Request() req) {
    const experience = await this.resumeService.getExperience(req.user.sub);
    return successResponse(experience, 'Experience entries retrieved successfully');
  }

  @Patch('experience/:id')
  @ApiOperation({ summary: 'Update a work experience entry' })
  @ApiResponse({ status: 200, description: 'Experience updated successfully' })
  @ApiBearerAuth()
  async updateExperience(
    @Request() req, 
    @Param('id') id: string, 
    @Body() updateExperienceDto: CreateExperienceDto
  ) {
    const experience = await this.resumeService.updateExperience(req.user.sub, id, updateExperienceDto);
    return successResponse(experience, 'Experience updated successfully');
  }

  @Delete('experience/:id')
  @ApiOperation({ summary: 'Delete a work experience entry' })
  @ApiResponse({ status: 200, description: 'Experience deleted successfully' })
  @ApiBearerAuth()
  async deleteExperience(@Request() req, @Param('id') id: string) {
    await this.resumeService.deleteExperience(req.user.sub, id);
    return successResponse(null, 'Experience deleted successfully');
  }
} 