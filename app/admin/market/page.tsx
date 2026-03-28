import { redirect } from 'next/navigation'
import { getAdminUser } from '@/lib/supabase/admin-auth'
import { getAdminMarketItems } from '@/app/actions/market-admin'
import MarketItemsTable from '@/components/admin/MarketItemsTable'

export default async function AdminMarketPage() {
  const user = await getAdminUser()
  if (!user) redirect('/admin/login')

  const { items } = await getAdminMarketItems()

  return (
    <div>
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900 font-body">Market Items</h1>
      </div>
      <MarketItemsTable initialItems={items} />
    </div>
  )
}
