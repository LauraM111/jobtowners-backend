import { 
  Controller, Get, Post, Body, Patch, Param, Delete, 
  UseGuards, Request, Query, ForbiddenException, NotFoundException, BadRequestException,
  UsePipes
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { CompanyService } from './company.service';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../user/entities/user.entity';
import { successResponse } from '../../common/helpers/response.helper';
import { CompanyStatus } from './enums/company-status.enum';
import { CompanyUpdatePipe } from './pipes/company-update.pipe';

@ApiTags('Companies')
@Controller('companies')
@UseGuards(JwtAuthGuard)
export class CompanyController {
  constructor(private readonly companyService: CompanyService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new company' })
  @ApiResponse({ status: 201, description: 'Company created successfully' })
  @ApiBearerAuth()
  async create(@Request() req, @Body() createCompanyDto: CreateCompanyDto) {
    const company = await this.companyService.create(req.user.sub, createCompanyDto);
    return successResponse(company, 'Company created successfully');
  }

  @Get()
  @ApiOperation({ summary: 'Get all companies' })
  @ApiResponse({ status: 200, description: 'Companies retrieved successfully' })
  @ApiQuery({ name: 'status', enum: CompanyStatus, required: false })
  @ApiQuery({ name: 'industryType', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiBearerAuth()
  async findAll(@Query() query) {
    try {
      const companies = await this.companyService.findAll(query);
      return successResponse(companies, 'Companies retrieved successfully');
    } catch (error) {
      console.error('Error retrieving companies:', error);
      throw error;
    }
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a company by ID' })
  @ApiResponse({ status: 200, description: 'Company retrieved successfully' })
  @ApiBearerAuth()
  async findOne(@Param('id') id: string) {
    const company = await this.companyService.findOne(id);
    return successResponse(company, 'Company retrieved successfully');
  }

  @Get('slug/:slug')
  @ApiOperation({ summary: 'Get a company by slug' })
  @ApiResponse({ status: 200, description: 'Company retrieved successfully' })
  @ApiBearerAuth()
  async findBySlug(@Param('slug') slug: string) {
    const company = await this.companyService.findBySlug(slug);
    return successResponse(company, 'Company retrieved successfully');
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a company' })
  @ApiResponse({ status: 200, description: 'Company updated successfully' })
  @ApiBearerAuth()
  @UsePipes(new CompanyUpdatePipe())
  async update(
    @Param('id') id: string, 
    @Request() req, 
    @Body() updateCompanyDto: UpdateCompanyDto
  ) {
    try {
      // Get the company to check ownership
      const company = await this.companyService.findOne(id);
      
      // Only allow the creator or admin to update the company
      if (company.createdBy !== req.user.sub && req.user.role !== UserRole.ADMIN) {
        throw new ForbiddenException('You do not have permission to update this company');
      }
      
      // No need to sanitize here since the pipe already did it
      const updatedCompany = await this.companyService.update(id, req.user.sub, updateCompanyDto);
      return successResponse(updatedCompany, 'Company updated successfully');
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }
      if (error instanceof NotFoundException) {
        throw error;
      }
      console.error('Error updating company:', error);
      throw new BadRequestException(error.message || 'Failed to update company');
    }
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a company' })
  @ApiResponse({ status: 200, description: 'Company deleted successfully' })
  @ApiBearerAuth()
  async remove(@Param('id') id: string, @Request() req) {
    try {
      // Get the company to check ownership
      const company = await this.companyService.findOne(id);
      
      // Log the user ID and company creator for debugging
      console.log('User ID (type):', req.user.sub, typeof req.user.sub);
      console.log('Company Creator (type):', company.createdBy, typeof company.createdBy);
      
      // Convert both to strings for comparison
      const userId = String(req.user.sub);
      const creatorId = String(company.createdBy);
      
      // Only allow the creator or admin to delete the company
      if (creatorId !== userId && req.user.role !== UserRole.ADMIN) {
        throw new ForbiddenException('You do not have permission to delete this company');
      }
      
      await this.companyService.remove(id);
      return successResponse(null, 'Company deleted successfully');
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }
      if (error instanceof NotFoundException) {
        throw error;
      }
      console.error('Error deleting company:', error);
      throw new BadRequestException(error.message || 'Failed to delete company');
    }
  }

  @Patch(':id/status')
  @Roles(UserRole.ADMIN)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Update company status (admin only)' })
  @ApiResponse({ status: 200, description: 'Company status updated successfully' })
  @ApiBearerAuth()
  async updateStatus(
    @Param('id') id: string, 
    @Request() req, 
    @Body('status') status: CompanyStatus
  ) {
    const updatedCompany = await this.companyService.updateStatus(id, req.user.sub, status);
    return successResponse(updatedCompany, 'Company status updated successfully');
  }

  @Get('user/me')
  @ApiOperation({ summary: 'Get all companies created by the current user' })
  @ApiResponse({ status: 200, description: 'Companies retrieved successfully' })
  @ApiQuery({ name: 'status', enum: CompanyStatus, required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiBearerAuth()
  async findMyCompanies(@Request() req, @Query() query) {
    const companies = await this.companyService.findByUserId(req.user.sub, query);
    return successResponse(companies, 'Companies retrieved successfully');
  }

  @Delete('user/me/:id')
  @ApiOperation({ summary: 'Delete user\'s own company' })
  @ApiResponse({ status: 200, description: 'Company deleted successfully' })
  @ApiBearerAuth()
  async removeOwnCompany(@Param('id') id: string, @Request() req) {
    try {
      // Get all companies created by the user
      const userCompanies = await this.companyService.findByUserId(req.user.sub, {});
      
      // Check if the company belongs to the user
      const companyBelongsToUser = userCompanies.some(company => company.id === id);
      
      if (!companyBelongsToUser) {
        throw new ForbiddenException('You do not have permission to delete this company');
      }
      
      await this.companyService.remove(id);
      return successResponse(null, 'Company deleted successfully');
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }
      if (error instanceof NotFoundException) {
        throw error;
      }
      console.error('Error deleting company:', error);
      throw new BadRequestException(error.message || 'Failed to delete company');
    }
  }
} 