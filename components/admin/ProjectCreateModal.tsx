'use client'

import { useState } from 'react'
import type { Database } from '@/types/database'
import type { I18nText } from '@/types'
import { createProject } from '@/app/actions/admin'
import AdminBaseModal from './AdminBaseModal'
import I18nFieldGroup from './I18nFieldGroup'

type Project = Database['public']['Tables']['projects']['Row']
type ProjectInsert = Database['public']['Tables']['projects']['Insert']

interface Props {
  onClose: () => void
  onCreated: (project: Project) => void
}

export default function ProjectCreateModal({ onClose, onCreated }: Props) {
  const [formData, setFormData] = useState<Partial<ProjectInsert>>({
    project_name: '',
    location: '',
    unit_price: 100,
    target_units: 0,
    start_date: new Date().toISOString().split('T')[0],
    status: 'planned',
    is_long_term: false,
    aggregate_donations: false,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const newProject = await createProject(formData as ProjectInsert)
      onCreated(newProject)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create project')
    } finally {
      setLoading(false)
    }
  }

  const updateField = <K extends keyof ProjectInsert>(field: K, value: ProjectInsert[K]) => {
    setFormData({ ...formData, [field]: value })
  }

  return (
    <AdminBaseModal title="Create New Project" onClose={onClose} error={error}>
      <form onSubmit={handleSubmit} className="space-y-4">
            {/* Basic Info */}
            <div className="border-b pb-4">
              <h3 className="text-lg font-semibold mb-3 font-body">Basic Information</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Project Name *
                  </label>
                  <input
                    type="text"
                    value={formData.project_name}
                    onChange={(e) => updateField('project_name', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Location *
                  </label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => updateField('location', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status *
                  </label>
                  <select
                    value={formData.status || 'planned'}
                    onChange={(e) => updateField('status', e.target.value as ProjectInsert['status'])}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="planned">Planned</option>
                    <option value="active">Active</option>
                    <option value="completed">Completed</option>
                    <option value="paused">Paused</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Pricing & Units */}
            <div className="border-b pb-4">
              <h3 className="text-lg font-semibold mb-3 font-body">Pricing & Units</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Unit Price *
                  </label>
                  <input
                    type="number"
                    value={formData.unit_price}
                    onChange={(e) => updateField('unit_price', Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    required
                    min="0"
                    step="0.01"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Target Units
                  </label>
                  <input
                    type="number"
                    value={formData.target_units || 0}
                    onChange={(e) => updateField('target_units', Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    min="0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Unit Name
                  </label>
                  <input
                    type="text"
                    value={formData.unit_name || ''}
                    onChange={(e) => updateField('unit_name', e.target.value || null)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
              </div>
            </div>

            {/* Timeline & Project Type */}
            <div className="border-b pb-4">
              <h3 className="text-lg font-semibold mb-3 font-body">Timeline & Project Type</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Date *
                  </label>
                  <input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => updateField('start_date', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={formData.end_date || ''}
                    onChange={(e) => updateField('end_date', e.target.value || null)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>

                <div className="sm:col-span-2 space-y-3 bg-blue-50 p-4 rounded-lg">
                  <p className="text-sm font-medium text-blue-900 mb-2">
                    Project Configuration (Can only be set during creation)
                  </p>

                  <label className="flex items-start">
                    <input
                      type="checkbox"
                      checked={formData.is_long_term || false}
                      onChange={(e) => updateField('is_long_term', e.target.checked)}
                      className="mr-2 mt-1"
                    />
                    <div>
                      <span className="text-sm font-medium text-gray-700">
                        Long-term project
                      </span>
                      <p className="text-xs text-gray-600 mt-1">
                        Check this if the project has no fixed end date
                      </p>
                    </div>
                  </label>

                  <label className="flex items-start">
                    <input
                      type="checkbox"
                      checked={formData.aggregate_donations || false}
                      onChange={(e) => updateField('aggregate_donations', e.target.checked)}
                      className="mr-2 mt-1"
                    />
                    <div>
                      <span className="text-sm font-medium text-gray-700">
                        Aggregate donations (allow direct amount input)
                      </span>
                      <p className="text-xs text-gray-600 mt-1">
                        When enabled, donors can input any amount directly instead of selecting quantity.
                        All donations will be aggregated into single records.
                      </p>
                    </div>
                  </label>

                  <div className="mt-2 pt-2 border-t border-blue-200">
                    <p className="text-xs text-blue-800 font-medium">
                      ⚠️ Note: These settings cannot be changed after project creation
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* i18n Fields - Optional */}
            <div className="border-b pb-4">
              <h3 className="text-lg font-semibold mb-3 font-body">Internationalization (Optional)</h3>
              <p className="text-sm text-gray-600 mb-4">
                Provide translations for different languages. Leave empty to use the basic information above.
              </p>

              <div className="space-y-6">
                <I18nFieldGroup
                  title="Project Name Translations"
                  value={formData.project_name_i18n as I18nText}
                  onChange={(v) => updateField('project_name_i18n', v)}
                  placeholders={{ en: 'Project Name', zh: 'Project name', ua: 'Назва проекту' }}
                />
                <I18nFieldGroup
                  title="Location Translations"
                  value={formData.location_i18n as I18nText}
                  onChange={(v) => updateField('location_i18n', v)}
                  placeholders={{ en: 'Location', zh: 'Location', ua: 'Розташування' }}
                />
                <I18nFieldGroup
                  title="Unit Name Translations"
                  value={formData.unit_name_i18n as I18nText}
                  onChange={(v) => updateField('unit_name_i18n', v)}
                  placeholders={{ en: 'unit', zh: 'Unit', ua: 'одиниця' }}
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Creating...' : 'Create Project'}
              </button>
            </div>
      </form>
    </AdminBaseModal>
  )
}
