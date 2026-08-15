'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Users, Building2, TrendingUp, Handshake,
  CheckSquare, Calendar, MessageSquare, BarChart3, Zap, Settings,
} from 'lucide-react';
import { clsx } from 'clsx';
import { usePermissions } from '@/lib/permissions';

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

export function Sidebar() {
  const pathname = usePathname();
  const { can, roles, isOwnScoped } = usePermissions();

  const sections = NAV_SECTIONS
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => !item.permission || can(item.permission)),
    }))
    .filter((section) => section.items.length > 0);

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600">
          <span className="text-sm font-bold text-white">C</span>
        </div>
        <span className="text-sm font-semibold text-white">CRM Platform</span>
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
                >
                  <item.icon className="h-4 w-4 flex-shrink-0" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Bottom: role badge + settings */}
      <div className="border-t border-slate-700 p-3">
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
          <Link href="/settings" className="nav-item">
            <Settings className="h-4 w-4 flex-shrink-0" />
            <span>Settings</span>
          </Link>
        )}
      </div>
    </aside>
  );
}
