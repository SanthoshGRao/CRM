import type { Metadata } from 'next';
import { PageHeader } from '@/components/ui/PageHeader';
import { CompanyForm } from '../CompanyForm';

export const metadata: Metadata = { title: 'New Company' };

export default function NewCompanyPage() {
  return (
    <div className="page-container">
      <PageHeader
        title="Add company"
        subtitle="Create a new account record."
        backHref="/companies"
        backLabel="Back to companies"
      />
      <div className="max-w-3xl">
        <CompanyForm />
      </div>
    </div>
  );
}
