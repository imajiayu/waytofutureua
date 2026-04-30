import { redirect } from 'next/navigation'

import { getAdminMarketItems } from '@/app/actions/market-admin'
import MarketItemsTable from '@/components/admin/MarketItemsTable'
import { getAdminUser } from '@/lib/supabase/admin-auth'

export default async function AdminMarketPage() {
  const user = await getAdminUser()
  if (!user) redirect('/admin/login')

  const { items } = await getAdminMarketItems()

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-body text-2xl font-bold text-gray-900">Market Items</h1>
      </div>
      <MarketItemsTable initialItems={items} />
    </div>
  )
}
