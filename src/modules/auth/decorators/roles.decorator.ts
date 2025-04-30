import { SetMetadata } from '@nestjs/common';

export type UserType = 'user' | 'employer' | 'admin';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: UserType[]) => SetMetadata(ROLES_KEY, roles); 