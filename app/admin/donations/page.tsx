import { redirect } from 'next/navigation'

import { getAdminDonations } from '@/app/actions/admin'
import DonationsTable from '@/components/admin/DonationsTable'
import { getAdminUser } from '@/lib/supabase/admin-auth'

export default async function AdminDonationsPage() {
  const user = await getAdminUser()
  if (!user) {
    redirect('/admin/login')
  }

  const { donations, history } = await getAdminDonations()

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-body text-2xl font-bold text-gray-900">Donations</h1>
      </div>
      <DonationsTable initialDonations={donations} statusHistory={history} />
    </div>
  )
}
