'use client'

import { useState, useMemo, useCallback } from 'react'
import type { Database } from '@/types/database'
import DonationEditModal from './DonationEditModal'
import BatchDonationEditModal from './BatchDonationEditModal'
import PrintLabelsModal from './PrintLabelsModal'
import DonationStatusBadge from '@/components/donation-display/DonationStatusBadge'
import { canBatchEdit, requiresFileUploadToTransition, type DonationStatus } from '@/lib/donation-status'
import { formatDate, formatDateTime } from '@/lib/i18n-utils'
import type { I18nText } from '@/types'

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

  const handleBatchSaved = (updatedDonations: Database['public']['Tables']['donations']['Row'][]) => {
    setDonations(donations.map((d) => {
      const updated = updatedDonations.find((u) => u.id === d.id)
      return updated ? { ...d, ...updated } : d
    }))
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
  const handleSelectAll = useCallback((checked: boolean) => {
    if (checked) {
      const newSelected = new Set(filteredDonations.map(d => d.id))
      setSelectedIds(newSelected)
    } else {
      setSelectedIds(new Set())
    }
  }, [filteredDonations])

  // 单选 - P2 优化: useCallback + 函数式 setState
  const handleSelectOne = useCallback((id: number, checked: boolean) => {
    setSelectedIds(prev => {
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
    setSelectedIds(prev => {
      const newSelected = new Set(prev)
      groupDonations.forEach(d => {
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
      totalAmount: donations.reduce((sum, d) => sum + d.amount, 0)
    }))
  }, [filteredDonations])

  // 判断全选状态
  const isAllSelected = filteredDonations.length > 0 &&
    filteredDonations.every(d => selectedIds.has(d.id))
  const isSomeSelected = filteredDonations.some(d => selectedIds.has(d.id)) && !isAllSelected

  // 获取选中的捐赠
  const selectedDonations = useMemo(() => {
    return donations.filter(d => selectedIds.has(d.id))
  }, [donations, selectedIds])

  // 判断是否可以批量操作
  const canBatchEditSelected = useMemo(() => {
    if (selectedDonations.length === 0) return false

    // 检查所有选中的捐赠状态是否相同
    const statuses = new Set(selectedDonations.map(d => d.donation_status))
    if (statuses.size !== 1) return false

    const commonStatus = selectedDonations[0].donation_status as DonationStatus

    // 使用 canBatchEdit 辅助函数判断状态是否支持批量编辑
    return canBatchEdit(commonStatus)
  }, [selectedDonations])

  // 获取选中捐赠的共同状态
  const selectedCommonStatus = selectedDonations.length > 0
    ? selectedDonations[0].donation_status
    : null

  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-4 py-5 sm:p-6">
        {/* Filters */}
        <div className="mb-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex lg:flex-wrap gap-3 sm:gap-4 items-start lg:items-center">
            <div className="min-w-0">
              <label className="block text-sm font-medium text-gray-700 mb-1 lg:hidden">
                Status
              </label>
              <div className="flex items-center gap-2">
                <label className="hidden lg:block text-sm font-medium text-gray-700 whitespace-nowrap">
                  Status:
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full lg:w-auto px-3 py-2 border border-gray-300 rounded-md text-sm"
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
              <label className="block text-sm font-medium text-gray-700 mb-1 lg:hidden">
                Project
              </label>
              <div className="flex items-center gap-2">
                <label className="hidden lg:block text-sm font-medium text-gray-700 whitespace-nowrap">
                  Project:
                </label>
                <select
                  value={projectFilter}
                  onChange={(e) => setProjectFilter(e.target.value)}
                  className="w-full lg:w-auto px-3 py-2 border border-gray-300 rounded-md text-sm"
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

          <div className="flex flex-wrap gap-3 items-center">
            <span className="text-sm text-gray-500">
              Total: {filteredDonations.length}
            </span>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isAllSelected}
                ref={(input) => {
                  if (input) {
                    input.indeterminate = isSomeSelected
                  }
                }}
                onChange={(e) => handleSelectAll(e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
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
            <div className="flex flex-wrap gap-2 items-center">
              {!canBatchEditSelected && (
                <span className="text-sm text-amber-600">
                  {selectedDonations.length > 0 && new Set(selectedDonations.map(d => d.donation_status)).size > 1
                    ? 'Selected donations have different statuses'
                    : requiresFileUploadToTransition(selectedCommonStatus as DonationStatus)
                      ? 'This status requires file upload (cannot batch edit)'
                      : 'Cannot batch edit'}
                </span>
              )}
              <button
                onClick={() => setShowPrintLabels(true)}
                className="px-3 py-1.5 sm:px-4 sm:py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors text-sm"
              >
                Print Labels ({selectedIds.size})
              </button>
              <button
                onClick={() => setShowBatchEdit(true)}
                disabled={!canBatchEditSelected}
                className="px-3 py-1.5 sm:px-4 sm:py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
              >
                Batch Edit ({selectedIds.size})
              </button>
              <button
                onClick={() => setSelectedIds(new Set())}
                className="px-3 py-1.5 sm:px-4 sm:py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors text-sm"
              >
                Clear
              </button>
            </div>
          )}
        </div>

        <div className="space-y-6">
          {donationGroups.map((group) => (
            <div key={group.orderReference || 'no-order'} className="border-2 border-gray-300 rounded-lg p-2 sm:p-4 bg-gray-50">
              {/* Order header */}
              {group.orderReference && (
                <div className="mb-3 pb-3 border-b border-gray-300">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <div className="font-semibold text-gray-900 text-sm sm:text-base truncate">
                      Order: {group.orderReference}
                    </div>
                    <div className="text-xs sm:text-sm text-gray-600 flex-shrink-0">
                      {group.donations.length} donation(s) | Total: ₴{group.totalAmount.toFixed(2)}
                    </div>
                  </div>
                </div>
              )}

              {/* Group select */}
              <div className="flex items-center gap-2 mb-2 sm:hidden">
                <input
                  type="checkbox"
                  checked={group.donations.every(d => selectedIds.has(d.id))}
                  ref={(input) => {
                    if (input) {
                      const allSelected = group.donations.every(d => selectedIds.has(d.id))
                      const someSelected = group.donations.some(d => selectedIds.has(d.id)) && !allSelected
                      input.indeterminate = someSelected
                    }
                  }}
                  onChange={(e) => handleSelectGroup(group.donations, e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-xs text-gray-500">Select group</span>
              </div>

              {/* Mobile card view */}
              <div className="sm:hidden space-y-2">
                {group.donations.map((donation) => (
                  <div
                    key={donation.id}
                    className={`bg-white rounded-md border p-3 ${selectedIds.has(donation.id) ? 'border-blue-300 bg-blue-50' : 'border-gray-200'}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2 min-w-0 flex-1" onClick={() => handleEdit(donation)}>
                        <input
                          type="checkbox"
                          checked={selectedIds.has(donation.id)}
                          onChange={(e) => { e.stopPropagation(); handleSelectOne(donation.id, e.target.checked) }}
                          onClick={(e) => e.stopPropagation()}
                          className="w-4 h-4 mt-0.5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 flex-shrink-0"
                        />
                        <div className="min-w-0">
                          <div className="font-medium text-sm text-gray-900">{donation.donor_name}</div>
                          <div className="text-xs text-gray-500 truncate">{donation.donor_email}</div>
                        </div>
                      </div>
                      <DonationStatusBadge status={donation.donation_status as DonationStatus} />
                    </div>
                    <div className="mt-2 flex items-center justify-between text-xs text-gray-500" onClick={() => handleEdit(donation)}>
                      <span className="font-medium text-gray-900 text-sm">{donation.amount} {donation.currency || 'UAH'}</span>
                      <span suppressHydrationWarning>#{donation.id} · {formatDate(donation.donated_at)}</span>
                    </div>
                    <div className="mt-1 text-xs text-gray-400 truncate" onClick={() => handleEdit(donation)}>
                      {donation.projects.project_name}
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop table view */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 bg-white rounded-md overflow-hidden">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-3 text-left">
                        <input
                          type="checkbox"
                          checked={group.donations.every(d => selectedIds.has(d.id))}
                          ref={(input) => {
                            if (input) {
                              const allSelected = group.donations.every(d => selectedIds.has(d.id))
                              const someSelected = group.donations.some(d => selectedIds.has(d.id)) && !allSelected
                              input.indeterminate = someSelected
                            }
                          }}
                          onChange={(e) => handleSelectGroup(group.donations, e.target.checked)}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                      </th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        ID
                      </th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Donor / Email
                      </th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Project
                      </th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Amount
                      </th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Status
                      </th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Date
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
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
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                        </td>
                        <td
                          className="px-3 py-3 text-sm text-gray-900 cursor-pointer"
                          onClick={() => handleEdit(donation)}
                        >
                          <div className="font-medium">#{donation.id}</div>
                          <div className="text-xs text-gray-500">{donation.donation_public_id}</div>
                        </td>
                        <td
                          className="px-3 py-3 text-sm cursor-pointer"
                          onClick={() => handleEdit(donation)}
                        >
                          <div className="font-medium text-gray-900">{donation.donor_name}</div>
                          <div className="text-xs text-gray-500 truncate max-w-[150px]">
                            {donation.donor_email}
                          </div>
                        </td>
                        <td
                          className="px-3 py-3 text-sm text-gray-500 max-w-[150px] cursor-pointer"
                          onClick={() => handleEdit(donation)}
                        >
                          <div className="truncate">{donation.projects.project_name}</div>
                        </td>
                        <td
                          className="px-3 py-3 whitespace-nowrap text-sm text-gray-900 cursor-pointer"
                          onClick={() => handleEdit(donation)}
                        >
                          {donation.amount} {donation.currency || 'UAH'}
                        </td>
                        <td
                          className="px-3 py-3 whitespace-nowrap cursor-pointer"
                          onClick={() => handleEdit(donation)}
                        >
                          <DonationStatusBadge status={donation.donation_status as DonationStatus} />
                        </td>
                        <td
                          className="px-3 py-3 text-sm text-gray-500 cursor-pointer"
                          onClick={() => handleEdit(donation)}
                        >
                          <div suppressHydrationWarning>{formatDate(donation.donated_at)}</div>
                          <div className="text-xs text-gray-400" suppressHydrationWarning>
                            {formatDateTime(donation.donated_at, 'en', { hour: '2-digit', minute: '2-digit' })}
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
          statusHistory={statusHistory.filter(h => h.donation_id === editingDonation.id)}
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
        <PrintLabelsModal
          donations={selectedDonations}
          onClose={() => setShowPrintLabels(false)}
        />
      )}
    </div>
  )
}
