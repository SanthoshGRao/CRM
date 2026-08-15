import type { Metadata } from 'next';
import { Suspense } from 'react';
import NewTaskClient from './NewTaskClient';

export const metadata: Metadata = { title: 'New Task' };

export default function NewTaskPage() {
  return (
    <Suspense fallback={<div className="page-container"><div className="skeleton h-8 w-40" /></div>}>
      <NewTaskClient />
    </Suspense>
  );
}
