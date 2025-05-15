import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { 
  IsString, IsEmail, IsOptional, IsEnum, IsNumber, 
  IsDate, IsLatitude, IsLongitude, ValidateNested, 
  IsArray, Min, Max, IsInt
} from 'class-validator';
import { Gender } from '../entities/resume.entity';

export class CreateEducationDto {
  @ApiProperty({ description: 'Degree name', example: 'Bachelor of Science in Computer Science' })
  @IsString()
  degreeName: string;

  @ApiProperty({ description: 'University name', example: 'Stanford University' })
  @IsString()
  universityName: string;

  @ApiProperty({ description: 'Start year', example: 2018 })
  @IsInt()
  @Min(1900)
  @Max(2100)
  fromYear: number;

  @ApiPropertyOptional({ description: 'End year', example: 2022 })
  @IsOptional()
  @IsInt()
  @Min(1900)
  @Max(2100)
  toYear?: number;

  @ApiPropertyOptional({ description: 'Description of education', example: 'Graduated with honors' })
  @IsOptional()
  @IsString()
  description?: string;
}

export class CreateExperienceDto {
  @ApiProperty({ description: 'Position held', example: 'Software Engineer' })
  @IsString()
  position: string;

  @ApiProperty({ description: 'Company name', example: 'Google' })
  @IsString()
  companyName: string;

  @ApiProperty({ description: 'Start year', example: 2022 })
  @IsInt()
  @Min(1900)
  @Max(2100)
  fromYear: number;

  @ApiPropertyOptional({ description: 'End year', example: 2023 })
  @IsOptional()
  @IsInt()
  @Min(1900)
  @Max(2100)
  toYear?: number;

  @ApiPropertyOptional({ description: 'Description of experience', example: 'Worked on cloud infrastructure' })
  @IsOptional()
  @IsString()
  description?: string;
}

export class CreateAttachmentDto {
  @ApiProperty({ description: 'File name', example: 'Certificate.pdf' })
  @IsString()
  fileName: string;

  @ApiProperty({ description: 'File URL', example: 'https://example.com/files/certificate.pdf' })
  @IsString()
  fileUrl: string;
}

export class CreateResumeDto {
  // Personal Details
  @ApiProperty({ description: 'First name', example: 'John' })
  @IsString()
  firstName: string;

  @ApiProperty({ description: 'Last name', example: 'Doe' })
  @IsString()
  lastName: string;

  @ApiProperty({ description: 'Email address', example: 'john.doe@example.com' })
  @IsEmail()
  email: string;

  @ApiPropertyOptional({ description: 'Phone number', example: '+1234567890' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ description: 'Date of birth', example: '1990-01-01' })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  dob?: Date;

  @ApiPropertyOptional({ description: 'Gender', enum: Gender, example: Gender.MALE })
  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender; 

  @ApiPropertyOptional({ description: 'Marital status', example: 'Single' })
  @IsOptional()
  @IsString()
  maritalStatus?: string;

  @ApiPropertyOptional({ description: 'Nationality', example: 'American' })
  @IsOptional()
  @IsString()
  nationality?: string;

  @ApiPropertyOptional({ description: 'Language', example: 'English' })
  @IsOptional()
  @IsString()
  language?: string;

  @ApiPropertyOptional({ description: 'City', example: 'San Francisco' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ description: 'State', example: 'California' })
  @IsOptional()
  @IsString()
  state?: string;

  @ApiPropertyOptional({ description: 'Country', example: 'USA' })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiPropertyOptional({ description: 'Latitude', example: 37.7749 })
  @IsOptional()
  @IsLatitude()
  latitude?: number;

  @ApiPropertyOptional({ description: 'Longitude', example: -122.4194 })
  @IsOptional()
  @IsLongitude()
  longitude?: number;

  @ApiPropertyOptional({ description: 'Offered salary', example: 100000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  offeredSalary?: number;

  @ApiPropertyOptional({ description: 'Years of experience', example: 5 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  yearsOfExperience?: number;

  @ApiPropertyOptional({ description: 'Qualification', example: 'Master\'s Degree' })
  @IsOptional()
  @IsString()
  qualification?: string;

  @ApiPropertyOptional({ description: 'Professional skills', example: 'JavaScript, React, Node.js' })
  @IsOptional()
  @IsString()
  professionalSkills?: string;

  @ApiPropertyOptional({ description: 'Address details', example: '123 Main St, Apt 4B' })
  @IsOptional()
  @IsString()
  addressDetails?: string;

  @ApiPropertyOptional({ description: 'Passion and future goals', example: 'Passionate about creating innovative solutions...' })
  @IsOptional()
  @IsString()
  passionAndFutureGoals?: string;

  // Media
  @ApiPropertyOptional({ description: 'Video URL', example: 'https://example.com/videos/intro.mp4' })
  @IsOptional()
  @IsString()
  videoUrl?: string;

  @ApiPropertyOptional({ description: 'CV URL', example: 'https://example.com/files/cv.pdf' })
  @IsOptional()
  @IsString()
  cvUrl?: string;

  // Education and Experience
  @ApiPropertyOptional({ type: [CreateEducationDto], description: 'Education history' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateEducationDto)
  education?: CreateEducationDto[];

  @ApiPropertyOptional({ type: [CreateExperienceDto], description: 'Work experience' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateExperienceDto)
  experiences?: CreateExperienceDto[];

  @ApiPropertyOptional({ type: [CreateAttachmentDto], description: 'Additional attachments' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateAttachmentDto)
  attachments?: CreateAttachmentDto[];
} 