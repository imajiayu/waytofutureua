'use client'

import { useState } from 'react'

import ProjectStatusBadge from '@/components/projects/ProjectStatusBadge'
import { getTranslatedText } from '@/lib/i18n-utils'
import type { I18nText } from '@/types'
import type { Database } from '@/types/database'

import ProjectCreateModal from './ProjectCreateModal'
import ProjectEditModal from './ProjectEditModal'

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
    <div className="rounded-lg bg-white shadow">
      <div className="px-4 py-5 sm:p-6">
        <div className="mb-4">
          <button
            onClick={handleCreateNew}
            className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            Create New Project
          </button>
        </div>

        {/* Mobile card view */}
        <div className="space-y-3 sm:hidden">
          {projects.map((project) => (
            <div
              key={project.id}
              className="rounded-lg border border-gray-200 bg-white p-3 active:bg-gray-50"
              onClick={() => handleEdit(project)}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-gray-900">
                    {getTranslatedText(project.project_name_i18n as I18nText, 'en')}
                  </div>
                  <div className="mt-0.5 text-xs text-gray-500">
                    {getTranslatedText(project.location_i18n as I18nText, 'en')}
                  </div>
                </div>
                <ProjectStatusBadge status={project.status || 'active'} />
              </div>
              <div className="mt-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {project.aggregate_donations ? (
                    <span className="inline-flex items-center rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-800">
                      Aggregated
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-800">
                      Unit-based
                    </span>
                  )}
                </div>
                <span className="text-xs text-gray-500">
                  {project.current_units} / {project.target_units || 0}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop table view */}
        <div className="hidden overflow-x-auto sm:block">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-3 text-left text-xs font-medium uppercase text-gray-500 sm:px-6">
                  ID
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium uppercase text-gray-500 sm:px-6">
                  Project Name
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium uppercase text-gray-500 sm:px-6">
                  Location
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium uppercase text-gray-500 sm:px-6">
                  Status
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium uppercase text-gray-500 sm:px-6">
                  Type
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium uppercase text-gray-500 sm:px-6">
                  Progress
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium uppercase text-gray-500 sm:px-6">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {projects.map((project) => (
                <tr
                  key={project.id}
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={() => handleEdit(project)}
                >
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900 sm:px-6">
                    {project.id}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900 sm:px-6">
                    {getTranslatedText(project.project_name_i18n as I18nText, 'en')}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 sm:px-6">
                    {getTranslatedText(project.location_i18n as I18nText, 'en')}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 sm:px-6">
                    <ProjectStatusBadge status={project.status || 'active'} />
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 sm:px-6">
                    {project.aggregate_donations ? (
                      <span className="inline-flex items-center rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-medium text-purple-800">
                        Aggregated
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-800">
                        Unit-based
                      </span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 sm:px-6">
                    {project.current_units} / {project.target_units || 0}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm sm:px-6">
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
        <ProjectCreateModal onClose={() => setIsCreating(false)} onCreated={handleCreated} />
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
