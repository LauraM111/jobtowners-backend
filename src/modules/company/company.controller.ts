import { 
  Controller, Get, Post, Body, Patch, Param, Delete, 
  UseGuards, Request, Query, ForbiddenException, NotFoundException, BadRequestException,
  UsePipes, UseInterceptors, UploadedFile, Put
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery, ApiConsumes } from '@nestjs/swagger';
import { CompanyService } from './company.service';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserType } from '../user/entities/user.entity';
import { successResponse } from '../../common/helpers/response.helper';
import { CompanyStatus } from './enums/company-status.enum';
import { CompanyUpdatePipe } from './pipes/company-update.pipe';
import { Company } from './entities/company.entity';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { UploadService } from '../upload/upload.service';

@ApiTags('Companies')
@Controller('companies')
@UseGuards(JwtAuthGuard)
export class CompanyController {
  constructor(
    private readonly companyService: CompanyService,
    private readonly uploadService: UploadService
  ) {}

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

  @Get('user/owned')
  @ApiOperation({ summary: 'Get all companies owned by the current user' })
  @ApiResponse({ status: 200, description: 'Companies retrieved successfully' })
  @ApiQuery({ name: 'status', enum: CompanyStatus, required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiBearerAuth()
  async findMyCompanies(@Request() req, @Query() query) {
    const companies = await this.companyService.findByUserId(req.user.sub, query);
    return successResponse(companies, 'Companies retrieved successfully');
  }

  @Get('by-slug/:slug')
  @ApiOperation({ summary: 'Get a company by slug' })
  @ApiResponse({ status: 200, description: 'Company retrieved successfully' })
  @ApiBearerAuth()
  async findBySlug(@Param('slug') slug: string) {
    const company = await this.companyService.findBySlug(slug);
    return successResponse(company, 'Company retrieved successfully');
  }

  @Delete('user/owned/:id')
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

  @Patch(':id/status')
  @Roles(UserType.ADMIN)
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

  @Get(':id')
  @ApiOperation({ summary: 'Get a company by ID' })
  @ApiResponse({ status: 200, description: 'Company retrieved successfully' })
  @ApiBearerAuth()
  async findOne(@Param('id') id: string) {
    const company = await this.companyService.findOne(id);
    return successResponse(company, 'Company retrieved successfully');
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a company' })
  @ApiResponse({ status: 200, description: 'Company updated successfully' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('logo', {
    storage: diskStorage({
      destination: './uploads/company-logos',
      filename: (req, file, cb) => {
        const randomName = uuidv4();
        return cb(null, `${randomName}${extname(file.originalname)}`);
      },
    }),
    fileFilter: (req, file, cb) => {
      if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/)) {
        return cb(new BadRequestException('Only image files are allowed!'), false);
      }
      cb(null, true);
    },
    limits: {
      fileSize: 2 * 1024 * 1024, // 2MB
    },
  }))
  async update(
    @Request() req,
    @Param('id') id: string,
    @Body() updateCompanyDto: UpdateCompanyDto,
    @UploadedFile() logo?: Express.Multer.File
  ) {
    try {
      // Check if the user has permission to update this company
      const company = await this.companyService.findOne(id);
      
      if (!company) {
        throw new BadRequestException('Company not found');
      }
      
      if (company.userId !== req.user.sub && req.user.userType !== UserType.ADMIN) {
        throw new BadRequestException('You do not have permission to update this company');
      }
      
      // If a new logo was uploaded, process it
      let logoUrl = null;
      if (logo) {
        // Upload to DigitalOcean Spaces
        logoUrl = await this.uploadService.uploadFile(
          logo.buffer,
          'company-logos',
          logo.originalname
        );
      }
      
      // Filter out properties that shouldn't be updated
      const allowedFields = [
        'companyName', 'website', 'foundedYear', 'companySize',
        'industry', 'description', 'socialLinks', 'contactEmail',
        'contactPhone', 'address', 'status'
      ];
      
      // Create a clean DTO with only allowed fields
      const cleanUpdateDto = Object.keys(updateCompanyDto)
        .filter(key => allowedFields.includes(key))
        .reduce((obj, key) => {
          obj[key] = updateCompanyDto[key];
          return obj;
        }, {});
      
      // Add logo URL if it exists
      if (logoUrl) {
        cleanUpdateDto['logoUrl'] = logoUrl;
      }
      
      const updatedCompany = await this.companyService.update(id, req.user.sub, cleanUpdateDto);
      return successResponse(updatedCompany, 'Company updated successfully');
    } catch (error) {
      console.error('Error updating company:', error);
      throw new BadRequestException(error.message);
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
      
      // Check if the company exists
      if (!company) {
        throw new NotFoundException(`Company with ID ${id} not found`);
      }
      
      // Check if the user is the owner or an admin
      const userId = req.user.id || req.user.sub; // Handle different JWT payload structures
      
      if (company.userId !== userId && req.user.userType !== UserType.ADMIN) {
        throw new ForbiddenException('You do not have permission to delete this company');
      }
      
      // Delete the company
      await this.companyService.remove(id);
      return successResponse(null, 'Company deleted successfully');
    } catch (error) {
      if (error instanceof ForbiddenException || error instanceof NotFoundException) {
        throw error;
      }
      console.error('Error deleting company:', error);
      throw new BadRequestException(error.message || 'Failed to delete company');
    }
  }
} 