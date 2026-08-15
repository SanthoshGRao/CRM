import type { Metadata } from 'next';
import { PageHeader } from '@/components/ui/PageHeader';
import { LeadForm } from '../LeadForm';

export const metadata: Metadata = { title: 'New Lead' };

export default function NewLeadPage() {
  return (
    <div className="page-container">
      <PageHeader
        title="Add lead"
        subtitle="Capture a new opportunity in your pipeline."
        backHref="/leads"
        backLabel="Back to leads"
      />
      <div className="max-w-3xl">
        <LeadForm />
      </div>
    </div>
  );
}
