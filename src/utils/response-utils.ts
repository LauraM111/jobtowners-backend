/**
 * Standard success response format for API endpoints
 * @param data The data to include in the response
 * @param message Optional success message
 * @returns Formatted response object
 */
export function successResponse(data: any, message: string = 'Operation successful') {
  return {
    success: true,
    message,
    data
  };
}

/**
 * Standard error response format for API endpoints
 * @param message Error message
 * @param error Optional error details
 * @returns Formatted error response object
 */
export function errorResponse(message: string, error: any = null) {
  return {
    success: false,
    message,
    error
  };
} 