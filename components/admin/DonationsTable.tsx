'use client'

import { useCallback, useMemo, useState } from 'react'

import DonationStatusBadge from '@/components/donation-display/DonationStatusBadge'
import {
  canBatchEdit,
  type DonationStatus,
  requiresFileUploadToTransition,
} from '@/lib/donation-status'
import { formatDate, formatDateTime } from '@/lib/i18n-utils'
import type { I18nText } from '@/types'
import type { Database } from '@/types/database'

import BatchDonationEditModal from './BatchDonationEditModal'
import DonationEditModal from './DonationEditModal'
import PrintLabelsModal from './PrintLabelsModal'

type Donation = Database['public']['Tables']['donations']['Row'] & {
  projects: { project_name: string; project_name_i18n: I18nText }
}
type StatusHistory = Database['public']['Tables']['donation_status_history']['Row']

interface Props {
  initialDonations: Donation[]
  statusHistory: StatusHistory[]
}

export default function DonationsTable({ initialDonations, statusHistory }: Props) {
  const [donations, setDonations] = useState(initialDonations)
  const [editingDonation, setEditingDonation] = useState<Donation | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [projectFilter, setProjectFilter] = useState<string>('all')

  // 批量编辑状态
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [showBatchEdit, setShowBatchEdit] = useState(false)
  const [showPrintLabels, setShowPrintLabels] = useState(false)

  const handleEdit = (donation: Donation) => {
    setEditingDonation(donation)
  }

  const handleSaved = (updated: Database['public']['Tables']['donations']['Row']) => {
    setDonations(donations.map((d) => (d.id === updated.id ? { ...d, ...updated } : d)))
    setEditingDonation(null)
  }

  const handleBatchSaved = (
    updatedDonations: Database['public']['Tables']['donations']['Row'][]
  ) => {
    setDonations(
      donations.map((d) => {
        const updated = updatedDonations.find((u) => u.id === d.id)
        return updated ? { ...d, ...updated } : d
      })
    )
    setSelectedIds(new Set())
    setShowBatchEdit(false)
  }

  // Get unique projects for filter
  const uniqueProjects = Array.from(
    new Map(donations.map((d) => [d.project_id, d.projects])).entries()
  ).map(([id, project]) => ({ id, name: project.project_name }))

  // 过滤后的捐赠列表 - 移到 handlers 之前避免引用错误
  const filteredDonations = useMemo(() => {
    return donations.filter((d) => {
      const matchesStatus = statusFilter === 'all' || d.donation_status === statusFilter
      const matchesProject = projectFilter === 'all' || d.project_id === Number(projectFilter)
      return matchesStatus && matchesProject
    })
  }, [donations, statusFilter, projectFilter])

  // 全选/取消全选 - P2 优化: useCallback 避免不必要的重渲染
  const handleSelectAll = useCallback(
    (checked: boolean) => {
      if (checked) {
        const newSelected = new Set(filteredDonations.map((d) => d.id))
        setSelectedIds(newSelected)
      } else {
        setSelectedIds(new Set())
      }
    },
    [filteredDonations]
  )

  // 单选 - P2 优化: useCallback + 函数式 setState
  const handleSelectOne = useCallback((id: number, checked: boolean) => {
    setSelectedIds((prev) => {
      const newSelected = new Set(prev)
      if (checked) {
        newSelected.add(id)
      } else {
        newSelected.delete(id)
      }
      return newSelected
    })
  }, [])

  // 分组全选 - P2 优化: useCallback + 函数式 setState
  const handleSelectGroup = useCallback((groupDonations: Donation[], checked: boolean) => {
    setSelectedIds((prev) => {
      const newSelected = new Set(prev)
      groupDonations.forEach((d) => {
        if (checked) {
          newSelected.add(d.id)
        } else {
          newSelected.delete(d.id)
        }
      })
      return newSelected
    })
  }, [])

  // 按 order_reference 分组
  const donationGroups = useMemo(() => {
    const groups = new Map<string, Donation[]>()

    filteredDonations.forEach((donation) => {
      const key = donation.order_reference || `no-order-${donation.id}`
      if (!groups.has(key)) {
        groups.set(key, [])
      }
      groups.get(key)!.push(donation)
    })

    return Array.from(groups.entries()).map(([orderRef, donations]) => ({
      orderReference: orderRef.startsWith('no-order-') ? null : orderRef,
      donations,
      totalAmount: donations.reduce((sum, d) => sum + d.amount, 0),
    }))
  }, [filteredDonations])

  // 判断全选状态
  const isAllSelected =
    filteredDonations.length > 0 && filteredDonations.every((d) => selectedIds.has(d.id))
  const isSomeSelected = filteredDonations.some((d) => selectedIds.has(d.id)) && !isAllSelected

  // 获取选中的捐赠
  const selectedDonations = useMemo(() => {
    return donations.filter((d) => selectedIds.has(d.id))
  }, [donations, selectedIds])

  // 判断是否可以批量操作
  const canBatchEditSelected = useMemo(() => {
    if (selectedDonations.length === 0) return false

    // 检查所有选中的捐赠状态是否相同
    const statuses = new Set(selectedDonations.map((d) => d.donation_status))
    if (statuses.size !== 1) return false

    const commonStatus = selectedDonations[0].donation_status as DonationStatus

    // 使用 canBatchEdit 辅助函数判断状态是否支持批量编辑
    return canBatchEdit(commonStatus)
  }, [selectedDonations])

  // 获取选中捐赠的共同状态
  const selectedCommonStatus =
    selectedDonations.length > 0 ? selectedDonations[0].donation_status : null

  return (
    <div className="rounded-lg bg-white shadow">
      <div className="px-4 py-5 sm:p-6">
        {/* Filters */}
        <div className="mb-4 space-y-3">
          <div className="grid grid-cols-1 items-start gap-3 sm:grid-cols-2 sm:gap-4 lg:flex lg:flex-wrap lg:items-center">
            <div className="min-w-0">
              <label className="mb-1 block text-sm font-medium text-gray-700 lg:hidden">
                Status
              </label>
              <div className="flex items-center gap-2">
                <label className="hidden whitespace-nowrap text-sm font-medium text-gray-700 lg:block">
                  Status:
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm lg:w-auto"
                >
                  <option value="all">All</option>
                  <option value="pending">Pending</option>
                  <option value="widget_load_failed">Widget Load Failed</option>
                  <option value="processing">Processing</option>
                  <option value="fraud_check">Fraud Check</option>
                  <option value="paid">Paid</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="delivering">Delivering</option>
                  <option value="completed">Completed</option>
                  <option value="expired">Expired</option>
                  <option value="declined">Declined</option>
                  <option value="failed">Failed</option>
                  <option value="refunding">Refunding</option>
                  <option value="refund_processing">Refund Processing</option>
                  <option value="refunded">Refunded</option>
                </select>
              </div>
            </div>

            <div className="min-w-0">
              <label className="mb-1 block text-sm font-medium text-gray-700 lg:hidden">
                Project
              </label>
              <div className="flex items-center gap-2">
                <label className="hidden whitespace-nowrap text-sm font-medium text-gray-700 lg:block">
                  Project:
                </label>
                <select
                  value={projectFilter}
                  onChange={(e) => setProjectFilter(e.target.value)}
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
            <span className="text-sm text-gray-500">Total: {filteredDonations.length}</span>

            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={isAllSelected}
                ref={(input) => {
                  if (input) {
                    input.indeterminate = isSomeSelected
                  }
                }}
                onChange={(e) => handleSelectAll(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Select All</span>
            </label>

            {selectedIds.size > 0 && (
              <span className="text-sm font-medium text-blue-600">
                Selected: {selectedIds.size}
              </span>
            )}
          </div>

          {selectedIds.size > 0 && (
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
                onClick={() => setShowPrintLabels(true)}
                className="rounded-md bg-gray-600 px-3 py-1.5 text-sm text-white transition-colors hover:bg-gray-700 sm:px-4 sm:py-2"
              >
                Print Labels ({selectedIds.size})
              </button>
              <button
                onClick={() => setShowBatchEdit(true)}
                disabled={!canBatchEditSelected}
                className="rounded-md bg-blue-600 px-3 py-1.5 text-sm text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 sm:px-4 sm:py-2"
              >
                Batch Edit ({selectedIds.size})
              </button>
              <button
                onClick={() => setSelectedIds(new Set())}
                className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 transition-colors hover:bg-gray-50 sm:px-4 sm:py-2"
              >
                Clear
              </button>
            </div>
          )}
        </div>

        <div className="space-y-6">
          {donationGroups.map((group) => (
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
                  onChange={(e) => handleSelectGroup(group.donations, e.target.checked)}
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
                        onClick={() => handleEdit(donation)}
                      >
                        <input
                          type="checkbox"
                          checked={selectedIds.has(donation.id)}
                          onChange={(e) => {
                            e.stopPropagation()
                            handleSelectOne(donation.id, e.target.checked)
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="mt-0.5 h-4 w-4 flex-shrink-0 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-gray-900">
                            {donation.donor_name}
                          </div>
                          <div className="truncate text-xs text-gray-500">
                            {donation.donor_email}
                          </div>
                        </div>
                      </div>
                      <DonationStatusBadge status={donation.donation_status as DonationStatus} />
                    </div>
                    <div
                      className="mt-2 flex items-center justify-between text-xs text-gray-500"
                      onClick={() => handleEdit(donation)}
                    >
                      <span className="text-sm font-medium text-gray-900">
                        {donation.amount} {donation.currency || 'UAH'}
                      </span>
                      <span suppressHydrationWarning>
                        #{donation.id} · {formatDate(donation.donated_at)}
                      </span>
                    </div>
                    <div
                      className="mt-1 truncate text-xs text-gray-400"
                      onClick={() => handleEdit(donation)}
                    >
                      {donation.projects.project_name}
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
                              const allSelected = group.donations.every((d) =>
                                selectedIds.has(d.id)
                              )
                              const someSelected =
                                group.donations.some((d) => selectedIds.has(d.id)) && !allSelected
                              input.indeterminate = someSelected
                            }
                          }}
                          onChange={(e) => handleSelectGroup(group.donations, e.target.checked)}
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
                            onChange={(e) => handleSelectOne(donation.id, e.target.checked)}
                            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                        </td>
                        <td
                          className="cursor-pointer px-3 py-3 text-sm text-gray-900"
                          onClick={() => handleEdit(donation)}
                        >
                          <div className="font-medium">#{donation.id}</div>
                          <div className="text-xs text-gray-500">{donation.donation_public_id}</div>
                        </td>
                        <td
                          className="cursor-pointer px-3 py-3 text-sm"
                          onClick={() => handleEdit(donation)}
                        >
                          <div className="font-medium text-gray-900">{donation.donor_name}</div>
                          <div className="max-w-[150px] truncate text-xs text-gray-500">
                            {donation.donor_email}
                          </div>
                        </td>
                        <td
                          className="max-w-[150px] cursor-pointer px-3 py-3 text-sm text-gray-500"
                          onClick={() => handleEdit(donation)}
                        >
                          <div className="truncate">{donation.projects.project_name}</div>
                        </td>
                        <td
                          className="cursor-pointer whitespace-nowrap px-3 py-3 text-sm text-gray-900"
                          onClick={() => handleEdit(donation)}
                        >
                          {donation.amount} {donation.currency || 'UAH'}
                        </td>
                        <td
                          className="cursor-pointer whitespace-nowrap px-3 py-3"
                          onClick={() => handleEdit(donation)}
                        >
                          <DonationStatusBadge
                            status={donation.donation_status as DonationStatus}
                          />
                        </td>
                        <td
                          className="cursor-pointer px-3 py-3 text-sm text-gray-500"
                          onClick={() => handleEdit(donation)}
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
          ))}
        </div>
      </div>

      {editingDonation && (
        <DonationEditModal
          donation={editingDonation}
          statusHistory={statusHistory.filter((h) => h.donation_id === editingDonation.id)}
          onClose={() => setEditingDonation(null)}
          onSaved={handleSaved}
        />
      )}

      {showBatchEdit && (
        <BatchDonationEditModal
          donations={selectedDonations}
          onClose={() => setShowBatchEdit(false)}
          onSaved={handleBatchSaved}
        />
      )}

      {showPrintLabels && (
        <PrintLabelsModal donations={selectedDonations} onClose={() => setShowPrintLabels(false)} />
      )}
    </div>
  )
}
