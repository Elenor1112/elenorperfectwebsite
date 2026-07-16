import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { can, getCurrentUser } from '@/server/auth/rbac';
import { listUsers } from '@/server/actions/users';
import { PageHeader } from '@/components/admin/ui';
import { UsersManager } from './UsersManager';

export const metadata: Metadata = { title: 'Users' };
export const dynamic = 'force-dynamic';

export default async function UsersAdminPage() {
  const user = await getCurrentUser();
  if (!user || !can(user, 'users:write')) redirect('/admin');

  const users = await listUsers();

  return (
    <div>
      <PageHeader
        title="Users"
        description="Editors can manage content, media, and messages. Super Admins can also change settings, navigation, theme, and users."
      />
      <UsersManager users={users} currentUserId={user.id} />
    </div>
  );
}
