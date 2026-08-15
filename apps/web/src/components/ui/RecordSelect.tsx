'use client';

import { useQuery } from '@tanstack/react-query';
import { companiesApi, contactsApi, usersApi } from '@/lib/api/services';

type Source = 'companies' | 'contacts' | 'users';

interface RecordSelectProps {
  source: Source;
  value: string;
  onChange: (value: string) => void;
  id?: string;
  placeholder?: string;
  disabled?: boolean;
}

const LOADERS: Record<Source, () => Promise<Array<{ id: string; label: string }>>> = {
  companies: async () => {
    const res = await companiesApi.list({ limit: 200 });
    return (res?.data ?? []).map((c: any) => ({ id: c.id, label: c.name }));
  },
  contacts: async () => {
    const res = await contactsApi.list({ limit: 200 });
    return (res?.data ?? []).map((c: any) => ({ id: c.id, label: `${c.firstName} ${c.lastName}` }));
  },
  users: async () => {
    const res = await usersApi.list({ limit: 200 });
    return (res?.data ?? []).map((u: any) => ({ id: u.id, label: `${u.firstName} ${u.lastName}` }));
  },
};

/**
 * Dropdown backed by a CRM collection. Selecting nothing sends an empty string,
 * which callers strip before POSTing (the API rejects empty UUIDs).
 */
export function RecordSelect({ source, value, onChange, id, placeholder, disabled }: RecordSelectProps) {
  const { data: options = [], isLoading } = useQuery({
    queryKey: ['record-select', source],
    queryFn: LOADERS[source],
    staleTime: 60_000,
  });

  return (
    <select
      id={id}
      className="input"
      value={value}
      disabled={disabled || isLoading}
      onChange={(e) => onChange((e.target as HTMLSelectElement).value)}
    >
      <option value="">{isLoading ? 'Loading…' : (placeholder ?? 'None')}</option>
      {options.map((o) => (
        <option key={o.id} value={o.id}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
