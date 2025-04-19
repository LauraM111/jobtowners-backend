/**
 * Standard success response format
 * @param data - The data to return
 * @param message - Optional success message
 * @returns Formatted success response
 */
export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T | null;
}

export function successResponse<T>(data: T, message = 'Success'): ApiResponse<T> {
  return {
    success: true,
    message,
    data,
  };
}

/**
 * Standard error response format
 * @param message - Error message
 * @param error - Optional error details
 * @returns Formatted error response
 */
export function errorResponse(message = 'Error', data: any = null): ApiResponse<any> {
  return {
    success: false,
    message,
    data,
  };
} 