'use client'

import { useState } from 'react'
import type { Database } from '@/types/database'
import type { I18nText } from '@/types'
import { updateProject } from '@/app/actions/admin'
import { formatDateTime } from '@/lib/i18n-utils'
import AdminBaseModal from './AdminBaseModal'

type Project = Database['public']['Tables']['projects']['Row']

interface Props {
  project: Project
  onClose: () => void
  onSaved: (project: Project) => void
}

export default function ProjectEditModal({ project, onClose, onSaved }: Props) {
  const [formData, setFormData] = useState<Project>(project)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const updated = await updateProject(project.id, formData)
      onSaved(updated)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update project')
    } finally {
      setLoading(false)
    }
  }

  const updateField = (field: keyof Project, value: any) => {
    setFormData({ ...formData, [field]: value })
  }


  return (
    <AdminBaseModal title={`Edit Project #${project.id}`} onClose={onClose} error={error}>
      {/* Read-only fields */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg space-y-2 text-sm">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="font-medium text-gray-700">ID:</span>
                <span className="ml-2 text-gray-900">{project.id}</span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Current Units:</span>
                <span className="ml-2 text-gray-900">{project.current_units}</span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Created At:</span>
                <span className="ml-2 text-gray-900">{formatDateTime(project.created_at)}</span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Updated At:</span>
                <span className="ml-2 text-gray-900">{formatDateTime(project.updated_at)}</span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Long-term Project:</span>
                <span className="ml-2 text-gray-900">{project.is_long_term ? 'Yes' : 'No'}</span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Aggregate Donations:</span>
                <span className="ml-2 text-gray-900">{project.aggregate_donations ? 'Yes' : 'No'}</span>
              </div>
            </div>
            <div className="mt-2 pt-2 border-t border-gray-200">
              <p className="text-xs text-gray-600 italic">
                Note: Long-term and Aggregate Donations flags can only be set during project creation and cannot be modified afterwards.
              </p>
            </div>
          </div>

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
                    onChange={(e) => updateField('status', e.target.value)}
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
              <div className="grid grid-cols-2 gap-4">
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
                    onChange={(e) => updateField('unit_name', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
              </div>
            </div>

            {/* Dates */}
            <div className="border-b pb-4">
              <h3 className="text-lg font-semibold mb-3 font-body">Timeline</h3>
              <div className="grid grid-cols-2 gap-4">
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
              </div>
            </div>

            {/* i18n Fields */}
            <div className="border-b pb-4">
              <h3 className="text-lg font-semibold mb-3 font-body">Internationalization (Optional)</h3>
              <p className="text-sm text-gray-600 mb-4">
                Provide translations for different languages. Leave empty to use the basic information above.
              </p>

              <div className="space-y-6">
                {/* Project Name i18n */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">Project Name Translations</h4>
                  <div className="grid grid-cols-1 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        English (en)
                      </label>
                      <input
                        type="text"
                        value={(formData.project_name_i18n as I18nText)?.en || ''}
                        onChange={(e) => {
                          const current = (formData.project_name_i18n as I18nText) || {}
                          updateField('project_name_i18n', { ...current, en: e.target.value || undefined })
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        placeholder="Project Name"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Chinese (zh)
                      </label>
                      <input
                        type="text"
                        value={(formData.project_name_i18n as I18nText)?.zh || ''}
                        onChange={(e) => {
                          const current = (formData.project_name_i18n as I18nText) || {}
                          updateField('project_name_i18n', { ...current, zh: e.target.value || undefined })
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        placeholder="Project name"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Ukrainian (ua)
                      </label>
                      <input
                        type="text"
                        value={(formData.project_name_i18n as I18nText)?.ua || ''}
                        onChange={(e) => {
                          const current = (formData.project_name_i18n as I18nText) || {}
                          updateField('project_name_i18n', { ...current, ua: e.target.value || undefined })
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        placeholder="Назва проекту"
                      />
                    </div>
                  </div>
                </div>

                {/* Location i18n */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">Location Translations</h4>
                  <div className="grid grid-cols-1 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        English (en)
                      </label>
                      <input
                        type="text"
                        value={(formData.location_i18n as I18nText)?.en || ''}
                        onChange={(e) => {
                          const current = (formData.location_i18n as I18nText) || {}
                          updateField('location_i18n', { ...current, en: e.target.value || undefined })
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        placeholder="Location"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Chinese (zh)
                      </label>
                      <input
                        type="text"
                        value={(formData.location_i18n as I18nText)?.zh || ''}
                        onChange={(e) => {
                          const current = (formData.location_i18n as I18nText) || {}
                          updateField('location_i18n', { ...current, zh: e.target.value || undefined })
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        placeholder="Location"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Ukrainian (ua)
                      </label>
                      <input
                        type="text"
                        value={(formData.location_i18n as I18nText)?.ua || ''}
                        onChange={(e) => {
                          const current = (formData.location_i18n as I18nText) || {}
                          updateField('location_i18n', { ...current, ua: e.target.value || undefined })
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        placeholder="Розташування"
                      />
                    </div>
                  </div>
                </div>

                {/* Unit Name i18n */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">Unit Name Translations</h4>
                  <div className="grid grid-cols-1 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        English (en)
                      </label>
                      <input
                        type="text"
                        value={(formData.unit_name_i18n as I18nText)?.en || ''}
                        onChange={(e) => {
                          const current = (formData.unit_name_i18n as I18nText) || {}
                          updateField('unit_name_i18n', { ...current, en: e.target.value || undefined })
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        placeholder="unit"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Chinese (zh)
                      </label>
                      <input
                        type="text"
                        value={(formData.unit_name_i18n as I18nText)?.zh || ''}
                        onChange={(e) => {
                          const current = (formData.unit_name_i18n as I18nText) || {}
                          updateField('unit_name_i18n', { ...current, zh: e.target.value || undefined })
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        placeholder="Unit"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Ukrainian (ua)
                      </label>
                      <input
                        type="text"
                        value={(formData.unit_name_i18n as I18nText)?.ua || ''}
                        onChange={(e) => {
                          const current = (formData.unit_name_i18n as I18nText) || {}
                          updateField('unit_name_i18n', { ...current, ua: e.target.value || undefined })
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        placeholder="одиниця"
                      />
                    </div>
                  </div>
                </div>

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
                {loading ? 'Saving...' : 'Save'}
              </button>
            </div>
      </form>
    </AdminBaseModal>
  )
}
