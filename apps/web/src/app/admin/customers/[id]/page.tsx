import CustomerDetailClient from './CustomerDetailClient';

export default async function AdminCustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <CustomerDetailClient tenantId={id} />;
}
