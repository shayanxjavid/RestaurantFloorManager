import { useState, useEffect, useCallback } from 'react';
import {
  X,
  Clock,
  Users,
  MessageSquare,
  User,
  History,
} from 'lucide-react';
import {
  TableStatus,
  TABLE_STATUS_COLORS,
  TABLE_STATUS_LABELS,
} from '@rfm/shared';
import type { TableConfig, TableStatusEntry, Section } from '@rfm/shared';
import { tableApi } from '@/api';
import { useFloorStore } from '@/stores/floorStore';
import { useSocket } from '@/hooks/useSocket';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Spinner';
import toast from 'react-hot-toast';

interface TableDetailsProps {
  table: TableConfig;
  onClose: () => void;
}

const STATUS_CYCLE: TableStatus[] = [
  TableStatus.AVAILABLE,
  TableStatus.SEATED,
  TableStatus.ORDERING,
  TableStatus.SERVED,
  TableStatus.CHECK_REQUESTED,
  TableStatus.CLEANING,
];

function formatTimeSince(date: Date | string | null): string {
  if (!date) return '--';
  const ms = Date.now() - new Date(date).getTime();
  if (ms < 0) return 'just now';
  const minutes = Math.floor(ms / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m ago`;
}

function formatTimestamp(date: Date | string | null): string {
  if (!date) return '--';
  return new Date(date).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function TableDetails({ table, onClose }: TableDetailsProps) {
  const tableStatuses = useFloorStore((s) => s.tableStatuses);
  const updateTableStatus = useFloorStore((s) => s.updateTableStatus);
  const sections = useFloorStore((s) => s.sections);
  const { emitTableStatus } = useSocket();

  const entry = tableStatuses[table.id] ?? null;
  const currentStatus = entry?.status ?? TableStatus.AVAILABLE;
  const statusColor = TABLE_STATUS_COLORS[currentStatus];

  const [guestCount, setGuestCount] = useState<number>(entry?.guestCount ?? 0);
  const [notes, setNotes] = useState<string>(entry?.notes ?? '');
  const [history, setHistory] = useState<TableStatusEntry[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [savingDetails, setSavingDetails] = useState(false);

  // Find which section this table belongs to
  const tableSection: Section | undefined = sections.find((s) =>
    s.tables?.some((t) => t.id === table.id),
  );

  // Determine if seated-level status
  const isSeated = [
    TableStatus.SEATED,
    TableStatus.ORDERING,
    TableStatus.SERVED,
    TableStatus.CHECK_REQUESTED,
  ].includes(currentStatus);

  // Load history on mount
  useEffect(() => {
    setLoadingHistory(true);
    tableApi
      .getHistory(table.id)
      .then((data) => setHistory(data.slice(0, 10)))
      .catch(() => {
        // Silently fail - history is optional
      })
      .finally(() => setLoadingHistory(false));
  }, [table.id]);

  // Sync local state when entry changes
  useEffect(() => {
    setGuestCount(entry?.guestCount ?? 0);
    setNotes(entry?.notes ?? '');
  }, [entry]);

  const handleStatusChange = useCallback(
    async (newStatus: TableStatus) => {
      setUpdatingStatus(true);
      try {
        const updated = await tableApi.updateStatus(table.id, {
          status: newStatus,
          guestCount: newStatus === TableStatus.AVAILABLE ? 0 : guestCount,
          notes: notes || undefined,
        });
        updateTableStatus(table.id, updated);
        emitTableStatus({
          tableId: table.id,
          status: newStatus,
          guestCount: newStatus === TableStatus.AVAILABLE ? 0 : guestCount,
          notes: notes || undefined,
          updatedBy: 'current-user',
        });
        toast.success(`Table ${table.tableNumber} -> ${TABLE_STATUS_LABELS[newStatus]}`);
      } catch {
        toast.error('Failed to update status');
      } finally {
        setUpdatingStatus(false);
      }
    },
    [table, guestCount, notes, updateTableStatus, emitTableStatus],
  );

  const handleSaveDetails = useCallback(async () => {
    setSavingDetails(true);
    try {
      const updated = await tableApi.updateStatus(table.id, {
        status: currentStatus,
        guestCount,
        notes: notes || undefined,
      });
      updateTableStatus(table.id, updated);
      toast.success('Details saved');
    } catch {
      toast.error('Failed to save details');
    } finally {
      setSavingDetails(false);
    }
  }, [table.id, currentStatus, guestCount, notes, updateTableStatus]);

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-700">
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-lg text-sm font-bold text-white"
            style={{ backgroundColor: statusColor }}
          >
            {table.tableNumber}
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              Table {table.tableNumber}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {table.shape} - {table.seats} seats
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Content */}
      <div className="custom-scrollbar flex-1 overflow-y-auto p-4 space-y-4">
        {/* Current Status */}
        <div>
          <label className="mb-1.5 block text-xs font-medium text-gray-500 dark:text-gray-400">
            Current Status
          </label>
          <span
            className="inline-flex rounded-full px-3 py-1 text-sm font-semibold text-white"
            style={{ backgroundColor: statusColor }}
          >
            {TABLE_STATUS_LABELS[currentStatus]}
          </span>
        </div>

        {/* Section */}
        {tableSection && (
          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-500 dark:text-gray-400">
              Section
            </label>
            <div className="flex items-center gap-2">
              <span
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: tableSection.color }}
              />
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {tableSection.name}
              </span>
            </div>
          </div>
        )}

        {/* Server */}
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-gray-400" />
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400">
              Server
            </label>
            <p className="text-sm text-gray-900 dark:text-gray-100">
              {entry?.serverName ?? 'Unassigned'}
            </p>
          </div>
        </div>

        {/* Time seated */}
        {isSeated && entry?.seatedAt && (
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-gray-400" />
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400">
                Time Seated
              </label>
              <p className="text-sm text-gray-900 dark:text-gray-100">
                {formatTimeSince(entry.seatedAt)}
              </p>
            </div>
          </div>
        )}

        {/* Guest Count */}
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <Users className="h-4 w-4 text-gray-400" />
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
              Guest Count
            </label>
          </div>
          <input
            type="number"
            min={0}
            max={table.seats * 2}
            value={guestCount}
            onChange={(e) => setGuestCount(Math.max(0, parseInt(e.target.value) || 0))}
            className="block w-24 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100 dark:focus:border-brand-400"
          />
        </div>

        {/* Notes */}
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <MessageSquare className="h-4 w-4 text-gray-400" />
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
              Notes
            </label>
          </div>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Add notes about this table..."
            className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100 dark:placeholder-gray-500 dark:focus:border-brand-400"
          />
        </div>

        {/* Save details */}
        <Button
          size="sm"
          variant="secondary"
          loading={savingDetails}
          onClick={handleSaveDetails}
        >
          Save Details
        </Button>

        {/* Status change buttons */}
        <div>
          <label className="mb-2 block text-xs font-medium text-gray-500 dark:text-gray-400">
            Change Status
          </label>
          <div className="grid grid-cols-2 gap-2">
            {STATUS_CYCLE.map((s) => (
              <button
                key={s}
                onClick={() => handleStatusChange(s)}
                disabled={updatingStatus || s === currentStatus}
                className={`rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                  s === currentStatus
                    ? 'text-white ring-2 ring-offset-1 dark:ring-offset-gray-900'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
                } ${updatingStatus ? 'cursor-wait opacity-50' : ''}`}
                style={
                  s === currentStatus
                    ? {
                        backgroundColor: TABLE_STATUS_COLORS[s],
                      }
                    : undefined
                }
              >
                {TABLE_STATUS_LABELS[s]}
              </button>
            ))}
          </div>
        </div>

        {/* History */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <History className="h-4 w-4 text-gray-400" />
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
              Status History
            </label>
          </div>
          {loadingHistory ? (
            <div className="flex justify-center py-4">
              <Spinner size="sm" />
            </div>
          ) : history.length === 0 ? (
            <p className="text-xs text-gray-400 dark:text-gray-500">
              No history yet.
            </p>
          ) : (
            <div className="space-y-1.5">
              {history.map((h) => (
                <div
                  key={h.id}
                  className="flex items-center justify-between rounded-md bg-gray-50 px-3 py-1.5 dark:bg-gray-800/50"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: TABLE_STATUS_COLORS[h.status] }}
                    />
                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                      {TABLE_STATUS_LABELS[h.status]}
                    </span>
                    {h.guestCount > 0 && (
                      <span className="text-xs text-gray-400">
                        ({h.guestCount} guests)
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-gray-400 dark:text-gray-500">
                    {formatTimestamp(h.updatedAt)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
