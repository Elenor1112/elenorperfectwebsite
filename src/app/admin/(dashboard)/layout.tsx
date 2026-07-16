import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/server/auth/rbac';
import { AdminShell } from '@/components/admin/AdminShell';

export const metadata: Metadata = {
  title: { default: 'Dashboard', template: '%s | Elenor Admin' },
  robots: { index: false, follow: false },
};

export default async function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect('/admin/login');

  return <AdminShell user={user}>{children}</AdminShell>;
}
