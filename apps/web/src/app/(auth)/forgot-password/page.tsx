'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Loader2, MailCheck } from 'lucide-react';
import api from '@/lib/api/client';
import { getErrorMessage } from '@/lib/api/errors';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await api.post('/auth/forgot-password', { email });
      setIsSent(true);
    } catch (err) {
      setError(getErrorMessage(err, 'Could not send the reset link.'));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-1 px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600">
            <span className="text-lg font-bold text-white">C</span>
          </div>
          <span className="text-lg font-semibold text-slate-900">CRM Platform</span>
        </div>

        {isSent ? (
          <div className="card">
            <div className="card-body text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                <MailCheck className="h-6 w-6" />
              </div>
              <h1 className="text-lg font-semibold text-slate-900">Check your inbox</h1>
              <p className="mt-1.5 text-sm text-slate-500">
                If an account exists for <span className="font-medium text-slate-700">{email}</span>, we&apos;ve sent a
                password reset link.
              </p>
              <Link href="/login" className="btn-secondary mt-6 w-full justify-center">
                Back to sign in
              </Link>
            </div>
          </div>
        ) : (
          <>
            <h1 className="text-2xl font-bold text-slate-900">Reset your password</h1>
            <p className="mb-6 mt-1.5 text-sm text-slate-500">
              Enter the email you signed up with and we&apos;ll send you a reset link.
            </p>

            {error && (
              <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3">
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
                  value={email}
                  onChange={(e) => setEmail((e.target as HTMLInputElement).value)}
                />
              </div>

              <button type="submit" id="forgot-submit-btn" disabled={isLoading} className="btn-primary w-full justify-center py-2.5">
                {isLoading ? (<><Loader2 className="h-4 w-4 animate-spin" /> Sending...</>) : 'Send reset link'}
              </button>
            </form>

            <Link href="/login" className="mt-6 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-brand-600">
              <ArrowLeft className="h-3.5 w-3.5" /> Back to sign in
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
