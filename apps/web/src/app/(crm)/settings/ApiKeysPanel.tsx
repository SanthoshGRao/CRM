'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { KeyRound, Plus, Loader2, Copy, Check, Ban, Trash2, X } from 'lucide-react';
import { clsx } from 'clsx';
import { apiKeysApi } from '@/lib/api/services';
import { getErrorMessage } from '@/lib/api/errors';
import { formatDate } from '@/lib/utils';
import { Field, ErrorBanner } from '@/components/ui/Field';

const API_BASE = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/v1/data`;

export function ApiKeysPanel() {
  const queryClient = useQueryClient();
  const [isCreating, setIsCreating] = useState(false);
  const [freshKey, setFreshKey] = useState<{ name: string; key: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const { data: keys = [], isLoading } = useQuery({
    queryKey: ['api-keys'],
    queryFn: () => apiKeysApi.list(),
  });

  const revoke = useMutation({
    mutationFn: (id: string) => apiKeysApi.revoke(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['api-keys'] }),
    onError: (err) => setError(getErrorMessage(err)),
  });

  const remove = useMutation({
    mutationFn: (id: string) => apiKeysApi.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['api-keys'] }),
    onError: (err) => setError(getErrorMessage(err)),
  });

  async function copyKey(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('Could not copy automatically — select the key and copy it manually.');
    }
  }

  return (
    <div className="flex max-w-4xl flex-col gap-6">
      <ErrorBanner message={error} />

      {freshKey && (
        <div className="card border-emerald-200 bg-emerald-50">
          <div className="card-body">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-emerald-900">
                  Key created — copy it now
                </p>
                <p className="mt-0.5 text-xs text-emerald-800">
                  “{freshKey.name}” will never be shown again. Store it somewhere safe.
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <code className="min-w-0 flex-1 overflow-x-auto rounded border border-emerald-300 bg-white px-3 py-2 font-mono text-xs text-slate-800">
                    {freshKey.key}
                  </code>
                  <button className="btn-secondary btn-sm shrink-0" onClick={() => copyKey(freshKey.key)}>
                    {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                </div>
              </div>
              <button
                className="rounded p-1 text-emerald-700 hover:bg-emerald-100"
                onClick={() => setFreshKey(null)}
                aria-label="Dismiss"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <div>
            <h3 className="text-sm font-semibold text-slate-800">API keys</h3>
            <p className="mt-0.5 text-xs text-slate-500">
              Programmatic access to this workspace only.
            </p>
          </div>
          <button className="btn-primary btn-sm" id="create-api-key-btn" onClick={() => setIsCreating(true)}>
            <Plus className="h-3.5 w-3.5" /> New key
          </button>
        </div>

        {isCreating && (
          <CreateKeyForm
            onClose={() => setIsCreating(false)}
            onCreated={(created) => {
              setIsCreating(false);
              setFreshKey({ name: created.name, key: created.key });
              queryClient.invalidateQueries({ queryKey: ['api-keys'] });
            }}
          />
        )}

        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="space-y-3 p-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <div className="skeleton h-4 max-w-[180px] flex-1" />
                  <div className="skeleton h-4 w-32" />
                  <div className="skeleton h-5 w-16 rounded-full" />
                </div>
              ))}
            </div>
          ) : (keys as any[]).length === 0 ? (
            <div className="flex flex-col items-center py-12 text-center">
              <div className="mb-3 rounded-full bg-surface-2 p-4 text-slate-400"><KeyRound className="h-6 w-6" /></div>
              <p className="text-sm font-semibold text-slate-900">No API keys yet</p>
              <p className="mt-1 max-w-sm text-sm text-slate-500">
                Create a key to pull your CRM data into another system, or push records in.
              </p>
            </div>
          ) : (
            <table className="data-table">
              <thead className="table-header">
                <tr><th>Name</th><th>Key</th><th>Scopes</th><th>Requests</th><th>Last used</th><th>Status</th><th className="w-20" /></tr>
              </thead>
              <tbody>
                {(keys as any[]).map((k) => (
                  <tr key={k.id} className="table-row cursor-default">
                    <td>
                      <p className="font-medium text-slate-900">{k.name}</p>
                      <p className="text-xs text-slate-500">Created {formatDate(k.createdAt)}</p>
                    </td>
                    <td className="font-mono text-xs text-slate-500">{k.keyPrefix}…</td>
                    <td>
                      {(k.scopes ?? []).map((s: string) => (
                        <span key={s} className={clsx('badge mr-1', s === 'write' ? 'badge-purple' : 'badge-blue')}>{s}</span>
                      ))}
                    </td>
                    <td className="text-slate-600">{k.requestCount ?? 0}</td>
                    <td className="text-slate-500">{k.lastUsedAt ? formatDate(k.lastUsedAt) : 'Never'}</td>
                    <td>
                      <span className={clsx('badge', k.revokedAt ? 'badge-red' : 'badge-green')}>
                        {k.revokedAt ? 'Revoked' : 'Active'}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center gap-1">
                        {!k.revokedAt && (
                          <button
                            className="rounded p-1 text-slate-400 hover:bg-surface-2 hover:text-amber-600"
                            title="Revoke"
                            aria-label="Revoke key"
                            onClick={() => { if (window.confirm(`Revoke "${k.name}"? Any integration using it stops working.`)) revoke.mutate(k.id); }}
                          >
                            <Ban className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          className="rounded p-1 text-slate-400 hover:bg-surface-2 hover:text-red-600"
                          title="Delete"
                          aria-label="Delete key"
                          onClick={() => { if (window.confirm(`Delete "${k.name}"?`)) remove.mutate(k.id); }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-header"><h3 className="text-sm font-semibold text-slate-800">Using your key</h3></div>
        <div className="card-body flex flex-col gap-4 text-sm text-slate-600">
          <p>
            Send the key as an <code className="rounded bg-surface-2 px-1 py-0.5 font-mono text-xs">X-API-Key</code> header.
            Every request is limited to your workspace.
          </p>
          <pre className="overflow-x-auto rounded-md bg-slate-900 p-4 text-xs leading-relaxed text-slate-100">
{`# List contacts
curl -H "X-API-Key: crm_live_xxx" \\
  "${API_BASE}/contacts?limit=50"

# Only what changed since a timestamp (incremental sync)
curl -H "X-API-Key: crm_live_xxx" \\
  "${API_BASE}/leads?updatedSince=2026-01-01"

# Create a record (needs the write scope)
curl -X POST -H "X-API-Key: crm_live_xxx" \\
  -H "Content-Type: application/json" \\
  -d '{"name":"Acme Corp","industry":"Software"}' \\
  "${API_BASE}/companies"`}
          </pre>
          <div>
            <p className="mb-1 font-medium text-slate-700">Available resources</p>
            <div className="flex flex-wrap gap-1.5">
              {['contacts', 'companies', 'leads', 'deals', 'tasks', 'activities'].map((r) => (
                <span key={r} className="badge badge-gray font-mono">{r}</span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CreateKeyForm({
  onClose, onCreated,
}: {
  onClose: () => void;
  onCreated: (created: { name: string; key: string }) => void;
}) {
  const [name, setName] = useState('');
  const [canRead, setCanRead] = useState(true);
  const [canWrite, setCanWrite] = useState(false);
  const [expiresAt, setExpiresAt] = useState('');
  const [error, setError] = useState<string | null>(null);

  const create = useMutation({
    mutationFn: () => {
      const scopes = [canRead && 'read', canWrite && 'write'].filter(Boolean) as string[];
      return apiKeysApi.create({ name: name.trim(), scopes, expiresAt: expiresAt || undefined });
    },
    onSuccess: (data: any) => onCreated({ name: data.name, key: data.key }),
    onError: (err) => setError(getErrorMessage(err)),
  });

  return (
    <form
      className="border-b bg-surface-1 p-4"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        if (!canRead && !canWrite) { setError('Pick at least one scope.'); return; }
        create.mutate();
      }}
    >
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-medium text-slate-800">New API key</p>
        <button type="button" className="rounded p-1 text-slate-400 hover:bg-surface-2" onClick={onClose} aria-label="Close">
          <X className="h-4 w-4" />
        </button>
      </div>

      {error && <div className="mb-3"><ErrorBanner message={error} /></div>}

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Name" htmlFor="api-key-name" required hint="What will use this key?">
          <input id="api-key-name" className="input" required maxLength={100} placeholder="Data warehouse sync"
            value={name} onChange={(e) => setName((e.target as HTMLInputElement).value)} />
        </Field>

        <Field label="Expires" htmlFor="api-key-expiry" hint="Leave blank for no expiry">
          <input id="api-key-expiry" type="date" className="input"
            value={expiresAt} onChange={(e) => setExpiresAt((e.target as HTMLInputElement).value)} />
        </Field>

        <Field label="Scopes" htmlFor="api-key-scopes" className="sm:col-span-2">
          <div className="flex flex-wrap gap-4 pt-1">
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" className="h-4 w-4 rounded border-slate-300"
                checked={canRead} onChange={(e) => setCanRead((e.target as HTMLInputElement).checked)} />
              Read — fetch records
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" className="h-4 w-4 rounded border-slate-300"
                checked={canWrite} onChange={(e) => setCanWrite((e.target as HTMLInputElement).checked)} />
              Write — create, update and delete records
            </label>
          </div>
        </Field>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <button type="submit" className="btn-primary btn-sm" disabled={create.isPending || !name.trim()}>
          {create.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <KeyRound className="h-3.5 w-3.5" />}
          Create key
        </button>
        <button type="button" className="btn-secondary btn-sm" onClick={onClose}>Cancel</button>
      </div>
    </form>
  );
}
