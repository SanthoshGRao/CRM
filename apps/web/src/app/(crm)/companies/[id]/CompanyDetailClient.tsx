'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Building2, Pencil, Trash2, Loader2, Globe, Mail, Phone, MapPin } from 'lucide-react';
import { companiesApi } from '@/lib/api/services';
import { getErrorMessage } from '@/lib/api/errors';
import { formatCurrency, formatDate, getInitials } from '@/lib/utils';
import { PageHeader } from '@/components/ui/PageHeader';
import { Can } from '@/components/ui/Can';
import { DetailRow, ErrorBanner } from '@/components/ui/Field';
import { ActivityTimeline } from '@/components/detail/ActivityTimeline';
import { RelatedList } from '@/components/detail/RelatedList';
import { CustomFieldSummary } from '@/components/ui/CustomFieldInputs';
import { CompanyForm, toCompanyFormValues } from '../CompanyForm';

export default function CompanyDetailClient({ companyId }: { companyId: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const { data: company, isLoading, isError, error } = useQuery({
    queryKey: ['company', companyId],
    queryFn: () => companiesApi.get(companyId),
  });

  const remove = useMutation({
    mutationFn: () => companiesApi.remove(companyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      router.push('/companies');
    },
    onError: (err) => setDeleteError(getErrorMessage(err)),
  });

  if (isLoading) {
    return (
      <div className="page-container">
        <div className="skeleton h-8 w-56" />
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="skeleton h-64 lg:col-span-1" />
          <div className="skeleton h-64 lg:col-span-2" />
        </div>
      </div>
    );
  }

  if (isError || !company) {
    return (
      <div className="page-container">
        <PageHeader title="Company" backHref="/companies" backLabel="Back to companies" />
        <ErrorBanner message={getErrorMessage(error, 'This company could not be found.')} />
      </div>
    );
  }

  if (isEditing) {
    return (
      <div className="page-container">
        <PageHeader
          title={`Edit ${company.name}`}
          backHref={`/companies/${companyId}`}
          backLabel="Back to company"
        />
        <div className="max-w-3xl">
          <CompanyForm
            companyId={companyId}
            initialValues={toCompanyFormValues(company)}
            initialCustomValues={company.customFieldValues ?? []}
            onCancel={() => setIsEditing(false)}
            onSaved={() => setIsEditing(false)}
          />
        </div>
      </div>
    );
  }

  const contacts = company.contacts ?? [];
  const leads = company.leads ?? [];
  const deals = company.deals ?? [];

  return (
    <div className="page-container">
      <PageHeader
        title={company.name}
        subtitle={company.industry ?? 'No industry set'}
        backHref="/companies"
        backLabel="Back to companies"
        actions={
          <>
            <Can permission="companies.update">
              <button className="btn-secondary btn-sm" id="edit-company-btn" onClick={() => setIsEditing(true)}>
              <Pencil className="h-3.5 w-3.5" /> Edit
            </button>
            </Can>
            <Can permission="companies.delete">
              <button
              className="btn-danger btn-sm"
              id="delete-company-btn"
              disabled={remove.isPending}
              onClick={() => {
                if (window.confirm(`Delete ${company.name}? This cannot be undone.`)) remove.mutate();
              }}
            >
              {remove.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
              Delete
            </button>
            </Can>
          </>
        }
      />

      <ErrorBanner message={deleteError} />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: profile */}
        <div className="flex flex-col gap-6 lg:col-span-1">
          <div className="card">
            <div className="card-body">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                  <Building2 className="h-6 w-6" />
                </div>
                <div>
                  <p className="font-semibold text-slate-900">{company.name}</p>
                  <span className={`badge ${company.status === 'active' ? 'badge-green' : 'badge-gray'}`}>
                    {company.status}
                  </span>
                </div>
              </div>

              <div className="mt-4 divide-y divide-slate-100 border-t pt-2">
                <DetailRow label="Website">
                  {company.website ? (
                    <a href={company.website} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-brand-600 hover:underline">
                      <Globe className="h-3.5 w-3.5" /> {company.website}
                    </a>
                  ) : '—'}
                </DetailRow>
                <DetailRow label="Email">
                  {company.email ? (
                    <a href={`mailto:${company.email}`} className="inline-flex items-center gap-1 text-brand-600 hover:underline">
                      <Mail className="h-3.5 w-3.5" /> {company.email}
                    </a>
                  ) : '—'}
                </DetailRow>
                <DetailRow label="Phone">
                  {company.phone ? (
                    <a href={`tel:${company.phone}`} className="inline-flex items-center gap-1 text-brand-600 hover:underline">
                      <Phone className="h-3.5 w-3.5" /> {company.phone}
                    </a>
                  ) : '—'}
                </DetailRow>
                <DetailRow label="Employees">{company.employees ?? '—'}</DetailRow>
                <DetailRow label="Annual revenue">
                  {company.annualRevenue != null ? formatCurrency(Number(company.annualRevenue)) : '—'}
                </DetailRow>
                <DetailRow label="Owner">
                  {company.owner ? (
                    <span className="inline-flex items-center gap-2">
                      <span className="avatar-sm text-[10px]">{getInitials(company.owner.firstName, company.owner.lastName)}</span>
                      {company.owner.firstName} {company.owner.lastName}
                    </span>
                  ) : 'Unassigned'}
                </DetailRow>
                <DetailRow label="Location">
                  {[company.city, company.state, company.country].filter(Boolean).join(', ') || '—'}
                </DetailRow>
                <DetailRow label="Address">
                  {company.address ? (
                    <span className="inline-flex items-start gap-1"><MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />{company.address}</span>
                  ) : '—'}
                </DetailRow>
                <DetailRow label="Created">{formatDate(company.createdAt)}</DetailRow>
              </div>
            </div>
          </div>

          <CustomFieldSummary values={company.customFieldValues} />

          <RelatedList
            title="Contacts"
            emptyLabel="No contacts linked"
            items={contacts.map((c: any) => ({ id: c.id, href: `/contacts/${c.id}`, label: `${c.firstName} ${c.lastName}`, meta: c.email }))}
          />
          <RelatedList
            title="Leads"
            emptyLabel="No leads linked"
            items={leads.map((l: any) => ({ id: l.id, href: `/leads/${l.id}`, label: l.title, meta: l.status }))}
          />
          <RelatedList
            title="Deals"
            emptyLabel="No deals linked"
            items={deals.map((d: any) => ({
              id: d.id,
              href: `/deals/${d.id}`,
              label: d.name,
              meta: d.value != null ? formatCurrency(Number(d.value)) : d.status,
            }))}
          />
        </div>

        {/* Right: activity */}
        <div className="lg:col-span-2">
          <ActivityTimeline
            activities={company.activities ?? []}
            relatedType="company"
            relatedId={companyId}
            invalidateKey={['company', companyId]}
          />
        </div>
      </div>
    </div>
  );
}
