'use client'

import { useState } from 'react'
import type { Database } from '@/types/database'
import ProjectEditModal from './ProjectEditModal'
import ProjectCreateModal from './ProjectCreateModal'
import ProjectStatusBadge from '@/components/projects/ProjectStatusBadge'

type Project = Database['public']['Tables']['projects']['Row']

interface Props {
  initialProjects: Project[]
}

export default function ProjectsTable({ initialProjects }: Props) {
  const [projects, setProjects] = useState(initialProjects)
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [isCreating, setIsCreating] = useState(false)

  const handleEdit = (project: Project) => {
    setEditingProject(project)
  }

  const handleCreateNew = () => {
    setIsCreating(true)
  }

  const handleCreated = (newProject: Project) => {
    setProjects([newProject, ...projects])
    setIsCreating(false)
  }

  const handleSaved = (updated: Project) => {
    setProjects(projects.map((p) => (p.id === updated.id ? updated : p)))
    setEditingProject(null)
  }

  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-4 py-5 sm:p-6">
        <div className="mb-4">
          <button
            onClick={handleCreateNew}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Create New Project
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  ID
                </th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Project Name
                </th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Location
                </th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Type
                </th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Progress
                </th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {projects.map((project) => (
                <tr
                  key={project.id}
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => handleEdit(project)}
                >
                  <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {project.id}
                  </td>
                  <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {project.project_name}
                  </td>
                  <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {project.location}
                  </td>
                  <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                    <ProjectStatusBadge status={project.status || 'active'} />
                  </td>
                  <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                    {project.aggregate_donations ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                        Aggregated
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        Unit-based
                      </span>
                    )}
                  </td>
                  <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {project.current_units} / {project.target_units || 0}
                  </td>
                  <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleEdit(project)
                      }}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isCreating && (
        <ProjectCreateModal
          onClose={() => setIsCreating(false)}
          onCreated={handleCreated}
        />
      )}

      {editingProject && (
        <ProjectEditModal
          project={editingProject}
          onClose={() => setEditingProject(null)}
          onSaved={handleSaved}
        />
      )}
    </div>
  )
}
