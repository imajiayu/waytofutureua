import { redirect } from 'next/navigation'

import { getAdminMarketOrders } from '@/app/actions/market-admin'
import MarketOrdersTable from '@/components/admin/MarketOrdersTable'
import { getAdminUser } from '@/lib/supabase/admin-auth'

export default async function AdminMarketOrdersPage() {
  const user = await getAdminUser()
  if (!user) redirect('/admin/login')

  const { orders } = await getAdminMarketOrders()

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-body text-2xl font-bold text-gray-900">Market Orders</h1>
      </div>
      <MarketOrdersTable initialOrders={orders} />
    </div>
  )
}
