import { ApiProperty } from '@nestjs/swagger';

export class PlacePredictionDto {
  @ApiProperty({ description: 'Place ID' })
  place_id: string;

  @ApiProperty({ description: 'Description of the place' })
  description: string;

  @ApiProperty({ description: 'Main text of the place' })
  structured_formatting: {
    main_text: string;
    secondary_text: string;
  };
} 