import { redirect } from 'next/navigation'
import { getAdminUser } from '@/lib/supabase/admin-auth'
import { getAdminProjects } from '@/app/actions/admin'
import ProjectsTable from '@/components/admin/ProjectsTable'

export default async function AdminProjectsPage() {
  const user = await getAdminUser()
  if (!user) {
    redirect('/admin/login')
  }

  const projects = await getAdminProjects()

  return (
    <div>
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900 font-body">Projects</h1>
      </div>
      <ProjectsTable initialProjects={projects} />
    </div>
  )
}
