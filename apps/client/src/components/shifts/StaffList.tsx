import { useState, useEffect } from 'react';
import { Search, User, Briefcase } from 'lucide-react';
import { UserRole } from '@rfm/shared';
import type { User as UserType } from '@rfm/shared';
import { userApi } from '@/api';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';

interface StaffListProps {
  onSelectServer: (userId: string) => void;
}

export function StaffList({ onSelectServer }: StaffListProps) {
  const [servers, setServers] = useState<UserType[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    userApi
      .list()
      .then((users) => {
        const filtered = users.filter(
          (u) => u.role === UserRole.SERVER && u.active,
        );
        setServers(filtered);
      })
      .catch(() => setError('Failed to load staff'))
      .finally(() => setLoading(false));
  }, []);

  const filteredServers = servers.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()),
  );

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Spinner size="md" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg bg-red-50 p-4 text-center dark:bg-red-950">
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Search */}
      <Input
        placeholder="Search servers..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        icon={<Search className="h-4 w-4" />}
      />

      {/* List */}
      {filteredServers.length === 0 ? (
        <div className="py-8 text-center">
          <User className="mx-auto h-8 w-8 text-gray-300 dark:text-gray-600" />
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            {search ? 'No servers match your search.' : 'No active servers available.'}
          </p>
        </div>
      ) : (
        <ul className="max-h-64 space-y-1 overflow-y-auto">
          {filteredServers.map((server) => (
            <li key={server.id}>
              <button
                onClick={() => onSelectServer(server.id)}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50"
              >
                {/* Avatar */}
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-700 dark:bg-brand-900 dark:text-brand-300">
                  {server.name.charAt(0).toUpperCase()}
                </div>

                {/* Info */}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">
                    {server.name}
                  </p>
                  <p className="truncate text-xs text-gray-500 dark:text-gray-400">
                    {server.email}
                  </p>
                </div>

                {/* Role badge */}
                <Badge variant="primary">
                  <Briefcase className="mr-1 h-3 w-3" />
                  Server
                </Badge>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
