import { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  Calendar,
  Clock,
  ChevronDown,
  ChevronUp,
  Users,
  Trash2,
  UserPlus,
  Shield,
} from 'lucide-react';
import { AssignmentStatus } from '@rfm/shared';
import type { Shift, ShiftAssignment, Section } from '@rfm/shared';
import { shiftApi } from '@/api';
import { useFloorStore } from '@/stores/floorStore';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { StaffList } from './StaffList';
import toast from 'react-hot-toast';

const ASSIGNMENT_STATUS_CONFIG: Record<
  AssignmentStatus,
  { label: string; variant: 'default' | 'warning' | 'success' | 'info' }
> = {
  [AssignmentStatus.ASSIGNED]: { label: 'Assigned', variant: 'default' },
  [AssignmentStatus.CLAIMED]: { label: 'Claimed', variant: 'warning' },
  [AssignmentStatus.ACTIVE]: { label: 'Active', variant: 'success' },
  [AssignmentStatus.COMPLETED]: { label: 'Completed', variant: 'info' },
};

function formatTime(date: Date | string): string {
  return new Date(date).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getTodayString(): string {
  const d = new Date();
  return d.toISOString().split('T')[0];
}

export function ShiftManager() {
  const { user } = useAuth();
  const currentFloor = useFloorStore((s) => s.currentFloor);
  const sections = useFloorStore((s) => s.sections);

  const [selectedDate, setSelectedDate] = useState(getTodayString());
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedShiftId, setExpandedShiftId] = useState<string | null>(null);

  // Create shift modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: '',
    startTime: '11:00',
    endTime: '15:00',
  });
  const [creating, setCreating] = useState(false);

  // Assign modal
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assigningShiftId, setAssigningShiftId] = useState<string | null>(null);
  const [assigningSectionId, setAssigningSectionId] = useState<string | null>(null);

  // Deleting
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Claiming
  const [claimingId, setClaimingId] = useState<string | null>(null);

  // Load shifts when date changes
  useEffect(() => {
    setLoading(true);
    shiftApi
      .getByDate(selectedDate)
      .then((data) => setShifts(data))
      .catch(() => toast.error('Failed to load shifts'))
      .finally(() => setLoading(false));
  }, [selectedDate]);

  const handleCreateShift = useCallback(async () => {
    if (!currentFloor || !createForm.name.trim()) return;

    setCreating(true);
    try {
      const shift = await shiftApi.create({
        name: createForm.name.trim(),
        startTime: createForm.startTime,
        endTime: createForm.endTime,
        date: selectedDate,
        floorId: currentFloor.id,
      });
      setShifts((prev) => [...prev, shift]);
      setShowCreateModal(false);
      setCreateForm({ name: '', startTime: '11:00', endTime: '15:00' });
      toast.success(`Shift "${shift.name}" created`);
    } catch {
      toast.error('Failed to create shift');
    } finally {
      setCreating(false);
    }
  }, [currentFloor, createForm, selectedDate]);

  const handleDeleteShift = useCallback(async (shiftId: string) => {
    setDeletingId(shiftId);
    try {
      await shiftApi.delete(shiftId);
      setShifts((prev) => prev.filter((s) => s.id !== shiftId));
      toast.success('Shift deleted');
    } catch {
      toast.error('Failed to delete shift');
    } finally {
      setDeletingId(null);
    }
  }, []);

  const handleAssignServer = useCallback(
    async (userId: string) => {
      if (!assigningShiftId || !assigningSectionId) return;

      try {
        const assignment = await shiftApi.assignServer(assigningShiftId, {
          userId,
          sectionId: assigningSectionId,
        });
        setShifts((prev) =>
          prev.map((s) => {
            if (s.id !== assigningShiftId) return s;
            return {
              ...s,
              assignments: [...(s.assignments ?? []), assignment],
            };
          }),
        );
        setShowAssignModal(false);
        setAssigningShiftId(null);
        setAssigningSectionId(null);
        toast.success('Server assigned');
      } catch {
        toast.error('Failed to assign server');
      }
    },
    [assigningShiftId, assigningSectionId],
  );

  const handleClaimSection = useCallback(
    async (shiftId: string) => {
      setClaimingId(shiftId);
      try {
        const updated = await shiftApi.claimSection(shiftId);
        setShifts((prev) =>
          prev.map((s) => {
            if (s.id !== shiftId) return s;
            return {
              ...s,
              assignments: (s.assignments ?? []).map((a) =>
                a.id === updated.id ? updated : a,
              ),
            };
          }),
        );
        toast.success('Section claimed!');
      } catch {
        toast.error('Failed to claim section');
      } finally {
        setClaimingId(null);
      }
    },
    [],
  );

  const getSectionById = useCallback(
    (id: string): Section | undefined => sections.find((s) => s.id === id),
    [sections],
  );

  const getAssignmentForSection = useCallback(
    (shift: Shift, sectionId: string): ShiftAssignment | undefined =>
      shift.assignments?.find((a) => a.sectionId === sectionId),
    [],
  );

  return (
    <div className="space-y-4">
      {/* Date picker + Create button */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Calendar className="h-5 w-5 text-gray-400" />
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100 dark:focus:border-brand-400"
          />
        </div>
        <Button
          icon={<Plus className="h-4 w-4" />}
          onClick={() => setShowCreateModal(true)}
          disabled={!currentFloor}
        >
          Create Shift
        </Button>
      </div>

      {/* Shift list */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : shifts.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 py-16 text-center dark:border-gray-700">
          <Clock className="h-12 w-12 text-gray-300 dark:text-gray-600" />
          <p className="mt-3 text-sm font-medium text-gray-500 dark:text-gray-400">
            No shifts for {selectedDate}
          </p>
          <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
            Create a shift to start scheduling your team.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {shifts.map((shift) => {
            const isExpanded = expandedShiftId === shift.id;
            const assignmentCount = shift.assignments?.length ?? 0;
            const isDeleting = deletingId === shift.id;

            return (
              <div
                key={shift.id}
                className="rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900"
              >
                {/* Shift header */}
                <button
                  onClick={() =>
                    setExpandedShiftId(isExpanded ? null : shift.id)
                  }
                  className="flex w-full items-center justify-between px-4 py-3 text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 dark:bg-brand-950">
                      <Clock className="h-5 w-5 text-brand-600 dark:text-brand-400" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                        {shift.name}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {formatTime(shift.startTime)} - {formatTime(shift.endTime)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                      <Users className="h-3.5 w-3.5" />
                      <span>{assignmentCount} assigned</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteShift(shift.id);
                        }}
                        disabled={isDeleting}
                        className="rounded p-1 text-gray-400 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900 dark:hover:text-red-400"
                        title="Delete shift"
                      >
                        {isDeleting ? (
                          <Spinner size="sm" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </button>
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4 text-gray-400" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-gray-400" />
                      )}
                    </div>
                  </div>
                </button>

                {/* Expanded: section assignments */}
                {isExpanded && (
                  <div className="border-t border-gray-100 px-4 py-3 dark:border-gray-800">
                    {sections.length === 0 ? (
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        No sections configured. Create sections in the Floor Plan editor first.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                          Section Assignments
                        </p>
                        <div className="grid gap-2 sm:grid-cols-2">
                          {sections.map((section) => {
                            const assignment = getAssignmentForSection(
                              shift,
                              section.id,
                            );
                            const config = assignment
                              ? ASSIGNMENT_STATUS_CONFIG[assignment.status]
                              : null;
                            const isCurrentUser =
                              assignment?.userId === user?.id;
                            const canClaim =
                              isCurrentUser &&
                              assignment?.status === AssignmentStatus.ASSIGNED;
                            const isClaiming = claimingId === shift.id;

                            return (
                              <div
                                key={section.id}
                                className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 dark:border-gray-800 dark:bg-gray-800/50"
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <span
                                    className="h-3 w-3 shrink-0 rounded-full"
                                    style={{ backgroundColor: section.color }}
                                  />
                                  <div className="min-w-0">
                                    <p className="truncate text-xs font-medium text-gray-900 dark:text-gray-100">
                                      {section.name}
                                    </p>
                                    {assignment?.user ? (
                                      <div className="flex items-center gap-1.5">
                                        <p className="truncate text-xs text-gray-500 dark:text-gray-400">
                                          {assignment.user.name}
                                        </p>
                                        {config && (
                                          <Badge variant={config.variant}>
                                            {config.label}
                                          </Badge>
                                        )}
                                      </div>
                                    ) : (
                                      <p className="text-xs text-gray-400 dark:text-gray-500">
                                        Unassigned
                                      </p>
                                    )}
                                  </div>
                                </div>

                                <div className="flex items-center gap-1 shrink-0">
                                  {canClaim && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      loading={isClaiming}
                                      icon={<Shield className="h-3 w-3" />}
                                      onClick={() => handleClaimSection(shift.id)}
                                    >
                                      Claim
                                    </Button>
                                  )}
                                  {!assignment && (
                                    <button
                                      onClick={() => {
                                        setAssigningShiftId(shift.id);
                                        setAssigningSectionId(section.id);
                                        setShowAssignModal(true);
                                      }}
                                      className="rounded p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300"
                                      title="Assign server"
                                    >
                                      <UserPlus className="h-4 w-4" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Create Shift Modal */}
      <Modal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create Shift"
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => setShowCreateModal(false)}
            >
              Cancel
            </Button>
            <Button
              loading={creating}
              onClick={handleCreateShift}
              disabled={!createForm.name.trim()}
            >
              Create
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Shift Name"
            placeholder="e.g., Lunch, Dinner, Late Night"
            value={createForm.name}
            onChange={(e) =>
              setCreateForm((prev) => ({ ...prev, name: e.target.value }))
            }
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Start Time"
              type="time"
              value={createForm.startTime}
              onChange={(e) =>
                setCreateForm((prev) => ({ ...prev, startTime: e.target.value }))
              }
            />
            <Input
              label="End Time"
              type="time"
              value={createForm.endTime}
              onChange={(e) =>
                setCreateForm((prev) => ({ ...prev, endTime: e.target.value }))
              }
            />
          </div>
        </div>
      </Modal>

      {/* Assign Server Modal */}
      <Modal
        open={showAssignModal}
        onClose={() => {
          setShowAssignModal(false);
          setAssigningShiftId(null);
          setAssigningSectionId(null);
        }}
        title="Assign Server"
        size="lg"
      >
        <div>
          {assigningSectionId && (
            <div className="mb-3 flex items-center gap-2">
              <span className="text-sm text-gray-500 dark:text-gray-400">
                Assigning to:
              </span>
              {(() => {
                const sec = getSectionById(assigningSectionId);
                return sec ? (
                  <div className="flex items-center gap-1.5">
                    <span
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: sec.color }}
                    />
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {sec.name}
                    </span>
                  </div>
                ) : null;
              })()}
            </div>
          )}
          <StaffList onSelectServer={handleAssignServer} />
        </div>
      </Modal>
    </div>
  );
}
