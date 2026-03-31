/**
 * Email System Configuration
 */

import { OrgBranding } from './types'

// Organization Branding Configuration
export const ORG_BRANDING: OrgBranding = {
  name: {
    en: 'Way to Future UA',
    zh: '乌克兰未来之路',
    ua: 'Way to Future UA'
  },
  logoUrl: '', // No logo in emails
  websiteUrl: 'https://waytofutureua.org.ua',
  contactEmail: 'contact@waytofutureua.org.ua',
  socialLinks: {
    // TODO: Add actual social media links if available
    // facebook: 'https://facebook.com/waytofutureua',
    // twitter: 'https://twitter.com/waytofutureua',
    // instagram: 'https://instagram.com/waytofutureua',
  }
}

// Email color scheme - Ukraine humanitarian theme
// Inspired by Ukrainian flag colors: blue (sky/peace) + gold (wheat/hope)
export const EMAIL_COLORS = {
  // Ukraine color palette
  ukraineBlue: '#076CB3',      // Primary blue - trust, peace
  ukraineBlue600: '#065A96',   // Darker blue for hover
  ukraineBlue700: '#054878',   // Deep blue for headers
  ukraineBlue800: '#04375B',   // Very dark blue
  ukraineGold: '#F5B800',      // CTA gold - hope, action
  ukraineGold600: '#D19A00',   // Darker gold for hover

  // Primary gradient - Deep Ukraine blue to rich navy
  gradientStart: '#054878',    // ukraine-blue-700
  gradientMid: '#04375B',      // ukraine-blue-800
  gradientEnd: '#02263E',      // ukraine-blue-900

  // Accent colors
  primary: '#076CB3',          // ukraine-blue-500
  primaryDark: '#065A96',      // ukraine-blue-600
  accent: '#F5B800',           // ukraine-gold-500
  accentDark: '#D19A00',       // ukraine-gold-600
  success: '#10B981',          // life-500
  successDark: '#059669',      // life-600
  warning: '#F5B800',          // ukraine-gold-500
  warningDark: '#D19A00',      // ukraine-gold-600
  info: '#076CB3',             // ukraine-blue-500
  error: '#E76F51',            // warm-500
  errorDark: '#C85A3D',        // warm-600

  // Text colors (for dark background)
  text: '#ffffff',
  textMuted: 'rgba(255,255,255,0.9)',
  textLight: 'rgba(255,255,255,0.75)',
  textSubtle: 'rgba(255,255,255,0.5)',

  // Background colors
  background: '#02263E',       // Deep navy
  cardBg: 'rgba(255,255,255,0.03)',
  cardBorder: 'rgba(255,255,255,0.1)',
  glassBg: 'rgba(255,255,255,0.08)',
  glassBorder: 'rgba(255,255,255,0.15)',

  // Legacy (for backwards compatibility)
  backgroundLight: 'rgba(255,255,255,0.05)',
  border: 'rgba(255,255,255,0.1)'
} as const
