import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  Label,
} from 'recharts';
import {
  TableStatus,
  TABLE_STATUS_COLORS,
  TABLE_STATUS_LABELS,
} from '@rfm/shared';

interface StatusDistributionDataPoint {
  status: TableStatus;
  count: number;
}

interface StatusDistributionProps {
  data: StatusDistributionDataPoint[];
  compact?: boolean;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    payload: StatusDistributionDataPoint & { name: string };
    value: number;
  }>;
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  const item = payload[0].payload;

  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-md dark:border-gray-700 dark:bg-gray-900">
      <div className="flex items-center gap-2">
        <span
          className="h-2.5 w-2.5 rounded-full"
          style={{ backgroundColor: TABLE_STATUS_COLORS[item.status] }}
        />
        <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
          {TABLE_STATUS_LABELS[item.status]}
        </span>
      </div>
      <p className="mt-0.5 text-sm font-bold text-gray-900 dark:text-gray-100">
        {item.count} table{item.count !== 1 ? 's' : ''}
      </p>
    </div>
  );
}

export function StatusDistribution({ data, compact }: StatusDistributionProps) {
  const total = data.reduce((sum, d) => sum + d.count, 0);
  const nonZero = data.filter((d) => d.count > 0);

  if (nonZero.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-gray-400 dark:text-gray-500">
          No table data available.
        </p>
      </div>
    );
  }

  const chartData = nonZero.map((d) => ({
    ...d,
    name: TABLE_STATUS_LABELS[d.status],
  }));

  const innerRadius = compact ? 35 : 55;
  const outerRadius = compact ? 55 : 80;

  return (
    <div className="h-full w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            dataKey="count"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={innerRadius}
            outerRadius={outerRadius}
            paddingAngle={2}
            label={
              compact
                ? false
                : ({ name, count }: { name: string; count: number }) =>
                    `${name} (${count})`
            }
          >
            {chartData.map((entry) => (
              <Cell
                key={entry.status}
                fill={TABLE_STATUS_COLORS[entry.status]}
                strokeWidth={0}
              />
            ))}
            <Label
              value={`${total}`}
              position="center"
              style={{
                fontSize: compact ? '18px' : '24px',
                fontWeight: 'bold',
                fill: '#111827',
              }}
            />
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          {!compact && (
            <Legend
              layout="horizontal"
              verticalAlign="bottom"
              wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
            />
          )}
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
