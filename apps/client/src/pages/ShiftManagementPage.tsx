import { Clock, ChevronRight } from 'lucide-react';
import { ShiftManager } from '@/components/shifts/ShiftManager';

export function ShiftManagementPage() {
  return (
    <div className="p-6">
      {/* Breadcrumb header */}
      <div className="mb-6">
        <div className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
          <span>FloorView</span>
          <ChevronRight className="h-3 w-3" />
          <span className="font-medium text-gray-900 dark:text-gray-100">
            Shift Management
          </span>
        </div>
        <div className="mt-2 flex items-center gap-3">
          <Clock className="h-6 w-6 text-gray-500 dark:text-gray-400" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Shift Management
          </h1>
        </div>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Create shifts, assign servers to sections, and manage your scheduling.
        </p>
      </div>

      {/* Shift Manager component */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
        <ShiftManager />
      </div>
    </div>
  );
}
