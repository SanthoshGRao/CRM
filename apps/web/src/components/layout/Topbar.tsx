'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Bell, Search, ChevronDown, Settings, LogOut, User as UserIcon } from 'lucide-react';
import api from '@/lib/api/client';
import { useAuthStore } from '@/stores/auth.store';

export function Topbar({ title }: { title?: string }) {
  const router = useRouter();
  const session = useAuthStore((s) => s.session);
  const logout = useAuthStore((s) => s.logout);
  const user = session?.user;

  const [menuOpen, setMenuOpen] = useState(false);
  const [search, setSearch] = useState('');
  const menuRef = useRef<HTMLDivElement>(null);

  // Close the user menu on any outside click.
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const initials = user
    ? `${user.firstName[0] ?? ''}${user.lastName[0] ?? ''}`.toUpperCase()
    : 'U';

  async function handleLogout() {
    try {
      await api.post('/auth/logout');
    } catch {
      // Signing out locally matters even if the server call fails.
    }
    logout();
    router.push('/login');
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = search.trim();
    if (q) router.push(`/leads?search=${encodeURIComponent(q)}`);
  }

  return (
    <header className="topbar">
      {/* Left: page title or search */}
      <div className="flex flex-1 items-center gap-4">
        {title && <h1 className="text-base font-semibold text-slate-800">{title}</h1>}
        <form onSubmit={handleSearch} className="relative">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search leads..."
            className="search-input"
            id="global-search"
            value={search}
            onChange={(e) => setSearch((e.target as HTMLInputElement).value)}
          />
        </form>
      </div>

      {/* Right: notifications + user */}
      <div className="flex items-center gap-3">
        <Link
          href="/communications"
          className="relative rounded-md p-2 text-slate-500 hover:bg-surface-2"
          aria-label="Notifications"
          id="notifications-btn"
        >
          <Bell className="h-4.5 w-4.5" />
          <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-brand-600" />
        </Link>

        <div className="relative" ref={menuRef}>
          <button
            className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-surface-2"
            id="user-menu-btn"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <div className="avatar-sm">{initials}</div>
            <div className="hidden text-left sm:block">
              <p className="text-xs font-medium leading-none text-slate-800">
                {user ? `${user.firstName} ${user.lastName}` : 'User'}
              </p>
              <p className="mt-0.5 text-[10px] leading-none text-slate-500">
                {session?.tenant?.name}
              </p>
            </div>
            <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
          </button>

          {menuOpen && (
            <div
              role="menu"
              className="absolute right-0 z-20 mt-1 w-52 overflow-hidden rounded-md border border-slate-200 bg-white py-1 shadow-lg"
            >
              <div className="border-b px-3 py-2">
                <p className="truncate text-sm font-medium text-slate-800">
                  {user ? `${user.firstName} ${user.lastName}` : 'Signed out'}
                </p>
                <p className="truncate text-xs text-slate-500">{user?.email ?? '—'}</p>
              </div>

              <Link
                href="/settings"
                role="menuitem"
                className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-surface-2"
                onClick={() => setMenuOpen(false)}
              >
                <UserIcon className="h-4 w-4" /> Your account
              </Link>
              <Link
                href="/settings"
                role="menuitem"
                className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-surface-2"
                onClick={() => setMenuOpen(false)}
              >
                <Settings className="h-4 w-4" /> Settings
              </Link>
              <button
                role="menuitem"
                id="logout-btn"
                className="flex w-full items-center gap-2 border-t px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                onClick={handleLogout}
              >
                <LogOut className="h-4 w-4" /> Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
