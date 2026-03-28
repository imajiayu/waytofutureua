'use client'

import { useState, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { adminLogout } from '@/app/actions/admin'
import GlobalLoadingSpinner from '@/components/layout/GlobalLoadingSpinner'

export default function AdminNav() {
  const pathname = usePathname()
  const router = useRouter()
  const [isNavigating, setIsNavigating] = useState(false)

  // Reset loading state when pathname changes
  useEffect(() => {
    setIsNavigating(false)
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
    { href: '/admin/market', label: 'Market Items', children: [
      { href: '/admin/market/orders', label: 'Orders' },
    ]},
  ]

  // 有子项的导航用前缀匹配（如 /admin/market 匹配 /admin/market/orders），
  // 无子项的保持精确匹配，避免改变已有导航项的高亮行为
  const isActive = (href: string, hasChildren: boolean) =>
    hasChildren
      ? pathname === href || pathname.startsWith(href + '/')
      : pathname === href

  return (
    <>
      <GlobalLoadingSpinner isLoading={isNavigating} loadingText="Loading..." />
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-14 sm:h-16">
            <div className="flex min-w-0">
              <div className="flex-shrink-0 flex items-center">
                <h1 className="text-base sm:text-xl font-bold font-body whitespace-nowrap">Admin</h1>
              </div>
              <div className="ml-3 sm:ml-6 flex space-x-3 sm:space-x-8 overflow-x-auto">
                {navItems.map((item) => (
                  <div key={item.href} className="relative flex items-center">
                    <button
                      onClick={() => handleNavClick(item.href)}
                      className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                        isActive(item.href, !!item.children?.length)
                          ? 'border-blue-500 text-gray-900'
                          : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                      }`}
                    >
                      {item.label}
                    </button>
                    {item.children?.map((child) => (
                      <button
                        key={child.href}
                        onClick={() => handleNavClick(child.href)}
                        className={`inline-flex items-center px-1 pt-1 ml-3 border-b-2 text-xs font-medium ${
                          pathname === child.href
                            ? 'border-blue-400 text-gray-800'
                            : 'border-transparent text-gray-400 hover:border-gray-200 hover:text-gray-600'
                        }`}
                      >
                        {child.label}
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            </div>
            <div className="flex items-center">
              <button
                onClick={handleLogout}
                className="text-sm text-gray-700 hover:text-gray-900"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>
    </>
  )
}
