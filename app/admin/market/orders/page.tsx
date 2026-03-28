import { redirect } from 'next/navigation'
import { getAdminUser } from '@/lib/supabase/admin-auth'
import { getAdminMarketOrders } from '@/app/actions/market-admin'
import MarketOrdersTable from '@/components/admin/MarketOrdersTable'

export default async function AdminMarketOrdersPage() {
  const user = await getAdminUser()
  if (!user) redirect('/admin/login')

  const { orders } = await getAdminMarketOrders()

  return (
    <div>
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900 font-body">Market Orders</h1>
      </div>
      <MarketOrdersTable initialOrders={orders} />
    </div>
  )
}
