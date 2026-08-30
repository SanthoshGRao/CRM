'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { UsersRound, Plus, Trash2, X, ArrowRightLeft, UserPlus } from 'lucide-react';
import { clsx } from 'clsx';
import { teamsApi, usersApi } from '@/lib/api/services';
import { getErrorMessage } from '@/lib/api/errors';
import { getInitials } from '@/lib/utils';
import { usePermissions } from '@/lib/permissions';
import { Field, ErrorBanner } from '@/components/ui/Field';

export function GroupsPanel() {
  const { can } = usePermissions();
  const queryClient = useQueryClient();
  const [isCreating, setIsCreating] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const { data: groups = [], isLoading, isError, error } = useQuery({
    queryKey: ['teams'],
    queryFn: () => teamsApi.list(),
  });

  const { data: usersData } = useQuery({
    queryKey: ['users'],
    queryFn: () => usersApi.list({ limit: 200 }),
  });
  const allUsers: any[] = usersData?.data ?? [];

  const removeGroup = useMutation({
    mutationFn: (id: string) => teamsApi.remove(id),
    onSuccess: () => {
      setActionError(null);
      queryClient.invalidateQueries({ queryKey: ['teams'] });
    },
    onError: (err) => setActionError(getErrorMessage(err)),
  });

  if (isError) {
    return <ErrorBanner message={getErrorMessage(error, 'Could not load groups.')} />;
  }

  const list = groups as any[];

  return (
    <div className="flex max-w-4xl flex-col gap-4">
      <ErrorBanner message={actionError} />
      <div className="card">
        <div className="card-header">
          <div>
            <h3 className="text-sm font-semibold text-slate-800">Groups</h3>
            <p className="mt-0.5 text-xs text-slate-500">
              Organize team members into groups like &quot;Sales Team&quot; — separate from roles, which control access.
            </p>
          </div>
          {can('teams.create') && (
            <button className="btn-primary btn-sm" id="create-group-btn" onClick={() => setIsCreating(true)}>
              <Plus className="h-3.5 w-3.5" /> Create group
            </button>
          )}
        </div>

        {isCreating && (
          <CreateGroupForm
            users={allUsers}
            onClose={() => setIsCreating(false)}
            onCreated={() => {
              setIsCreating(false);
              queryClient.invalidateQueries({ queryKey: ['teams'] });
            }}
          />
        )}

        {isLoading ? (
          <div className="space-y-3 p-4">
            {Array.from({ length: 3 }).map((_, i) => <div key={i} className="skeleton h-14" />)}
          </div>
        ) : list.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-400">
            No groups yet. {can('teams.create') && 'Create one to start organizing your team.'}
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {list.map((group) => (
              <div key={group.id}>
                <button
                  type="button"
                  className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-surface-1"
                  onClick={() => setExpandedId(expandedId === group.id ? null : group.id)}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-50 text-brand-600">
                      <UsersRound className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">{group.name}</p>
                      <p className="text-xs text-slate-500">
                        {group._count?.members ?? 0} member{(group._count?.members ?? 0) === 1 ? '' : 's'}
                        {group.manager ? ` · Managed by ${group.manager.firstName} ${group.manager.lastName}` : ''}
                      </p>
                    </div>
                  </div>
                  {can('teams.delete') && (
                    <span
                      role="button"
                      tabIndex={0}
                      className="rounded p-1 text-slate-400 hover:bg-surface-2 hover:text-red-600"
                      aria-label="Delete group"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm(`Delete "${group.name}"? Members are not removed from the workspace.`)) {
                          removeGroup.mutate(group.id);
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </span>
                  )}
                </button>

                {expandedId === group.id && (
                  <GroupMembers
                    groupId={group.id}
                    allGroups={list}
                    allUsers={allUsers}
                    onError={setActionError}
                  />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function CreateGroupForm({
  users, onClose, onCreated,
}: { users: any[]; onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({ name: '', description: '', managerId: '' });
  const [error, setError] = useState<string | null>(null);

  const set = (key: keyof typeof form) => (value: string) => setForm((p) => ({ ...p, [key]: value }));

  const create = useMutation({
    mutationFn: () =>
      teamsApi.create({
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        managerId: form.managerId || undefined,
      }),
    onSuccess: onCreated,
    onError: (err) => setError(getErrorMessage(err)),
  });

  return (
    <form
      className="border-b bg-surface-1 p-4"
      onSubmit={(e) => { e.preventDefault(); setError(null); create.mutate(); }}
    >
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-medium text-slate-800">Create a group</p>
        <button type="button" className="rounded p-1 text-slate-400 hover:bg-surface-2" onClick={onClose} aria-label="Close">
          <X className="h-4 w-4" />
        </button>
      </div>

      {error && <div className="mb-3"><ErrorBanner message={error} /></div>}

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Group name" htmlFor="group-name" required className="sm:col-span-2">
          <input id="group-name" className="input" required maxLength={100} placeholder="e.g. Sales Team"
            value={form.name} onChange={(e) => set('name')((e.target as HTMLInputElement).value)} />
        </Field>
        <Field label="Description" htmlFor="group-description" className="sm:col-span-2">
          <input id="group-description" className="input" maxLength={500}
            value={form.description} onChange={(e) => set('description')((e.target as HTMLInputElement).value)} />
        </Field>
        <Field label="Manager" htmlFor="group-manager" className="sm:col-span-2" hint="Optional">
          <select id="group-manager" className="input" value={form.managerId}
            onChange={(e) => set('managerId')((e.target as HTMLSelectElement).value)}>
            <option value="">No manager</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>
            ))}
          </select>
        </Field>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <button type="submit" className="btn-primary btn-sm" disabled={create.isPending || !form.name.trim()}>
          <Plus className="h-3.5 w-3.5" /> Create group
        </button>
        <button type="button" className="btn-secondary btn-sm" onClick={onClose}>Cancel</button>
      </div>
    </form>
  );
}

function GroupMembers({
  groupId, allGroups, allUsers, onError,
}: { groupId: string; allGroups: any[]; allUsers: any[]; onError: (msg: string | null) => void }) {
  const { can } = usePermissions();
  const queryClient = useQueryClient();
  const [addingUserId, setAddingUserId] = useState('');
  const [movingUserId, setMovingUserId] = useState<string | null>(null);
  const [moveTargetId, setMoveTargetId] = useState('');

  const { data: group, isLoading } = useQuery({
    queryKey: ['teams', groupId],
    queryFn: () => teamsApi.get(groupId),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['teams'] });
    queryClient.invalidateQueries({ queryKey: ['teams', groupId] });
  };

  const addMember = useMutation({
    mutationFn: (userId: string) => teamsApi.addMember(groupId, userId),
    onSuccess: () => { onError(null); setAddingUserId(''); invalidate(); },
    onError: (err) => onError(getErrorMessage(err)),
  });

  const removeMember = useMutation({
    mutationFn: (userId: string) => teamsApi.removeMember(groupId, userId),
    onSuccess: () => { onError(null); invalidate(); },
    onError: (err) => onError(getErrorMessage(err)),
  });

  const moveMember = useMutation({
    mutationFn: ({ userId, toTeamId }: { userId: string; toTeamId: string }) =>
      teamsApi.moveMember(groupId, userId, toTeamId),
    onSuccess: () => { onError(null); setMovingUserId(null); setMoveTargetId(''); invalidate(); },
    onError: (err) => onError(getErrorMessage(err)),
  });

  if (isLoading) return <div className="px-4 pb-4"><div className="skeleton h-24" /></div>;

  const members: any[] = group?.members ?? [];
  const memberIds = new Set(members.map((m) => m.id));
  const availableUsers = allUsers.filter((u) => !memberIds.has(u.id));
  const otherGroups = allGroups.filter((g) => g.id !== groupId);
  const canManage = can('teams.update');

  return (
    <div className="bg-surface-1 px-4 pb-4">
      {group?.description && <p className="mb-3 text-xs text-slate-500">{group.description}</p>}

      {members.length === 0 ? (
        <p className="py-3 text-sm text-slate-400">No members in this group yet.</p>
      ) : (
        <ul className="divide-y divide-slate-200 rounded-md border border-slate-200 bg-white">
          {members.map((m) => (
            <li key={m.id} className="flex items-center justify-between gap-3 px-3 py-2">
              <div className="flex items-center gap-2.5">
                <div className="avatar-sm text-[10px]">{getInitials(m.firstName, m.lastName)}</div>
                <div>
                  <p className="text-sm font-medium text-slate-900">{m.firstName} {m.lastName}</p>
                  <p className="text-xs text-slate-500">{m.email}</p>
                </div>
              </div>

              {canManage && (
                <div className="flex items-center gap-1">
                  {movingUserId === m.id ? (
                    <>
                      <select
                        className="input !h-8 !py-0 text-xs"
                        value={moveTargetId}
                        onChange={(e) => setMoveTargetId((e.target as HTMLSelectElement).value)}
                      >
                        <option value="">Move to…</option>
                        {otherGroups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                      </select>
                      <button
                        type="button"
                        className="btn-secondary btn-sm"
                        disabled={!moveTargetId || moveMember.isPending}
                        onClick={() => moveMember.mutate({ userId: m.id, toTeamId: moveTargetId })}
                      >
                        Go
                      </button>
                      <button type="button" className="rounded p-1 text-slate-400 hover:bg-surface-2"
                        onClick={() => { setMovingUserId(null); setMoveTargetId(''); }} aria-label="Cancel move">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </>
                  ) : (
                    <>
                      {otherGroups.length > 0 && (
                        <button
                          type="button"
                          className="rounded p-1 text-slate-400 hover:bg-surface-2 hover:text-brand-600"
                          aria-label="Move to another group"
                          title="Move to another group"
                          onClick={() => setMovingUserId(m.id)}
                        >
                          <ArrowRightLeft className="h-3.5 w-3.5" />
                        </button>
                      )}
                      <button
                        type="button"
                        className="rounded p-1 text-slate-400 hover:bg-surface-2 hover:text-red-600"
                        aria-label="Remove from group"
                        title="Remove from group"
                        disabled={removeMember.isPending}
                        onClick={() => removeMember.mutate(m.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {canManage && (
        <div className="mt-3 flex items-center gap-2">
          <select
            className="input !h-8 max-w-xs text-xs"
            value={addingUserId}
            onChange={(e) => setAddingUserId((e.target as HTMLSelectElement).value)}
          >
            <option value="">Select a member to add…</option>
            {availableUsers.map((u) => (
              <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>
            ))}
          </select>
          <button
            type="button"
            className="btn-secondary btn-sm"
            disabled={!addingUserId || addMember.isPending}
            onClick={() => addMember.mutate(addingUserId)}
          >
            <UserPlus className="h-3.5 w-3.5" /> Add
          </button>
        </div>
      )}
    </div>
  );
}
