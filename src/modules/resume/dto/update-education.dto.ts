import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsUUID } from 'class-validator';
import { CreateEducationDto } from './create-education.dto';

export class UpdateEducationDto extends CreateEducationDto {
  @ApiProperty({ 
    description: 'ID of the education record to update', 
    example: '550e8400-e29b-41d4-a716-446655440000' 
  })
  @IsUUID()
  @IsNotEmpty()
  id: string;
} 