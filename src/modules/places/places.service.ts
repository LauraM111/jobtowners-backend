import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { map, catchError } from 'rxjs/operators';
import { Observable, throwError } from 'rxjs';
import { AxiosResponse } from 'axios';

@Injectable()
export class PlacesService {
  private readonly logger = new Logger(PlacesService.name);
  private readonly apiKey: string;
  private readonly baseUrl = 'https://maps.googleapis.com/maps/api/place';

  constructor(
    private httpService: HttpService,
    private configService: ConfigService
  ) {
    
    // Use a hardcoded API key temporarily for testing
    // Replace this with your new properly configured API key
    this.apiKey = process.env.GOOGLE_PLACES_API_KEY; // Replace with a new API key that has Places API enabled
    
    if (!this.apiKey) {
      this.logger.warn('Google Places API key is not set!');
    } else {
      this.logger.log('Google Places API key is configured');
    }
  }

  /**
   * Get place predictions based on input text
   */
  getPlacePredictions(input: string, sessionToken?: string): Observable<any> {
    const url = `${this.baseUrl}/autocomplete/json`;


    console.log("url",url);
    
    this.logger.log(`Calling Places API with key: ${this.apiKey.substring(0, 5)}...`);
    
    return this.httpService.get(url, {
      params: {
        input,
        key: this.apiKey,
        sessiontoken: sessionToken,
        types: 'address'
      }
    }).pipe(
      map((response: AxiosResponse) => {
        this.logger.log(`Places API response status: ${response.data.status}`);
        if (response.data.status !== 'OK') {
          this.logger.error(`Places API error: ${response.data.error_message || 'Unknown error'}`);
        }
        return response.data;
      }),
      catchError(error => {
        this.logger.error(`Error fetching place predictions: ${error.message}`);
        return throwError(() => error);
      })
    );
  }

  /**
   * Get place details by place ID
   */
  getPlaceDetails(placeId: string, sessionToken?: string): Observable<any> {
    const url = `${this.baseUrl}/details/json`;
    
    return this.httpService.get(url, {
      params: {
        place_id: placeId,
        key: this.apiKey,
        sessiontoken: sessionToken,
        fields: 'address_component,geometry,formatted_address'
      }
    }).pipe(
      map((response: AxiosResponse) => {
        const result = response.data.result;
        if (result) {
          // Extract address components
          const addressComponents = {};
          result.address_components.forEach(component => {
            component.types.forEach(type => {
              addressComponents[type] = component.long_name;
              if (type === 'country' && component.short_name) {
                addressComponents['country_code'] = component.short_name;
              }
            });
          });

          // Format the response
          return {
            placeId: result.place_id,
            formattedAddress: result.formatted_address,
            latitude: result.geometry?.location?.lat,
            longitude: result.geometry?.location?.lng,
            streetNumber: addressComponents['street_number'],
            route: addressComponents['route'],
            city: addressComponents['locality'],
            state: addressComponents['administrative_area_level_1'],
            postalCode: addressComponents['postal_code'],
            country: addressComponents['country'],
            countryCode: addressComponents['country_code']
          };
        }
        return response.data;
      }),
      catchError(error => {
        this.logger.error(`Error fetching place details: ${error.message}`);
        return throwError(() => error);
      })
    );
  }

  /**
   * Geocode an address to get coordinates
   */
  geocodeAddress(address: string): Observable<any> {
    const url = 'https://maps.googleapis.com/maps/api/geocode/json';
    
    return this.httpService.get(url, {
      params: {
        address,
        key: this.apiKey
      }
    }).pipe(
      map((response: AxiosResponse) => {
        if (response.data.results && response.data.results.length > 0) {
          const result = response.data.results[0];
          return {
            formattedAddress: result.formatted_address,
            latitude: result.geometry.location.lat,
            longitude: result.geometry.location.lng,
            placeId: result.place_id
          };
        }
        return { results: [] };
      }),
      catchError(error => {
        this.logger.error(`Error geocoding address: ${error.message}`);
        return throwError(() => error);
      })
    );
  }
} 