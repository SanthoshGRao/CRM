import type { Metadata } from 'next';
import AdminShell from './AdminShell';

export const metadata: Metadata = {
  title: { template: '%s | Platform Console', default: 'Platform Console' },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminShell>{children}</AdminShell>;
}
