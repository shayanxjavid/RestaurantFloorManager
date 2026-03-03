import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Clock,
  Eye,
  Users,
  TrendingUp,
  Activity,
  AlertCircle,
} from 'lucide-react';
import { UserRole, TableStatus } from '@rfm/shared';
import { useAuth } from '@/hooks/useAuth';
import { analyticsApi } from '@/api';
import type { OverviewData } from '@/api';
import { StatsCards } from '@/components/dashboard/StatsCards';
import { StatusDistribution } from '@/components/dashboard/StatusDistribution';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';

interface QuickActionProps {
  label: string;
  description: string;
  icon: React.ReactNode;
  onClick: () => void;
}

function QuickAction({ label, description, icon, onClick }: QuickActionProps) {
  return (
    <button
      onClick={onClick}
      className="flex items-start gap-4 rounded-xl border border-gray-200 bg-white p-5 text-left transition-shadow hover:shadow-md dark:border-gray-800 dark:bg-gray-900 dark:hover:border-gray-700"
    >
      <div className="rounded-lg bg-brand-50 p-2.5 text-brand-600 dark:bg-brand-950 dark:text-brand-400">
        {icon}
      </div>
      <div>
        <p className="font-medium text-gray-900 dark:text-gray-100">{label}</p>
        <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">{description}</p>
      </div>
    </button>
  );
}

// Generate placeholder status distribution
function generateStatusDistribution(): Array<{ status: TableStatus; count: number }> {
  return [
    { status: TableStatus.AVAILABLE, count: 8 },
    { status: TableStatus.SEATED, count: 6 },
    { status: TableStatus.ORDERING, count: 3 },
    { status: TableStatus.SERVED, count: 4 },
    { status: TableStatus.CHECK_REQUESTED, count: 2 },
    { status: TableStatus.CLEANING, count: 1 },
  ];
}

export function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isManager = user?.role === UserRole.ADMIN || user?.role === UserRole.MANAGER;

  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [statusDistData] = useState(generateStatusDistribution());

  useEffect(() => {
    setLoading(true);
    setError(null);
    analyticsApi
      .getOverview()
      .then((data) => setOverview(data))
      .catch(() => setError('Failed to load dashboard data'))
      .finally(() => setLoading(false));
  }, []);

  const firstName = user?.name?.split(' ')[0] || 'User';

  return (
    <div className="p-6">
      {/* Welcome */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Welcome back, {firstName}
        </h1>
        <p className="mt-1 text-gray-500 dark:text-gray-400">
          Here is an overview of your restaurant floor.
        </p>
      </div>

      {/* Error state */}
      {error && (
        <div className="mb-6 flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950">
          <AlertCircle className="h-5 w-5 shrink-0 text-red-500" />
          <div className="flex-1">
            <p className="text-sm font-medium text-red-800 dark:text-red-200">
              {error}
            </p>
            <p className="mt-0.5 text-xs text-red-600 dark:text-red-400">
              Some dashboard data may be unavailable. Please try refreshing.
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.location.reload()}
          >
            Retry
          </Button>
        </div>
      )}

      {/* Stat Cards */}
      <div className="mb-8">
        <StatsCards
          data={
            overview ?? {
              totalTables: 0,
              occupiedTables: 0,
              totalGuests: 0,
              avgTurnover: 0,
            }
          }
          loading={loading}
        />
      </div>

      {/* Quick Actions */}
      <div className="mb-8">
        <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {isManager && (
            <QuickAction
              label="Floor Plan"
              description="Edit your restaurant layout"
              icon={<LayoutDashboard className="h-5 w-5" />}
              onClick={() => navigate('/floor-plan')}
            />
          )}
          {isManager && (
            <QuickAction
              label="Manage Shifts"
              description="Create and assign shifts"
              icon={<Clock className="h-5 w-5" />}
              onClick={() => navigate('/shifts')}
            />
          )}
          <QuickAction
            label="Service View"
            description="View live table statuses"
            icon={<Eye className="h-5 w-5" />}
            onClick={() => navigate('/service')}
          />
          {user?.role === UserRole.ADMIN && (
            <QuickAction
              label="Manage Staff"
              description="Manage team members"
              icon={<Users className="h-5 w-5" />}
              onClick={() => navigate('/staff')}
            />
          )}
        </div>
      </div>

      {/* Bottom row: Chart + Activity */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Status Distribution chart */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Table Status
            </h2>
            {isManager && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/analytics')}
              >
                View Analytics
              </Button>
            )}
          </div>
          {loading ? (
            <div className="flex h-48 items-center justify-center">
              <Spinner size="md" />
            </div>
          ) : (
            <div className="h-48">
              <StatusDistribution data={statusDistData} compact />
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
          <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">
            Recent Activity
          </h2>
          <div className="space-y-3">
            {/* Placeholder activity items */}
            {[
              {
                icon: <Activity className="h-4 w-4 text-green-500" />,
                text: 'Table 5 status changed to Seated',
                time: '2 min ago',
              },
              {
                icon: <Users className="h-4 w-4 text-blue-500" />,
                text: 'Server Maria claimed Section A',
                time: '8 min ago',
              },
              {
                icon: <Clock className="h-4 w-4 text-amber-500" />,
                text: 'Dinner shift started',
                time: '15 min ago',
              },
              {
                icon: <Activity className="h-4 w-4 text-purple-500" />,
                text: 'Table 12 marked as Cleaning',
                time: '22 min ago',
              },
              {
                icon: <TrendingUp className="h-4 w-4 text-cyan-500" />,
                text: 'Peak occupancy reached 85%',
                time: '1 hour ago',
              },
            ].map((item, idx) => (
              <div
                key={idx}
                className="flex items-center gap-3 rounded-lg bg-gray-50 px-3 py-2.5 dark:bg-gray-800/50"
              >
                {item.icon}
                <p className="flex-1 text-sm text-gray-700 dark:text-gray-300">
                  {item.text}
                </p>
                <span className="shrink-0 text-xs text-gray-400 dark:text-gray-500">
                  {item.time}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
