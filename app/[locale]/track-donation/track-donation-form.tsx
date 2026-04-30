'use client'

import { useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useCallback, useEffect, useRef, useState } from 'react'

import { requestRefund, trackDonations } from '@/app/actions/track-donation'
import DonationResultViewer from '@/components/donation-display/DonationResultViewer'
import { SearchIcon } from '@/components/icons'
import { canRequestRefund, type DonationStatus } from '@/lib/donation-status'
import { useBodyScrollLock } from '@/lib/hooks/useBodyScrollLock'
import { clientLogger } from '@/lib/logger-client'

import OrderGroupCard from './components/OrderGroupCard'
import RefundConfirmationDialog from './components/RefundConfirmationDialog'
import SearchForm from './components/SearchForm'
import type { TrackDonation } from './components/types'

type Props = {
  locale: string
}

export default function TrackDonationForm({ locale }: Props) {
  const t = useTranslations('trackDonation')
  const searchParams = useSearchParams()

  // 从 URL 参数初始化表单值
  const [email, setEmail] = useState(searchParams.get('email') || '')
  const [donationId, setDonationId] = useState(searchParams.get('id') || '')
  const [donations, setDonations] = useState<TrackDonation[] | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [confirmRefundId, setConfirmRefundId] = useState<string | null>(null)
  const [viewResultDonationId, setViewResultDonationId] = useState<string | null>(null)

  // 用于追踪上次自动查询的参数，避免重复查询
  const lastAutoQueryParams = useRef<{ email: string; id: string } | null>(null)

  // 自动查询函数
  const handleAutoQuery = useCallback(
    async (queryEmail: string, queryId: string) => {
      setError('')
      setDonations(null)
      setLoading(true)

      try {
        const result = await trackDonations({ email: queryEmail, donationId: queryId })
        if (result.error) {
          setError(t(`errors.${result.error}`))
        } else if (result.donations) {
          setDonations(result.donations as TrackDonation[])
        }
      } catch (err) {
        setError(t('errors.serverError'))
      } finally {
        setLoading(false)
      }
    },
    [t]
  )

  // 如果 URL 有参数，自动触发查询（仅在参数改变或首次加载时）
  useEffect(() => {
    const urlEmail = searchParams.get('email')
    const urlId = searchParams.get('id')

    // 如果 URL 没有参数，跳过
    if (!urlEmail || !urlId) return

    // 如果已经有查询结果且参数未变，跳过（防止切换语言时重复查询）
    if (
      donations &&
      lastAutoQueryParams.current?.email === urlEmail &&
      lastAutoQueryParams.current?.id === urlId
    ) {
      return
    }

    // 记录本次查询参数
    lastAutoQueryParams.current = { email: urlEmail, id: urlId }

    handleAutoQuery(urlEmail, urlId)
  }, [searchParams, donations, handleAutoQuery])

  // Lock body scroll when confirmation dialog is open
  useBodyScrollLock(!!confirmRefundId)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    const trimmedEmail = email.trim()
    const trimmedId = donationId.trim()

    if (!trimmedEmail) {
      setError(t('errors.emailRequired'))
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setError(t('errors.emailInvalid'))
      return
    }
    if (!trimmedId) {
      setError(t('errors.donationIdRequired'))
      return
    }

    setDonations(null)
    setLoading(true)

    try {
      const result = await trackDonations({ email: trimmedEmail, donationId: trimmedId })
      if (result.error) {
        setError(t(`errors.${result.error}`))
      } else if (result.donations) {
        setDonations(result.donations as TrackDonation[])
        // 查询成功后更新 URL，这样切换语言时能保留查询参数
        const url = new URL(window.location.href)
        url.searchParams.set('email', trimmedEmail)
        url.searchParams.set('id', trimmedId)
        window.history.replaceState({}, '', url.toString())
        // 同时更新 lastAutoQueryParams，防止 useEffect 重复查询
        lastAutoQueryParams.current = { email: trimmedEmail, id: trimmedId }
      }
    } catch (err) {
      setError(t('errors.serverError'))
    } finally {
      setLoading(false)
    }
  }

  function handleRequestRefund(orderReference: string) {
    // Get a REFUNDABLE donation ID from this order for verification
    // Must be paid/confirmed/delivering status, NOT completed
    const refundableDonation = donations?.find(
      (d) => d.order_reference === orderReference && canRequestRefund(d.donation_status)
    )
    if (!refundableDonation) {
      setError(t('errors.cannotRefundCompleted'))
      return
    }

    // 立即关闭确认窗口
    setConfirmRefundId(null)
    setError('')

    // 立即更新UI为"refunding"状态（乐观更新）- 只更新可退款的记录
    setDonations((prev) =>
      prev
        ? prev.map((d) =>
            d.order_reference === orderReference && canRequestRefund(d.donation_status)
              ? { ...d, donation_status: 'refunding' as DonationStatus }
              : d
          )
        : null
    )

    // 异步发送退款请求（不阻塞UI）
    requestRefund({
      donationPublicId: refundableDonation.donation_public_id,
      email,
    })
      .then((result) => {
        if (result.error) {
          // 退款失败，显示错误并恢复原状态
          setError(t(`errors.${result.error}`))
          // 重新查询获取正确的状态
          trackDonations({ email, donationId: refundableDonation.donation_public_id }).then(
            (trackResult) => {
              if (trackResult.donations) {
                setDonations(trackResult.donations as TrackDonation[])
              }
            }
          )
        } else if (result.success) {
          // 退款成功，只更新可退款的记录为实际状态
          const newStatus = (result as any).status || 'refund_processing'
          setDonations((prev) =>
            prev
              ? prev.map((d) =>
                  d.order_reference === orderReference &&
                  (canRequestRefund(d.donation_status) || d.donation_status === 'refunding')
                    ? { ...d, donation_status: newStatus as DonationStatus }
                    : d
                )
              : null
          )
        }
      })
      .catch((err) => {
        clientLogger.error('API', 'Refund request failed', {
          error: err instanceof Error ? err.message : String(err),
        })
        setError(t('errors.serverError'))
        // 重新查询获取正确的状态
        trackDonations({ email, donationId: refundableDonation.donation_public_id }).then(
          (trackResult) => {
            if (trackResult.donations) {
              setDonations(trackResult.donations as TrackDonation[])
            }
          }
        )
      })
  }

  // Group donations by order_reference (only when results exist)
  const orderEntries = donations
    ? Object.entries(
        donations.reduce(
          (acc, donation) => {
            const orderRef = donation.order_reference
            if (!acc[orderRef]) acc[orderRef] = []
            acc[orderRef].push(donation)
            return acc
          },
          {} as Record<string, TrackDonation[]>
        )
      )
    : []

  return (
    <div className="pb-20">
      <SearchForm
        email={email}
        setEmail={setEmail}
        donationId={donationId}
        setDonationId={setDonationId}
        error={error}
        setError={setError}
        loading={loading}
        onSubmit={handleSubmit}
      />

      {/* Results Section */}
      {donations && donations.length > 0 && (
        <div className="space-y-6">
          <div>
            <h2 className="font-display text-2xl font-bold text-gray-900">
              {t('results.title', { count: orderEntries.length })}
            </h2>
          </div>

          <div className="grid gap-4">
            {orderEntries.map(([orderReference, orderDonations]) => (
              <OrderGroupCard
                key={orderReference}
                orderReference={orderReference}
                orderDonations={orderDonations}
                locale={locale}
                onRequestRefund={setConfirmRefundId}
                onViewResult={setViewResultDonationId}
              />
            ))}
          </div>
        </div>
      )}

      {/* No Results */}
      {donations && donations.length === 0 && (
        <div className="rounded-2xl border-2 border-dashed border-gray-300 bg-white p-12 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
            <SearchIcon className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="mb-2 font-display text-lg font-semibold text-gray-900">
            {t('noDonationsFound')}
          </h3>
          <p className="text-gray-600">{t('errors.donationNotFound')}</p>
        </div>
      )}

      {confirmRefundId && donations && (
        <RefundConfirmationDialog
          orderReference={confirmRefundId}
          donations={donations}
          locale={locale}
          onConfirm={handleRequestRefund}
          onCancel={() => setConfirmRefundId(null)}
        />
      )}

      {/* Result Viewer Modal */}
      {viewResultDonationId && (
        <DonationResultViewer
          donationPublicId={viewResultDonationId}
          onClose={() => setViewResultDonationId(null)}
        />
      )}
    </div>
  )
}
