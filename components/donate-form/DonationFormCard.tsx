'use client'

import { useTranslations } from 'next-intl'
import { useCallback, useEffect, useRef, useState } from 'react'

import { createNowPaymentsDonation, createWayForPayDonation } from '@/app/actions/donation'
import { createEmailSubscription } from '@/app/actions/subscription'
import NowPaymentsWidget from '@/components/donate-form/widgets/NowPaymentsWidget'
import { getLocation, getProjectName, getUnitName, type SupportedLocale } from '@/lib/i18n-utils'
import { clientLogger } from '@/lib/logger-client'
import type { CreatePaymentResponse } from '@/lib/payment/nowpayments/types'
import type { ProjectStats } from '@/types'
import type { DonorInfo } from '@/types/dtos'

import CryptoSelector from './CryptoSelector'
import PaymentMethodSelector, { type PaymentMethod } from './PaymentMethodSelector'
import PaymentStateView from './PaymentStateView'
import AmountQuantitySection from './sections/AmountQuantitySection'
import ContactMethodsSection from './sections/ContactMethodsSection'
import DonorInfoSection from './sections/DonorInfoSection'
import EmptyProjectSelected from './sections/EmptyProjectSelected'
import MessageAndNewsletterSection from './sections/MessageAndNewsletterSection'
import ProjectInactiveOverlay from './sections/ProjectInactiveOverlay'
import ProjectSummaryHeader from './sections/ProjectSummaryHeader'
import SubmitSection from './sections/SubmitSection'
import TipSection from './sections/TipSection'
import TotalSummarySection from './sections/TotalSummarySection'
import type { FieldKey } from './sections/types'
import { clampAmount } from './sections/utils'

// Re-export for backward compatibility (DonatePageClient imports it from here historically)
export type { DonorInfo }

interface DonationFormCardProps {
  project: ProjectStats | null
  locale: string
  onProjectsUpdate?: (projects: ProjectStats[]) => void
  // Shared form fields (preserved across project switches)
  // Only donor personal information, NOT project-specific fields
  donorInfo: DonorInfo
  updateDonorInfo: <K extends keyof DonorInfo>(key: K, value: DonorInfo[K]) => void
}

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
  const projectName = project
    ? getProjectName(project.project_name_i18n, project.project_name, locale as SupportedLocale)
    : ''
  const location = project
    ? getLocation(project.location_i18n, project.location, locale as SupportedLocale)
    : ''
  const unitName = project
    ? getUnitName(project.unit_name_i18n, project.unit_name, locale as SupportedLocale)
    : ''

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
  const [processingState, setProcessingState] = useState<
    | 'idle'
    | 'selecting_method'
    | 'selecting_crypto'
    | 'creating'
    | 'ready'
    | 'crypto_ready'
    | 'error'
  >('idle')
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
    ? isAggregatedProject
      ? donationAmount
      : (project.unit_price || 0) * quantity
    : 0
  const totalAmount = projectAmount + tipAmount

  // Validation constants
  const MAX_QUANTITY = 10 // Maximum units per order
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
          behavior: 'smooth',
        })
      } else {
        // Desktop: Scroll to show the container in view
        targetElement.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
          inline: 'nearest',
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

  // Set a field-level error, focus the field, and scroll it into view
  const showFieldError = (
    key: FieldKey,
    message: string,
    fieldRef?: React.RefObject<HTMLElement | null>
  ) => {
    setFieldErrors((prev) => ({ ...prev, [key]: message }))
    requestAnimationFrame(() => {
      fieldRef?.current?.focus({ preventScroll: true })
      fieldRef?.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    })
  }

  // Clear a specific field error (called on user input to dismiss stale errors)
  const clearFieldError = (key: FieldKey) => {
    setFieldErrors((prev) => {
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
    const validatedProjectAmount = isAggregatedProject
      ? validatedDonationAmount
      : (project?.unit_price || 0) * quantity
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
        createEmailSubscription(donorEmail.trim(), locale as SupportedLocale).catch(
          (subscriptionError) => {
            clientLogger.error('FORM:DONATION', 'Failed to create email subscription', {
              error:
                subscriptionError instanceof Error
                  ? subscriptionError.message
                  : String(subscriptionError),
            })
          }
        )
      }
    } catch (err) {
      if (activeProjectIdRef.current !== requestProjectId) return
      clientLogger.error('FORM:DONATION', 'Error creating payment intent', {
        error: err instanceof Error ? err.message : String(err),
      })
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
        createEmailSubscription(donorEmail.trim(), locale as SupportedLocale).catch(
          (subscriptionError) => {
            clientLogger.error('FORM:DONATION', 'Failed to create email subscription', {
              error:
                subscriptionError instanceof Error
                  ? subscriptionError.message
                  : String(subscriptionError),
            })
          }
        )
      }
    } catch (err) {
      if (activeProjectIdRef.current !== requestProjectId) return
      clientLogger.error('FORM:DONATION', 'Error creating crypto payment', {
        error: err instanceof Error ? err.message : String(err),
      })
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
        <div className="overflow-hidden rounded-xl border-2 border-gray-200 bg-white shadow-lg">
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
          {(processingState === 'creating' ||
            processingState === 'ready' ||
            processingState === 'error') && (
            <PaymentStateView
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
    return <EmptyProjectSelected />
  }

  // Show donation form
  return (
    <div ref={formContainerRef}>
      <div className="relative overflow-hidden rounded-xl border-2 border-gray-200 bg-white shadow-lg">
        <ProjectSummaryHeader
          projectName={projectName}
          location={location}
          unitName={unitName}
          unitPrice={project.unit_price || 0}
          isAggregatedProject={isAggregatedProject}
        />

        {/* Donation Form */}
        <form onSubmit={handleSubmit} noValidate className="space-y-4 p-6">
          {/* Amount/Quantity Selection - Different UI based on project type */}
          {isAggregatedProject ? (
            <AmountQuantitySection
              isAggregatedProject={true}
              donationAmount={donationAmount}
              donationAmountInput={donationAmountInput}
              setDonationAmount={setDonationAmount}
              setDonationAmountInput={setDonationAmountInput}
              donationAmountRef={donationAmountRef}
              projectAmount={projectAmount}
              fieldErrors={fieldErrors}
              clearFieldError={clearFieldError}
            />
          ) : (
            <AmountQuantitySection
              isAggregatedProject={false}
              quantity={quantity}
              setQuantity={setQuantity}
              quantityRef={quantityRef}
              projectAmount={projectAmount}
              fieldErrors={fieldErrors}
              clearFieldError={clearFieldError}
            />
          )}

          {/* Tip for Rehabilitation Center - Only show if NOT project 0 */}
          {project.id !== 0 && (
            <TipSection
              locale={locale}
              tipAmount={tipAmount}
              tipAmountInput={tipAmountInput}
              setTipAmount={setTipAmount}
              setTipAmountInput={setTipAmountInput}
              tipAmountRef={tipAmountRef}
              fieldErrors={fieldErrors}
              clearFieldError={clearFieldError}
            />
          )}

          {/* Total Amount Summary */}
          <TotalSummarySection
            projectAmount={projectAmount}
            tipAmount={tipAmount}
            totalAmount={totalAmount}
            fieldErrors={fieldErrors}
            totalAmountRef={totalAmountRef}
          />

          {/* Donor Information */}
          <DonorInfoSection
            donorName={donorName}
            donorEmail={donorEmail}
            updateDonorInfo={updateDonorInfo}
            fieldErrors={fieldErrors}
            clearFieldError={clearFieldError}
            nameInputRef={nameInputRef}
            emailInputRef={emailInputRef}
          />

          {/* Contact Methods (Optional) */}
          <ContactMethodsSection
            contactTelegram={contactTelegram}
            contactWhatsapp={contactWhatsapp}
            updateDonorInfo={updateDonorInfo}
          />

          {/* Message + Newsletter */}
          <MessageAndNewsletterSection
            donorMessage={donorMessage}
            subscribeToNewsletter={subscribeToNewsletter}
            updateDonorInfo={updateDonorInfo}
          />

          {/* Submit Button + Network Notice */}
          <SubmitSection
            isCreating={processingState === 'creating'}
            projectStatus={project.status}
          />
        </form>

        {/* Overlay when project is not active - covers entire card */}
        {project.status !== 'active' && <ProjectInactiveOverlay />}
      </div>
    </div>
  )
}
