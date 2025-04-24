import { ApiProperty } from '@nestjs/swagger';
import { 
  IsString, IsNotEmpty, IsOptional, IsEmail, 
  IsUrl, IsNumber, IsEnum, Min, Max 
} from 'class-validator';
import { CompanyStatus } from '../enums/company-status.enum';

export class CreateCompanyDto {
  // Basic Company Information
  @ApiProperty({ description: 'Name of the company', example: 'Acme Corporation' })
  @IsString()
  @IsNotEmpty()
  companyName: string;

  @ApiProperty({ description: 'URL-friendly version of the name', example: 'acme-corp', required: false })
  @IsString()
  @IsOptional()
  slug?: string;

  @ApiProperty({ description: 'Short description of the company', example: 'Leading provider of innovative solutions', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: 'Industry type', example: 'Technology', required: false })
  @IsString()
  @IsOptional()
  industryType?: string;

  @ApiProperty({ description: 'Company website URL', example: 'https://www.acmecorp.com', required: false })
  @IsUrl()
  @IsOptional()
  website?: string;

  @ApiProperty({ description: 'Year of establishment', example: 2010, required: false })
  @IsNumber()
  @Min(1800)
  @Max(new Date().getFullYear())
  @IsOptional()
  foundedYear?: number;

  @ApiProperty({ description: 'Company size', example: '51-200', required: false })
  @IsString()
  @IsOptional()
  companySize?: string;

  // Contact Details
  @ApiProperty({ description: 'Official contact email', example: 'contact@acmecorp.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ description: 'Contact number', example: '+1234567890', required: false })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiProperty({ description: 'Secondary phone', example: '+0987654321', required: false })
  @IsString()
  @IsOptional()
  alternatePhone?: string;

  @ApiProperty({ description: 'Name of point of contact', example: 'John Doe', required: false })
  @IsString()
  @IsOptional()
  contactPerson?: string;

  // Address
  @ApiProperty({ description: 'Address line 1', example: '123 Main Street' })
  @IsString()
  @IsNotEmpty()
  addressLine1: string;

  @ApiProperty({ description: 'Address line 2', example: 'Suite 456', required: false })
  @IsString()
  @IsOptional()
  addressLine2?: string;

  @ApiProperty({ description: 'City', example: 'San Francisco' })
  @IsString()
  @IsNotEmpty()
  city: string;

  @ApiProperty({ description: 'State', example: 'California' })
  @IsString()
  @IsNotEmpty()
  state: string;

  @ApiProperty({ description: 'Country', example: 'USA' })
  @IsString()
  @IsNotEmpty()
  country: string;

  @ApiProperty({ description: 'Postal code', example: '94105' })
  @IsString()
  @IsNotEmpty()
  postalCode: string;

  @ApiProperty({ description: 'Latitude', example: 37.7749, required: false })
  @IsNumber()
  @IsOptional()
  latitude?: number;

  @ApiProperty({ description: 'Longitude', example: -122.4194, required: false })
  @IsNumber()
  @IsOptional()
  longitude?: number;

  // Registration and Legal
  @ApiProperty({ description: 'GST number', example: 'GST1234567890', required: false })
  @IsString()
  @IsOptional()
  gstNumber?: string;

  @ApiProperty({ description: 'PAN number', example: 'ABCDE1234F', required: false })
  @IsString()
  @IsOptional()
  panNumber?: string;

  @ApiProperty({ description: 'Government-issued company number', example: 'REG123456', required: false })
  @IsString()
  @IsOptional()
  registrationNumber?: string;

  // Media & Branding
  @ApiProperty({ description: 'Logo image URL', example: 'https://www.acmecorp.com/logo.png', required: false })
  @IsUrl()
  @IsOptional()
  logoUrl?: string;

  @ApiProperty({ description: 'Banner or cover photo URL', example: 'https://www.acmecorp.com/cover.jpg', required: false })
  @IsUrl()
  @IsOptional()
  coverImageUrl?: string;

  // Status
  @ApiProperty({ 
    description: 'Company status', 
    enum: CompanyStatus, 
    example: CompanyStatus.ACTIVE,
    required: false
  })
  @IsEnum(CompanyStatus)
  @IsOptional()
  status?: CompanyStatus;
} 