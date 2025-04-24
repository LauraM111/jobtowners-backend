import { PipeTransform, Injectable, ArgumentMetadata } from '@nestjs/common';

@Injectable()
export class CompanyUpdatePipe implements PipeTransform {
  transform(value: any, metadata: ArgumentMetadata) {
    // Only process the request body
    if (metadata.type === 'body') {
      // Create a new object with only the allowed properties
      const sanitizedValue = { ...value };
      
      // Remove properties that should not be updated by the client
      delete sanitizedValue.id;
      delete sanitizedValue.createdBy;
      delete sanitizedValue.updatedBy;
      delete sanitizedValue.createdAt;
      delete sanitizedValue.updatedAt;
      
      return sanitizedValue;
    }
    
    // For other types of data, return as is
    return value;
  }
} 