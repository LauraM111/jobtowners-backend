import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Custom decorator to extract the current user or a specific property from the user object
 * in the request
 * 
 * @example
 * // Get the entire user object
 * @CurrentUser() user: User
 * 
 * @example
 * // Get a specific property from the user object
 * @CurrentUser('id') userId: string
 */
export const CurrentUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    // If no specific property is requested, return the entire user object
    if (!data) {
      return user;
    }

    // Return the specific property from the user object
    return user?.[data];
  },
); 