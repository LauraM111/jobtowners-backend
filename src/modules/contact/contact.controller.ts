import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ContactService } from './contact.service';
import { ContactFormDto } from './dto/contact.dto';
import { ContactResponseDto } from './dto/contact-response.dto';
import { Public } from '../auth/decorators/public.decorator';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { User } from '../auth/decorators/user.decorator';

@ApiTags('Contact')
@Controller('contact')
export class ContactController {
  constructor(private readonly contactService: ContactService) {}

  @Public()
  @Post()
  @ApiOperation({ summary: 'Submit contact form' })
  @ApiResponse({ status: 201, description: 'Contact form submitted successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async submitContactForm(@Body() contactFormDto: ContactFormDto) {
    return this.contactService.processContactForm(contactFormDto);
  }

  @Get()
  @Roles('admin')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Get contact form submissions (Admin only)' })
  @ApiResponse({ status: 200, description: 'Returns list of contact form submissions' })
  async getContactSubmissions(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Query('status') status?: string,
  ) {
    return this.contactService.getContactSubmissions(
      parseInt(page, 10),
      parseInt(limit, 10),
      status
    );
  }

  @Get(':id')
  @Roles('admin')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Get a specific contact form submission by ID (Admin only)' })
  @ApiParam({ name: 'id', description: 'Contact submission ID' })
  @ApiResponse({ status: 200, description: 'Returns the contact form submission' })
  @ApiResponse({ status: 404, description: 'Contact submission not found' })
  async getContactSubmissionById(@Param('id') id: string) {
    return this.contactService.getContactSubmissionById(id);
  }

  @Patch(':id/status')
  @Roles('admin')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Update the status of a contact submission (Admin only)' })
  @ApiParam({ name: 'id', description: 'Contact submission ID' })
  @ApiResponse({ status: 200, description: 'Status updated successfully' })
  @ApiResponse({ status: 404, description: 'Contact submission not found' })
  async updateContactSubmissionStatus(
    @Param('id') id: string,
    @Body('status') status: string,
  ) {
    return this.contactService.updateContactSubmissionStatus(id, status);
  }

  @Post(':id/response')
  @Roles('admin')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Respond to a contact submission (Admin only)' })
  @ApiParam({ name: 'id', description: 'Contact submission ID' })
  @ApiResponse({ status: 200, description: 'Response sent successfully' })
  @ApiResponse({ status: 404, description: 'Contact submission not found' })
  async respondToContactSubmission(
    @Param('id') id: string,
    @Body() responseDto: ContactResponseDto,
    @User() user: any,
  ) {
    return this.contactService.respondToContactSubmission(id, responseDto.message, user.id);
  }
} 