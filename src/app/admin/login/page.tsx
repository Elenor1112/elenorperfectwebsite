import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/server/auth/rbac';
import { LoginForm } from './LoginForm';

export const metadata: Metadata = {
  title: 'Admin Login',
  robots: { index: false, follow: false },
};

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: { next?: string };
}) {
  const user = await getCurrentUser();
  if (user) redirect('/admin');

  return (
    <div className="grid min-h-screen place-items-center bg-[#05060a] px-6">
      <div className="w-full max-w-sm">
        <p className="text-center font-display text-2xl font-semibold text-white">
          Elenor <span className="text-white/40">Admin</span>
        </p>
        <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-8 backdrop-blur">
          <LoginForm next={searchParams.next} />
        </div>
        <p className="mt-6 text-center text-sm text-white/40">
          Content management for elenor-marketing.com
        </p>
      </div>
    </div>
  );
}
