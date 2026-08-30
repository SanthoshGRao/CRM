'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { KeyRound, Plus, Loader2, Copy, Check, Ban, Trash2, X, Sparkles, Wifi, Calendar } from 'lucide-react';
import { clsx } from 'clsx';
import { apiKeysApi } from '@/lib/api/services';
import { getErrorMessage } from '@/lib/api/errors';
import { formatDate } from '@/lib/utils';
import { Field, ErrorBanner } from '@/components/ui/Field';

const API_BASE = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001'}/api/v1/data`;

const RESOURCES = ['contacts', 'companies', 'leads', 'deals', 'tasks', 'activities', 'custom-fields'];

/** One text block, usable as-is in any AI coding tool or read by a developer directly. */
function buildConnectionPrompt() {
  return `CRM REST API — integration guide

BASE URL
${API_BASE}

AUTH
Header: X-API-Key: <your key>
Manage keys in the CRM under Settings → API keys (a key can be copied again anytime — it isn't a one-time reveal).

STEP 1 — Verify the connection
GET ${API_BASE}
→ { success: true, data: { status: "connected", workspace, apiKey: { name, scopes }, resources, usage, users, customFields, notes } }
Errors: 401 invalid/expired/revoked key · 402 subscription required · 403 workspace inactive.
Report the connection status back before doing anything else.

STEP 2 — Records (needs the "read" scope)
GET    ${API_BASE}/{resource}?page=1&limit=50&search=&updatedSince=2026-01-01
GET    ${API_BASE}/{resource}/{id}
resource: contacts, companies, leads, deals, tasks, activities

STEP 3 — Records (needs the "write" scope)
POST   ${API_BASE}/{resource}            create — JSON body of fields
PATCH  ${API_BASE}/{resource}/{id}       update
DELETE ${API_BASE}/{resource}/{id}       delete

STEP 4 — Team directory (needs the "read:users" scope, separate from "read")
GET ${API_BASE}/users?page=1&limit=50
GET ${API_BASE}/users/{id}
Resolves the user ids referenced by ownerId / assignedToId / performedById below.

STEP 5 — Custom fields (workspace-specific columns on contacts/companies/leads/deals)
GET    ${API_BASE}/custom-fields?entityType=contact
POST   ${API_BASE}/custom-fields                                 { entityType, label, fieldType, options? }
PATCH  ${API_BASE}/custom-fields/{id}
DELETE ${API_BASE}/custom-fields/{id}
GET    ${API_BASE}/custom-fields/values/{entityType}/{recordId}
PUT    ${API_BASE}/custom-fields/values/{entityType}/{recordId}  { values: { "<fieldId>": "<value>" } }

fieldType: text, long_text, number, currency, percentage, date, datetime, boolean, dropdown, multi_select, phone, email, url, file, user
options (dropdown/multi_select): [{ "label": "High priority", "value": "high"? }] — value defaults to a slug of label if omitted
writing dropdown/multi_select values: accepts the option's value or label (case-insensitive); multi_select is one comma-separated string, e.g. "vip,renewal"

RULES
- Every request is scoped to the key's workspace — it can never read or write another workspace's data.
- Pagination: ?page & &limit (max 200). Incremental sync: ?updatedSince / ?createdSince as ISO dates.
- activities require relatedType (contact|company|lead|deal|task) plus exactly one of relatedContactId/relatedCompanyId/relatedLeadId/relatedDealId.
- activities.type for writes: call, email, whatsapp, sms, meeting, note — the rest are system-generated audit entries.
- Omitting performedById/createdById on an activity or task defaults it to whoever issued the key.
- Enums — contacts.status: active|inactive|blocked · companies.status: active|inactive · leads.status: new|working|qualified|unqualified|converted|lost · deals.status: open|won|lost`;
}

const API_SNIPPETS = {
  curl: {
    label: 'cURL',
    steps: [
      { title: 'Set your API key', code: `export CRM_API_KEY="crm_live_xxx"` },
      {
        title: 'Check the connection',
        code: `curl -H "X-API-Key: $CRM_API_KEY" "${API_BASE}"`,
      },
      {
        title: 'Read data',
        code: `curl -H "X-API-Key: $CRM_API_KEY" \\\n  "${API_BASE}/contacts?limit=50"`,
      },
      {
        title: 'Write data',
        code: `curl -X POST -H "X-API-Key: $CRM_API_KEY" -H "Content-Type: application/json" \\\n  -d '{"firstName":"Ada","lastName":"Lovelace","email":"ada@example.com"}' \\\n  "${API_BASE}/contacts"`,
      },
      {
        title: 'Create a custom field',
        code: `curl -X POST -H "X-API-Key: $CRM_API_KEY" -H "Content-Type: application/json" \\\n  -d '{"entityType":"contact","label":"Account tier","fieldType":"dropdown","options":[{"label":"Gold"},{"label":"Silver"}]}' \\\n  "${API_BASE}/custom-fields"`,
      },
    ],
  },
  python: {
    label: 'Python',
    steps: [
      { title: 'Set your API key', code: `export CRM_API_KEY="crm_live_xxx"` },
      { title: 'Install the requests library', code: `pip install requests` },
      {
        title: 'Check the connection',
        code: `import os\nimport requests\n\napi_key = os.environ["CRM_API_KEY"]\nresp = requests.get("${API_BASE}", headers={"X-API-Key": api_key})\ninfo = resp.json()\nif resp.ok:\n    print(f\"Connected to {info['data']['workspace']['name']} — resources: {info['data']['resources']}\")\nelse:\n    print(f\"Connection failed: {info}\")`,
      },
      {
        title: 'Read data',
        code: `resp = requests.get(\n    "${API_BASE}/contacts",\n    headers={"X-API-Key": api_key},\n    params={"limit": 50},\n)\nprint(resp.json())`,
      },
      {
        title: 'Write data',
        code: `created = requests.post(\n    "${API_BASE}/contacts",\n    headers={"X-API-Key": api_key},\n    json={"firstName": "Ada", "lastName": "Lovelace", "email": "ada@example.com"},\n)\nprint(created.json())`,
      },
      {
        title: 'Create a custom field',
        code: `field = requests.post(\n    "${API_BASE}/custom-fields",\n    headers={"X-API-Key": api_key},\n    json={\n        "entityType": "contact",\n        "label": "Account tier",\n        "fieldType": "dropdown",\n        "options": [{"label": "Gold"}, {"label": "Silver"}],\n    },\n)\nprint(field.json())`,
      },
    ],
  },
  javascript: {
    label: 'JavaScript',
    steps: [
      { title: 'Set your API key', code: `export CRM_API_KEY="crm_live_xxx"` },
      {
        title: 'Check the connection',
        code: `const apiKey = process.env.CRM_API_KEY;\n\nconst status = await fetch("${API_BASE}", {\n  headers: { 'X-API-Key': apiKey },\n}).then((r) => r.json());\n\nconsole.log(status.success ? \`Connected to \${status.data.workspace.name}\` : status);`,
      },
      {
        title: 'Read data',
        code: `const res = await fetch("${API_BASE}/contacts?limit=50", {\n  headers: { 'X-API-Key': apiKey },\n});\nconst data = await res.json();\nconsole.log(data);`,
      },
      {
        title: 'Write data',
        code: `const created = await fetch("${API_BASE}/contacts", {\n  method: 'POST',\n  headers: { 'X-API-Key': apiKey, 'Content-Type': 'application/json' },\n  body: JSON.stringify({ firstName: 'Ada', lastName: 'Lovelace', email: 'ada@example.com' }),\n}).then((r) => r.json());\nconsole.log(created);`,
      },
      {
        title: 'Create a custom field',
        code: `const field = await fetch("${API_BASE}/custom-fields", {\n  method: 'POST',\n  headers: { 'X-API-Key': apiKey, 'Content-Type': 'application/json' },\n  body: JSON.stringify({\n    entityType: 'contact',\n    label: 'Account tier',\n    fieldType: 'dropdown',\n    options: [{ label: 'Gold' }, { label: 'Silver' }],\n  }),\n}).then((r) => r.json());\nconsole.log(field);`,
      },
    ],
  },
  php: {
    label: 'PHP',
    steps: [
      { title: 'Set your API key', code: `export CRM_API_KEY="crm_live_xxx"` },
      {
        title: 'Check the connection',
        code: `<?php\n$apiKey = getenv('CRM_API_KEY');\n\n$ch = curl_init("${API_BASE}");\ncurl_setopt($ch, CURLOPT_HTTPHEADER, ["X-API-Key: $apiKey"]);\ncurl_setopt($ch, CURLOPT_RETURNTRANSFER, true);\n$status = json_decode(curl_exec($ch), true);\ncurl_close($ch);\n\necho $status['success'] ? "Connected to {$status['data']['workspace']['name']}\\n" : "Connection failed\\n";`,
      },
      {
        title: 'Read data',
        code: `$ch = curl_init("${API_BASE}/contacts?limit=50");\ncurl_setopt($ch, CURLOPT_HTTPHEADER, ["X-API-Key: $apiKey"]);\ncurl_setopt($ch, CURLOPT_RETURNTRANSFER, true);\necho curl_exec($ch);\ncurl_close($ch);`,
      },
      {
        title: 'Write data',
        code: `$ch = curl_init("${API_BASE}/contacts");\ncurl_setopt($ch, CURLOPT_POST, true);\ncurl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([\n  'firstName' => 'Ada', 'lastName' => 'Lovelace', 'email' => 'ada@example.com',\n]));\ncurl_setopt($ch, CURLOPT_HTTPHEADER, ["X-API-Key: $apiKey", "Content-Type: application/json"]);\ncurl_setopt($ch, CURLOPT_RETURNTRANSFER, true);\necho curl_exec($ch);\ncurl_close($ch);`,
      },
    ],
  },
  ruby: {
    label: 'Ruby',
    steps: [
      { title: 'Set your API key', code: `export CRM_API_KEY="crm_live_xxx"` },
      {
        title: 'Check the connection',
        code: `require 'net/http'\nrequire 'json'\n\nuri = URI("${API_BASE}")\nreq = Net::HTTP::Get.new(uri)\nreq['X-API-Key'] = ENV['CRM_API_KEY']\n\nres = Net::HTTP.start(uri.hostname, uri.port, use_ssl: uri.scheme == 'https') { |http| http.request(req) }\nstatus = JSON.parse(res.body)\nputs status['success'] ? "Connected to #{status['data']['workspace']['name']}" : "Connection failed"`,
      },
      {
        title: 'Read data',
        code: `uri = URI("${API_BASE}/contacts?limit=50")\nreq = Net::HTTP::Get.new(uri)\nreq['X-API-Key'] = ENV['CRM_API_KEY']\nres = Net::HTTP.start(uri.hostname, uri.port, use_ssl: uri.scheme == 'https') { |http| http.request(req) }\nputs res.body`,
      },
      {
        title: 'Write data',
        code: `uri = URI("${API_BASE}/contacts")\nreq = Net::HTTP::Post.new(uri)\nreq['X-API-Key'] = ENV['CRM_API_KEY']\nreq['Content-Type'] = 'application/json'\nreq.body = { firstName: 'Ada', lastName: 'Lovelace', email: 'ada@example.com' }.to_json\nres = Net::HTTP.start(uri.hostname, uri.port, use_ssl: uri.scheme == 'https') { |http| http.request(req) }\nputs res.body`,
      },
    ],
  },
} as const;

async function copyToClipboard(value: string) {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(value);
    return;
  }
  const textarea = document.createElement('textarea');
  textarea.value = value;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  const ok = document.execCommand('copy');
  document.body.removeChild(textarea);
  if (!ok) throw new Error('execCommand copy failed');
}

function CodeBlock({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await copyToClipboard(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard unavailable — silently ignore
    }
  }

  return (
    <div className="group relative">
      <pre className="overflow-x-auto rounded-md bg-slate-900 p-4 pr-10 text-xs leading-relaxed text-slate-100">
        <code>{code}</code>
      </pre>
      <button
        type="button"
        onClick={handleCopy}
        aria-label="Copy code"
        className="absolute right-2 top-2 rounded p-1 text-slate-400 opacity-0 transition-opacity hover:bg-slate-800 hover:text-slate-200 group-hover:opacity-100"
      >
        {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
      </button>
    </div>
  );
}

export function ApiKeysPanel() {
  const queryClient = useQueryClient();
  const [isCreating, setIsCreating] = useState(false);
  const [freshKey, setFreshKey] = useState<{ name: string; key: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [copiedRowId, setCopiedRowId] = useState<string | null>(null);
  const [revealingId, setRevealingId] = useState<string | null>(null);
  const [promptCopied, setPromptCopied] = useState(false);
  const [activeLang, setActiveLang] = useState<keyof typeof API_SNIPPETS>('curl');

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
      await copyToClipboard(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('Could not copy automatically — select the key and copy it manually.');
    }
  }

  // Keys are never shown in full again after creation — instead each copy
  // re-fetches and copies it straight to the clipboard, as many times as needed.
  async function copyExistingKey(id: string) {
    setError(null);
    setRevealingId(id);
    try {
      const revealed: any = await apiKeysApi.reveal(id);
      await copyToClipboard(revealed.key);
      setCopiedRowId(id);
      setTimeout(() => setCopiedRowId((current) => (current === id ? null : current)), 2000);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setRevealingId(null);
    }
  }

  async function copyPrompt() {
    try {
      await copyToClipboard(buildConnectionPrompt());
      setPromptCopied(true);
      setTimeout(() => setPromptCopied(false), 2000);
    } catch {
      setError('Could not copy automatically — try again.');
    }
  }

  return (
    <div className="flex max-w-5xl flex-col gap-6">
      <ErrorBanner message={error} />

      {freshKey && (
        <div className="card border-emerald-200 bg-emerald-50">
          <div className="card-body">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-emerald-900">
                  “{freshKey.name}” created
                </p>
                <p className="mt-0.5 text-xs text-emerald-800">
                  You can copy it again anytime from the list below.
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
                Create a key to connect this workspace to another system.
              </p>
            </div>
          ) : (
            <table className="data-table">
              <thead className="table-header">
                <tr>
                  <th className="!py-3.5">Name</th>
                  <th className="!py-3.5">Key</th>
                  <th className="!py-3.5">Scopes</th>
                  <th className="!py-3.5 whitespace-nowrap">Requests</th>
                  <th className="!py-3.5 whitespace-nowrap">Last used</th>
                  <th className="!py-3.5">Status</th>
                  <th className="!py-3.5 w-20" />
                </tr>
              </thead>
              <tbody>
                {(keys as any[]).map((k) => (
                  <tr key={k.id} className="table-row cursor-default">
                    <td className="!py-4">
                      <p className="font-medium text-slate-900">{k.name}</p>
                      <p className="mt-0.5 text-xs text-slate-500">Created {formatDate(k.createdAt)}</p>
                    </td>
                    <td className="!py-4">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-slate-500">{k.keyPrefix}…</span>
                        <button
                          className="rounded p-1 text-slate-400 hover:bg-surface-2 hover:text-slate-700 disabled:opacity-50"
                          title="Copy full key"
                          aria-label={`Copy key for ${k.name}`}
                          disabled={revealingId === k.id}
                          onClick={() => copyExistingKey(k.id)}
                        >
                          {revealingId === k.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : copiedRowId === k.id ? (
                            <Check className="h-3.5 w-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>
                    </td>
                    <td className="!py-4">
                      <div className="flex flex-wrap gap-1.5">
                        {(k.scopes ?? []).map((s: string) => (
                          <span key={s} className={clsx('badge', s === 'write' ? 'badge-purple' : 'badge-blue')}>{s}</span>
                        ))}
                      </div>
                    </td>
                    <td className="!py-4 whitespace-nowrap text-slate-600">{k.requestCount ?? 0}</td>
                    <td className="!py-4 whitespace-nowrap text-slate-500">{k.lastUsedAt ? formatDate(k.lastUsedAt) : 'Never'}</td>
                    <td className="!py-4">
                      <span className={clsx('badge', k.revokedAt ? 'badge-red' : 'badge-green')}>
                        {k.revokedAt ? 'Revoked' : 'Active'}
                      </span>
                    </td>
                    <td className="!py-4">
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
        <div className="card-header">
          <div>
            <h3 className="text-sm font-semibold text-slate-800">Using your key</h3>
            <p className="mt-0.5 text-xs text-slate-500">How to read and write data, and how to verify the connection.</p>
          </div>
          <button className="btn-secondary btn-sm shrink-0" onClick={copyPrompt}>
            {promptCopied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Sparkles className="h-3.5 w-3.5" />}
            {promptCopied ? 'Copied' : 'Copy setup prompt'}
          </button>
        </div>
        <div className="card-body flex flex-col gap-5 text-sm text-slate-600">
          <div className="flex items-start gap-2 rounded-md border border-slate-200 bg-surface-2 px-3 py-2 text-xs text-slate-600">
            <Wifi className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
            <span>
              Send the key as an <code className="rounded bg-white px-1 py-0.5 font-mono">X-API-Key</code> header.
              {' '}<code className="font-mono">GET {API_BASE}</code> doubles as a connection check.
            </span>
          </div>

          <div className="flex w-fit flex-wrap gap-1 rounded-lg bg-surface-2 p-1">
            {(Object.keys(API_SNIPPETS) as (keyof typeof API_SNIPPETS)[]).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setActiveLang(key)}
                className={clsx(
                  'rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                  activeLang === key
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800',
                )}
              >
                {API_SNIPPETS[key].label}
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-4">
            {API_SNIPPETS[activeLang].steps.map((step, i) => (
              <div key={step.title} className="flex gap-3">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-800 text-xs font-semibold text-white">
                  {i + 1}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="mb-1.5 font-medium text-slate-700">{step.title}</p>
                  <CodeBlock code={step.code} />
                </div>
              </div>
            ))}
          </div>

          <div className="grid gap-3 border-t border-slate-100 pt-4 sm:grid-cols-3">
            <div>
              <p className="mb-1.5 text-xs font-medium text-slate-700">Resources</p>
              <div className="flex flex-wrap gap-1.5">
                {RESOURCES.map((r) => (
                  <span key={r} className="badge badge-gray font-mono">{r}</span>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-1.5 text-xs font-medium text-slate-700">Team directory</p>
              <span className="badge badge-gray font-mono">users</span>
              <p className="mt-1 text-xs text-slate-400">needs read:users</p>
            </div>
            <div>
              <p className="mb-1.5 text-xs font-medium text-slate-700">Custom fields</p>
              <span className="badge badge-gray font-mono">custom-fields</span>
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
  const [canReadUsers, setCanReadUsers] = useState(false);
  const [expiresAt, setExpiresAt] = useState('');
  const [error, setError] = useState<string | null>(null);

  const create = useMutation({
    mutationFn: () => {
      const scopes = [canRead && 'read', canWrite && 'write', canReadUsers && 'read:users'].filter(Boolean) as string[];
      return apiKeysApi.create({ name: name.trim(), scopes, expiresAt: expiresAt || undefined });
    },
    onSuccess: (data: any) => onCreated({ name: data.name, key: data.key }),
    onError: (err) => setError(getErrorMessage(err)),
  });

  return (
    <form
      className="border-b bg-surface-1 p-5"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        if (!canRead && !canWrite && !canReadUsers) { setError('Pick at least one scope.'); return; }
        create.mutate();
      }}
    >
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-800">New API key</p>
        <button type="button" className="rounded p-1 text-slate-400 hover:bg-surface-2" onClick={onClose} aria-label="Close">
          <X className="h-4 w-4" />
        </button>
      </div>

      {error && <div className="mb-3"><ErrorBanner message={error} /></div>}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name" htmlFor="api-key-name" required>
          <input id="api-key-name" className="input" required maxLength={100} placeholder="Data warehouse sync"
            value={name} onChange={(e) => setName((e.target as HTMLInputElement).value)} />
        </Field>

        <Field label="Expires" htmlFor="api-key-expiry" hint="Leave blank for no expiry">
          <div className="relative">
            <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input id="api-key-expiry" type="date" className="input date-input-clean pl-9"
              value={expiresAt} onChange={(e) => setExpiresAt((e.target as HTMLInputElement).value)} />
          </div>
        </Field>

        <Field label="Scopes" htmlFor="api-key-scopes" className="sm:col-span-2">
          <div className="grid gap-2 pt-1 sm:grid-cols-3">
            <ScopeOption
              label="Read" description="Fetch records"
              checked={canRead} onChange={setCanRead}
            />
            <ScopeOption
              label="Write" description="Create, update, delete"
              checked={canWrite} onChange={setCanWrite}
            />
            <ScopeOption
              label="Team members" description="Resolve owner / assignee ids"
              checked={canReadUsers} onChange={setCanReadUsers}
            />
          </div>
        </Field>
      </div>

      <div className="mt-4 flex items-center gap-2">
        <button type="submit" className="btn-primary btn-sm" disabled={create.isPending || !name.trim()}>
          {create.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <KeyRound className="h-3.5 w-3.5" />}
          Create key
        </button>
        <button type="button" className="btn-secondary btn-sm" onClick={onClose}>Cancel</button>
      </div>
    </form>
  );
}

function ScopeOption({
  label, description, checked, onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label
      className={clsx(
        'flex cursor-pointer items-start gap-2 rounded-md border px-3 py-2 transition-colors',
        checked ? 'border-brand-300 bg-brand-50' : 'border-slate-200 bg-white hover:border-slate-300',
      )}
    >
      <input
        type="checkbox"
        className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
        checked={checked}
        onChange={(e) => onChange((e.target as HTMLInputElement).checked)}
      />
      <span className="min-w-0">
        <span className="block text-sm font-medium text-slate-800">{label}</span>
        <span className="block text-xs text-slate-500">{description}</span>
      </span>
    </label>
  );
}
