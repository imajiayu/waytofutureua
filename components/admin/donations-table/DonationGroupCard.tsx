'use client'

import DonationStatusBadge from '@/components/donation-display/DonationStatusBadge'
import type { DonationStatus } from '@/lib/donation-status'
import { formatDate, formatDateTime, getTranslatedText } from '@/lib/i18n-utils'

import type { Donation, DonationGroup } from './types'

interface Props {
  group: DonationGroup
  selectedIds: Set<number>
  onSelectOne: (id: number, checked: boolean) => void
  onSelectGroup: (donations: Donation[], checked: boolean) => void
  onEdit: (donation: Donation) => void
}

export default function DonationGroupCard({
  group,
  selectedIds,
  onSelectOne,
  onSelectGroup,
  onEdit,
}: Props) {
  return (
    <div
      key={group.orderReference || 'no-order'}
      className="rounded-lg border-2 border-gray-300 bg-gray-50 p-2 sm:p-4"
    >
      {/* Order header */}
      {group.orderReference && (
        <div className="mb-3 border-b border-gray-300 pb-3">
          <div className="flex flex-col justify-between gap-1 sm:flex-row sm:items-center">
            <div className="truncate text-sm font-semibold text-gray-900 sm:text-base">
              Order: {group.orderReference}
            </div>
            <div className="flex-shrink-0 text-xs text-gray-600 sm:text-sm">
              {group.donations.length} donation(s) | Total: ₴{group.totalAmount.toFixed(2)}
            </div>
          </div>
        </div>
      )}

      {/* Group select */}
      <div className="mb-2 flex items-center gap-2 sm:hidden">
        <input
          type="checkbox"
          checked={group.donations.every((d) => selectedIds.has(d.id))}
          ref={(input) => {
            if (input) {
              const allSelected = group.donations.every((d) => selectedIds.has(d.id))
              const someSelected =
                group.donations.some((d) => selectedIds.has(d.id)) && !allSelected
              input.indeterminate = someSelected
            }
          }}
          onChange={(e) => onSelectGroup(group.donations, e.target.checked)}
          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
        <span className="text-xs text-gray-500">Select group</span>
      </div>

      {/* Mobile card view */}
      <div className="space-y-2 sm:hidden">
        {group.donations.map((donation) => (
          <div
            key={donation.id}
            className={`rounded-md border bg-white p-3 ${selectedIds.has(donation.id) ? 'border-blue-300 bg-blue-50' : 'border-gray-200'}`}
          >
            <div className="flex items-start justify-between gap-2">
              <div
                className="flex min-w-0 flex-1 items-start gap-2"
                onClick={() => onEdit(donation)}
              >
                <input
                  type="checkbox"
                  checked={selectedIds.has(donation.id)}
                  onChange={(e) => {
                    e.stopPropagation()
                    onSelectOne(donation.id, e.target.checked)
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className="mt-0.5 h-4 w-4 flex-shrink-0 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <div className="min-w-0">
                  <div className="text-sm font-medium text-gray-900">{donation.donor_name}</div>
                  <div className="truncate text-xs text-gray-500">{donation.donor_email}</div>
                </div>
              </div>
              <DonationStatusBadge status={donation.donation_status as DonationStatus} />
            </div>
            <div
              className="mt-2 flex items-center justify-between text-xs text-gray-500"
              onClick={() => onEdit(donation)}
            >
              <span className="text-sm font-medium text-gray-900">
                {donation.amount} {donation.currency || 'UAH'}
              </span>
              <span suppressHydrationWarning>
                #{donation.id} · {formatDate(donation.donated_at)}
              </span>
            </div>
            <div className="mt-1 truncate text-xs text-gray-400" onClick={() => onEdit(donation)}>
              {getTranslatedText(donation.projects.project_name_i18n, 'en')}
            </div>
          </div>
        ))}
      </div>

      {/* Desktop table view */}
      <div className="hidden overflow-x-auto sm:block">
        <table className="min-w-full divide-y divide-gray-200 overflow-hidden rounded-md bg-white">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-3 text-left">
                <input
                  type="checkbox"
                  checked={group.donations.every((d) => selectedIds.has(d.id))}
                  ref={(input) => {
                    if (input) {
                      const allSelected = group.donations.every((d) => selectedIds.has(d.id))
                      const someSelected =
                        group.donations.some((d) => selectedIds.has(d.id)) && !allSelected
                      input.indeterminate = someSelected
                    }
                  }}
                  onChange={(e) => onSelectGroup(group.donations, e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium uppercase text-gray-500">
                ID
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium uppercase text-gray-500">
                Donor / Email
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium uppercase text-gray-500">
                Project
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium uppercase text-gray-500">
                Amount
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium uppercase text-gray-500">
                Status
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium uppercase text-gray-500">
                Date
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {group.donations.map((donation) => (
              <tr
                key={donation.id}
                className={`hover:bg-gray-50 ${selectedIds.has(donation.id) ? 'bg-blue-50' : ''}`}
              >
                <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={selectedIds.has(donation.id)}
                    onChange={(e) => onSelectOne(donation.id, e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </td>
                <td
                  className="cursor-pointer px-3 py-3 text-sm text-gray-900"
                  onClick={() => onEdit(donation)}
                >
                  <div className="font-medium">#{donation.id}</div>
                  <div className="text-xs text-gray-500">{donation.donation_public_id}</div>
                </td>
                <td className="cursor-pointer px-3 py-3 text-sm" onClick={() => onEdit(donation)}>
                  <div className="font-medium text-gray-900">{donation.donor_name}</div>
                  <div className="max-w-[150px] truncate text-xs text-gray-500">
                    {donation.donor_email}
                  </div>
                </td>
                <td
                  className="max-w-[150px] cursor-pointer px-3 py-3 text-sm text-gray-500"
                  onClick={() => onEdit(donation)}
                >
                  <div className="truncate">
                    {getTranslatedText(donation.projects.project_name_i18n, 'en')}
                  </div>
                </td>
                <td
                  className="cursor-pointer whitespace-nowrap px-3 py-3 text-sm text-gray-900"
                  onClick={() => onEdit(donation)}
                >
                  {donation.amount} {donation.currency || 'UAH'}
                </td>
                <td
                  className="cursor-pointer whitespace-nowrap px-3 py-3"
                  onClick={() => onEdit(donation)}
                >
                  <DonationStatusBadge status={donation.donation_status as DonationStatus} />
                </td>
                <td
                  className="cursor-pointer px-3 py-3 text-sm text-gray-500"
                  onClick={() => onEdit(donation)}
                >
                  <div suppressHydrationWarning>{formatDate(donation.donated_at)}</div>
                  <div className="text-xs text-gray-400" suppressHydrationWarning>
                    {formatDateTime(donation.donated_at, 'en', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
