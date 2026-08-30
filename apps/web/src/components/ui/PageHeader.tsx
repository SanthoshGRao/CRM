'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  backHref?: string;
  backLabel?: string;
  actions?: React.ReactNode;
}

export function PageHeader({ title, subtitle, backHref, backLabel, actions }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-3">
      {backHref && (
        <Link
          href={backHref}
          className="inline-flex w-fit items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-brand-600"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {backLabel ?? 'Back'}
        </Link>
      )}
      <div className="page-header">
        <div>
          <h1>{title}</h1>
          {subtitle && <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}
