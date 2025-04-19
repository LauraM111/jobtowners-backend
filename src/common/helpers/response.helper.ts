/**
 * Standard success response format
 * @param data - The data to return
 * @param message - Optional success message
 * @returns Formatted success response
 */
export const successResponse = (data: any, message?: string) => {
  return {
    success: true,
    message: message || 'Operation successful',
    data,
  };
};

/**
 * Standard error response format
 * @param message - Error message
 * @param error - Optional error details
 * @returns Formatted error response
 */
export const errorResponse = (message: string, error?: any) => {
  return {
    success: false,
    message,
    error: error || null,
  };
}; 