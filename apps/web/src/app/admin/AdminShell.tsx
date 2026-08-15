'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Building2, LayoutDashboard, LogOut, ShieldCheck } from 'lucide-react';
import { clsx } from 'clsx';
import { useAdminStore } from '@/stores/admin.store';

const NAV = [
  { href: '/admin', label: 'Overview', icon: LayoutDashboard, exact: true },
  { href: '/admin/customers', label: 'Customer companies', icon: Building2, exact: false },
];

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { admin, isAuthenticated, logout } = useAdminStore();

  const isLoginPage = pathname === '/admin/login';

  // Keep staff pages behind the admin session.
  useEffect(() => {
    if (!isLoginPage && !isAuthenticated) router.replace('/admin/login');
  }, [isLoginPage, isAuthenticated, router]);

  if (isLoginPage) return <>{children}</>;

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-1">
        <p className="text-sm text-slate-500">Redirecting to sign in…</p>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600">
            <ShieldCheck className="h-4 w-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Platform</p>
            <p className="text-[10px] text-slate-400">Service provider console</p>
          </div>
        </div>

        <nav className="sidebar-nav">
          <p className="nav-section-label">Manage</p>
          {NAV.map((item) => {
            const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href);
            return (
              <Link key={item.href} href={item.href} className={clsx('nav-item', isActive && 'nav-item-active')}>
                <item.icon className="h-4 w-4 flex-shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-slate-700 p-3">
          <Link href="/login" className="nav-item text-[11px]">
            Customer app →
          </Link>
        </div>
      </aside>

      <div className="main-content">
        <header className="topbar">
          <p className="text-sm font-medium text-slate-500">Platform Console</p>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-xs font-medium leading-none text-slate-800">
                {admin ? `${admin.firstName} ${admin.lastName}` : 'Admin'}
              </p>
              <p className="mt-0.5 text-[10px] leading-none text-slate-500">{admin?.email}</p>
            </div>
            <button
              className="btn-secondary btn-sm"
              id="admin-logout-btn"
              onClick={() => { logout(); router.push('/admin/login'); }}
            >
              <LogOut className="h-3.5 w-3.5" /> Sign out
            </button>
          </div>
        </header>

        {children}
      </div>
    </div>
  );
}
