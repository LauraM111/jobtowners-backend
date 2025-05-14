import { ApiProperty } from '@nestjs/swagger';

class StructuredFormatting {
  @ApiProperty({ description: 'Main text of the place' })
  main_text: string;

  @ApiProperty({ description: 'Secondary text of the place' })
  secondary_text: string;
}

class Term {
  @ApiProperty({ description: 'Value of the term' })
  value: string;

  @ApiProperty({ description: 'Offset of the term in the description' })
  offset: number;
}

export class LocationSuggestionDto {
  @ApiProperty({ description: 'Place ID' })
  place_id: string;

  @ApiProperty({ description: 'Full description of the place' })
  description: string;

  @ApiProperty({ description: 'Structured formatting of the place' })
  structured_formatting: StructuredFormatting;

  @ApiProperty({ description: 'Terms that make up the description', type: [Term] })
  terms: Term[];

  @ApiProperty({ description: 'Formatted suggestion (e.g., "Mohali, Punjab, India")' })
  formatted_suggestion: string;
  
  @ApiProperty({ description: 'Latitude coordinate', required: false, nullable: true })
  latitude: number | null;
  
  @ApiProperty({ description: 'Longitude coordinate', required: false, nullable: true })
  longitude: number | null;
} 