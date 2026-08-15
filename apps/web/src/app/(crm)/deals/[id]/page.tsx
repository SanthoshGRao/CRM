import type { Metadata } from 'next';
import DealDetailClient from './DealDetailClient';

export const metadata: Metadata = { title: 'Deal' };

export default async function DealDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <DealDetailClient dealId={id} />;
}
