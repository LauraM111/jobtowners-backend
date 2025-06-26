import { ApiProperty } from '@nestjs/swagger';
import { 
  IsString, IsNotEmpty, IsOptional, IsEmail, 
  IsUrl, IsNumber, IsEnum, Min, Max, ValidateIf,
  Validate
} from 'class-validator';
import { CompanyStatus } from '../enums/company-status.enum';
import { RequireTwoBusinessVerificationFields } from '../validators/business-verification.validator';

export class CreateCompanyDto {
  @Validate(RequireTwoBusinessVerificationFields)
  @IsOptional()
  businessVerification?: boolean;

  // Basic Company Information
  @ApiProperty({ description: 'Name of the company', example: 'Acme Corporation' })
  @IsString()
  @IsNotEmpty()
  companyName: string;

  @ApiProperty({ description: 'URL-friendly version of the name', example: 'acme-corp', required: false })
  @IsString()
  @IsOptional()
  slug?: string;

  @ApiProperty({ description: 'Short description of the company', example: 'Leading provider of innovative solutions' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: 'Industry type', example: 'Technology' })
  @IsString()
  @IsOptional()
  industryType?: string;

  @ApiProperty({ 
    description: 'Company website URL (Required for business verification if no other verification methods provided)', 
    example: 'https://www.acmecorp.com'
  })
  @IsUrl()
  @IsOptional()
  website?: string;

  @ApiProperty({ description: 'Year of establishment', example: 2010 })
  @IsNumber()
  @Min(1800)
  @Max(new Date().getFullYear())
  @IsOptional()
  foundedYear?: number;

  @ApiProperty({ description: 'Company size', example: '51-200' })
  @IsString()
  @IsOptional()
  companySize?: string;

  // Contact Details
  @ApiProperty({ description: 'Official contact email', example: 'contact@acmecorp.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ description: 'Contact number', example: '+1234567890' })
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

  // Address (Required for business verification if no other verification methods provided)
  @ApiProperty({ 
    description: 'Physical business address line 1 (Required for business verification if no other verification methods provided)', 
    example: '123 Main Street' 
  })
  @IsString()
  @IsOptional()
  addressLine1?: string;

  @ApiProperty({ description: 'Address line 2', example: 'Suite 456' })
  @IsString()
  @IsOptional()
  addressLine2?: string;

  @ApiProperty({ 
    description: 'City (Required if address is provided)', 
    example: 'San Francisco' 
  })
  @ValidateIf(o => !!o.addressLine1)
  @IsString()
  @IsNotEmpty()
  city?: string;

  @ApiProperty({ 
    description: 'State (Required if address is provided)', 
    example: 'California' 
  })
  @ValidateIf(o => !!o.addressLine1)
  @IsString()
  @IsNotEmpty()
  state?: string;

  @ApiProperty({ 
    description: 'Country (Required if address is provided)', 
    example: 'USA' 
  })
  @ValidateIf(o => !!o.addressLine1)
  @IsString()
  @IsNotEmpty()
  country?: string;

  @ApiProperty({ 
    description: 'Postal code (Required if address is provided)', 
    example: '94105' 
  })
  @ValidateIf(o => !!o.addressLine1)
  @IsString()
  @IsNotEmpty()
  postalCode?: string;

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

  // Business Registration
  @ApiProperty({ 
    description: 'Business registration number (Required for business verification if no other verification methods provided)', 
    example: 'BRN123456' 
  })
  @IsString()
  @IsOptional()
  businessRegistrationNumber?: string;

  // Social Media Links (Any one social media link is sufficient for business verification)
  @ApiProperty({ 
    description: 'Facebook page URL', 
    example: 'https://facebook.com/company',
    required: false
  })
  @IsOptional()
  facebookUrl?: string;

  @ApiProperty({ 
    description: 'LinkedIn company page URL', 
    example: 'https://linkedin.com/company/example',
    required: false
  })
  @IsOptional()
  linkedinUrl?: string;

  @ApiProperty({ 
    description: 'Twitter profile URL', 
    example: 'https://twitter.com/company',
    required: false
  })
  @IsOptional()
  twitterUrl?: string;

  @ApiProperty({ 
    description: 'Instagram profile URL', 
    example: 'https://instagram.com/company',
    required: false
  })
  @IsOptional()
  instagramUrl?: string;

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