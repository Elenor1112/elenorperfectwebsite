'use client';

import { useState, useTransition } from 'react';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import {
  deleteUser,
  saveUser,
  signOutUserEverywhere,
  type AdminUser,
} from '@/server/actions/users';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { Badge, Button, Card, Field, Input, Select, Switch } from '@/components/admin/ui';

export function UsersManager({
  users: initial,
  currentUserId,
}: {
  users: AdminUser[];
  currentUserId: string;
}) {
  const [users, setUsers] = useState(initial);
  const [editing, setEditing] = useState<AdminUser | 'new' | null>(null);
  const [, startTransition] = useTransition();

  return (
    <div>
      <Button className="mb-5" onClick={() => setEditing('new')}>
        <Plus className="h-4 w-4" /> Add user
      </Button>

      <div className="space-y-2">
        {users.map((u) => (
          <div key={u.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
            <button type="button" onClick={() => setEditing(u)} className="min-w-0 flex-1 text-left">
              <p className="font-medium hover:text-brand-glow">
                {u.name}
                {u.id === currentUserId ? <span className="ml-2 text-xs text-white/40">(you)</span> : null}
              </p>
              <p className="text-xs text-white/40">{u.email}</p>
            </button>
            <Badge
              value={u.role === 'SUPER_ADMIN' ? 'published' : 'read'}
              label={u.role === 'SUPER_ADMIN' ? 'Super Admin' : 'Editor'}
            />
            {!u.isActive ? <Badge value="archived" label="Disabled" /> : null}
            <Button
              variant="secondary"
              size="sm"
              onClick={() =>
                startTransition(async () => {
                  await signOutUserEverywhere(u.id);
                  toast.success(`${u.name} signed out everywhere`);
                })
              }
            >
              Sign out everywhere
            </Button>
            {u.id !== currentUserId ? (
              <ConfirmDialog
                title={`Delete ${u.name}?`}
                description="Their account and sessions are removed. Content they created is kept."
                onConfirm={() =>
                  startTransition(async () => {
                    const res = await deleteUser(u.id);
                    if (res.ok) {
                      setUsers((cur) => cur.filter((x) => x.id !== u.id));
                      toast.success('User deleted');
                    } else toast.error(res.error);
                  })
                }
              >
                <Button variant="danger" size="sm">Delete</Button>
              </ConfirmDialog>
            ) : null}
          </div>
        ))}
      </div>

      {editing ? (
        <UserDialog
          user={
            editing === 'new'
              ? { id: '', email: '', name: '', role: 'EDITOR', isActive: true, createdAt: '' }
              : editing
          }
          isNew={editing === 'new'}
          onClose={() => setEditing(null)}
          onSaved={(saved, isNew) => {
            setUsers((cur) => (isNew ? [...cur, saved] : cur.map((x) => (x.id === saved.id ? saved : x))));
            setEditing(null);
          }}
        />
      ) : null}
    </div>
  );
}

function UserDialog({
  user,
  isNew,
  onClose,
  onSaved,
}: {
  user: AdminUser;
  isNew: boolean;
  onClose: () => void;
  onSaved: (user: AdminUser, isNew: boolean) => void;
}) {
  const [value, setValue] = useState(user);
  const [password, setPassword] = useState('');
  const [pending, startTransition] = useTransition();

  const save = () =>
    startTransition(async () => {
      const res = await saveUser({
        id: isNew ? undefined : user.id,
        email: value.email,
        name: value.name,
        role: value.role,
        isActive: value.isActive,
        password: password || undefined,
      });
      if (res.ok) {
        toast.success('User saved');
        onSaved({ ...value, id: res.id }, isNew);
      } else toast.error(res.error);
    });

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-sm" role="dialog" aria-modal>
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0e0f16] p-6">
        <h2 className="font-display text-lg font-semibold">{isNew ? 'Add user' : `Edit ${user.name}`}</h2>
        <div className="mt-4 space-y-4">
          <Field label="Name">
            <Input value={value.name} onChange={(e) => setValue({ ...value, name: e.target.value })} />
          </Field>
          <Field label="Email">
            <Input type="email" value={value.email} onChange={(e) => setValue({ ...value, email: e.target.value })} />
          </Field>
          <Field label="Role">
            <Select value={value.role} onChange={(e) => setValue({ ...value, role: e.target.value as AdminUser['role'] })}>
              <option value="EDITOR">Editor — content, media, inbox</option>
              <option value="SUPER_ADMIN">Super Admin — everything</option>
            </Select>
          </Field>
          <Field label={isNew ? 'Password' : 'New password'} hint={isNew ? 'min 8 characters' : 'leave empty to keep current; changing signs them out everywhere'}>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
          </Field>
          <div className="flex items-center justify-between rounded-xl border border-white/10 px-4 py-3">
            <div>
              <p className="text-sm">Active</p>
              <p className="text-xs text-white/40">Disabled users cannot sign in.</p>
            </div>
            <Switch checked={value.isActive} onCheckedChange={(v) => setValue({ ...value, isActive: v })} aria-label="Active" />
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={pending || !value.email || !value.name}>
            {pending ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </div>
    </div>
  );
}
