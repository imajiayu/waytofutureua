import createMiddleware from 'next-intl/middleware'
import { locales, defaultLocale } from './i18n/config'

export default createMiddleware({
  // A list of all locales that are supported
  locales,

  // Used when no locale matches
  defaultLocale,

  // Always use locale prefix (even for default locale)
  localePrefix: 'always',

  // hreflang 由 HTML <link rel="alternate"> 接管。
  // next-intl 默认会把 'ua' 原样写进 Link header（应为 ISO 'uk'），与 HTML 冲突时 Google 会丢弃 canonical。
  alternateLinks: false,
})

export const config = {
  // Match only internationalized pathnames
  matcher: [
    // Match all pathnames except for
    // - … if they start with `/api`, `/_next` or `/_vercel`
    // - … if they start with `/admin` (admin panel)
    // - … the ones containing a dot (e.g. `favicon.ico`)
    '/((?!api|_next|_vercel|admin|.*\\..*).*)',
  ],
}
