'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

import { adminLogout } from '@/app/actions/admin'
import GlobalLoadingSpinner from '@/components/layout/GlobalLoadingSpinner'

export default function AdminNav() {
  const pathname = usePathname()
  const router = useRouter()
  const [isNavigating, setIsNavigating] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  // Reset loading state and close mobile menu when pathname changes
  useEffect(() => {
    setIsNavigating(false)
    setIsMobileMenuOpen(false)
  }, [pathname])

  const handleLogout = async () => {
    setIsNavigating(true)
    await adminLogout()
    router.push('/admin/login')
    router.refresh()
  }

  const handleNavClick = (href: string) => {
    setIsNavigating(true)
    router.push(href)
  }

  const navItems = [
    { href: '/admin/projects', label: 'Projects' },
    { href: '/admin/donations', label: 'Donations' },
    { href: '/admin/subscriptions', label: 'Subscriptions' },
    { href: '/admin/market', label: 'Market Items' },
    { href: '/admin/market/orders', label: 'Market Orders' },
  ]

  const isActive = (href: string) => pathname === href

  return (
    <>
      <GlobalLoadingSpinner isLoading={isNavigating} loadingText="Loading..." />
      <nav className="bg-white shadow">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-14 justify-between sm:h-16">
            {/* Left: Logo + Desktop nav */}
            <div className="flex min-w-0">
              <div className="flex flex-shrink-0 items-center">
                <h1 className="whitespace-nowrap font-body text-base font-bold sm:text-xl">
                  Admin
                </h1>
              </div>
              {/* Desktop nav links */}
              <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                {navItems.map((item) => (
                  <button
                    key={item.href}
                    onClick={() => handleNavClick(item.href)}
                    className={`inline-flex items-center border-b-2 px-1 pt-1 text-sm font-medium ${
                      isActive(item.href)
                        ? 'border-blue-500 text-gray-900'
                        : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Right: Logout (desktop) + Hamburger (mobile) */}
            <div className="flex items-center gap-3">
              <button
                onClick={handleLogout}
                className="hidden text-sm text-gray-700 hover:text-gray-900 sm:block"
              >
                Logout
              </button>
              {/* Mobile hamburger */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="inline-flex items-center justify-center rounded-md p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 sm:hidden"
                aria-expanded={isMobileMenuOpen}
                aria-label="Toggle navigation menu"
              >
                {isMobileMenuOpen ? (
                  <svg
                    className="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth="1.5"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : (
                  <svg
                    className="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth="1.5"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
                    />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile dropdown menu */}
        {isMobileMenuOpen && (
          <div className="border-t border-gray-200 sm:hidden">
            <div className="space-y-1 py-2">
              {navItems.map((item) => (
                <button
                  key={item.href}
                  onClick={() => handleNavClick(item.href)}
                  className={`block w-full px-4 py-2.5 text-left text-sm font-medium ${
                    isActive(item.href)
                      ? 'border-l-4 border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-l-4 border-transparent text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  {item.label}
                </button>
              ))}
              <div className="mt-1 border-t border-gray-200 pt-1">
                <button
                  onClick={handleLogout}
                  className="block w-full border-l-4 border-transparent px-4 py-2.5 text-left text-sm font-medium text-red-600 hover:bg-red-50"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        )}
      </nav>
    </>
  )
}
