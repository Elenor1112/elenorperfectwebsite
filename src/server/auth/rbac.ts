import 'server-only';
import { cache } from 'react';
import { redirect } from 'next/navigation';
import { validateSession, type SessionUser } from './session';

export type Permission =
  | 'content:write'
  | 'media:write'
  | 'messages:write'
  | 'settings:write'
  | 'navigation:write'
  | 'theme:write'
  | 'users:write';

const ROLE_PERMISSIONS: Record<SessionUser['role'], readonly Permission[]> = {
  EDITOR: ['content:write', 'media:write', 'messages:write'],
  SUPER_ADMIN: [
    'content:write',
    'media:write',
    'messages:write',
    'settings:write',
    'navigation:write',
    'theme:write',
    'users:write',
  ],
};

export function can(user: SessionUser, permission: Permission): boolean {
  return ROLE_PERMISSIONS[user.role].includes(permission);
}

/** Deduped per request: layouts, pages, and actions can all call this. */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  try {
    return await validateSession();
  } catch {
    // DB unreachable → treat as unauthenticated rather than crashing the shell.
    return null;
  }
});

/** Gate for pages/actions. Redirects anonymous users to the login screen and
 *  throws for authenticated users lacking the permission. */
export async function requireUser(permission?: Permission): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect('/admin/login');
  if (permission && !can(user, permission)) {
    throw new Error('You do not have permission to perform this action.');
  }
  return user;
}
