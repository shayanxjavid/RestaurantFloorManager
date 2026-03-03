import { useState, useEffect, useCallback } from 'react';
import {
  BarChart3,
  ChevronRight,
  Calendar,
  RefreshCw,
  Trophy,
} from 'lucide-react';
import { TableStatus, TABLE_STATUS_COLORS } from '@rfm/shared';
import {
  analyticsApi,
} from '@/api';
import type {
  OverviewData,
  SectionAnalytics,
  StaffAnalytics,
} from '@/api';
import { StatsCards } from '@/components/dashboard/StatsCards';
import { OccupancyChart } from '@/components/dashboard/OccupancyChart';
import { SectionChart } from '@/components/dashboard/SectionChart';
import { StatusDistribution } from '@/components/dashboard/StatusDistribution';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { Badge } from '@/components/ui/Badge';
import toast from 'react-hot-toast';

// Generate placeholder occupancy data (would come from real API in production)
function generateOccupancyData(): Array<{ time: string; occupancy: number }> {
  const hours = [
    '10am', '11am', '12pm', '1pm', '2pm', '3pm',
    '4pm', '5pm', '6pm', '7pm', '8pm', '9pm', '10pm',
  ];
  return hours.map((time) => ({
    time,
    occupancy: Math.floor(Math.random() * 60 + 20),
  }));
}

// Generate placeholder status distribution (would come from real API)
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

function getTodayString(): string {
  return new Date().toISOString().split('T')[0];
}

function getWeekAgoString(): string {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  return d.toISOString().split('T')[0];
}

export function AnalyticsPage() {
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [sectionData, setSectionData] = useState<SectionAnalytics[]>([]);
  const [staffData, setStaffData] = useState<StaffAnalytics[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [startDate, setStartDate] = useState(getWeekAgoString());
  const [endDate, setEndDate] = useState(getTodayString());

  const [occupancyData] = useState(generateOccupancyData());
  const [statusDistData] = useState(generateStatusDistribution());

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [overviewRes, sectionsRes, staffRes] = await Promise.all([
        analyticsApi.getOverview(),
        analyticsApi.getSections(),
        analyticsApi.getStaff(),
      ]);
      setOverview(overviewRes);
      setSectionData(sectionsRes);
      setStaffData(staffRes);
    } catch {
      setError('Failed to load analytics data');
      toast.error('Failed to load analytics');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Transform section data for chart
  const sectionChartData = sectionData.map((s) => ({
    name: s.sectionName,
    tables: Math.floor(s.totalCovers / 4), // Approximate table count
    guests: s.totalCovers,
    color: '#3b82f6',
  }));

  // Sort staff by tables served
  const topServers = [...staffData].sort((a, b) => b.tablesServed - a.tablesServed);

  return (
    <div className="p-6">
      {/* Breadcrumb header */}
      <div className="mb-6">
        <div className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
          <span>FloorView</span>
          <ChevronRight className="h-3 w-3" />
          <span className="font-medium text-gray-900 dark:text-gray-100">
            Analytics
          </span>
        </div>
        <div className="mt-2 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BarChart3 className="h-6 w-6 text-gray-500 dark:text-gray-400" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Analytics
            </h1>
          </div>
          <Button
            variant="ghost"
            size="sm"
            icon={<RefreshCw className="h-4 w-4" />}
            onClick={loadData}
            loading={loading}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Date range selector */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Calendar className="h-4 w-4 text-gray-400" />
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
          />
          <span className="text-sm text-gray-500 dark:text-gray-400">to</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
          />
        </div>
      </div>

      {error && (
        <div className="mb-6 rounded-lg bg-red-50 p-4 text-sm text-red-600 dark:bg-red-950 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Stats cards */}
      <div className="mb-6">
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

      {/* Charts grid */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner size="lg" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Occupancy Chart */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
            <h3 className="mb-4 text-sm font-semibold text-gray-900 dark:text-gray-100">
              Occupancy Over Time
            </h3>
            <div className="h-64">
              <OccupancyChart data={occupancyData} />
            </div>
          </div>

          {/* Section Chart */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
            <h3 className="mb-4 text-sm font-semibold text-gray-900 dark:text-gray-100">
              Section Performance
            </h3>
            <div className="h-64">
              <SectionChart data={sectionChartData} />
            </div>
          </div>

          {/* Status Distribution */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
            <h3 className="mb-4 text-sm font-semibold text-gray-900 dark:text-gray-100">
              Table Status Distribution
            </h3>
            <div className="h-64">
              <StatusDistribution data={statusDistData} />
            </div>
          </div>

          {/* Top Servers Table */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
            <div className="mb-4 flex items-center gap-2">
              <Trophy className="h-4 w-4 text-amber-500" />
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                Top Servers by Table Count
              </h3>
            </div>

            {topServers.length === 0 ? (
              <div className="flex h-56 items-center justify-center">
                <p className="text-sm text-gray-400 dark:text-gray-500">
                  No server data available.
                </p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-lg border border-gray-100 dark:border-gray-800">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-800/50">
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 dark:text-gray-400">
                        Rank
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 dark:text-gray-400">
                        Server
                      </th>
                      <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500 dark:text-gray-400">
                        Tables
                      </th>
                      <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500 dark:text-gray-400">
                        Avg Rating
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {topServers.slice(0, 8).map((server, idx) => (
                      <tr
                        key={server.userId}
                        className="transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/30"
                      >
                        <td className="px-3 py-2">
                          {idx < 3 ? (
                            <span
                              className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold text-white ${
                                idx === 0
                                  ? 'bg-amber-500'
                                  : idx === 1
                                  ? 'bg-gray-400'
                                  : 'bg-orange-600'
                              }`}
                            >
                              {idx + 1}
                            </span>
                          ) : (
                            <span className="pl-1.5 text-xs text-gray-500 dark:text-gray-400">
                              {idx + 1}
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-sm font-medium text-gray-900 dark:text-gray-100">
                          {server.userName}
                        </td>
                        <td className="px-3 py-2 text-right text-sm font-semibold text-gray-900 dark:text-gray-100">
                          {server.tablesServed}
                        </td>
                        <td className="px-3 py-2 text-right">
                          <Badge
                            variant={
                              server.avgRating >= 4.5
                                ? 'success'
                                : server.avgRating >= 3.5
                                ? 'warning'
                                : 'default'
                            }
                          >
                            {server.avgRating.toFixed(1)}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
