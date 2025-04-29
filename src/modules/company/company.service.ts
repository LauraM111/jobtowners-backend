import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Sequelize } from 'sequelize-typescript';
import { Company } from './entities/company.entity';
import { CompanyStatus } from './enums/company-status.enum';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { User } from '../user/entities/user.entity';
import { Op } from 'sequelize';

@Injectable()
export class CompanyService {
  constructor(
    @InjectModel(Company)
    private companyModel: typeof Company,
    private sequelize: Sequelize,
  ) {}

  /**
   * Create a new company
   */
  async create(userId: string, createCompanyDto: CreateCompanyDto): Promise<Company> {
    try {
      // Ensure userId is set
      console.log('Creating company with userId:', userId);
      
      // Create the company with userId and createdBy set to the current user
      const company = await this.companyModel.create({
        ...createCompanyDto,
        userId: userId,
        createdBy: userId
      });
      
      return company;
    } catch (error) {
      console.error('Error creating company:', error);
      throw error;
    }
  }

  /**
   * Get the appropriate case-insensitive search operator based on the database dialect
   */
  private getCaseInsensitiveSearchOperator(): symbol {
    const dialect = this.sequelize.getDialect();
    
    switch (dialect) {
      case 'postgres':
        return Op.iLike;
      case 'mysql':
      case 'mariadb':
      case 'sqlite':
      case 'mssql':
      default:
        return Op.like;
    }
  }

  /**
   * Find all companies with optional filtering
   */
  async findAll(query: any = {}): Promise<Company[]> {
    const { status, industryType, search, limit = 10, offset = 0 } = query;
    
    const whereClause: any = {};
    
    // Add condition to exclude deleted companies
    try {
      // First try with deletedAt is null condition
      whereClause.deletedAt = null;
      
      // Filter by status if provided
      if (status) {
        whereClause.status = status;
      }
      
      // Filter by industry type if provided
      if (industryType) {
        whereClause.industryType = industryType;
      }
      
      // Search by company name or description if provided
      if (search) {
        // Get the appropriate operator for case-insensitive search
        const caseInsensitiveOp = this.getCaseInsensitiveSearchOperator();
        
        // Use the correct operator for the database dialect
        whereClause[Op.or] = [
          { companyName: { [caseInsensitiveOp]: `%${search}%` } },
          { description: { [caseInsensitiveOp]: `%${search}%` } },
        ];
      }
      
      return await this.companyModel.findAll({
        where: whereClause,
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [['createdAt', 'DESC']],
      });
    } catch (error) {
      // If the error is about the deletedAt column, try again without it
      if (error.message && error.message.includes('deletedAt')) {
        console.warn('deletedAt column not found, querying without soft delete filter');
        delete whereClause.deletedAt;
        
        return await this.companyModel.findAll({
          where: whereClause,
          limit: parseInt(limit),
          offset: parseInt(offset),
          order: [['createdAt', 'DESC']],
        });
      }
      
      // If the error is about ILIKE, try again with LIKE
      if (error.message && error.message.includes('ILIKE')) {
        console.warn('ILIKE not supported, falling back to LIKE');
        
        // Modify the search condition to use LIKE instead
        if (search) {
          whereClause[Op.or] = [
            { companyName: { [Op.like]: `%${search}%` } },
            { description: { [Op.like]: `%${search}%` } },
          ];
        }
        
        return await this.companyModel.findAll({
          where: whereClause,
          limit: parseInt(limit),
          offset: parseInt(offset),
          order: [['createdAt', 'DESC']],
        });
      }
      
      throw error;
    }
  }

  /**
   * Find a company by ID
   */
  async findOne(id: string): Promise<Company> {
    try {
      // Try to find the company with deletedAt condition
      let whereClause: any = { id };
      
      try {
        whereClause.deletedAt = null;
        const company = await this.companyModel.findOne({ where: whereClause });
        
        if (!company) {
          throw new NotFoundException(`Company with ID ${id} not found or has been deleted`);
        }
        
        // Log the company details for debugging
        console.log('Company found:', {
          id: company.id,
          name: company.companyName,
          createdBy: company.createdBy,
        });
        
        return company;
      } catch (error) {
        // If the error is about the deletedAt column, try again without it
        if (error.message && error.message.includes('deletedAt')) {
          console.warn('deletedAt column not found, querying without soft delete filter');
          delete whereClause.deletedAt;
          
          const company = await this.companyModel.findByPk(id);
          
          if (!company) {
            throw new NotFoundException(`Company with ID ${id} not found`);
          }
          
          return company;
        }
        throw error;
      }
    } catch (error) {
      console.error('Error finding company:', error);
      throw error;
    }
  }

  /**
   * Find a company by slug
   */
  async findBySlug(slug: string): Promise<Company> {
    try {
      // Try to find the company with deletedAt condition
      let whereClause: any = { slug };
      
      try {
        whereClause.deletedAt = null;
        const company = await this.companyModel.findOne({ where: whereClause });
        
        if (!company) {
          throw new NotFoundException(`Company with slug ${slug} not found or has been deleted`);
        }
        
        return company;
      } catch (error) {
        // If the error is about the deletedAt column, try again without it
        if (error.message && error.message.includes('deletedAt')) {
          console.warn('deletedAt column not found, querying without soft delete filter');
          delete whereClause.deletedAt;
          
          const company = await this.companyModel.findOne({ where: whereClause });
          
          if (!company) {
            throw new NotFoundException(`Company with slug ${slug} not found`);
          }
          
          return company;
        }
        throw error;
      }
    } catch (error) {
      console.error('Error finding company by slug:', error);
      throw error;
    }
  }

  /**
   * Update a company
   */
  async update(id: string, userId: string, updateCompanyDto: UpdateCompanyDto): Promise<Company> {
    const transaction = await this.sequelize.transaction();
    
    try {
      const company = await this.companyModel.findByPk(id, { transaction });
      
      if (!company) {
        throw new NotFoundException(`Company with ID ${id} not found`);
      }
      
      // Create a clean update object with only the fields from the DTO
      // This ensures that fields like id, createdBy, etc. are not updated even if sent
      const updateData: Partial<Company> = {};
      
      // Only copy allowed fields from the DTO
      if (updateCompanyDto.companyName !== undefined) updateData.companyName = updateCompanyDto.companyName;
      if (updateCompanyDto.slug !== undefined) updateData.slug = updateCompanyDto.slug;
      if (updateCompanyDto.description !== undefined) updateData.description = updateCompanyDto.description;
      if (updateCompanyDto.industryType !== undefined) updateData.industryType = updateCompanyDto.industryType;
      if (updateCompanyDto.website !== undefined) updateData.website = updateCompanyDto.website;
      if (updateCompanyDto.foundedYear !== undefined) updateData.foundedYear = updateCompanyDto.foundedYear;
      if (updateCompanyDto.companySize !== undefined) updateData.companySize = updateCompanyDto.companySize;
      if (updateCompanyDto.email !== undefined) updateData.email = updateCompanyDto.email;
      if (updateCompanyDto.phone !== undefined) updateData.phone = updateCompanyDto.phone;
      if (updateCompanyDto.alternatePhone !== undefined) updateData.alternatePhone = updateCompanyDto.alternatePhone;
      if (updateCompanyDto.contactPerson !== undefined) updateData.contactPerson = updateCompanyDto.contactPerson;
      if (updateCompanyDto.addressLine1 !== undefined) updateData.addressLine1 = updateCompanyDto.addressLine1;
      if (updateCompanyDto.addressLine2 !== undefined) updateData.addressLine2 = updateCompanyDto.addressLine2;
      if (updateCompanyDto.city !== undefined) updateData.city = updateCompanyDto.city;
      if (updateCompanyDto.state !== undefined) updateData.state = updateCompanyDto.state;
      if (updateCompanyDto.country !== undefined) updateData.country = updateCompanyDto.country;
      if (updateCompanyDto.postalCode !== undefined) updateData.postalCode = updateCompanyDto.postalCode;
      if (updateCompanyDto.latitude !== undefined) updateData.latitude = updateCompanyDto.latitude;
      if (updateCompanyDto.longitude !== undefined) updateData.longitude = updateCompanyDto.longitude;
      if (updateCompanyDto.gstNumber !== undefined) updateData.gstNumber = updateCompanyDto.gstNumber;
      if (updateCompanyDto.panNumber !== undefined) updateData.panNumber = updateCompanyDto.panNumber;
      if (updateCompanyDto.registrationNumber !== undefined) updateData.registrationNumber = updateCompanyDto.registrationNumber;
      if (updateCompanyDto.logoUrl !== undefined) updateData.logoUrl = updateCompanyDto.logoUrl;
      if (updateCompanyDto.coverImageUrl !== undefined) updateData.coverImageUrl = updateCompanyDto.coverImageUrl;
      if (updateCompanyDto.status !== undefined) updateData.status = updateCompanyDto.status;
      
      // If slug is being updated, check if it's unique
      if (updateData.slug && updateData.slug !== company.slug) {
        const existingCompany = await this.companyModel.findOne({
          where: { 
            slug: updateData.slug,
            id: { [Op.ne]: id } // Exclude current company
          },
          transaction,
        });
        
        if (existingCompany) {
          throw new BadRequestException(`Company with slug "${updateData.slug}" already exists`);
        }
      }
      
      // If company name is updated but slug isn't, update the slug
      if (updateData.companyName && !updateData.slug && 
          updateData.companyName !== company.companyName) {
        updateData.slug = this.generateSlug(updateData.companyName);
      }
      
      // Always set the updatedBy field
      updateData.updatedBy = userId;
      
      // Update the company
      await company.update(updateData, { transaction });
      
      await transaction.commit();
      
      // Return the updated company
      return this.findOne(id);
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Remove a company
   */
  async remove(id: string): Promise<void> {
    const company = await this.findOne(id);
    
    if (!company) {
      throw new NotFoundException(`Company with ID ${id} not found`);
    }
    
    try {
      // Try soft delete first (if deletedAt column exists)
      await this.companyModel.update(
        { deletedAt: new Date() },
        { where: { id } }
      );
    } catch (error) {
      // If soft delete fails (e.g., no deletedAt column), try hard delete
      if (error.message && error.message.includes('deletedAt')) {
        await this.companyModel.destroy({ where: { id } });
      } else {
        throw error;
      }
    }
  }

  /**
   * Update company status
   */
  async updateStatus(id: string, userId: string, status: CompanyStatus): Promise<Company> {
    const transaction = await this.sequelize.transaction();
    
    try {
      const company = await this.companyModel.findByPk(id, { transaction });
      
      if (!company) {
        throw new NotFoundException(`Company with ID ${id} not found`);
      }
      
      await company.update(
        {
          status,
          updatedBy: userId,
        },
        { transaction }
      );
      
      await transaction.commit();
      
      // Return the updated company
      return this.findOne(id);
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Generate a slug from a company name
   */
  private generateSlug(companyName: string): string {
    return companyName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }

  /**
   * Find all companies created by a specific user
   */
  async findByUserId(userId: string, query: any = {}): Promise<Company[]> {
    const { status, limit, offset } = query;
    
    const whereClause: any = {
      userId: userId,
    };
    
    // Add condition to exclude deleted companies
    try {
      // First try with deletedAt is null condition
      whereClause.deletedAt = null;
      
      // Filter by status if provided
      if (status) {
        whereClause.status = status;
      }
      
      const options: any = {
        where: whereClause,
        order: [['createdAt', 'DESC']],
      };
      
      // Add pagination if provided
      if (limit) {
        options.limit = parseInt(limit);
      }
      
      if (offset) {
        options.offset = parseInt(offset);
      }
      
      return await this.companyModel.findAll(options);
    } catch (error) {
      // If the error is about the deletedAt column, try again without it
      if (error.message && error.message.includes('deletedAt')) {
        console.warn('deletedAt column not found, querying without soft delete filter');
        delete whereClause.deletedAt;
        
        const options: any = {
          where: whereClause,
          order: [['createdAt', 'DESC']],
        };
        
        // Add pagination if provided
        if (limit) {
          options.limit = parseInt(limit);
        }
        
        if (offset) {
          options.offset = parseInt(offset);
        }
        
        return await this.companyModel.findAll(options);
      }
      throw error;
    }
  }
} 