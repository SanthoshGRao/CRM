'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, Save } from 'lucide-react';
import { contactsApi, customFieldsApi } from '@/lib/api/services';
import { getErrorMessage } from '@/lib/api/errors';
import { Field, ErrorBanner } from '@/components/ui/Field';
import { RecordSelect } from '@/components/ui/RecordSelect';
import { CustomFieldInputs, type CustomFieldValues } from '@/components/ui/CustomFieldInputs';

export interface ContactFormValues {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  mobile: string;
  companyId: string;
  ownerId: string;
  tags: string;
}

const EMPTY: ContactFormValues = {
  firstName: '', lastName: '', email: '', phone: '', mobile: '', companyId: '', ownerId: '', tags: '',
};

export function toContactFormValues(contact: any): ContactFormValues {
  return {
    firstName: contact?.firstName ?? '',
    lastName: contact?.lastName ?? '',
    email: contact?.email ?? '',
    phone: contact?.phone ?? '',
    mobile: contact?.mobile ?? '',
    companyId: contact?.companyId ?? '',
    ownerId: contact?.ownerId ?? '',
    tags: Array.isArray(contact?.tags) ? contact.tags.join(', ') : '',
  };
}

function toPayload(values: ContactFormValues) {
  const payload: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(values)) {
    if (value === '' || value == null) continue;
    if (key === 'tags') {
      const tags = String(value).split(',').map((t: string) => t.trim()).filter(Boolean);
      if (tags.length > 0) payload.tags = tags;
      continue;
    }
    payload[key] = value;
  }

  return payload;
}

interface ContactFormProps {
  contactId?: string;
  initialValues?: ContactFormValues;
  initialCustomValues?: Array<{ fieldId: string; value: string | null }>;
  onCancel?: () => void;
  onSaved?: (contact: any) => void;
}

export function ContactForm({
  contactId, initialValues, initialCustomValues, onCancel, onSaved,
}: ContactFormProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [values, setValues] = useState<ContactFormValues>(initialValues ?? EMPTY);
  const [customValues, setCustomValues] = useState<CustomFieldValues>({});
  const [error, setError] = useState<string | null>(null);

  const set = (key: keyof ContactFormValues) => (value: string) =>
    setValues((prev) => ({ ...prev, [key]: value }));

  const save = useMutation({
    mutationFn: async () => {
      const payload = toPayload(values);
      const record = contactId
        ? await contactsApi.update(contactId, payload)
        : await contactsApi.create(payload);

      // Custom values are stored separately, keyed by the record's id.
      if (Object.keys(customValues).length > 0) {
        await customFieldsApi.setValues('contact', record.id, customValues);
      }

      return record;
    },
    onSuccess: (contact: any) => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      queryClient.invalidateQueries({ queryKey: ['contact', contactId] });
      queryClient.invalidateQueries({ queryKey: ['custom-fields'] });
      if (onSaved) onSaved(contact);
      else router.push(`/contacts/${contact.id}`);
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
        <div className="card-header"><h3 className="text-sm font-semibold text-slate-800">Contact details</h3></div>
        <div className="card-body grid gap-4 sm:grid-cols-2">
          <Field label="First name" htmlFor="contact-first" required>
            <input id="contact-first" className="input" required maxLength={50} placeholder="Rahul"
              value={values.firstName} onChange={(e) => set('firstName')((e.target as HTMLInputElement).value)} />
          </Field>

          <Field label="Last name" htmlFor="contact-last" required>
            <input id="contact-last" className="input" required maxLength={50} placeholder="Kumar"
              value={values.lastName} onChange={(e) => set('lastName')((e.target as HTMLInputElement).value)} />
          </Field>

          <Field label="Email" htmlFor="contact-email">
            <input id="contact-email" type="email" className="input" placeholder="rahul@example.com"
              value={values.email} onChange={(e) => set('email')((e.target as HTMLInputElement).value)} />
          </Field>

          <Field label="Phone" htmlFor="contact-phone">
            <input id="contact-phone" className="input" maxLength={20} placeholder="+91 98765 43210"
              value={values.phone} onChange={(e) => set('phone')((e.target as HTMLInputElement).value)} />
          </Field>

          <Field label="Mobile" htmlFor="contact-mobile">
            <input id="contact-mobile" className="input" maxLength={20}
              value={values.mobile} onChange={(e) => set('mobile')((e.target as HTMLInputElement).value)} />
          </Field>

          <Field label="Company" htmlFor="contact-company">
            <RecordSelect id="contact-company" source="companies" value={values.companyId} onChange={set('companyId')} placeholder="No company" />
          </Field>

          <Field label="Owner" htmlFor="contact-owner">
            <RecordSelect id="contact-owner" source="users" value={values.ownerId} onChange={set('ownerId')} placeholder="Unassigned" />
          </Field>

          <Field label="Tags" htmlFor="contact-tags" hint="Comma separated, e.g. vip, newsletter">
            <input id="contact-tags" className="input" placeholder="vip, newsletter"
              value={values.tags} onChange={(e) => set('tags')((e.target as HTMLInputElement).value)} />
          </Field>
        </div>
      </div>

      <CustomFieldInputs
        entityType="contact"
        values={customValues}
        onChange={setCustomValues}
        initialFrom={initialCustomValues}
      />

      <div className="flex items-center gap-2">
        <button type="submit" className="btn-primary" id="save-contact-btn" disabled={save.isPending}>
          {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {contactId ? 'Save changes' : 'Create contact'}
        </button>
        <button type="button" className="btn-secondary" onClick={() => (onCancel ? onCancel() : router.push('/contacts'))}>
          Cancel
        </button>
      </div>
    </form>
  );
}
