import { SetMetadata } from '@nestjs/common';

export const REQUIRED_SCOPE_KEY = 'required_api_scope';

/** Marks a data-API route as needing a given API-key scope ('read' | 'write'). */
export const RequireScope = (scope: 'read' | 'write') => SetMetadata(REQUIRED_SCOPE_KEY, scope);
