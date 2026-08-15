'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, Save } from 'lucide-react';
import { companiesApi, customFieldsApi } from '@/lib/api/services';
import { getErrorMessage } from '@/lib/api/errors';
import { Field, ErrorBanner } from '@/components/ui/Field';
import { RecordSelect } from '@/components/ui/RecordSelect';
import { CustomFieldInputs, type CustomFieldValues } from '@/components/ui/CustomFieldInputs';

export interface CompanyFormValues {
  name: string;
  industry: string;
  website: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
  employees: string;
  annualRevenue: string;
  ownerId: string;
}

const EMPTY: CompanyFormValues = {
  name: '', industry: '', website: '', phone: '', email: '', address: '',
  city: '', state: '', country: '', postalCode: '', employees: '', annualRevenue: '', ownerId: '',
};

export function toCompanyFormValues(company: any): CompanyFormValues {
  return {
    name: company?.name ?? '',
    industry: company?.industry ?? '',
    website: company?.website ?? '',
    phone: company?.phone ?? '',
    email: company?.email ?? '',
    address: company?.address ?? '',
    city: company?.city ?? '',
    state: company?.state ?? '',
    country: company?.country ?? '',
    postalCode: company?.postalCode ?? '',
    employees: company?.employees != null ? String(company.employees) : '',
    annualRevenue: company?.annualRevenue != null ? String(company.annualRevenue) : '',
    ownerId: company?.ownerId ?? '',
  };
}

/** Strips blanks and coerces numbers — the API rejects empty strings for optional fields. */
function toPayload(values: CompanyFormValues) {
  const payload: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(values)) {
    if (value === '' || value == null) continue;
    if (key === 'employees' || key === 'annualRevenue') {
      const num = Number(value);
      if (!Number.isNaN(num)) payload[key] = num;
      continue;
    }
    payload[key] = value;
  }

  return payload;
}

interface CompanyFormProps {
  companyId?: string;
  initialValues?: CompanyFormValues;
  initialCustomValues?: Array<{ fieldId: string; value: string | null }>;
  onCancel?: () => void;
  onSaved?: (company: any) => void;
}

export function CompanyForm({
  companyId, initialValues, initialCustomValues, onCancel, onSaved,
}: CompanyFormProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [values, setValues] = useState<CompanyFormValues>(initialValues ?? EMPTY);
  const [customValues, setCustomValues] = useState<CustomFieldValues>({});
  const [error, setError] = useState<string | null>(null);

  const set = (key: keyof CompanyFormValues) => (value: string) =>
    setValues((prev) => ({ ...prev, [key]: value }));

  const save = useMutation({
    mutationFn: async () => {
      const payload = toPayload(values);
      const company = companyId
        ? await companiesApi.update(companyId, payload)
        : await companiesApi.create(payload);

      // Custom values are stored separately, keyed by the new record's id.
      if (Object.keys(customValues).length > 0) {
        await customFieldsApi.setValues('company', company.id, customValues);
      }

      return company;
    },
    onSuccess: (company: any) => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      queryClient.invalidateQueries({ queryKey: ['company', companyId] });
      queryClient.invalidateQueries({ queryKey: ['custom-fields'] });
      if (onSaved) onSaved(company);
      else router.push(`/companies/${company.id}`);
    },
    onError: (err) => setError(getErrorMessage(err)),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    save.mutate();
  }

  return (
    <form onSubmit={handleSubmit} autoComplete="off" className="flex flex-col gap-6">
      <ErrorBanner message={error} />

      <div className="card">
        <div className="card-header"><h3 className="text-sm font-semibold text-slate-800">Company details</h3></div>
        <div className="card-body grid gap-4 sm:grid-cols-2">
          <Field label="Company name" htmlFor="company-name" required className="sm:col-span-2">
            <input id="company-name" className="input" required maxLength={100} placeholder="Acme Corp"
              value={values.name} onChange={(e) => set('name')((e.target as HTMLInputElement).value)} />
          </Field>

          <Field label="Industry" htmlFor="company-industry">
            <input id="company-industry" className="input" maxLength={100} placeholder="Software"
              value={values.industry} onChange={(e) => set('industry')((e.target as HTMLInputElement).value)} />
          </Field>

          <Field label="Website" htmlFor="company-website">
            <input id="company-website" className="input" maxLength={255} placeholder="https://acme.com"
              value={values.website} onChange={(e) => set('website')((e.target as HTMLInputElement).value)} />
          </Field>

          <Field label="Email" htmlFor="company-email">
            <input id="company-email" type="email" className="input" placeholder="hello@acme.com"
              value={values.email} onChange={(e) => set('email')((e.target as HTMLInputElement).value)} />
          </Field>

          <Field label="Phone" htmlFor="company-phone">
            <input id="company-phone" className="input" maxLength={20} placeholder="+91 98765 43210"
              value={values.phone} onChange={(e) => set('phone')((e.target as HTMLInputElement).value)} />
          </Field>

          <Field label="Employees" htmlFor="company-employees">
            <input id="company-employees" type="number" min={0} className="input" placeholder="50"
              value={values.employees} onChange={(e) => set('employees')((e.target as HTMLInputElement).value)} />
          </Field>

          <Field label="Annual revenue (₹)" htmlFor="company-revenue">
            <input id="company-revenue" type="number" min={0} className="input" placeholder="10000000"
              value={values.annualRevenue} onChange={(e) => set('annualRevenue')((e.target as HTMLInputElement).value)} />
          </Field>

          <Field label="Owner" htmlFor="company-owner" className="sm:col-span-2">
            <RecordSelect id="company-owner" source="users" value={values.ownerId} onChange={set('ownerId')} placeholder="Unassigned" />
          </Field>
        </div>
      </div>

      <div className="card">
        <div className="card-header"><h3 className="text-sm font-semibold text-slate-800">Address</h3></div>
        <div className="card-body grid gap-4 sm:grid-cols-2">
          <Field label="Street address" htmlFor="company-address" className="sm:col-span-2">
            <input id="company-address" className="input" placeholder="12 MG Road"
              value={values.address} onChange={(e) => set('address')((e.target as HTMLInputElement).value)} />
          </Field>

          <Field label="City" htmlFor="company-city">
            <input id="company-city" className="input" maxLength={100}
              value={values.city} onChange={(e) => set('city')((e.target as HTMLInputElement).value)} />
          </Field>

          <Field label="State" htmlFor="company-state">
            <input id="company-state" className="input" maxLength={100}
              value={values.state} onChange={(e) => set('state')((e.target as HTMLInputElement).value)} />
          </Field>

          <Field label="Country" htmlFor="company-country">
            <input id="company-country" className="input" maxLength={100}
              value={values.country} onChange={(e) => set('country')((e.target as HTMLInputElement).value)} />
          </Field>

          <Field label="Postal code" htmlFor="company-postal">
            <input id="company-postal" className="input" maxLength={20}
              value={values.postalCode} onChange={(e) => set('postalCode')((e.target as HTMLInputElement).value)} />
          </Field>
        </div>
      </div>

      <CustomFieldInputs
        entityType="company"
        values={customValues}
        onChange={setCustomValues}
        initialFrom={initialCustomValues}
      />

      <div className="flex items-center gap-2">
        <button type="submit" className="btn-primary" id="save-company-btn" disabled={save.isPending}>
          {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {companyId ? 'Save changes' : 'Create company'}
        </button>
        <button
          type="button"
          className="btn-secondary"
          onClick={() => (onCancel ? onCancel() : router.push('/companies'))}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
