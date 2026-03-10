/**
 * Project Detail Pages
 *
 * Each project has its own dedicated detail page component.
 * This file exports all project detail components for use in DonatePageClient.
 *
 * Directory Structure:
 * detail-pages/
 * ├── index.ts           # This file - exports all project components
 * ├── Project0/          # Way to Health (Rehabilitation Center)
 * │   ├── index.tsx      # Main component
 * │   ├── EmployeeCarousel.tsx
 * │   └── CollapsibleGallery.tsx
 * ├── Project3/          # Christmas Gift Program
 * │   └── index.tsx      # Main component
 * ├── Project4/          # Mykolaivka Family Support
 * │   └── index.tsx      # Main component
 * └── Project5/          # Hot Meals for Dnipro
 *     └── index.tsx      # Main component
 *
 * Adding a New Project:
 * 1. Create a new folder: Project{N}/
 * 2. Create index.tsx with your component
 * 3. Export it here
 * 4. Add to PROJECT_DETAIL_COMPONENTS map in DonatePageClient.tsx
 */

// Project 0: Way to Health - Rehabilitation Center
export { default as Project0DetailContent } from './Project0'

// Project 3: Christmas Gift Program for Orphans
export { default as Project3DetailContent } from './Project3'

// Project 4: Mykolaivka Family Support
export { default as Project4DetailContent } from './Project4'

// Project 5: Hot Meals and Support for Dnipro Residents
export { default as Project5DetailContent } from './Project5'

// Component type for project detail pages
import type { ProjectStats } from '@/types'

export interface ProjectDetailProps {
  project: ProjectStats
  locale: string
}
