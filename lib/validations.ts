import { z } from 'zod'

// ============================================
// Base Validation Rules
// ============================================

const emailSchema = z.string().email('Invalid email address')
const localeSchema = z.enum(['en', 'zh', 'ua'])

// ============================================
// Project Schemas
// ============================================

// i18n object where en is required (the canonical fallback used everywhere).
const i18nEnRequired = z
  .object({
    en: z.string().min(1, 'English translation is required'),
    zh: z.string().optional(),
    ua: z.string().optional(),
  })
  .passthrough()

// i18n object where all locales are optional. Aggregated projects don't read
// unit_name at all (they substitute 'USD'), so it's fully optional in the base
// shape; non-aggregated projects require .en, enforced via superRefine below.
const i18nAllOptional = z
  .object({
    en: z.string().optional(),
    zh: z.string().optional(),
    ua: z.string().optional(),
  })
  .passthrough()

export const createProjectSchema = z
  .object({
    project_name_i18n: i18nEnRequired,
    location_i18n: i18nEnRequired,
    unit_name_i18n: i18nAllOptional.optional(),
    unit_price: z.number().positive('Unit price must be > 0'),
    start_date: z.string().refine((date) => !isNaN(Date.parse(date)), {
      message: 'Invalid date format',
    }),
    end_date: z
      .string()
      .optional()
      .nullable()
      .refine((date) => !date || !isNaN(Date.parse(date)), { message: 'Invalid date format' }),
    is_long_term: z.boolean().optional().default(false),
    aggregate_donations: z.boolean().optional().default(false),
    target_units: z.number().int().min(0),
    status: z.enum(['planned', 'active']).optional().default('planned'),
  })
  .passthrough()
  .refine((data) => data.is_long_term || data.target_units >= 1, {
    message: 'Fixed-term projects require target_units >= 1',
    path: ['target_units'],
  })
  .superRefine((data, ctx) => {
    if (!data.aggregate_donations && !data.unit_name_i18n?.en) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Unit name (English) is required for non-aggregated projects',
        path: ['unit_name_i18n', 'en'],
      })
    }
  })

export const updateProjectSchema = z
  .object({
    project_name_i18n: i18nEnRequired.optional(),
    location_i18n: i18nEnRequired.optional(),
    unit_name_i18n: i18nAllOptional.optional(),
    unit_price: z.number().positive().optional(),
    start_date: z
      .string()
      .refine((date) => !isNaN(Date.parse(date)), {
        message: 'Invalid date format',
      })
      .optional(),
    end_date: z
      .string()
      .nullable()
      .refine((date) => !date || !isNaN(Date.parse(date)), { message: 'Invalid date format' })
      .optional(),
    is_long_term: z.boolean().optional(),
    target_units: z.number().int().min(0).optional(),
    current_units: z.number().int().min(0).optional(),
    status: z.enum(['planned', 'active', 'completed', 'paused']).optional(),
  })
  .passthrough()
  .superRefine((data, ctx) => {
    // Only validate when both fields are present in the update payload.
    // If the caller isn't touching aggregate_donations or unit_name_i18n,
    // we can't infer the project's current type and must stay permissive.
    if (
      data.aggregate_donations === false &&
      data.unit_name_i18n !== undefined &&
      !data.unit_name_i18n.en
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Unit name (English) is required for non-aggregated projects',
        path: ['unit_name_i18n', 'en'],
      })
    }
  })

// ============================================
// Donation Schemas
// ============================================

export const donationFormSchema = z.object({
  project_id: z.number().int().min(0), // Allow 0 for rehabilitation center support (tip project)
  quantity: z.number().int().min(1).max(10), // Max 10 units per order to prevent performance issues
  amount: z.number().positive().max(10000).optional(), // For aggregated projects: direct donation amount (max $10,000 per order)
  donor_name: z.string().min(2, 'Name must be at least 2 characters').max(255),
  donor_email: z.string().email('Invalid email address'),
  donor_message: z.string().max(1000).optional(),
  contact_telegram: z.string().max(255).optional(),
  contact_whatsapp: z.string().max(255).optional(),
  tip_amount: z.number().min(0).max(10000).optional(), // Optional tip for project 0 (max $10,000 per order)
  locale: z.enum(['en', 'zh', 'ua']),
})

// ============================================
// Subscription Schemas
// ============================================

export const createSubscriptionSchema = z.object({
  email: emailSchema,
  locale: localeSchema,
})

export const unsubscribeSchema = z.object({
  email: emailSchema,
  locale: localeSchema.optional(),
})

// ============================================
// Donation Tracking Schemas
// ============================================

export const trackDonationSchema = z.object({
  email: emailSchema,
  donationId: z.string().min(1, 'Donation ID is required'),
})

export const requestRefundSchema = z.object({
  donationPublicId: z.string().min(1, 'Donation ID is required'),
  email: emailSchema,
})

// ============================================
// Email Broadcast Schemas
// ============================================

export const sendBroadcastSchema = z.object({
  templateName: z.string().min(1, 'Template name is required'),
  variables: z.record(z.string()).optional(),
})
