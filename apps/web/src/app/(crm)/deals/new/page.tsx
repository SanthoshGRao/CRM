import type { Metadata } from 'next';
import { PageHeader } from '@/components/ui/PageHeader';
import { DealForm } from '../DealForm';

export const metadata: Metadata = { title: 'New Deal' };

export default function NewDealPage() {
  return (
    <div className="page-container">
      <PageHeader
        title="Add deal"
        subtitle="Track a new revenue opportunity."
        backHref="/deals"
        backLabel="Back to deals"
      />
      <div className="max-w-3xl">
        <DealForm />
      </div>
    </div>
  );
}
