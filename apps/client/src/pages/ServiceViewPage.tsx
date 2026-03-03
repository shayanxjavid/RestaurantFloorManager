import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Eye,
  Clock,
  Users,
  Timer,
  Filter,
} from 'lucide-react';
import {
  TableStatus,
  TABLE_STATUS_COLORS,
  TABLE_STATUS_LABELS,
} from '@rfm/shared';
import type { TableConfig, TableStatusEntry, Section } from '@rfm/shared';
import { useFloorStore } from '@/stores/floorStore';
import { useAuth } from '@/hooks/useAuth';
import { useSocket } from '@/hooks/useSocket';
import { tableApi } from '@/api';
import { TableStatusPanel } from '@/components/tables/TableStatusPanel';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import toast from 'react-hot-toast';

function formatTimeSince(date: Date | string | null): string {
  if (!date) return '--';
  const ms = Date.now() - new Date(date).getTime();
  if (ms < 0) return 'now';
  const minutes = Math.floor(ms / 60000);
  if (minutes < 1) return '<1m';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m`;
}

const STATUS_CYCLE: TableStatus[] = [
  TableStatus.AVAILABLE,
  TableStatus.SEATED,
  TableStatus.ORDERING,
  TableStatus.SERVED,
  TableStatus.CHECK_REQUESTED,
  TableStatus.CLEANING,
];

interface TableCardProps {
  table: TableConfig;
  entry: TableStatusEntry | null;
  section: Section | undefined;
  onClick: () => void;
}

function TableCard({ table, entry, section, onClick }: TableCardProps) {
  const status = entry?.status ?? TableStatus.AVAILABLE;
  const statusColor = TABLE_STATUS_COLORS[status];

  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center rounded-xl border border-gray-200 bg-white p-4 text-center transition-all hover:shadow-md dark:border-gray-800 dark:bg-gray-900 dark:hover:border-gray-700"
      style={{ borderLeftWidth: 4, borderLeftColor: section?.color ?? '#e5e7eb' }}
    >
      {/* Table number with status background */}
      <div
        className="flex h-12 w-12 items-center justify-center rounded-full text-lg font-bold text-white"
        style={{ backgroundColor: statusColor }}
      >
        {table.tableNumber}
      </div>

      {/* Status label */}
      <span
        className="mt-2 rounded-full px-2 py-0.5 text-xs font-medium text-white"
        style={{ backgroundColor: statusColor }}
      >
        {TABLE_STATUS_LABELS[status]}
      </span>

      {/* Meta */}
      <div className="mt-2 flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
        <span>{table.seats} seats</span>
        {entry && entry.guestCount > 0 && (
          <>
            <span className="text-gray-300 dark:text-gray-600">|</span>
            <span>{entry.guestCount} guests</span>
          </>
        )}
      </div>

      {/* Time badge */}
      {entry?.updatedAt && status !== TableStatus.AVAILABLE && (
        <span className="mt-1.5 flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500">
          <Clock className="h-3 w-3" />
          {formatTimeSince(entry.updatedAt)}
        </span>
      )}
    </button>
  );
}

export function ServiceViewPage() {
  const { user } = useAuth();
  const tables = useFloorStore((s) => s.tables);
  const sections = useFloorStore((s) => s.sections);
  const tableStatuses = useFloorStore((s) => s.tableStatuses);
  const updateTableStatus = useFloorStore((s) => s.updateTableStatus);
  const { emitTableStatus, connected } = useSocket();

  const [selectedTable, setSelectedTable] = useState<TableConfig | null>(null);
  const [showMyTables, setShowMyTables] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [showStatusPanel, setShowStatusPanel] = useState(false);

  // Determine "my tables" - tables in sections assigned to current user
  // For now, since we don't track shift assignments in the store,
  // we'll compute it from server names in table statuses
  const myTableIds = useMemo(() => {
    if (!user) return [];
    return tables
      .filter((t) => {
        const entry = tableStatuses[t.id];
        return entry?.serverName === user.name;
      })
      .map((t) => t.id);
  }, [tables, tableStatuses, user]);

  const getSectionForTable = useCallback(
    (tableId: string): Section | undefined =>
      sections.find((s) => s.tables?.some((t) => t.id === tableId)),
    [sections],
  );

  // Group tables by section
  const groupedTables = useMemo(() => {
    const groups: Array<{ section: Section | null; tables: TableConfig[] }> = [];
    const assigned = new Set<string>();

    for (const section of sections) {
      const sectionTableIds = new Set(section.tables?.map((t) => t.id) ?? []);
      const sectionTables = tables.filter((t) => sectionTableIds.has(t.id));
      if (sectionTables.length > 0) {
        groups.push({ section, tables: sectionTables });
        sectionTables.forEach((t) => assigned.add(t.id));
      }
    }

    // Unassigned tables
    const unassigned = tables.filter((t) => !assigned.has(t.id));
    if (unassigned.length > 0) {
      groups.push({ section: null, tables: unassigned });
    }

    return groups;
  }, [tables, sections]);

  const filteredGroups = useMemo(() => {
    if (!showMyTables) return groupedTables;
    return groupedTables
      .map((g) => ({
        ...g,
        tables: g.tables.filter((t) => myTableIds.includes(t.id)),
      }))
      .filter((g) => g.tables.length > 0);
  }, [groupedTables, showMyTables, myTableIds]);

  // Quick stats
  const myTablesCount = myTableIds.length;
  const myGuests = myTableIds.reduce((sum, id) => {
    return sum + (tableStatuses[id]?.guestCount ?? 0);
  }, 0);
  const occupiedTables = tables.filter((t) => {
    const entry = tableStatuses[t.id];
    return entry && entry.status !== TableStatus.AVAILABLE;
  }).length;

  const handleStatusChange = useCallback(
    async (table: TableConfig, newStatus: TableStatus) => {
      setUpdatingStatus(true);
      try {
        const entry = await tableApi.updateStatus(table.id, { status: newStatus });
        updateTableStatus(table.id, entry);
        emitTableStatus({
          tableId: table.id,
          status: newStatus,
          updatedBy: user?.id ?? 'unknown',
        });
        toast.success(`Table ${table.tableNumber} -> ${TABLE_STATUS_LABELS[newStatus]}`);
      } catch {
        toast.error('Failed to update status');
      } finally {
        setUpdatingStatus(false);
      }
    },
    [updateTableStatus, emitTableStatus, user],
  );

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-gray-900">
        <div className="flex items-center gap-3">
          <Eye className="h-5 w-5 text-gray-500 dark:text-gray-400" />
          <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Service View
          </h1>
          {connected && (
            <Badge variant="success">
              <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-green-500" />
              Live
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant={showMyTables ? 'primary' : 'outline'}
            size="sm"
            icon={<Filter className="h-3.5 w-3.5" />}
            onClick={() => setShowMyTables((prev) => !prev)}
          >
            My Tables
          </Button>
          <Button
            variant={showStatusPanel ? 'secondary' : 'outline'}
            size="sm"
            onClick={() => setShowStatusPanel((prev) => !prev)}
            className="lg:hidden"
          >
            Status Panel
          </Button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Floor grid */}
        <div className="custom-scrollbar flex-1 overflow-y-auto p-4">
          {tables.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <Eye className="h-12 w-12 text-gray-300 dark:text-gray-600" />
              <p className="mt-3 text-sm font-medium text-gray-500 dark:text-gray-400">
                No tables configured
              </p>
              <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                Set up tables in the Floor Plan editor first.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {filteredGroups.map((group, idx) => (
                <div key={group.section?.id ?? `unassigned-${idx}`}>
                  {/* Section header */}
                  <div className="mb-3 flex items-center gap-2">
                    {group.section && (
                      <span
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: group.section.color }}
                      />
                    )}
                    <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                      {group.section?.name ?? 'Unassigned'}
                    </h2>
                    <span className="text-xs text-gray-400 dark:text-gray-500">
                      ({group.tables.length} tables)
                    </span>
                  </div>

                  {/* Table grid */}
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                    {group.tables.map((table) => (
                      <TableCard
                        key={table.id}
                        table={table}
                        entry={tableStatuses[table.id] ?? null}
                        section={group.section ?? undefined}
                        onClick={() => setSelectedTable(table)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right sidebar - TableStatusPanel (desktop) */}
        <div className="hidden w-80 border-l border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 lg:block">
          <TableStatusPanel
            filterMyTables={showMyTables}
            myTableIds={myTableIds}
          />
        </div>
      </div>

      {/* Bottom stats bar */}
      <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-2 dark:border-gray-800 dark:bg-gray-900">
        <div className="flex items-center gap-6 text-xs text-gray-500 dark:text-gray-400">
          <span className="flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5" />
            My Tables: <strong className="text-gray-900 dark:text-gray-100">{myTablesCount}</strong>
          </span>
          <span className="flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5" />
            My Guests: <strong className="text-gray-900 dark:text-gray-100">{myGuests}</strong>
          </span>
          <span className="flex items-center gap-1.5">
            <Timer className="h-3.5 w-3.5" />
            Occupied: <strong className="text-gray-900 dark:text-gray-100">{occupiedTables}/{tables.length}</strong>
          </span>
        </div>
      </div>

      {/* Table status update modal */}
      <Modal
        open={selectedTable !== null}
        onClose={() => setSelectedTable(null)}
        title={selectedTable ? `Table ${selectedTable.tableNumber}` : undefined}
        size="sm"
      >
        {selectedTable && (() => {
          const entry = tableStatuses[selectedTable.id] ?? null;
          const currentStatus = entry?.status ?? TableStatus.AVAILABLE;
          const section = getSectionForTable(selectedTable.id);

          return (
            <div className="space-y-4">
              {/* Current info */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className="inline-flex rounded-full px-3 py-1 text-xs font-semibold text-white"
                    style={{ backgroundColor: TABLE_STATUS_COLORS[currentStatus] }}
                  >
                    {TABLE_STATUS_LABELS[currentStatus]}
                  </span>
                  {section && (
                    <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: section.color }}
                      />
                      {section.name}
                    </span>
                  )}
                </div>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {selectedTable.seats} seats
                </span>
              </div>

              {entry && (
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <p className="text-gray-500 dark:text-gray-400">Guests</p>
                    <p className="font-medium text-gray-900 dark:text-gray-100">
                      {entry.guestCount}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500 dark:text-gray-400">Server</p>
                    <p className="font-medium text-gray-900 dark:text-gray-100">
                      {entry.serverName ?? '--'}
                    </p>
                  </div>
                </div>
              )}

              {/* Status change */}
              <div>
                <p className="mb-2 text-xs font-medium text-gray-500 dark:text-gray-400">
                  Update Status
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {STATUS_CYCLE.map((s) => (
                    <button
                      key={s}
                      onClick={() => {
                        handleStatusChange(selectedTable, s);
                        setSelectedTable(null);
                      }}
                      disabled={updatingStatus || s === currentStatus}
                      className={`rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                        s === currentStatus
                          ? 'text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
                      } ${updatingStatus ? 'cursor-wait opacity-50' : ''}`}
                      style={
                        s === currentStatus
                          ? { backgroundColor: TABLE_STATUS_COLORS[s] }
                          : undefined
                      }
                    >
                      {TABLE_STATUS_LABELS[s]}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* Mobile status panel overlay */}
      {showStatusPanel && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowStatusPanel(false)}
          />
          <div className="absolute bottom-0 left-0 right-0 top-16 rounded-t-2xl bg-white dark:bg-gray-900">
            <div className="flex justify-center py-2">
              <div className="h-1 w-10 rounded-full bg-gray-300 dark:bg-gray-600" />
            </div>
            <TableStatusPanel
              filterMyTables={showMyTables}
              myTableIds={myTableIds}
            />
          </div>
        </div>
      )}
    </div>
  );
}
