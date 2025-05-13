import { ApiProperty } from '@nestjs/swagger';

export class PlaceDetailsDto {
  @ApiProperty({ description: 'Place ID' })
  placeId: string;

  @ApiProperty({ description: 'Formatted address' })
  formattedAddress: string;

  @ApiProperty({ description: 'Latitude' })
  latitude: number;

  @ApiProperty({ description: 'Longitude' })
  longitude: number;

  @ApiProperty({ description: 'Street number', required: false })
  streetNumber?: string;

  @ApiProperty({ description: 'Street name', required: false })
  route?: string;

  @ApiProperty({ description: 'City', required: false })
  city?: string;

  @ApiProperty({ description: 'State', required: false })
  state?: string;

  @ApiProperty({ description: 'Postal code', required: false })
  postalCode?: string;

  @ApiProperty({ description: 'Country', required: false })
  country?: string;

  @ApiProperty({ description: 'Country code', required: false })
  countryCode?: string;
} 