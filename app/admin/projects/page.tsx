import { redirect } from 'next/navigation'

import { getAdminProjects } from '@/app/actions/admin'
import ProjectsTable from '@/components/admin/ProjectsTable'
import { getAdminUser } from '@/lib/supabase/admin-auth'

export default async function AdminProjectsPage() {
  const user = await getAdminUser()
  if (!user) {
    redirect('/admin/login')
  }

  const projects = await getAdminProjects()

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-body text-2xl font-bold text-gray-900">Projects</h1>
      </div>
      <ProjectsTable initialProjects={projects} />
    </div>
  )
}
