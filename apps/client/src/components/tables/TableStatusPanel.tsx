import { useState, useMemo, useCallback } from 'react';
import {
  Filter,
  ArrowUpDown,
  Clock,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  TableStatus,
  TABLE_STATUS_COLORS,
  TABLE_STATUS_LABELS,
} from '@rfm/shared';
import type { TableConfig, TableStatusEntry } from '@rfm/shared';
import { tableApi } from '@/api';
import { useFloorStore } from '@/stores/floorStore';
import { useSocket } from '@/hooks/useSocket';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import toast from 'react-hot-toast';

type SortKey = 'number' | 'time';

const STATUS_CYCLE: TableStatus[] = [
  TableStatus.AVAILABLE,
  TableStatus.SEATED,
  TableStatus.ORDERING,
  TableStatus.SERVED,
  TableStatus.CHECK_REQUESTED,
  TableStatus.CLEANING,
];

function getNextStatus(current: TableStatus): TableStatus {
  const idx = STATUS_CYCLE.indexOf(current);
  if (idx === -1) return TableStatus.AVAILABLE;
  return STATUS_CYCLE[(idx + 1) % STATUS_CYCLE.length];
}

function formatTimeSince(date: Date | string | null): string {
  if (!date) return '--';
  const ms = Date.now() - new Date(date).getTime();
  if (ms < 0) return 'just now';
  const minutes = Math.floor(ms / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m`;
}

interface TableStatusPanelProps {
  filterMyTables?: boolean;
  myTableIds?: string[];
}

export function TableStatusPanel({ filterMyTables, myTableIds }: TableStatusPanelProps) {
  const tables = useFloorStore((s) => s.tables);
  const tableStatuses = useFloorStore((s) => s.tableStatuses);
  const updateTableStatus = useFloorStore((s) => s.updateTableStatus);
  const { emitTableStatus } = useSocket();

  const [statusFilter, setStatusFilter] = useState<TableStatus | 'ALL'>('ALL');
  const [sortKey, setSortKey] = useState<SortKey>('number');
  const [expandedTableId, setExpandedTableId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const getStatus = useCallback(
    (tableId: string): TableStatusEntry | null => tableStatuses[tableId] ?? null,
    [tableStatuses],
  );

  const filteredAndSorted = useMemo(() => {
    let result = [...tables];

    // Filter to my tables if requested
    if (filterMyTables && myTableIds) {
      result = result.filter((t) => myTableIds.includes(t.id));
    }

    // Filter by status
    if (statusFilter !== 'ALL') {
      result = result.filter((t) => {
        const entry = getStatus(t.id);
        const currentStatus = entry?.status ?? TableStatus.AVAILABLE;
        return currentStatus === statusFilter;
      });
    }

    // Sort
    result.sort((a, b) => {
      if (sortKey === 'number') {
        return a.tableNumber - b.tableNumber;
      }
      const aTime = getStatus(a.id)?.updatedAt;
      const bTime = getStatus(b.id)?.updatedAt;
      if (!aTime && !bTime) return 0;
      if (!aTime) return 1;
      if (!bTime) return -1;
      return new Date(bTime).getTime() - new Date(aTime).getTime();
    });

    return result;
  }, [tables, statusFilter, sortKey, filterMyTables, myTableIds, getStatus]);

  const handleStatusChange = useCallback(
    async (table: TableConfig, newStatus: TableStatus) => {
      setUpdatingId(table.id);
      try {
        const entry = await tableApi.updateStatus(table.id, { status: newStatus });
        updateTableStatus(table.id, entry);
        emitTableStatus({
          tableId: table.id,
          status: newStatus,
          updatedBy: 'current-user',
        });
      } catch {
        toast.error('Failed to update table status');
      } finally {
        setUpdatingId(null);
      }
    },
    [updateTableStatus, emitTableStatus],
  );

  const handleQuickCycle = useCallback(
    (table: TableConfig) => {
      const entry = getStatus(table.id);
      const current = entry?.status ?? TableStatus.AVAILABLE;
      const next = getNextStatus(current);
      handleStatusChange(table, next);
    },
    [getStatus, handleStatusChange],
  );

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-gray-200 px-4 py-3 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            Table Status
          </h3>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowFilters((prev) => !prev)}
              className={`rounded p-1.5 text-gray-400 transition-colors ${
                showFilters
                  ? 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200'
                  : 'hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800'
              }`}
              title="Filters"
            >
              <Filter className="h-4 w-4" />
            </button>
            <button
              onClick={() =>
                setSortKey((prev) => (prev === 'number' ? 'time' : 'number'))
              }
              className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800"
              title={`Sort by ${sortKey === 'number' ? 'time' : 'number'}`}
            >
              <ArrowUpDown className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Filter pills */}
        {showFilters && (
          <div className="mt-2 flex flex-wrap gap-1">
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                statusFilter === 'ALL'
                  ? 'bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700'
              }`}
            >
              All
            </button>
            {Object.values(TableStatus).map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                  statusFilter === status
                    ? 'text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700'
                }`}
                style={
                  statusFilter === status
                    ? { backgroundColor: TABLE_STATUS_COLORS[status] }
                    : undefined
                }
              >
                {TABLE_STATUS_LABELS[status]}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Table list */}
      <div className="custom-scrollbar flex-1 overflow-y-auto">
        {filteredAndSorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center px-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No tables match the current filter.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100 dark:divide-gray-800">
            {filteredAndSorted.map((table) => {
              const entry = getStatus(table.id);
              const status = entry?.status ?? TableStatus.AVAILABLE;
              const isExpanded = expandedTableId === table.id;
              const isUpdating = updatingId === table.id;
              const statusColor = TABLE_STATUS_COLORS[status];

              return (
                <li key={table.id}>
                  {/* Summary row */}
                  <button
                    onClick={() =>
                      setExpandedTableId(isExpanded ? null : table.id)
                    }
                    className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50"
                  >
                    {/* Table number + status dot */}
                    <div className="flex items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: statusColor }}
                      />
                      <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                        T{table.tableNumber}
                      </span>
                    </div>

                    {/* Status badge */}
                    <span
                      className="rounded-full px-2 py-0.5 text-xs font-medium text-white"
                      style={{ backgroundColor: statusColor }}
                    >
                      {TABLE_STATUS_LABELS[status]}
                    </span>

                    {/* Seats */}
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {table.seats} seats
                    </span>

                    {/* Time */}
                    <span className="ml-auto flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500">
                      <Clock className="h-3 w-3" />
                      {formatTimeSince(entry?.updatedAt ?? null)}
                    </span>

                    {/* Expand icon */}
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4 text-gray-400" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-gray-400" />
                    )}
                  </button>

                  {/* Expanded details */}
                  {isExpanded && (
                    <div className="border-t border-gray-100 bg-gray-50 px-4 py-3 dark:border-gray-800 dark:bg-gray-900/50">
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <p className="text-gray-500 dark:text-gray-400">Guests</p>
                          <p className="font-medium text-gray-900 dark:text-gray-100">
                            {entry?.guestCount ?? 0}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500 dark:text-gray-400">Server</p>
                          <p className="font-medium text-gray-900 dark:text-gray-100">
                            {entry?.serverName ?? 'Unassigned'}
                          </p>
                        </div>
                        {entry?.notes && (
                          <div className="col-span-2">
                            <p className="text-gray-500 dark:text-gray-400">Notes</p>
                            <p className="font-medium text-gray-900 dark:text-gray-100">
                              {entry.notes}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Quick status buttons */}
                      <div className="mt-3">
                        <p className="mb-1.5 text-xs font-medium text-gray-500 dark:text-gray-400">
                          Change Status
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {STATUS_CYCLE.map((s) => (
                            <button
                              key={s}
                              onClick={() => handleStatusChange(table, s)}
                              disabled={isUpdating || s === status}
                              className={`rounded-md px-2 py-1 text-xs font-medium transition-colors ${
                                s === status
                                  ? 'text-white'
                                  : 'bg-gray-200 text-gray-600 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                              } ${isUpdating ? 'cursor-wait opacity-50' : ''}`}
                              style={
                                s === status
                                  ? { backgroundColor: TABLE_STATUS_COLORS[s] }
                                  : undefined
                              }
                            >
                              {TABLE_STATUS_LABELS[s]}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Quick cycle button */}
                      <div className="mt-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleQuickCycle(table)}
                          loading={isUpdating}
                        >
                          Advance to {TABLE_STATUS_LABELS[getNextStatus(status)]}
                        </Button>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Summary footer */}
      <div className="border-t border-gray-200 px-4 py-2 dark:border-gray-700">
        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
          <span>
            {filteredAndSorted.length} table{filteredAndSorted.length !== 1 ? 's' : ''}
          </span>
          <span>
            Sorted by {sortKey === 'number' ? 'table number' : 'last updated'}
          </span>
        </div>
      </div>
    </div>
  );
}
