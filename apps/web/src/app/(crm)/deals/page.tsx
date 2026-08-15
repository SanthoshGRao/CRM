import type { Metadata } from 'next';
import DealsClient from './DealsClient';
export const metadata: Metadata = { title: 'Deals' };
export default function DealsPage() { return <DealsClient />; }
