'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Users, Building2, TrendingUp, Handshake,
  CheckSquare, Calendar, MessageSquare, BarChart3, Zap, Settings, X, Download,
} from 'lucide-react';
import { clsx } from 'clsx';
import { usePermissions } from '@/lib/permissions';
import { useAuthStore } from '@/stores/auth.store';
import { useUIStore } from '@/stores/ui.store';

/** Each item names the permission required to reach it. */
const NAV_SECTIONS = [
  {
    label: 'Main',
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, permission: null },
    ],
  },
  {
    label: 'CRM',
    items: [
      { href: '/leads', label: 'Leads', icon: TrendingUp, permission: 'leads.view' },
      { href: '/contacts', label: 'Contacts', icon: Users, permission: 'contacts.view' },
      { href: '/companies', label: 'Companies', icon: Building2, permission: 'companies.view' },
      { href: '/deals', label: 'Deals', icon: Handshake, permission: 'deals.view' },
    ],
  },
  {
    label: 'Work',
    items: [
      { href: '/tasks', label: 'Tasks', icon: CheckSquare, permission: 'tasks.view' },
      { href: '/calendar', label: 'Calendar', icon: Calendar, permission: 'tasks.view' },
      { href: '/communications', label: 'Communications', icon: MessageSquare, permission: 'activities.view' },
    ],
  },
  {
    label: 'Insights',
    items: [
      { href: '/reports', label: 'Reports', icon: BarChart3, permission: 'reports.view' },
      { href: '/automation', label: 'Automation', icon: Zap, permission: 'settings.update' },
    ],
  },
];

const STATUS_LABEL: Record<string, string> = {
  active: 'Active',
  trialing: 'Trial',
  past_due: 'Payment failed',
  cancelled: 'Cancelled',
};

export function Sidebar() {
  const pathname = usePathname();
  const { can, roles, isOwnScoped } = usePermissions();
  const billing = useAuthStore((s) => s.session?.billing);
  const mobileOpen = useUIStore((s) => s.mobileSidebarOpen);
  const closeMobileSidebar = useUIStore((s) => s.closeMobileSidebar);
  const [isAndroid, setIsAndroid] = useState(false);

  useEffect(() => {
    setIsAndroid(/android/i.test(navigator.userAgent));
  }, []);

  const sections = NAV_SECTIONS
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => !item.permission || can(item.permission)),
    }))
    .filter((section) => section.items.length > 0);

  return (
    <>
      {mobileOpen && <div className="sidebar-backdrop" onClick={closeMobileSidebar} />}
      <aside className={clsx('sidebar', mobileOpen && 'sidebar-open')}>
        {/* Logo */}
        <div className="sidebar-logo">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600"
            style={{ backgroundColor: 'var(--brand-accent, #4f46e5)' }}
          >
            <span className="text-sm font-bold text-white">C</span>
          </div>
          <span className="flex-1 text-sm font-semibold text-white">CRM Platform</span>
          <button
            className="rounded-md p-1 text-slate-400 hover:bg-sidebar-hover hover:text-white lg:hidden"
            aria-label="Close menu"
            onClick={closeMobileSidebar}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav">
          {sections.map((section) => (
            <div key={section.label}>
              <p className="nav-section-label">{section.label}</p>
              {section.items.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={clsx('nav-item', isActive && 'nav-item-active')}
                    onClick={closeMobileSidebar}
                  >
                    <item.icon className="h-4 w-4 flex-shrink-0" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Bottom: download app + plan + role badge + settings */}
        <div className="border-t border-slate-700 p-3">
          {isAndroid && (
            <a href="/api/download/android" className="nav-item">
              <Download className="h-4 w-4 flex-shrink-0" />
              <span>Download app</span>
            </a>
          )}
          {billing?.plan && (
            <div className="mb-2 px-3">
              <p className="text-[10px] uppercase tracking-widest text-slate-600">Plan</p>
              <p className="mt-0.5 text-xs font-medium text-slate-300">
                {billing.plan.name}
                {billing.status && <span className="text-slate-500"> · {STATUS_LABEL[billing.status] ?? billing.status}</span>}
              </p>
              {billing.status === 'trialing' && (
                <p className="mt-0.5 text-[10px] text-slate-500">{billing.daysLeft} day{billing.daysLeft === 1 ? '' : 's'} left in trial</p>
              )}
            </div>
          )}
          {roles.length > 0 && (
            <div className="mb-2 px-3">
              <p className="text-[10px] uppercase tracking-widest text-slate-600">Your role</p>
              <p className="mt-0.5 text-xs font-medium text-slate-300">{roles.join(', ')}</p>
              {isOwnScoped && (
                <p className="mt-0.5 text-[10px] text-slate-500">Showing only records you own</p>
              )}
            </div>
          )}
          {can('settings.view') && (
            <Link href="/settings" className="nav-item" onClick={closeMobileSidebar}>
              <Settings className="h-4 w-4 flex-shrink-0" />
              <span>Settings</span>
            </Link>
          )}
        </div>
      </aside>
    </>
  );
}
