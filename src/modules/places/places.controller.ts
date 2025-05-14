import { Controller, Get, Query, Logger, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { PlacesService } from './places.service';
import { Public } from '../auth/decorators/public.decorator';
import { successResponse } from '../../common/helpers/response.helper';
import { lastValueFrom } from 'rxjs';

@ApiTags('Places')
@Controller('places')
export class PlacesController {
  private readonly logger = new Logger(PlacesController.name);

  constructor(private readonly placesService: PlacesService) {}

  @Get('autocomplete')
  @Public()
  @ApiOperation({ summary: 'Get place predictions based on input text' })
  @ApiQuery({ name: 'input', required: true, description: 'The text to search for place predictions' })
  @ApiQuery({ name: 'sessionToken', required: false, description: 'A session token for billing purposes' })
  @ApiResponse({ status: 200, description: 'Place predictions retrieved successfully' })
  async getPlacePredictions(
    @Query('input') input: string,
    @Query('sessionToken') sessionToken?: string
  ) {
    if (!input || input.trim().length < 2) {
      throw new BadRequestException('Input must be at least 2 characters');
    }

    try {
      const predictions = await lastValueFrom(this.placesService.getPlacePredictions(input, sessionToken));
      return successResponse(predictions, 'Place predictions retrieved successfully');
    } catch (error) {
      this.logger.error(`Error in getPlacePredictions: ${error.message}`);
      throw new BadRequestException('Failed to get place predictions');
    }
  }

  @Get('details')
  @Public()
  @ApiOperation({ summary: 'Get place details by place ID' })
  @ApiQuery({ name: 'placeId', required: true, description: 'The place ID to get details for' })
  @ApiQuery({ name: 'sessionToken', required: false, description: 'A session token for billing purposes' })
  @ApiResponse({ status: 200, description: 'Place details retrieved successfully' })
  async getPlaceDetails(
    @Query('placeId') placeId: string,
    @Query('sessionToken') sessionToken?: string
  ) {
    if (!placeId) {
      throw new BadRequestException('Place ID is required');
    }

    try {
      const details = await lastValueFrom(this.placesService.getPlaceDetails(placeId, sessionToken));
      return successResponse(details, 'Place details retrieved successfully');
    } catch (error) {
      this.logger.error(`Error in getPlaceDetails: ${error.message}`);
      throw new BadRequestException('Failed to get place details');
    }
  }

  @Get('geocode')
  @Public()
  @ApiOperation({ summary: 'Geocode an address to get coordinates' })
  @ApiQuery({ name: 'address', required: true, description: 'The address to geocode' })
  @ApiResponse({ status: 200, description: 'Address geocoded successfully' })
  async geocodeAddress(@Query('address') address: string) {
    if (!address) {
      throw new BadRequestException('Address is required');
    }

    try {
      const geocodeResult = await lastValueFrom(this.placesService.geocodeAddress(address));
      return successResponse(geocodeResult, 'Address geocoded successfully');
    } catch (error) {
      this.logger.error(`Error in geocodeAddress: ${error.message}`);
      throw new BadRequestException('Failed to geocode address');
    }
  }

  @Get('autocomplete/location-suggestions')
  @Public()
  @ApiOperation({ summary: 'Get location suggestions based on input text' })
  @ApiQuery({ name: 'input', required: true, description: 'The location text to search for (city, state, country, etc.)' })
  @ApiQuery({ name: 'sessionToken', required: false, description: 'A session token for billing purposes' })
  @ApiResponse({ status: 200, description: 'Location suggestions retrieved successfully' })
  async getLocationSuggestions(
    @Query('input') input: string,
    @Query('sessionToken') sessionToken?: string
  ) {
    if (!input || input.trim().length < 2) {
      throw new BadRequestException('Input must be at least 2 characters');
    }

    try {
      const suggestions = await lastValueFrom(this.placesService.getLocationSuggestions(input, sessionToken));
      return successResponse(suggestions, 'Location suggestions retrieved successfully');
    } catch (error) {
      this.logger.error(`Error in getLocationSuggestions: ${error.message}`);
      throw new BadRequestException('Failed to get location suggestions');
    }
  }
} 