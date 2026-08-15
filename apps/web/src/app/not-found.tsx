import Link from 'next/link';
import { Compass, LayoutDashboard } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-surface-1 px-6 text-center">
      <div className="mb-6 rounded-full bg-surface-2 p-6 text-slate-400">
        <Compass className="h-10 w-10" />
      </div>
      <p className="text-sm font-semibold uppercase tracking-widest text-brand-600">404</p>
      <h1 className="mt-2 text-2xl font-bold text-slate-900">Page not found</h1>
      <p className="mt-2 max-w-md text-sm text-slate-500">
        That page doesn&apos;t exist or may have moved. Check the address, or head back to your dashboard.
      </p>
      <div className="mt-8 flex items-center gap-3">
        <Link href="/dashboard" className="btn-primary">
          <LayoutDashboard className="h-4 w-4" /> Go to dashboard
        </Link>
        <Link href="/leads" className="btn-secondary">Browse leads</Link>
      </div>
    </div>
  );
}
