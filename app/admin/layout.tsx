import type { Metadata } from 'next'
import { Source_Sans_3, JetBrains_Mono } from 'next/font/google'
import { NextIntlClientProvider } from 'next-intl'
import { getMessages } from 'next-intl/server'
import { getAdminUser } from '@/lib/supabase/admin-auth'
import AdminNav from '@/components/admin/AdminNav'
import '../globals.css'

// 管理后台使用 Source Sans 3 作为主字体，保持专业简洁
const sourceSans = Source_Sans_3({
  subsets: ['latin', 'latin-ext'],
  display: 'swap',
  variable: '--font-source-sans',
  weight: ['400', '500', '600', '700'],
})

// 数据字体 - 用于表格和统计数据
const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-jetbrains-mono',
  weight: ['400', '500', '600'],
})

export const metadata: Metadata = {
  title: 'Admin Panel',
  description: 'Admin panel for managing projects and donations',
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getAdminUser()

  // Get English messages for admin panel
  const messages = await getMessages({ locale: 'en' })

  // 如果未登录且不是登录页面，返回登录页面布局
  if (!user) {
    return (
      <html lang="en">
        <body className={`${sourceSans.variable} ${jetbrainsMono.variable} font-body antialiased`}>
          <NextIntlClientProvider messages={messages} locale="en">
            {children}
          </NextIntlClientProvider>
        </body>
      </html>
    )
  }

  return (
    <html lang="en">
      <body className={`${sourceSans.variable} ${jetbrainsMono.variable} font-body antialiased`}>
        <NextIntlClientProvider messages={messages} locale="en">
          <div className="min-h-screen bg-gray-50">
            <AdminNav />
            <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
              {children}
            </main>
          </div>
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
