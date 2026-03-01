import { useState, useCallback } from 'react';
import {
  Plus,
  Pencil,
  Trash2,
  MousePointerClick,
  Check,
  X,
} from 'lucide-react';
import { SECTION_COLORS } from '@rfm/shared';
import type { Section } from '@rfm/shared';
import { sectionApi } from '@/api';
import { useFloorStore } from '@/stores/floorStore';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Spinner';
import toast from 'react-hot-toast';

interface SectionFormState {
  name: string;
  color: string;
}

const INITIAL_FORM: SectionFormState = {
  name: '',
  color: SECTION_COLORS[0],
};

export function SectionPanel() {
  const sections = useFloorStore((s) => s.sections);
  const tables = useFloorStore((s) => s.tables);
  const currentLayout = useFloorStore((s) => s.currentLayout);
  const currentFloor = useFloorStore((s) => s.currentFloor);
  const addSectionToStore = useFloorStore((s) => s.addSection);
  const removeSectionFromStore = useFloorStore((s) => s.removeSection);
  const updateSectionInStore = useFloorStore((s) => s.updateSection);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<SectionFormState>(INITIAL_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [assignMode, setAssignMode] = useState(false);
  const [assigningTableIds, setAssigningTableIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const usedColors = sections.map((s) => s.color);

  const handleCreateSection = useCallback(async () => {
    if (!form.name.trim() || !currentLayout || !currentFloor) return;

    setLoading(true);
    try {
      const section = await sectionApi.create({
        name: form.name.trim(),
        color: form.color,
        layoutId: currentLayout.id,
        floorId: currentFloor.id,
      });
      addSectionToStore(section);
      setForm(INITIAL_FORM);
      setShowForm(false);
      toast.success(`Section "${section.name}" created`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create section';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [form, currentLayout, currentFloor, addSectionToStore]);

  const handleUpdateSection = useCallback(async () => {
    if (!editingId || !form.name.trim()) return;

    setLoading(true);
    try {
      const updated = await sectionApi.update(editingId, {
        name: form.name.trim(),
        color: form.color,
      });
      updateSectionInStore(editingId, updated);
      setEditingId(null);
      setForm(INITIAL_FORM);
      toast.success('Section updated');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update section';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [editingId, form, updateSectionInStore]);

  const handleDeleteSection = useCallback(async (id: string) => {
    setDeletingId(id);
    try {
      await sectionApi.delete(id);
      removeSectionFromStore(id);
      if (selectedSectionId === id) {
        setSelectedSectionId(null);
        setAssignMode(false);
      }
      toast.success('Section deleted');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete section';
      toast.error(message);
    } finally {
      setDeletingId(null);
    }
  }, [removeSectionFromStore, selectedSectionId]);

  const startEditing = useCallback((section: Section) => {
    setEditingId(section.id);
    setForm({ name: section.name, color: section.color });
    setShowForm(false);
  }, []);

  const cancelEditing = useCallback(() => {
    setEditingId(null);
    setForm(INITIAL_FORM);
  }, []);

  const handleSelectSection = useCallback((sectionId: string) => {
    if (selectedSectionId === sectionId) {
      setSelectedSectionId(null);
      setAssignMode(false);
      setAssigningTableIds([]);
    } else {
      setSelectedSectionId(sectionId);
      const section = sections.find((s) => s.id === sectionId);
      setAssigningTableIds(section?.tables?.map((t) => t.id) ?? []);
    }
  }, [selectedSectionId, sections]);

  const toggleAssignMode = useCallback(() => {
    if (!selectedSectionId) return;
    if (assignMode) {
      // Save assignment
      sectionApi
        .assignTables(selectedSectionId, assigningTableIds)
        .then((updated) => {
          updateSectionInStore(selectedSectionId, updated);
          toast.success('Tables assigned');
        })
        .catch(() => toast.error('Failed to assign tables'));
    }
    setAssignMode((prev) => !prev);
  }, [assignMode, selectedSectionId, assigningTableIds, updateSectionInStore]);

  const toggleTableInAssignment = useCallback((tableId: string) => {
    setAssigningTableIds((prev) =>
      prev.includes(tableId)
        ? prev.filter((id) => id !== tableId)
        : [...prev, tableId],
    );
  }, []);

  const getTableCountForSection = useCallback(
    (section: Section) => section.tables?.length ?? 0,
    [],
  );

  if (!currentLayout) {
    return (
      <div className="flex h-full items-center justify-center p-4">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Select a layout to manage sections.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-gray-200 px-4 py-3 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            Sections
          </h3>
          <Button
            variant="ghost"
            size="sm"
            icon={<Plus className="h-4 w-4" />}
            onClick={() => {
              setShowForm(true);
              setEditingId(null);
              setForm(INITIAL_FORM);
            }}
          >
            Add
          </Button>
        </div>
      </div>

      {/* Create / Edit Form */}
      {(showForm || editingId) && (
        <div className="border-b border-gray-200 p-4 dark:border-gray-700">
          <Input
            label={editingId ? 'Edit Section' : 'Section Name'}
            placeholder="e.g., Patio, Main Dining"
            value={form.name}
            onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
          />
          <div className="mt-3">
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Color
            </label>
            <div className="flex flex-wrap gap-2">
              {SECTION_COLORS.map((color) => {
                const isUsed = usedColors.includes(color) && color !== form.color;
                return (
                  <button
                    key={color}
                    onClick={() => setForm((prev) => ({ ...prev, color }))}
                    disabled={isUsed}
                    className={`h-7 w-7 rounded-full border-2 transition-transform ${
                      form.color === color
                        ? 'scale-110 border-gray-900 dark:border-white'
                        : 'border-transparent hover:scale-105'
                    } ${isUsed ? 'cursor-not-allowed opacity-30' : ''}`}
                    style={{ backgroundColor: color }}
                    title={isUsed ? 'Already in use' : color}
                  />
                );
              })}
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <Button
              size="sm"
              loading={loading}
              onClick={editingId ? handleUpdateSection : handleCreateSection}
              disabled={!form.name.trim()}
            >
              {editingId ? 'Update' : 'Create'}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setShowForm(false);
                cancelEditing();
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Assign Mode Banner */}
      {assignMode && selectedSectionId && (
        <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 dark:border-amber-800 dark:bg-amber-950">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-amber-700 dark:text-amber-300">
              Click tables below to toggle assignment
            </p>
            <Button size="sm" variant="ghost" onClick={toggleAssignMode}>
              <Check className="mr-1 h-3 w-3" />
              Done
            </Button>
          </div>
        </div>
      )}

      {/* Section List */}
      <div className="custom-scrollbar flex-1 overflow-y-auto p-2">
        {sections.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="rounded-full bg-gray-100 p-3 dark:bg-gray-800">
              <MousePointerClick className="h-6 w-6 text-gray-400 dark:text-gray-500" />
            </div>
            <p className="mt-3 text-sm font-medium text-gray-500 dark:text-gray-400">
              No sections yet
            </p>
            <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
              Create sections to organize your tables.
            </p>
          </div>
        ) : (
          <ul className="space-y-1">
            {sections.map((section) => {
              const isSelected = selectedSectionId === section.id;
              const tableCount = getTableCountForSection(section);
              const isDeleting = deletingId === section.id;

              return (
                <li key={section.id}>
                  <button
                    onClick={() => handleSelectSection(section.id)}
                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors ${
                      isSelected
                        ? 'bg-gray-100 ring-1 ring-gray-300 dark:bg-gray-800 dark:ring-gray-600'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
                    }`}
                  >
                    {/* Color Dot */}
                    <span
                      className="h-3.5 w-3.5 shrink-0 rounded-full"
                      style={{ backgroundColor: section.color }}
                    />

                    {/* Name + count */}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">
                        {section.name}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {tableCount} table{tableCount !== 1 ? 's' : ''}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex shrink-0 items-center gap-1">
                      {isSelected && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleAssignMode();
                          }}
                          className={`rounded p-1 text-xs ${
                            assignMode
                              ? 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300'
                              : 'text-gray-400 hover:bg-gray-200 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300'
                          }`}
                          title={assignMode ? 'Save assignments' : 'Assign tables'}
                        >
                          <MousePointerClick className="h-3.5 w-3.5" />
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          startEditing(section);
                        }}
                        className="rounded p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300"
                        title="Edit"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteSection(section.id);
                        }}
                        disabled={isDeleting}
                        className="rounded p-1 text-gray-400 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900 dark:hover:text-red-400"
                        title="Delete"
                      >
                        {isDeleting ? (
                          <Spinner size="sm" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Table list for assign mode */}
      {assignMode && selectedSectionId && (
        <div className="border-t border-gray-200 dark:border-gray-700">
          <div className="px-4 py-2">
            <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">
              Tables
            </p>
          </div>
          <div className="custom-scrollbar max-h-48 overflow-y-auto px-2 pb-2">
            <div className="grid grid-cols-3 gap-1">
              {tables.map((table) => {
                const isAssigned = assigningTableIds.includes(table.id);
                return (
                  <button
                    key={table.id}
                    onClick={() => toggleTableInAssignment(table.id)}
                    className={`flex items-center justify-center rounded-md border px-2 py-1.5 text-xs font-medium transition-colors ${
                      isAssigned
                        ? 'border-brand-300 bg-brand-50 text-brand-700 dark:border-brand-600 dark:bg-brand-950 dark:text-brand-300'
                        : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-gray-800'
                    }`}
                  >
                    {isAssigned && <Check className="mr-1 h-3 w-3" />}
                    T{table.tableNumber}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
