'use client';

import React, { useEffect, useState } from 'react';
import Button from '@/app/components/button';
import Input from '@/app/components/input';
import Select from '@/app/components/select';
import { PageWrapper } from '@/app/components/page-wrapper';
import { GUI_ROLE_OPTIONS, GuiRole } from '@/utils/gui-roles';
import styles from './styles.module.scss';

type PublicGuiUser = {
  id: string;
  username: string;
  role: GuiRole;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
  protected: boolean;
};

type AuditEvent = {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  subject: string;
};

type UserFormState = {
  username: string;
  password: string;
  role: GuiRole;
  enabled: boolean;
};

const emptyForm: UserFormState = {
  username: '',
  password: '',
  role: 'viewer',
  enabled: true,
};

async function parseResponse(response: Response) {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body.message ?? 'Request failed');
  }
  return body;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<PublicGuiUser[]>([]);
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [form, setForm] = useState<UserFormState>(emptyForm);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const selectedUser = users.find((user) => user.id === selectedUserId);
  const isEditing = !!selectedUser;
  const isProtectedUser = !!selectedUser?.protected;

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [usersResponse, auditResponse] = await Promise.all([fetch('/api/admin/users'), fetch('/api/admin/audit')]);
      const usersBody = await parseResponse(usersResponse);
      const auditBody = await parseResponse(auditResponse);
      setUsers(usersBody.users);
      setEvents(auditBody.events);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const resetForm = () => {
    setSelectedUserId(null);
    setForm(emptyForm);
    setMessage('');
    setError('');
  };

  const selectUser = (user: PublicGuiUser) => {
    setSelectedUserId(user.id);
    setForm({
      username: user.username,
      password: '',
      role: user.role,
      enabled: user.enabled,
    });
    setMessage('');
    setError('');
  };

  const saveUser = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setMessage('');
    setError('');

    try {
      const response = await fetch(selectedUserId ? `/api/admin/users/${selectedUserId}` : '/api/admin/users', {
        method: selectedUserId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: form.username,
          password: form.password || undefined,
          role: form.role,
          enabled: form.enabled,
        }),
      });

      await parseResponse(response);
      resetForm();
      await load();
      setMessage(isEditing ? 'User updated' : 'User created');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Failed to save user');
    } finally {
      setSaving(false);
    }
  };

  const deleteUser = async () => {
    if (!selectedUser) return;
    setSaving(true);
    setMessage('');
    setError('');

    try {
      await parseResponse(
        await fetch(`/api/admin/users/${selectedUser.id}`, {
          method: 'DELETE',
        })
      );
      resetForm();
      await load();
      setMessage('User deleted');
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Failed to delete user');
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageWrapper>
      <PageWrapper.Title>Admin Users</PageWrapper.Title>

      <div className={styles.grid}>
        <section className={styles.panel}>
          <h2 className={styles.panelTitle}>{isEditing ? 'Edit User' : 'Create User'}</h2>
          <form className={styles.form} onSubmit={saveUser}>
            <label className={styles.field}>
              Username
              <Input
                value={form.username}
                required
                disabled={isProtectedUser}
                onChange={(event) => setForm((prev) => ({ ...prev, username: event.target.value }))}
              />
            </label>

            <label className={styles.field}>
              Password
              <Input
                type='password'
                value={form.password}
                required={!isEditing}
                placeholder={isEditing ? 'Leave blank to keep current password' : ''}
                onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
              />
            </label>

            <label className={styles.field}>
              Role
              <Select value={form.role} disabled={isProtectedUser} onChange={(event) => setForm((prev) => ({ ...prev, role: event.target.value as GuiRole }))}>
                {GUI_ROLE_OPTIONS.map((role) => (
                  <option key={role.value} value={role.value}>
                    {role.label}
                  </option>
                ))}
              </Select>
            </label>

            <label className={styles.checkboxField}>
              <input
                type='checkbox'
                checked={form.enabled}
                disabled={isProtectedUser}
                onChange={(event) => setForm((prev) => ({ ...prev, enabled: event.target.checked }))}
              />
              Enabled
            </label>

            {isProtectedUser && <div className={styles.protectedNotice}>Built-in admin is always enabled and must keep the Admin role. Only its password can be changed.</div>}

            <div className={styles.actions}>
              <Button type='submit' isLoading={saving}>
                {isEditing ? 'Save user' : 'Create user'}
              </Button>
              {isEditing && !isProtectedUser && (
                <Button variant='outline' color='danger' onClick={deleteUser} disabled={saving}>
                  Delete
                </Button>
              )}
              <Button variant='ghost' onClick={resetForm} disabled={saving}>
                Clear
              </Button>
            </div>

            {message && <div className={styles.message}>{message}</div>}
            {error && <div className={styles.error}>{error}</div>}
          </form>
        </section>

        <section className={styles.panel}>
          <h2 className={styles.panelTitle}>Users</h2>
          <div className={styles.table}>
            <div className={styles.header}>
              <span>Username</span>
              <span>Role</span>
              <span>Status</span>
              <span>Created</span>
              <span>Updated</span>
              <span>Actions</span>
            </div>
            {loading && <div className={styles.row}>Loading users...</div>}
            {!loading &&
              users.map((user) => (
                <div className={styles.row} key={user.id}>
                  <strong>{user.username}</strong>
                  <span>{GUI_ROLE_OPTIONS.find((role) => role.value === user.role)?.label ?? user.role}</span>
                  <span>{user.protected ? 'Enabled, built-in' : user.enabled ? 'Enabled' : 'Disabled'}</span>
                  <span>{new Date(user.createdAt).toLocaleString()}</span>
                  <span>{new Date(user.updatedAt).toLocaleString()}</span>
                  <Button variant='outline' onClick={() => selectUser(user)}>
                    Edit
                  </Button>
                </div>
              ))}
          </div>
        </section>

        <section className={styles.panel}>
          <h2 className={styles.panelTitle}>Recent Audit</h2>
          <div className={styles.audit}>
            {events.map((event) => (
              <div className={styles.auditItem} key={event.id}>
                <span>{new Date(event.timestamp).toLocaleString()}</span>
                <strong>{event.actor}</strong>
                <span>{event.action}</span>
                <span className={styles.muted}>{event.subject}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </PageWrapper>
  );
}
