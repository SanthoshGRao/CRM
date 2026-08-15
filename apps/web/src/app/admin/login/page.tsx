'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Loader2, ShieldCheck } from 'lucide-react';
import { adminAuthApi } from '@/lib/api/admin-client';
import { getErrorMessage } from '@/lib/api/errors';
import { useAdminStore } from '@/stores/admin.store';

export default function AdminLoginPage() {
  const router = useRouter();
  const setSession = useAdminStore((s) => s.setSession);

  const [form, setForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const data = await adminAuthApi.login(form.email, form.password);
      setSession(data.accessToken, data.admin);
      router.push('/admin');
    } catch (err) {
      setError(getErrorMessage(err, 'Invalid email or password.'));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-900 px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-600">
            <ShieldCheck className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-xl font-bold text-white">Platform Console</h1>
          <p className="mt-1 text-sm text-slate-400">Staff access only</p>
        </div>

        <div className="rounded-lg border border-slate-700 bg-slate-800 p-6">
          {error && (
            <div className="mb-4 rounded-md border border-red-900 bg-red-950 px-4 py-3">
              <p className="text-sm text-red-300">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="admin-email" className="mb-1 block text-xs font-medium text-slate-300">
                Email
              </label>
              <input
                id="admin-email"
                type="email"
                autoComplete="email"
                required
                className="block w-full rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                placeholder="admin@yourcompany.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: (e.target as HTMLInputElement).value })}
              />
            </div>

            <div>
              <label htmlFor="admin-password" className="mb-1 block text-xs font-medium text-slate-300">
                Password
              </label>
              <div className="relative">
                <input
                  id="admin-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  className="block w-full rounded-md border border-slate-600 bg-slate-900 px-3 py-2 pr-10 text-sm text-white placeholder-slate-500 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: (e.target as HTMLInputElement).value })}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              id="admin-login-btn"
              disabled={isLoading}
              className="btn-primary w-full justify-center py-2.5"
            >
              {isLoading ? (<><Loader2 className="h-4 w-4 animate-spin" /> Signing in...</>) : 'Sign in'}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-slate-500">
          Customer sign-in is at <a href="/login" className="text-brand-400 hover:underline">/login</a>
        </p>
      </div>
    </div>
  );
}
