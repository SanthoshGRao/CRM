import type { Metadata } from 'next';
import CompanyDetailClient from './CompanyDetailClient';

export const metadata: Metadata = { title: 'Company' };

export default async function CompanyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <CompanyDetailClient companyId={id} />;
}
