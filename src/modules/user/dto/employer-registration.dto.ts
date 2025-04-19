import { ApiProperty } from '@nestjs/swagger';
import { BaseRegistrationDto } from './base-registration.dto';

export class EmployerRegistrationDto extends BaseRegistrationDto {
  // We can add employer-specific fields here in the future if needed
} 