'use client'

import { useCallback, useMemo, useState } from 'react'

import { canBatchEdit, type DonationStatus } from '@/lib/donation-status'
import { useTableFilters } from '@/lib/hooks/useTableFilters'
import type { Database } from '@/types/database'

import BatchDonationEditModal from './BatchDonationEditModal'
import DonationEditModal from './DonationEditModal'
import DonationGroupCard from './donations-table/DonationGroupCard'
import DonationsFiltersBar from './donations-table/DonationsFiltersBar'
import type {
  Donation,
  DonationGroup,
  DonationTableFilters,
  StatusHistory,
} from './donations-table/types'
import PrintLabelsModal from './PrintLabelsModal'

interface Props {
  initialDonations: Donation[]
  statusHistory: StatusHistory[]
}

export default function DonationsTable({ initialDonations, statusHistory }: Props) {
  const [donations, setDonations] = useState(initialDonations)
  const [editingDonation, setEditingDonation] = useState<Donation | null>(null)

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

  const {
    filters,
    setFilters,
    filtered: filteredDonations,
  } = useTableFilters<Donation, DonationTableFilters>(
    donations,
    { status: 'all', project: 'all' },
    (d, f) => {
      const matchesStatus = f.status === 'all' || d.donation_status === f.status
      const matchesProject = f.project === 'all' || d.project_id === Number(f.project)
      return matchesStatus && matchesProject
    }
  )

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
  const donationGroups = useMemo<DonationGroup[]>(() => {
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
        <DonationsFiltersBar
          filters={filters}
          setFilters={setFilters}
          uniqueProjects={uniqueProjects}
          totalCount={filteredDonations.length}
          isAllSelected={isAllSelected}
          isSomeSelected={isSomeSelected}
          onSelectAll={handleSelectAll}
          selectedCount={selectedIds.size}
          selectedDonations={selectedDonations}
          selectedCommonStatus={selectedCommonStatus}
          canBatchEditSelected={canBatchEditSelected}
          onShowPrintLabels={() => setShowPrintLabels(true)}
          onShowBatchEdit={() => setShowBatchEdit(true)}
          onClearSelection={() => setSelectedIds(new Set())}
        />

        <div className="space-y-6">
          {donationGroups.map((group) => (
            <DonationGroupCard
              key={group.orderReference || 'no-order'}
              group={group}
              selectedIds={selectedIds}
              onSelectOne={handleSelectOne}
              onSelectGroup={handleSelectGroup}
              onEdit={handleEdit}
            />
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
