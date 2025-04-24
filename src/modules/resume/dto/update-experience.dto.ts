import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsNotEmpty } from 'class-validator';
import { CreateExperienceDto } from './create-experience.dto';

export class UpdateExperienceDto extends CreateExperienceDto {
  @ApiProperty({ 
    description: 'ID of the experience record to update', 
    example: '550e8400-e29b-41d4-a716-446655440000' 
  })
  @IsUUID()
  @IsNotEmpty()
  id: string;
} 