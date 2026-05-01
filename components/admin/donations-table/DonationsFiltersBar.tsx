'use client'

import {
  DONATION_STATUSES,
  type DonationStatus,
  requiresFileUploadToTransition,
} from '@/lib/donation-status'

import type { Donation, DonationTableFilters, UniqueProject } from './types'

interface Props {
  filters: DonationTableFilters
  setFilters: (
    next: DonationTableFilters | ((prev: DonationTableFilters) => DonationTableFilters)
  ) => void
  uniqueProjects: UniqueProject[]
  totalCount: number
  isAllSelected: boolean
  isSomeSelected: boolean
  onSelectAll: (checked: boolean) => void
  selectedCount: number
  selectedDonations: Donation[]
  selectedCommonStatus: string | null
  canBatchEditSelected: boolean
  onShowPrintLabels: () => void
  onShowBatchEdit: () => void
  onClearSelection: () => void
}

export default function DonationsFiltersBar({
  filters,
  setFilters,
  uniqueProjects,
  totalCount,
  isAllSelected,
  isSomeSelected,
  onSelectAll,
  selectedCount,
  selectedDonations,
  selectedCommonStatus,
  canBatchEditSelected,
  onShowPrintLabels,
  onShowBatchEdit,
  onClearSelection,
}: Props) {
  return (
    <div className="mb-4 space-y-3">
      <div className="grid grid-cols-1 items-start gap-3 sm:grid-cols-2 sm:gap-4 lg:flex lg:flex-wrap lg:items-center">
        <div className="min-w-0">
          <label className="mb-1 block text-sm font-medium text-gray-700 lg:hidden">Status</label>
          <div className="flex items-center gap-2">
            <label className="hidden whitespace-nowrap text-sm font-medium text-gray-700 lg:block">
              Status:
            </label>
            <select
              value={filters.status}
              onChange={(e) => setFilters((p) => ({ ...p, status: e.target.value }))}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm lg:w-auto"
            >
              <option value="all">All</option>
              {DONATION_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s
                    .split('_')
                    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                    .join(' ')}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="min-w-0">
          <label className="mb-1 block text-sm font-medium text-gray-700 lg:hidden">Project</label>
          <div className="flex items-center gap-2">
            <label className="hidden whitespace-nowrap text-sm font-medium text-gray-700 lg:block">
              Project:
            </label>
            <select
              value={filters.project}
              onChange={(e) => setFilters((p) => ({ ...p, project: e.target.value }))}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm lg:w-auto"
            >
              <option value="all">All Projects</option>
              {uniqueProjects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm text-gray-500">Total: {totalCount}</span>

        <label className="flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            checked={isAllSelected}
            ref={(input) => {
              if (input) {
                input.indeterminate = isSomeSelected
              }
            }}
            onChange={(e) => onSelectAll(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm text-gray-700">Select All</span>
        </label>

        {selectedCount > 0 && (
          <span className="text-sm font-medium text-blue-600">Selected: {selectedCount}</span>
        )}
      </div>

      {selectedCount > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {!canBatchEditSelected && (
            <span className="text-sm text-amber-600">
              {selectedDonations.length > 0 &&
              new Set(selectedDonations.map((d) => d.donation_status)).size > 1
                ? 'Selected donations have different statuses'
                : requiresFileUploadToTransition(selectedCommonStatus as DonationStatus)
                  ? 'This status requires file upload (cannot batch edit)'
                  : 'Cannot batch edit'}
            </span>
          )}
          <button
            onClick={onShowPrintLabels}
            className="rounded-md bg-gray-600 px-3 py-1.5 text-sm text-white transition-colors hover:bg-gray-700 sm:px-4 sm:py-2"
          >
            Print Labels ({selectedCount})
          </button>
          <button
            onClick={onShowBatchEdit}
            disabled={!canBatchEditSelected}
            className="rounded-md bg-blue-600 px-3 py-1.5 text-sm text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 sm:px-4 sm:py-2"
          >
            Batch Edit ({selectedCount})
          </button>
          <button
            onClick={onClearSelection}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 transition-colors hover:bg-gray-50 sm:px-4 sm:py-2"
          >
            Clear
          </button>
        </div>
      )}
    </div>
  )
}
