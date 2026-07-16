'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Briefcase,
  FileText,
  HelpCircle,
  Image as ImageIcon,
  Inbox,
  LayoutDashboard,
  LayoutTemplate,
  LogOut,
  Menu,
  MessageSquareQuote,
  Navigation,
  Settings,
  Sparkles,
  Users,
  X,
} from 'lucide-react';
import { Toaster } from 'sonner';
import { logout } from '@/server/actions/auth';

type ShellUser = {
  name: string;
  email: string;
  role: 'SUPER_ADMIN' | 'EDITOR';
};

const CONTENT_LINKS = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/admin/pages', label: 'Pages', icon: LayoutTemplate },
  { href: '/admin/services', label: 'Services', icon: Sparkles },
  { href: '/admin/work', label: 'Work', icon: Briefcase },
  { href: '/admin/posts', label: 'Blog', icon: FileText },
  { href: '/admin/faqs', label: 'FAQ', icon: HelpCircle },
  { href: '/admin/testimonials', label: 'Testimonials', icon: MessageSquareQuote },
  { href: '/admin/media', label: 'Media', icon: ImageIcon },
  { href: '/admin/messages', label: 'Inbox', icon: Inbox },
];

const ADMIN_LINKS = [
  { href: '/admin/navigation', label: 'Navigation', icon: Navigation },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
  { href: '/admin/users', label: 'Users', icon: Users },
];

function NavLink({
  href,
  label,
  icon: Icon,
  exact,
  onNavigate,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  exact?: boolean;
  onNavigate: () => void;
}) {
  const pathname = usePathname();
  const active = exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${
        active
          ? 'bg-brand/15 font-medium text-brand-glow'
          : 'text-white/60 hover:bg-white/5 hover:text-white'
      }`}
    >
      <Icon className="h-4 w-4 shrink-0" />
      {label}
    </Link>
  );
}

export function AdminShell({ user, children }: { user: ShellUser; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  const isSuperAdmin = user.role === 'SUPER_ADMIN';

  return (
    <div className="admin-root min-h-screen bg-[#0a0b10] text-white">
      <Toaster theme="dark" position="bottom-right" richColors />

      {/* Mobile top bar */}
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-white/10 bg-[#0a0b10]/90 px-4 py-3 backdrop-blur lg:hidden">
        <span className="font-display font-semibold">Elenor Admin</span>
        <button
          type="button"
          aria-label="Toggle menu"
          onClick={() => setOpen((v) => !v)}
          className="rounded-lg border border-white/10 p-2 text-white/70"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </header>

      <div className="lg:flex">
        {/* Sidebar */}
        <aside
          className={`fixed inset-y-0 left-0 z-30 w-64 transform border-r border-white/10 bg-[#0a0b10] transition-transform lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${
            open ? 'translate-x-0 pt-14 lg:pt-0' : '-translate-x-full'
          }`}
        >
          <div className="flex h-full flex-col p-4">
            <Link href="/admin" onClick={close} className="hidden px-3 py-4 lg:block">
              <span className="font-display text-lg font-semibold">
                Elenor <span className="text-white/40">Admin</span>
              </span>
            </Link>

            <nav className="mt-2 flex-1 space-y-6 overflow-y-auto">
              <div className="space-y-1">
                <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-white/30">
                  Content
                </p>
                {CONTENT_LINKS.map((l) => (
                  <NavLink key={l.href} {...l} onNavigate={close} />
                ))}
              </div>
              {isSuperAdmin ? (
                <div className="space-y-1">
                  <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-white/30">
                    Administration
                  </p>
                  {ADMIN_LINKS.map((l) => (
                    <NavLink key={l.href} {...l} onNavigate={close} />
                  ))}
                </div>
              ) : null}
            </nav>

            <div className="border-t border-white/10 pt-3">
              <div className="px-3">
                <p className="truncate text-sm font-medium">{user.name}</p>
                <p className="truncate text-xs text-white/40">
                  {user.email} · {user.role === 'SUPER_ADMIN' ? 'Super Admin' : 'Editor'}
                </p>
              </div>
              <form action={logout}>
                <button
                  type="submit"
                  className="mt-2 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-white/60 transition hover:bg-white/5 hover:text-white"
                >
                  <LogOut className="h-4 w-4" />
                  Sign out
                </button>
              </form>
            </div>
          </div>
        </aside>

        {/* Backdrop for mobile drawer */}
        {open ? (
          <button
            type="button"
            aria-label="Close menu"
            onClick={close}
            className="fixed inset-0 z-20 bg-black/60 lg:hidden"
          />
        ) : null}

        <main className="min-w-0 flex-1 px-4 py-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
