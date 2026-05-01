/**
 * Admin server actions barrel.
 *
 * Real implementations live under `app/actions/admin/`. This file re-exports
 * everything so that existing callers (`import { ... } from '@/app/actions/admin'`)
 * continue to work without changes.
 */

export * from './admin/auth'
export * from './admin/donation-files'
export * from './admin/donations'
export * from './admin/projects'
