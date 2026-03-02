import { LayoutGrid, Users, Clock, TrendingUp } from 'lucide-react';

interface StatsData {
  totalTables: number;
  occupiedTables: number;
  totalGuests: number;
  avgTurnover: number;
}

interface StatsCardsProps {
  data: StatsData;
  loading?: boolean;
}

interface CardConfig {
  key: keyof StatsData;
  label: string;
  icon: React.ReactNode;
  iconBg: string;
  format: (value: number) => string;
  trend?: string;
}

const CARDS: CardConfig[] = [
  {
    key: 'totalTables',
    label: 'Total Tables',
    icon: <LayoutGrid className="h-5 w-5 text-brand-600 dark:text-brand-400" />,
    iconBg: 'bg-brand-50 dark:bg-brand-950',
    format: (v) => String(v),
  },
  {
    key: 'occupiedTables',
    label: 'Occupied',
    icon: <Users className="h-5 w-5 text-green-600 dark:text-green-400" />,
    iconBg: 'bg-green-50 dark:bg-green-950',
    format: (v) => String(v),
  },
  {
    key: 'totalGuests',
    label: 'Total Guests',
    icon: <Users className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />,
    iconBg: 'bg-cyan-50 dark:bg-cyan-950',
    format: (v) => String(v),
  },
  {
    key: 'avgTurnover',
    label: 'Avg Turnover',
    icon: <TrendingUp className="h-5 w-5 text-amber-600 dark:text-amber-400" />,
    iconBg: 'bg-amber-50 dark:bg-amber-950',
    format: (v) => `${v} min`,
  },
];

function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-3 w-20 rounded bg-gray-200 dark:bg-gray-700" />
          <div className="h-8 w-16 rounded bg-gray-200 dark:bg-gray-700" />
        </div>
        <div className="h-11 w-11 rounded-xl bg-gray-200 dark:bg-gray-700" />
      </div>
    </div>
  );
}

export function StatsCards({ data, loading }: StatsCardsProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {CARDS.map((c) => (
          <SkeletonCard key={c.key} />
        ))}
      </div>
    );
  }

  // Compute occupancy percentage for trend
  const occupancyPct =
    data.totalTables > 0
      ? Math.round((data.occupiedTables / data.totalTables) * 100)
      : 0;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {CARDS.map((card) => {
        const value = data[card.key];
        const showTrend = card.key === 'occupiedTables';

        return (
          <div
            key={card.key}
            className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md dark:border-gray-800 dark:bg-gray-900"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  {card.label}
                </p>
                <p className="mt-1 text-3xl font-bold text-gray-900 dark:text-gray-100">
                  {card.format(value)}
                </p>
                {showTrend && (
                  <p className="mt-1 flex items-center gap-1 text-xs">
                    <TrendingUp className="h-3 w-3 text-green-500" />
                    <span className="font-medium text-green-600 dark:text-green-400">
                      {occupancyPct}% occupancy
                    </span>
                  </p>
                )}
              </div>
              <div className={`rounded-xl p-3 ${card.iconBg}`}>{card.icon}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
