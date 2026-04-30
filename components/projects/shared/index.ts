/**
 * Shared Project Components
 *
 * Reusable components that can be used across multiple project detail pages.
 * These are fundamental building blocks, not project-specific templates.
 *
 * Available Components:
 * - ProjectProgressBar: Displays progress towards a goal
 * - ProjectResultsMasonry: Masonry grid layout for result images
 * - FadeInSection: Scroll-triggered fade-in animation wrapper
 * - AnimatedNumber: Animated number counter with intersection observer
 * - SectionHeader: Gradient bar + title header for detail page sections
 * - SectionNav: Sticky horizontal section quick-navigation bar
 */

export { default as AnimatedNumber } from './AnimatedNumber'
export { default as FadeInSection } from './FadeInSection'
export { default as ProjectProgressBar } from './ProjectProgressBar'
export { default as ProjectResultsMasonry } from './ProjectResultsMasonry'
export { default as SectionHeader } from './SectionHeader'
export { default as SectionNav } from './SectionNav'
export type { ResultImage } from './UnifiedResultsSection'
export { default as UnifiedResultsSection } from './UnifiedResultsSection'
