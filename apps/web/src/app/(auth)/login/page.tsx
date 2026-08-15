'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import api from '@/lib/api/client';
import { useAuthStore } from '@/stores/auth.store';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setSession = useAuthStore((s) => s.setSession);

  // Where the guard bounced them from, so a reload-induced sign-in returns them
  // to the page they were on. Relative paths only — never an open redirect.
  const nextParam = searchParams.get('next');
  const redirectTo = nextParam?.startsWith('/') && !nextParam.startsWith('//')
    ? nextParam
    : '/dashboard';

  const [form, setForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const { data } = await api.post('/auth/login', form);
      setSession(data.data.accessToken, data.data.session);
      router.replace(redirectTo);
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Invalid email or password.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left: branding panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-slate-900 via-slate-800 to-brand-950 flex-col justify-between p-12">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600">
            <span className="text-lg font-bold text-white">C</span>
          </div>
          <span className="text-lg font-semibold text-white">CRM Platform</span>
        </div>

        <div>
          <blockquote className="text-2xl font-light text-slate-200 leading-relaxed mb-6">
            "Your team. Your pipeline. Your growth — all in one place."
          </blockquote>
          <div className="flex gap-4">
            {['10,000+ Leads Managed', '500+ Companies', '99.9% Uptime'].map((s) => (
              <div key={s} className="rounded-lg border border-slate-700 bg-slate-800/50 px-4 py-3">
                <p className="text-xs text-slate-300">{s}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right: login form */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 bg-white">
        <div className="w-full max-w-sm">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-slate-900">Sign in to your CRM</h1>
            <p className="mt-1.5 text-sm text-slate-500">
              Workspaces are created by your provider. Need access? Ask your account owner.
            </p>
          </div>

          {error && (
            <div className="mb-4 rounded-md bg-red-50 border border-red-200 px-4 py-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="form-group">
              <label htmlFor="email" className="label">Email address</label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                className="input"
                placeholder="you@company.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: (e.target as HTMLInputElement).value })}
              />
            </div>

            <div className="form-group">
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="password" className="label mb-0">Password</label>
                <Link href="/forgot-password" className="text-xs text-brand-600 hover:underline">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  className="input pr-10"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: (e.target as HTMLInputElement).value })}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              id="login-submit-btn"
              disabled={isLoading}
              className="btn-primary w-full justify-center py-2.5"
            >
              {isLoading ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Signing in...</>
              ) : (
                'Sign in'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  // useSearchParams needs a Suspense boundary to keep this page pre-renderable.
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-white">
          <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
