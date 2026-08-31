'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { rowNavigate } from '@/lib/utils';

export interface RelatedItem {
  id: string;
  href: string;
  label: string;
  meta?: string;
}

export function RelatedList({
  title,
  items,
  emptyLabel,
  action,
}: {
  title: string;
  items: RelatedItem[];
  emptyLabel: string;
  action?: React.ReactNode;
}) {
  const router = useRouter();

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
        {action ?? <span className="text-xs text-slate-400">{items.length}</span>}
      </div>
      <div className="card-body">
        {items.length === 0 ? (
          <p className="text-sm text-slate-400">{emptyLabel}</p>
        ) : (
          <ul className="flex flex-col divide-y divide-slate-100">
            {items.map((item) => (
              <li
                key={item.id}
                className="flex cursor-pointer items-center justify-between gap-3 py-2"
                onClick={rowNavigate(() => router.push(item.href))}
              >
                <Link href={item.href} className="truncate text-sm font-medium text-slate-800 hover:text-brand-600">
                  {item.label}
                </Link>
                {item.meta && <span className="shrink-0 text-xs text-slate-500">{item.meta}</span>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
