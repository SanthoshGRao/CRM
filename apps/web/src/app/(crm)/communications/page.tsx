import type { Metadata } from 'next';
import CommunicationsClient from './CommunicationsClient';

export const metadata: Metadata = { title: 'Communications' };

export default function CommunicationsPage() {
  return <CommunicationsClient />;
}
