import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Users,
  Search,
  ChevronRight,
  UserPlus,
  ShieldCheck,
  ShieldAlert,
  UserX,
  Link2,
} from 'lucide-react';
import { UserRole } from '@rfm/shared';
import type { User } from '@rfm/shared';
import { userApi } from '@/api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Spinner';
import toast from 'react-hot-toast';

const ROLE_OPTIONS: Array<{ value: UserRole; label: string }> = [
  { value: UserRole.SERVER, label: 'Server' },
  { value: UserRole.MANAGER, label: 'Manager' },
  { value: UserRole.ADMIN, label: 'Admin' },
];

const ROLE_BADGE_VARIANT: Record<UserRole, 'primary' | 'warning' | 'danger'> = {
  [UserRole.SERVER]: 'primary',
  [UserRole.MANAGER]: 'warning',
  [UserRole.ADMIN]: 'danger',
};

function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function StaffManagementPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<UserRole | 'ALL'>('ALL');

  // Deactivate confirmation
  const [deactivatingUser, setDeactivatingUser] = useState<User | null>(null);
  const [deactivating, setDeactivating] = useState(false);

  // Invite modal
  const [showInviteModal, setShowInviteModal] = useState(false);

  // Role change loading
  const [changingRoleId, setChangingRoleId] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    userApi
      .list()
      .then((data) => setUsers(data))
      .catch(() => setError('Failed to load staff members'))
      .finally(() => setLoading(false));
  }, []);

  const filteredUsers = useMemo(() => {
    let result = [...users];

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (u) =>
          u.name.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q),
      );
    }

    if (roleFilter !== 'ALL') {
      result = result.filter((u) => u.role === roleFilter);
    }

    return result;
  }, [users, search, roleFilter]);

  const handleRoleChange = useCallback(
    async (userId: string, newRole: UserRole) => {
      setChangingRoleId(userId);
      try {
        const updated = await userApi.updateRole(userId, newRole);
        setUsers((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, role: updated.role } : u)),
        );
        toast.success('Role updated');
      } catch {
        toast.error('Failed to update role');
      } finally {
        setChangingRoleId(null);
      }
    },
    [],
  );

  const handleDeactivate = useCallback(async () => {
    if (!deactivatingUser) return;
    setDeactivating(true);
    try {
      await userApi.deactivate(deactivatingUser.id);
      setUsers((prev) =>
        prev.map((u) =>
          u.id === deactivatingUser.id ? { ...u, active: false } : u,
        ),
      );
      toast.success(`${deactivatingUser.name} has been deactivated`);
      setDeactivatingUser(null);
    } catch {
      toast.error('Failed to deactivate user');
    } finally {
      setDeactivating(false);
    }
  }, [deactivatingUser]);

  return (
    <div className="p-6">
      {/* Breadcrumb header */}
      <div className="mb-6">
        <div className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
          <span>FloorView</span>
          <ChevronRight className="h-3 w-3" />
          <span className="font-medium text-gray-900 dark:text-gray-100">
            Staff Management
          </span>
        </div>
        <div className="mt-2 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Users className="h-6 w-6 text-gray-500 dark:text-gray-400" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Staff Management
            </h1>
          </div>
          <Button
            icon={<UserPlus className="h-4 w-4" />}
            onClick={() => setShowInviteModal(true)}
          >
            Invite Staff
          </Button>
        </div>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Manage team members, roles, and permissions.
        </p>
      </div>

      {/* Search and filter */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex-1">
          <Input
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            icon={<Search className="h-4 w-4" />}
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setRoleFilter('ALL')}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              roleFilter === 'ALL'
                ? 'bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700'
            }`}
          >
            All
          </button>
          {ROLE_OPTIONS.map((r) => (
            <button
              key={r.value}
              onClick={() => setRoleFilter(r.value)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                roleFilter === r.value
                  ? 'bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        {loading ? (
          <div className="flex justify-center py-16">
            <Spinner size="lg" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <ShieldAlert className="h-12 w-12 text-red-300 dark:text-red-600" />
            <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>
            <Button
              variant="ghost"
              size="sm"
              className="mt-3"
              onClick={() => window.location.reload()}
            >
              Retry
            </Button>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Users className="h-12 w-12 text-gray-300 dark:text-gray-600" />
            <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
              {search || roleFilter !== 'ALL'
                ? 'No staff match the current filter.'
                : 'No staff members yet.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 dark:border-gray-800 dark:bg-gray-900/50">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Email
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Role
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Joined
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {filteredUsers.map((user) => {
                  const isChangingRole = changingRoleId === user.id;

                  return (
                    <tr
                      key={user.id}
                      className="transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50"
                    >
                      {/* Name */}
                      <td className="whitespace-nowrap px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-sm font-medium text-brand-700 dark:bg-brand-900 dark:text-brand-300">
                            {user.name.charAt(0).toUpperCase()}
                          </div>
                          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {user.name}
                          </span>
                        </div>
                      </td>

                      {/* Email */}
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                        {user.email}
                      </td>

                      {/* Role dropdown */}
                      <td className="whitespace-nowrap px-4 py-3">
                        <div className="relative inline-block">
                          {isChangingRole ? (
                            <Spinner size="sm" />
                          ) : (
                            <select
                              value={user.role}
                              onChange={(e) =>
                                handleRoleChange(user.id, e.target.value as UserRole)
                              }
                              className="rounded-md border border-gray-200 bg-white py-1 pl-2 pr-7 text-xs font-medium text-gray-700 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                            >
                              {ROLE_OPTIONS.map((r) => (
                                <option key={r.value} value={r.value}>
                                  {r.label}
                                </option>
                              ))}
                            </select>
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="whitespace-nowrap px-4 py-3">
                        {user.active ? (
                          <Badge variant="success">Active</Badge>
                        ) : (
                          <Badge variant="default">Inactive</Badge>
                        )}
                      </td>

                      {/* Created date */}
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                        {formatDate(user.createdAt)}
                      </td>

                      {/* Actions */}
                      <td className="whitespace-nowrap px-4 py-3 text-right">
                        {user.active && (
                          <button
                            onClick={() => setDeactivatingUser(user)}
                            className="rounded-md p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950 dark:hover:text-red-400"
                            title="Deactivate"
                          >
                            <UserX className="h-4 w-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Footer count */}
      <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">
        Showing {filteredUsers.length} of {users.length} staff members
      </div>

      {/* Deactivate confirmation modal */}
      <Modal
        open={deactivatingUser !== null}
        onClose={() => setDeactivatingUser(null)}
        title="Deactivate Staff Member"
        size="sm"
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => setDeactivatingUser(null)}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              loading={deactivating}
              onClick={handleDeactivate}
            >
              Deactivate
            </Button>
          </>
        }
      >
        {deactivatingUser && (
          <div className="text-sm text-gray-600 dark:text-gray-400">
            <p>
              Are you sure you want to deactivate{' '}
              <strong className="text-gray-900 dark:text-gray-100">
                {deactivatingUser.name}
              </strong>
              ?
            </p>
            <p className="mt-2">
              They will no longer be able to log in or be assigned to shifts.
              This action can be reversed by an administrator.
            </p>
          </div>
        )}
      </Modal>

      {/* Invite modal */}
      <Modal
        open={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        title="Invite Staff"
        size="sm"
        footer={
          <Button onClick={() => setShowInviteModal(false)}>
            Done
          </Button>
        }
      >
        <div className="space-y-4 text-sm">
          <div className="flex items-center gap-3 rounded-lg bg-brand-50 p-4 dark:bg-brand-950">
            <Link2 className="h-5 w-5 shrink-0 text-brand-600 dark:text-brand-400" />
            <p className="text-brand-700 dark:text-brand-300">
              Share the registration link with your staff members to invite them.
            </p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800">
            <p className="mb-1 text-xs font-medium text-gray-500 dark:text-gray-400">
              Registration URL
            </p>
            <code className="break-all text-xs text-gray-900 dark:text-gray-100">
              {window.location.origin}/register
            </code>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            New staff members will be assigned the Server role by default.
            You can change their role after they register.
          </p>
        </div>
      </Modal>
    </div>
  );
}
