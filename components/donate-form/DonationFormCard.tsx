'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import type { ProjectStats } from '@/types'
import { createWayForPayDonation, createNowPaymentsDonation } from '@/app/actions/donation'
import { createEmailSubscription } from '@/app/actions/subscription'
import WayForPayWidget from '@/components/donate-form/widgets/WayForPayWidget'
import NowPaymentsWidget from '@/components/donate-form/widgets/NowPaymentsWidget'
import PaymentMethodSelector, { type PaymentMethod } from './PaymentMethodSelector'
import CryptoSelector from './CryptoSelector'
import type { CreatePaymentResponse } from '@/lib/payment/nowpayments/types'
import { getProjectName, getLocation, getUnitName, type SupportedLocale } from '@/lib/i18n-utils'
import { clientLogger } from '@/lib/logger-client'
import { MapPinIcon, SpinnerIcon } from '@/components/icons'

export interface DonorInfo {
  name: string
  email: string
  message: string
  telegram: string
  whatsapp: string
  subscribeToNewsletter: boolean
}

interface DonationFormCardProps {
  project: ProjectStats | null
  locale: string
  onProjectsUpdate?: (projects: ProjectStats[]) => void
  // Shared form fields (preserved across project switches)
  // Only donor personal information, NOT project-specific fields
  donorInfo: DonorInfo
  updateDonorInfo: <K extends keyof DonorInfo>(key: K, value: DonorInfo[K]) => void
}

interface PaymentWidgetContainerProps {
  processingState: 'idle' | 'selecting_method' | 'selecting_crypto' | 'creating' | 'ready' | 'crypto_ready' | 'error'
  paymentParams: any | null
  amount: number
  locale: string
  error: string | null
  onBack: () => void
}

// Component that handles all payment widget states
function PaymentWidgetContainer({
  processingState,
  paymentParams,
  amount,
  locale,
  error,
  onBack
}: PaymentWidgetContainerProps) {
  const t = useTranslations('donate')

  // Creating donation state
  if (processingState === 'creating') {
    return (
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="text-center">
          <h2 className="text-xl font-bold text-gray-900 mb-2 font-display">
            {t('processing.title')}
          </h2>
          <p className="text-sm text-gray-600">
            {t('processing.wait')}
          </p>
        </div>

        {/* Amount Display */}
        <div className="p-4 bg-gradient-to-br from-ukraine-blue-50 to-ukraine-gold-50/30 rounded-lg border border-ukraine-blue-200">
          <div className="text-center">
            <p className="text-sm text-gray-600 mb-1">
              {t('processing.donationAmount')}
            </p>
            <p className="text-3xl font-bold text-ukraine-blue-500 font-data">
              ${amount.toFixed(2)} USD
            </p>
          </div>
        </div>

        {/* Processing Animation */}
        <div className="py-8 flex flex-col items-center justify-center space-y-4">
          <SpinnerIcon className="animate-spin h-16 w-16 text-ukraine-blue-500" />
          <p className="text-gray-600 font-medium">
            {t('processing.creatingRecord')}
          </p>
        </div>

        {/* Security Notice */}
        <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <div className="flex gap-3">
            <svg className="w-5 h-5 text-gray-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <div className="text-sm text-gray-700">
              <p className="font-medium mb-1">
                {t('securePayment.title')}
              </p>
              <p className="text-gray-600">
                {t('securePayment.description')}
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Error state
  if (processingState === 'error' || error) {
    return (
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="text-center">
          <h2 className="text-xl font-bold text-gray-900 mb-2 font-display">
            {t('paymentError.title')}
          </h2>
        </div>

        {/* Amount Display */}
        <div className="p-4 bg-gradient-to-br from-ukraine-blue-50 to-ukraine-gold-50/30 rounded-lg border border-ukraine-blue-200">
          <div className="text-center">
            <p className="text-sm text-gray-600 mb-1">
              {t('processing.donationAmount')}
            </p>
            <p className="text-3xl font-bold text-ukraine-blue-500 font-data">
              ${amount.toFixed(2)} USD
            </p>
          </div>
        </div>

        {/* Error Message */}
        <div className="p-5 bg-warm-50 border-2 border-warm-200 rounded-lg">
          <div className="flex gap-3 mb-4">
            <svg className="w-6 h-6 text-warm-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="flex-1">
              <p className="text-base font-bold text-warm-800 mb-2">
                {t('paymentError.unableToProcess')}
              </p>
              <p className="text-sm text-warm-700 mb-3">{error}</p>
              <p className="text-xs text-warm-600">
                {t('paymentError.tryAgainMessage')}
              </p>
            </div>
          </div>
          {/* Network Access Notice */}
          <div className="pt-3 border-t border-warm-300">
            <p className="text-sm text-ukraine-gold-700 font-medium">
              {t('networkNotice')}
            </p>
          </div>
        </div>

        {/* Back Button */}
        <button
          type="button"
          onClick={onBack}
          className="w-full py-3 px-6 bg-white border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 hover:border-gray-400 transition-all flex items-center justify-center gap-2 shadow-sm"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          <span>
            {t('paymentError.backToEdit')}
          </span>
        </button>
      </div>
    )
  }

  // Ready state - show WayForPay widget
  if (processingState === 'ready' && paymentParams) {
    return (
      <WayForPayWidget
        paymentParams={paymentParams}
        amount={amount}
        locale={locale}
        onBack={onBack}
      />
    )
  }

  // Fallback
  return null
}

type FieldKey = 'donationAmount' | 'quantity' | 'tipAmount' | 'total' | 'name' | 'email'

export default function DonationFormCard({
  project,
  locale,
  onProjectsUpdate,
  donorInfo,
  updateDonorInfo,
}: DonationFormCardProps) {
  // Destructure donorInfo for convenient access throughout the component
  const {
    name: donorName,
    email: donorEmail,
    message: donorMessage,
    telegram: contactTelegram,
    whatsapp: contactWhatsapp,
    subscribeToNewsletter,
  } = donorInfo
  const t = useTranslations('donate')

  // Get translated project data
  const projectName = project ? getProjectName(project.project_name_i18n, project.project_name, locale as SupportedLocale) : ''
  const location = project ? getLocation(project.location_i18n, project.location, locale as SupportedLocale) : ''
  const unitName = project ? getUnitName(project.unit_name_i18n, project.unit_name, locale as SupportedLocale) : ''

  // Project-specific fields (reset when project changes)
  const [quantity, setQuantity] = useState(1)
  const [donationAmount, setDonationAmount] = useState(10) // For aggregate_donations projects
  const [donationAmountInput, setDonationAmountInput] = useState('10') // Display string for free typing
  const [tipAmount, setTipAmount] = useState(0)
  const [tipAmountInput, setTipAmountInput] = useState('') // Display string for free typing

  // UI state
  const [paymentParams, setPaymentParams] = useState<any | null>(null)
  const [cryptoPaymentData, setCryptoPaymentData] = useState<CreatePaymentResponse | null>(null)
  const [showWidget, setShowWidget] = useState(false)
  const [processingState, setProcessingState] = useState<'idle' | 'selecting_method' | 'selecting_crypto' | 'creating' | 'ready' | 'crypto_ready' | 'error'>('idle')
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod | null>(null)
  const [isCryptoLoading, setIsCryptoLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<FieldKey, string>>>({})
  const widgetContainerRef = useRef<HTMLDivElement>(null)
  const formContainerRef = useRef<HTMLDivElement>(null)
  const nameInputRef = useRef<HTMLInputElement>(null)
  const emailInputRef = useRef<HTMLInputElement>(null)
  const donationAmountRef = useRef<HTMLInputElement>(null)
  const quantityRef = useRef<HTMLInputElement>(null)
  const tipAmountRef = useRef<HTMLInputElement>(null)
  const totalAmountRef = useRef<HTMLDivElement>(null)
  const activeProjectIdRef = useRef(project?.id)

  // Check if this is an aggregated donation project
  const isAggregatedProject = project?.aggregate_donations === true

  // Reset project-specific fields when project changes
  useEffect(() => {
    activeProjectIdRef.current = project?.id
    setQuantity(1)
    setDonationAmount(10)
    setDonationAmountInput('10')
    setTipAmount(0)
    setTipAmountInput('')
    setError(null)
    setFieldErrors({})
    setShowWidget(false)
    setPaymentParams(null)
    setCryptoPaymentData(null)
    setProcessingState('idle')
    setSelectedPaymentMethod(null)
    setIsCryptoLoading(false)
  }, [project?.id])

  // Calculate project amount based on project type
  const projectAmount = project
    ? (isAggregatedProject ? donationAmount : (project.unit_price || 0) * quantity)
    : 0
  const totalAmount = projectAmount + tipAmount

  // Quick select options
  const quantityOptions = [1, 2, 5, 10]
  const amountOptions = [10, 50, 100, 500] // For aggregated projects
  const tipOptions = [5, 10, 20]

  // Validation constants
  const MAX_QUANTITY = 10  // Maximum units per order
  const MAX_AMOUNT = 10000 // Maximum amount per order

  // Helper function to scroll to the form/widget area
  const scrollToFormArea = useCallback(() => {
    // Use requestAnimationFrame to ensure scroll happens after any DOM updates
    requestAnimationFrame(() => {
      const targetElement = widgetContainerRef.current || formContainerRef.current
      if (!targetElement) return

      // Check if mobile (screen width < 1024px, which is Tailwind's lg breakpoint)
      const isMobile = window.innerWidth < 1024

      if (isMobile) {
        // Mobile: Scroll to top of viewport with generous padding
        const elementTop = targetElement.getBoundingClientRect().top
        const offsetPosition = elementTop + window.pageYOffset - 100 // 100px padding from top

        window.scrollTo({
          top: offsetPosition,
          behavior: 'smooth'
        })
      } else {
        // Desktop: Scroll to show the container in view
        targetElement.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
          inline: 'nearest'
        })
      }
    })
  }, [])

  // Effect to scroll when payment params are set (widget appears)
  useEffect(() => {
    if (paymentParams && widgetContainerRef.current) {
      // Double rAF ensures the widget DOM has been painted before scrolling
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          scrollToFormArea()
        })
      })
    }
  }, [paymentParams, scrollToFormArea])

  // Clamp a raw input string to [min, max], round to 1 decimal, fallback if out of range
  const clampAmount = (raw: string, min: number, max: number, fallback: number): { value: number; wasInvalid: boolean } => {
    const num = parseFloat(raw)
    const outOfRange = isNaN(num) || num < min || num > max
    const value = isNaN(num) || num < min ? fallback : num > max ? max : Math.round(num * 10) / 10
    return { value, wasInvalid: outOfRange }
  }

  // Set a field-level error, focus the field, and scroll it into view
  const showFieldError = (
    key: FieldKey,
    message: string,
    fieldRef?: React.RefObject<HTMLElement | null>,
  ) => {
    setFieldErrors(prev => ({ ...prev, [key]: message }))
    requestAnimationFrame(() => {
      fieldRef?.current?.focus({ preventScroll: true })
      fieldRef?.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    })
  }

  // Clear a specific field error (called on user input to dismiss stale errors)
  const clearFieldError = (key: FieldKey) => {
    setFieldErrors(prev => {
      if (!prev[key]) return prev
      const { [key]: _removed, ...rest } = prev
      return rest
    })
  }

  // Validate all form fields before submit; scroll to first invalid field
  const validateForm = (): boolean => {
    setFieldErrors({})
    let validatedDonationAmount = donationAmount
    let validatedTipAmount = tipAmount

    // 1. Donation amount (aggregated projects only)
    if (isAggregatedProject) {
      const { value, wasInvalid } = clampAmount(donationAmountInput, 0.1, MAX_AMOUNT, 10)
      validatedDonationAmount = value
      setDonationAmount(value)
      setDonationAmountInput(String(value))
      if (wasInvalid) {
        showFieldError('donationAmount', t('errors.invalidAmount'), donationAmountRef)
        return false
      }
    }

    // 2. Quantity (non-aggregated projects only)
    if (!isAggregatedProject) {
      if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QUANTITY) {
        const clamped = Math.max(1, Math.min(MAX_QUANTITY, Math.round(quantity) || 1))
        setQuantity(clamped)
        showFieldError('quantity', t('errors.invalidQuantity'), quantityRef)
        return false
      }
    }

    // 3. Tip amount
    if (tipAmountInput !== '') {
      const { value, wasInvalid } = clampAmount(tipAmountInput, 0, 9999.9, 0)
      validatedTipAmount = value
      setTipAmount(value)
      setTipAmountInput(value === 0 ? '' : String(value))
      if (wasInvalid) {
        showFieldError('tipAmount', t('errors.invalidAmount'), tipAmountRef)
        return false
      }
    }

    // 4. Total amount limit ($10,000 per transaction)
    const validatedProjectAmount = isAggregatedProject ? validatedDonationAmount : (project?.unit_price || 0) * quantity
    if (validatedProjectAmount + validatedTipAmount > MAX_AMOUNT) {
      showFieldError('total', t('errors.totalLimitExceeded'), totalAmountRef)
      return false
    }

    // 5. Donor name
    const trimmedName = donorName.trim()
    if (!trimmedName) {
      showFieldError('name', t('validation.nameRequired'), nameInputRef)
      return false
    }
    if (trimmedName.length < 2) {
      showFieldError('name', t('validation.nameMin'), nameInputRef)
      return false
    }

    // 6. Donor email
    const trimmedEmail = donorEmail.trim()
    if (!trimmedEmail) {
      showFieldError('email', t('validation.emailRequired'), emailInputRef)
      return false
    }
    const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
    if (!emailPattern.test(trimmedEmail)) {
      showFieldError('email', t('validation.emailInvalid'), emailInputRef)
      return false
    }

    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!project || project.id === null || project.id === undefined) return

    // Prevent duplicate submissions
    if (processingState === 'creating' || processingState === 'selecting_method') return

    setError(null)

    // Validate all fields — scroll to first invalid field if needed
    if (!validateForm()) return

    // Show payment method selection first
    setShowWidget(true)
    setProcessingState('selecting_method')
    scrollToFormArea()
  }

  // Handle payment method selection
  const handlePaymentMethodSelect = async (method: PaymentMethod) => {
    if (!project || project.id === null || project.id === undefined) return

    const requestProjectId = project.id
    setSelectedPaymentMethod(method)
    setError(null)

    // Handle crypto: show crypto selector
    if (method === 'crypto') {
      setProcessingState('selecting_crypto')
      return
    }

    // Handle card payment
    if (method !== 'card') return

    setProcessingState('creating')

    try {
      // For aggregated projects: pass amount directly with quantity=1
      // For non-aggregated projects: pass quantity only
      const submitQuantity = isAggregatedProject ? 1 : quantity
      const submitAmount = isAggregatedProject ? donationAmount : undefined

      const result = await createWayForPayDonation({
        project_id: project.id,
        quantity: submitQuantity,
        amount: submitAmount,
        donor_name: donorName.trim(),
        donor_email: donorEmail.trim(),
        donor_message: donorMessage || undefined,
        contact_telegram: contactTelegram ? contactTelegram.trim() : undefined,
        contact_whatsapp: contactWhatsapp ? contactWhatsapp.trim() : undefined,
        tip_amount: tipAmount > 0 ? tipAmount : undefined,
        locale: locale as SupportedLocale,
      })

      // Discard stale response if user switched projects during the request
      if (activeProjectIdRef.current !== requestProjectId) return

      // Update projects stats if available
      if (result.allProjectsStats && onProjectsUpdate) {
        onProjectsUpdate(result.allProjectsStats)
      }

      // Check if the result is successful
      if (!result.success) {
        // Handle different error types
        if (result.error === 'quantity_exceeded') {
          const remainingUnits = result.remainingUnits || 0

          // Set quantity to remaining units
          setQuantity(remainingUnits)

          // Show localized error message (use project's translated unitName)
          setError(t('errors.quantityExceeded', { remaining: remainingUnits, unitName }))
        } else if (result.error === 'amount_limit_exceeded') {
          const maxQuantity = result.maxQuantity || 1

          // For aggregated projects: maxQuantity represents remaining amount in USD
          // For non-aggregated projects: maxQuantity represents max units
          if (isAggregatedProject) {
            setDonationAmount(maxQuantity)
            setDonationAmountInput(String(maxQuantity))
            setError(t('errors.amountLimitExceeded', { max: maxQuantity, unitName }))
          } else {
            setQuantity(maxQuantity)
            setError(t('errors.amountLimitExceeded', { max: maxQuantity, unitName }))
          }
        } else if (result.error === 'project_not_found') {
          setError(t('errors.projectNotFound'))
        } else if (result.error === 'project_not_active') {
          setError(t('errors.projectNotActive'))
        } else {
          setError(t('errors.serverError'))
        }
        setProcessingState('error')
        return
      }

      // Success - set payment params and mark as ready
      setPaymentParams(result.paymentParams!)
      setProcessingState('ready')

      // P2 优化: Fire-and-forget 模式 - 邮件订阅不阻塞支付流程
      // 订阅失败不影响支付成功，无需等待
      if (subscribeToNewsletter && donorEmail) {
        createEmailSubscription(
          donorEmail.trim(),
          locale as SupportedLocale
        ).catch(subscriptionError => {
          clientLogger.error('FORM:DONATION', 'Failed to create email subscription', { error: subscriptionError instanceof Error ? subscriptionError.message : String(subscriptionError) })
        })
      }
    } catch (err) {
      if (activeProjectIdRef.current !== requestProjectId) return
      clientLogger.error('FORM:DONATION', 'Error creating payment intent', { error: err instanceof Error ? err.message : String(err) })
      if (err instanceof Error && err.message.includes('email')) {
        setError(t('errors.invalidEmail'))
      } else if (err instanceof Error && err.message.includes('validation')) {
        setError(t('errors.validationError'))
      } else {
        setError(t('errors.serverError'))
      }
      setProcessingState('error')
    }
  }

  // Handle cryptocurrency selection
  const handleCryptoSelect = async (cryptoCurrency: string) => {
    if (!project || project.id === null || project.id === undefined) return

    const requestProjectId = project.id
    setError(null)
    setIsCryptoLoading(true)

    try {
      // For aggregated projects: pass amount directly with quantity=1
      // For non-aggregated projects: pass quantity only
      const submitQuantity = isAggregatedProject ? 1 : quantity
      const submitAmount = isAggregatedProject ? donationAmount : undefined

      const result = await createNowPaymentsDonation({
        project_id: project.id,
        quantity: submitQuantity,
        amount: submitAmount,
        donor_name: donorName.trim(),
        donor_email: donorEmail.trim(),
        donor_message: donorMessage || undefined,
        contact_telegram: contactTelegram ? contactTelegram.trim() : undefined,
        contact_whatsapp: contactWhatsapp ? contactWhatsapp.trim() : undefined,
        tip_amount: tipAmount > 0 ? tipAmount : undefined,
        locale: locale as SupportedLocale,
        pay_currency: cryptoCurrency,
      })

      // Discard stale response if user switched projects during the request
      if (activeProjectIdRef.current !== requestProjectId) return

      // Update projects stats if available
      if (result.allProjectsStats && onProjectsUpdate) {
        onProjectsUpdate(result.allProjectsStats)
      }

      // Check if the result is successful
      if (!result.success) {
        // Handle different error types
        if (result.error === 'quantity_exceeded') {
          const remainingUnits = result.remainingUnits || 0
          setQuantity(remainingUnits)
          setError(t('errors.quantityExceeded', { remaining: remainingUnits, unitName }))
        } else if (result.error === 'amount_limit_exceeded') {
          const maxQuantity = result.maxQuantity || 1
          if (isAggregatedProject) {
            setDonationAmount(maxQuantity)
            setDonationAmountInput(String(maxQuantity))
            setError(t('errors.amountLimitExceeded', { max: maxQuantity, unitName }))
          } else {
            setQuantity(maxQuantity)
            setError(t('errors.amountLimitExceeded', { max: maxQuantity, unitName }))
          }
        } else if (result.error === 'api_error') {
          // Show the actual error message from NOWPayments API
          setError(result.message || t('errors.serverError'))
        } else if (result.error === 'project_not_found') {
          setError(t('errors.projectNotFound'))
        } else if (result.error === 'project_not_active') {
          setError(t('errors.projectNotActive'))
        } else {
          setError(t('errors.serverError'))
        }
        setProcessingState('error')
        setIsCryptoLoading(false)
        return
      }

      // Success - set crypto payment data and mark as ready
      setCryptoPaymentData(result.paymentData!)
      setProcessingState('crypto_ready')
      setIsCryptoLoading(false)

      // P2 优化: Fire-and-forget 模式 - 邮件订阅不阻塞支付流程
      // 订阅失败不影响支付成功，无需等待
      if (subscribeToNewsletter && donorEmail) {
        createEmailSubscription(
          donorEmail.trim(),
          locale as SupportedLocale
        ).catch(subscriptionError => {
          clientLogger.error('FORM:DONATION', 'Failed to create email subscription', { error: subscriptionError instanceof Error ? subscriptionError.message : String(subscriptionError) })
        })
      }
    } catch (err) {
      if (activeProjectIdRef.current !== requestProjectId) return
      clientLogger.error('FORM:DONATION', 'Error creating crypto payment', { error: err instanceof Error ? err.message : String(err) })
      if (err instanceof Error && err.message.includes('email')) {
        setError(t('errors.invalidEmail'))
      } else if (err instanceof Error && err.message.includes('validation')) {
        setError(t('errors.validationError'))
      } else {
        setError(t('errors.serverError'))
      }
      setProcessingState('error')
      setIsCryptoLoading(false)
    }
  }

  // Handler to go back to edit form
  const handleBack = () => {
    setShowWidget(false)
    setPaymentParams(null)
    setCryptoPaymentData(null)
    setProcessingState('idle')
    setSelectedPaymentMethod(null)
    setIsCryptoLoading(false)
    setError(null)
    setFieldErrors({})
  }

  // Handler to go back to payment method selection
  const handleBackToMethodSelect = () => {
    setProcessingState('selecting_method')
    setCryptoPaymentData(null)
    setIsCryptoLoading(false)
    setError(null)
  }

  // Show widget if user clicked submit
  if (showWidget && project) {
    return (
      <div ref={widgetContainerRef}>
        <div className="bg-white rounded-xl border-2 border-gray-200 shadow-lg overflow-hidden">
          {processingState === 'selecting_method' && (
            <PaymentMethodSelector
              amount={totalAmount}
              onSelectMethod={handlePaymentMethodSelect}
              onBack={handleBack}
            />
          )}
          {processingState === 'selecting_crypto' && (
            <CryptoSelector
              amount={totalAmount}
              onSelectCrypto={handleCryptoSelect}
              onBack={handleBackToMethodSelect}
              isLoading={isCryptoLoading}
            />
          )}
          {processingState === 'crypto_ready' && cryptoPaymentData && (
            <NowPaymentsWidget
              paymentData={cryptoPaymentData}
              amount={totalAmount}
              locale={locale}
              onBack={handleBack}
            />
          )}
          {(processingState === 'creating' || processingState === 'ready' || processingState === 'error') && (
            <PaymentWidgetContainer
              processingState={processingState}
              paymentParams={paymentParams}
              amount={totalAmount}
              locale={locale}
              error={error}
              onBack={handleBack}
            />
          )}
        </div>
      </div>
    )
  }

  // Show empty state if no project selected
  if (!project) {
    return (
      <div>
        <div className="bg-gray-50 rounded-xl border-2 border-dashed border-gray-300 p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-ukraine-blue-100 flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-700 mb-2 font-display">
            {t('noProjectSelected')}
          </h3>
          <p className="text-sm text-gray-500">
            {t('formCard.noProjectDescription')}
          </p>
        </div>
      </div>
    )
  }

  // Show donation form
  return (
    <div ref={formContainerRef}>
      <div className="bg-white rounded-xl border-2 border-gray-200 shadow-lg overflow-hidden relative">
        {/* Project Summary */}
        <div className="bg-ukraine-blue-50 p-6 border-b border-gray-200">
          <h3 className="font-bold text-lg text-gray-900 mb-3 line-clamp-2 font-display">
            {projectName}
          </h3>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <MapPinIcon className="w-4 h-4 flex-shrink-0" />
              <span>{location}</span>
            </div>
            {!isAggregatedProject && (
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-ukraine-blue-500 font-data">
                  ${(project.unit_price || 0).toFixed(2)}
                </span>
                <span className="text-sm text-gray-500">
                  {t('quantity.perUnit', { unitName })}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Donation Form */}
        <form onSubmit={handleSubmit} noValidate className="p-6 space-y-4">
          {/* Amount/Quantity Selection - Different UI based on project type */}
          {isAggregatedProject ? (
            /* Aggregated Project: Direct Amount Input */
            <div>
              <label htmlFor="donation-amount" className="block text-sm font-medium mb-2">
                {t('amount.label')} *
              </label>
              <div className="grid grid-cols-4 gap-2 mb-3">
                {amountOptions.map((amount) => (
                  <button
                    key={amount}
                    type="button"
                    onClick={() => {
                      clearFieldError('donationAmount')
                      clearFieldError('total')
                      setDonationAmount(amount)
                      setDonationAmountInput(String(amount))
                    }}
                    className={`px-3 py-2 rounded-lg border font-medium text-sm transition-all ${
                      donationAmount === amount && donationAmountInput === String(amount)
                        ? 'bg-ukraine-blue-500 text-white border-ukraine-blue-500 shadow-md'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    ${amount}
                  </button>
                ))}
              </div>
              <input
                ref={donationAmountRef}
                id="donation-amount"
                type="number"
                min="0.1"
                max="10000"
                step="0.1"
                value={donationAmountInput}
                onKeyDown={(e) => {
                  if (e.key === 'e' || e.key === 'E' || e.key === '+' || e.key === '-') {
                    e.preventDefault()
                  }
                }}
                onChange={(e) => {
                  clearFieldError('donationAmount')
                  clearFieldError('total')
                  const val = e.target.value
                  setDonationAmountInput(val)
                  // Live-update numeric state for total preview
                  const num = parseFloat(val)
                  setDonationAmount(!isNaN(num) && num >= 0 ? num : 0)
                }}
                onBlur={() => {
                  const { value } = clampAmount(donationAmountInput, 0.1, MAX_AMOUNT, 10)
                  setDonationAmount(value)
                  setDonationAmountInput(String(value))
                }}
                aria-invalid={!!fieldErrors.donationAmount}
                aria-describedby={fieldErrors.donationAmount ? 'donation-amount-error' : undefined}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ukraine-blue-500 focus:border-transparent"
                placeholder={t('amount.placeholder')}
              />
              {fieldErrors.donationAmount && (
                <p
                  id="donation-amount-error"
                  role="alert"
                  className="mt-1 text-xs text-red-600 flex items-start gap-1"
                >
                  <svg className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <span>{fieldErrors.donationAmount}</span>
                </p>
              )}
              <div className="mt-2 p-2.5 bg-ukraine-blue-50 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700">
                    {t('payment.projectTotal')}:
                  </span>
                  <span className="text-xl font-bold text-ukraine-blue-500 font-data">
                    ${projectAmount.toFixed(2)} {t('payment.currency')}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            /* Unit-based Project: Quantity Selection */
            <div>
              <label htmlFor="donation-quantity" className="block text-sm font-medium mb-2">
                {t('quantity.label')} *
              </label>
              <div className="grid grid-cols-4 gap-2 mb-3">
                {quantityOptions.map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => {
                      clearFieldError('quantity')
                      clearFieldError('total')
                      setQuantity(num)
                    }}
                    className={`px-3 py-2 rounded-lg border font-medium text-sm transition-all ${
                      quantity === num
                        ? 'bg-ukraine-blue-500 text-white border-ukraine-blue-500 shadow-md'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {num}
                  </button>
                ))}
              </div>
              <input
                ref={quantityRef}
                id="donation-quantity"
                type="number"
                min="1"
                max="10"
                value={quantity}
                onKeyDown={(e) => {
                  // Prevent: e, E, +, -, and decimal point (quantity must be integer)
                  if (
                    e.key === 'e' ||
                    e.key === 'E' ||
                    e.key === '+' ||
                    e.key === '-' ||
                    e.key === '.'
                  ) {
                    e.preventDefault()
                  }
                }}
                onChange={(e) => {
                  clearFieldError('quantity')
                  clearFieldError('total')
                  const val = e.target.value
                  if (val === '') {
                    setQuantity(0)
                    return
                  }

                  const num = parseInt(val, 10)
                  // Prevent negative values and non-integers during input
                  if (isNaN(num) || num < 0) {
                    setQuantity(0)
                    return
                  }

                  // Limit to max value
                  if (num > MAX_QUANTITY) {
                    setQuantity(MAX_QUANTITY)
                    return
                  }

                  setQuantity(num)
                }}
                onBlur={(e) => {
                  // Clean up on blur: ensure valid range and no leading zeros
                  const num = parseInt(e.target.value, 10)

                  if (isNaN(num) || num < 1) {
                    setQuantity(1)
                  } else if (num > MAX_QUANTITY) {
                    setQuantity(MAX_QUANTITY)
                  } else {
                    setQuantity(num) // This removes leading zeros
                  }
                }}
                aria-invalid={!!fieldErrors.quantity}
                aria-describedby={fieldErrors.quantity ? 'donation-quantity-error' : undefined}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ukraine-blue-500 focus:border-transparent"
                placeholder={t('quantity.custom')}
              />
              {fieldErrors.quantity && (
                <p
                  id="donation-quantity-error"
                  role="alert"
                  className="mt-1 text-xs text-red-600 flex items-start gap-1"
                >
                  <svg className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <span>{fieldErrors.quantity}</span>
                </p>
              )}
              <div className="mt-2 p-2.5 bg-ukraine-blue-50 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700">
                    {t('payment.projectTotal')}:
                  </span>
                  <span className="text-xl font-bold text-ukraine-blue-500 font-data">
                    ${projectAmount.toFixed(2)} {t('payment.currency')}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Tip for Rehabilitation Center - Only show if NOT project 0 */}
          {project.id !== 0 && (
            <div className="border-t pt-5">
              <div className="flex items-start justify-between gap-2 mb-4">
                <h4 className="font-semibold text-gray-900 font-display">
                  {t('tip.title')}
                </h4>
                <div className="flex-shrink-0 bg-ukraine-gold-50 px-2 py-1 rounded text-xs font-medium text-ukraine-gold-700 border border-ukraine-gold-200">
                  {t('tip.optional')}
                </div>
              </div>

              <div className="bg-gradient-to-br from-ukraine-gold-50 to-ukraine-gold-100 rounded-lg p-4 mb-3 border border-ukraine-gold-200">
                <p className="text-sm text-gray-800 font-medium mb-3">
                  {t('tip.description')}
                </p>

                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div className="bg-white/80 rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-ukraine-gold-600 font-data">1,600+</div>
                    <div className="text-xs text-gray-600 mt-1">{t('tip.patientsServed')}</div>
                  </div>
                  <div className="bg-white/80 rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-ukraine-gold-600 font-data">$1,000</div>
                    <div className="text-xs text-gray-600 mt-1">{t('tip.avgCostPerPatient')}</div>
                  </div>
                </div>

                <div className="text-xs text-gray-600 text-center">
                  {t('tip.asOfDate')}
                </div>
              </div>

              <a
                href={`/${locale}/donate?project=0`}
                className="text-sm text-ukraine-blue-500 hover:text-ukraine-blue-600 font-medium inline-flex items-center gap-1 mb-3"
              >
                {t('tip.viewDetails')}
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </a>

              <div className="grid grid-cols-3 gap-2 mb-3">
                {tipOptions.map((amount) => (
                  <button
                    key={amount}
                    type="button"
                    onClick={() => {
                      clearFieldError('tipAmount')
                      clearFieldError('total')
                      setTipAmount(amount)
                      setTipAmountInput(String(amount))
                    }}
                    className={`px-3 py-2 rounded-lg border font-medium text-sm transition-all ${
                      tipAmount === amount && tipAmountInput === String(amount)
                        ? 'bg-ukraine-gold-600 text-white border-ukraine-gold-600 shadow-md'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    ${amount}
                  </button>
                ))}
              </div>
              <input
                ref={tipAmountRef}
                id="tip-amount"
                type="number"
                min="0"
                max="9999.9"
                step="0.1"
                value={tipAmountInput}
                onKeyDown={(e) => {
                  if (e.key === 'e' || e.key === 'E' || e.key === '+' || e.key === '-') {
                    e.preventDefault()
                  }
                }}
                onChange={(e) => {
                  clearFieldError('tipAmount')
                  clearFieldError('total')
                  const val = e.target.value
                  setTipAmountInput(val)
                  const num = parseFloat(val)
                  setTipAmount(!isNaN(num) && num >= 0 ? num : 0)
                }}
                onBlur={() => {
                  const { value } = clampAmount(tipAmountInput, 0, 9999.9, 0)
                  setTipAmount(value)
                  setTipAmountInput(value === 0 ? '' : String(value))
                }}
                aria-invalid={!!fieldErrors.tipAmount}
                aria-describedby={fieldErrors.tipAmount ? 'tip-amount-error' : undefined}
                className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ukraine-gold-500 focus:border-transparent"
                placeholder={t('tip.placeholder')}
              />
              {fieldErrors.tipAmount && (
                <p
                  id="tip-amount-error"
                  role="alert"
                  className="mt-1 text-xs text-red-600 flex items-start gap-1"
                >
                  <svg className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <span>{fieldErrors.tipAmount}</span>
                </p>
              )}
              {tipAmount > 0 && (
                <p className="mt-2 text-xs text-ukraine-gold-700 flex items-center gap-1">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                  </svg>
                  {t('tip.thankYou')}
                </p>
              )}
            </div>
          )}

          {/* Total Amount Summary */}
          <div ref={totalAmountRef} className="border-t pt-3" tabIndex={-1}>
            <div className="p-3 bg-gradient-to-br from-ukraine-blue-50 to-ukraine-gold-50/30 rounded-lg border border-ukraine-blue-200">
              <div className="space-y-2">
                {/* Show breakdown if there's a tip */}
                {tipAmount > 0 && (
                  <>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600">
                        {t('payment.projectDonation')}:
                      </span>
                      <span className="font-semibold text-gray-900 font-data">
                        ${projectAmount.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600">
                        {t('payment.tipAmount')}:
                      </span>
                      <span className="font-semibold text-ukraine-gold-700 font-data">
                        ${tipAmount.toFixed(2)}
                      </span>
                    </div>
                    <div className="h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent my-2"></div>
                  </>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-base font-bold text-gray-900">
                    {t('payment.total')}:
                  </span>
                  <span className="text-2xl font-bold text-ukraine-blue-500 font-data">
                    ${totalAmount.toFixed(2)} {t('payment.currency')}
                  </span>
                </div>
              </div>
            </div>
            {fieldErrors.total && (
              <p
                id="total-amount-error"
                role="alert"
                className="mt-2 text-xs text-red-600 flex items-start gap-1"
              >
                <svg className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <span>{fieldErrors.total}</span>
              </p>
            )}
          </div>

          {/* Donor Information */}
          <div className="space-y-3">
            <h4 className="font-semibold text-gray-900 border-b pb-2 font-display">
              {t('donor.title')}
            </h4>

            <div>
              <label htmlFor="donor-name" className="block text-sm font-medium mb-1">
                {t('donor.name')} *
              </label>
              <input
                id="donor-name"
                ref={nameInputRef}
                type="text"
                required
                minLength={2}
                maxLength={255}
                value={donorName}
                onChange={(e) => {
                  clearFieldError('name')
                  updateDonorInfo('name', e.target.value)
                }}
                aria-invalid={!!fieldErrors.name}
                aria-describedby={fieldErrors.name ? 'donor-name-error' : undefined}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ukraine-blue-500 focus:border-transparent"
                placeholder={t('donor.namePlaceholder')}
              />
              <p className="mt-1 text-xs text-gray-500">{t('donor.nameHint')}</p>
              {fieldErrors.name && (
                <p
                  id="donor-name-error"
                  role="alert"
                  className="mt-1 text-xs text-red-600 flex items-start gap-1"
                >
                  <svg className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <span>{fieldErrors.name}</span>
                </p>
              )}
            </div>

            <div>
              <label htmlFor="donor-email" className="block text-sm font-medium mb-1">
                {t('donor.email')} *
              </label>
              <input
                id="donor-email"
                ref={emailInputRef}
                type="email"
                required
                value={donorEmail}
                onChange={(e) => {
                  clearFieldError('email')
                  updateDonorInfo('email', e.target.value)
                }}
                onBlur={(e) => updateDonorInfo('email', e.target.value.trim())}
                pattern="[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}"
                aria-invalid={!!fieldErrors.email}
                aria-describedby={fieldErrors.email ? 'donor-email-error' : undefined}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ukraine-blue-500 focus:border-transparent"
                placeholder={t('donor.emailPlaceholder')}
              />
              <p className="mt-1 text-xs text-gray-500">{t('donor.emailHint')}</p>
              {fieldErrors.email && (
                <p
                  id="donor-email-error"
                  role="alert"
                  className="mt-1 text-xs text-red-600 flex items-start gap-1"
                >
                  <svg className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <span>{fieldErrors.email}</span>
                </p>
              )}
            </div>
          </div>

          {/* Contact Methods (Optional) */}
          <div className="space-y-3">
            <div>
              <h4 className="font-semibold text-gray-900 border-b pb-2 font-display">
                {t('contact.title')}
              </h4>
              <p className="text-xs text-gray-600 mt-1">{t('contact.description')}</p>
            </div>

            <div>
              <label htmlFor="contact-telegram" className="block text-sm font-medium mb-1">
                {t('contact.telegram')}
              </label>
              <input
                id="contact-telegram"
                type="text"
                maxLength={255}
                value={contactTelegram}
                onChange={(e) => updateDonorInfo('telegram', e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ukraine-blue-500 focus:border-transparent"
                placeholder={t('contact.telegramPlaceholder')}
              />
            </div>

            <div>
              <label htmlFor="contact-whatsapp" className="block text-sm font-medium mb-1">
                {t('contact.whatsapp')}
              </label>
              <input
                id="contact-whatsapp"
                type="text"
                maxLength={255}
                value={contactWhatsapp}
                onChange={(e) => updateDonorInfo('whatsapp', e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ukraine-blue-500 focus:border-transparent"
                placeholder={t('contact.whatsappPlaceholder')}
              />
            </div>
          </div>

          {/* Message (Optional) */}
          <div>
            <label htmlFor="donor-message" className="block text-sm font-medium mb-1">
              {t('message.label')}
            </label>
            <textarea
              id="donor-message"
              maxLength={1000}
              rows={3}
              value={donorMessage}
              onChange={(e) => updateDonorInfo('message', e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ukraine-blue-500 focus:border-transparent resize-none"
              placeholder={t('message.placeholder')}
            />
            <p className="mt-1 text-xs text-gray-500">
              {t('message.hint', { remaining: 1000 - donorMessage.length })}
            </p>
          </div>

          {/* Newsletter Subscription */}
          <div className="pt-2">
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={subscribeToNewsletter}
                onChange={(e) => updateDonorInfo('subscribeToNewsletter', e.target.checked)}
                className="mt-0.5 w-3.5 h-3.5 text-gray-400 bg-transparent border-gray-300 rounded focus:ring-0 focus:ring-offset-0"
              />
              <span className="text-xs text-gray-500">
                {t('subscription.label')} · {t('subscription.privacyNote')}
              </span>
            </label>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={processingState === 'creating' || project.status !== 'active'}
            className={`group relative w-full py-3 px-6 rounded-xl font-semibold transition-all duration-300 shadow-md overflow-hidden ${
              project.status !== 'active'
                ? 'bg-gray-400 text-white cursor-not-allowed'
                : 'bg-ukraine-gold-500 text-ukraine-blue-900 hover:bg-ukraine-gold-600 hover:shadow-xl disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed'
            }`}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
            <span className="relative z-10">
              {project.status !== 'active'
                ? t('formCard.projectEnded')
                : t('submit')
              }
            </span>
          </button>

          {/* Network Access Notice */}
          <p className="text-sm text-ukraine-gold-700 text-center font-medium">
            {t('networkNotice')}
          </p>
        </form>

        {/* Overlay when project is not active - covers entire card */}
        {project.status !== 'active' && (
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-10 rounded-xl">
            <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm mx-4 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-100 flex items-center justify-center">
                <svg className="w-8 h-8 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2 font-display">
                {t('formCard.cannotDonateNow')}
              </h3>
              <p className="text-sm text-gray-600">
                {t('formCard.projectNotActive')}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
