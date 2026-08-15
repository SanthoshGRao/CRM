import type { Metadata } from 'next';
import { PageHeader } from '@/components/ui/PageHeader';
import { ContactForm } from '../ContactForm';

export const metadata: Metadata = { title: 'New Contact' };

export default function NewContactPage() {
  return (
    <div className="page-container">
      <PageHeader
        title="Add contact"
        subtitle="Create a new person record."
        backHref="/contacts"
        backLabel="Back to contacts"
      />
      <div className="max-w-3xl">
        <ContactForm />
      </div>
    </div>
  );
}
