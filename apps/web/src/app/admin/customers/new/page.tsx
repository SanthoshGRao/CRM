'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Building2 } from 'lucide-react';
import { adminTenantsApi, adminPlansApi } from '@/lib/api/admin-client';
import { getErrorMessage } from '@/lib/api/errors';
import { PageHeader } from '@/components/ui/PageHeader';
import { Field, ErrorBanner } from '@/components/ui/Field';

export default function NewCustomerPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const { data: plans } = useQuery({
    queryKey: ['admin', 'plans'],
    queryFn: adminPlansApi.list,
  });

  const [form, setForm] = useState({
    name: '',
    planId: '',
    status: 'active',
    ownerFirstName: '',
    ownerLastName: '',
    ownerEmail: '',
    ownerPassword: '',
  });

  const set = (key: keyof typeof form) => (value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const create = useMutation({
    mutationFn: () =>
      adminTenantsApi.create({
        name: form.name.trim(),
        planId: form.planId || undefined,
        status: form.status,
        ownerFirstName: form.ownerFirstName.trim(),
        ownerLastName: form.ownerLastName.trim(),
        ownerEmail: form.ownerEmail.trim(),
        ownerPassword: form.ownerPassword,
      }),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['admin'] });
      router.push(`/admin/customers/${data.tenant.id}`);
    },
    onError: (err) => setError(getErrorMessage(err)),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (form.ownerPassword.length < 8) {
      setError('The owner password must be at least 8 characters.');
      return;
    }
    create.mutate();
  }

  return (
    <div className="page-container">
      <PageHeader
        title="New customer company"
        subtitle="Creates the workspace, its Owner user, roles and default pipelines."
        backHref="/admin/customers"
        backLabel="Back to customers"
      />

      <form onSubmit={handleSubmit} className="flex max-w-3xl flex-col gap-6">
        <ErrorBanner message={error} />

        <div className="card">
          <div className="card-header"><h3 className="text-sm font-semibold text-slate-800">Company</h3></div>
          <div className="card-body grid gap-4 sm:grid-cols-2">
            <Field label="Company name" htmlFor="tenant-name" required className="sm:col-span-2">
              <input id="tenant-name" className="input" required maxLength={100}
                value={form.name} onChange={(e) => set('name')((e.target as HTMLInputElement).value)} />
            </Field>

            <Field label="Plan" htmlFor="tenant-plan" hint="Starts the workspace on a trial subscription for this plan.">
              <select id="tenant-plan" className="input" value={form.planId}
                onChange={(e) => set('planId')((e.target as HTMLSelectElement).value)}>
                <option value="">No plan</option>
                {(plans ?? []).map((plan: any) => (
                  <option key={plan.id} value={plan.id}>{plan.name}</option>
                ))}
              </select>
            </Field>

            <Field label="Status" htmlFor="tenant-status">
              <select id="tenant-status" className="input" value={form.status}
                onChange={(e) => set('status')((e.target as HTMLSelectElement).value)}>
                <option value="active">Active</option>
                <option value="pending">Pending</option>
                <option value="suspended">Suspended</option>
              </select>
            </Field>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="text-sm font-semibold text-slate-800">Owner account</h3>
            <span className="text-xs text-slate-400">Signs in at /login</span>
          </div>
          <div className="card-body grid gap-4 sm:grid-cols-2">
            <Field label="First name" htmlFor="owner-first" required>
              <input id="owner-first" className="input" required maxLength={50}
                value={form.ownerFirstName} onChange={(e) => set('ownerFirstName')((e.target as HTMLInputElement).value)} />
            </Field>

            <Field label="Last name" htmlFor="owner-last" required>
              <input id="owner-last" className="input" required maxLength={50}
                value={form.ownerLastName} onChange={(e) => set('ownerLastName')((e.target as HTMLInputElement).value)} />
            </Field>

            <Field label="Email" htmlFor="owner-email" required>
              <input id="owner-email" type="email" className="input" required
                value={form.ownerEmail} onChange={(e) => set('ownerEmail')((e.target as HTMLInputElement).value)} />
            </Field>

            <Field label="Temporary password" htmlFor="owner-password" required hint="Minimum 8 characters — share it securely">
              <input id="owner-password" type="text" className="input" required minLength={8}
                value={form.ownerPassword} onChange={(e) => set('ownerPassword')((e.target as HTMLInputElement).value)} />
            </Field>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button type="submit" className="btn-primary" id="create-customer-btn" disabled={create.isPending}>
            {create.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Building2 className="h-4 w-4" />}
            Create customer company
          </button>
          <button type="button" className="btn-secondary" onClick={() => router.push('/admin/customers')}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
