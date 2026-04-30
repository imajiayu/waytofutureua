'use client'

import { useState } from 'react'

import { createProject } from '@/app/actions/admin'
import type { I18nText } from '@/types'
import type { Database } from '@/types/database'

import AdminBaseModal from './AdminBaseModal'
import I18nFieldGroup from './I18nFieldGroup'
import { SelectField, TextField } from './ui/FormField'

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
          <h3 className="mb-3 font-body text-lg font-semibold">Basic Information</h3>
          <div className="space-y-4">
            <TextField
              label="Project Name"
              required
              value={formData.project_name || ''}
              onChange={(v) => updateField('project_name', v)}
            />
            <TextField
              label="Location"
              required
              value={formData.location || ''}
              onChange={(v) => updateField('location', v)}
            />
            <SelectField
              label="Status"
              required
              value={formData.status || 'planned'}
              onChange={(v) => updateField('status', v as ProjectInsert['status'])}
            >
              <option value="planned">Planned</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="paused">Paused</option>
            </SelectField>
          </div>
        </div>

        {/* Pricing & Units */}
        <div className="border-b pb-4">
          <h3 className="mb-3 font-body text-lg font-semibold">Pricing & Units</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <TextField
              label="Unit Price"
              type="number"
              required
              min={0}
              step={0.01}
              value={formData.unit_price || 0}
              onChange={(v) => updateField('unit_price', Number(v))}
            />
            <TextField
              label="Target Units"
              type="number"
              min={0}
              value={formData.target_units || 0}
              onChange={(v) => updateField('target_units', Number(v))}
            />
            <TextField
              label="Unit Name"
              value={formData.unit_name || ''}
              onChange={(v) => updateField('unit_name', v || null)}
            />
          </div>
        </div>

        {/* Timeline & Project Type */}
        <div className="border-b pb-4">
          <h3 className="mb-3 font-body text-lg font-semibold">Timeline & Project Type</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <TextField
              label="Start Date"
              type="date"
              required
              value={formData.start_date || ''}
              onChange={(v) => updateField('start_date', v)}
            />
            <TextField
              label="End Date"
              type="date"
              value={formData.end_date || ''}
              onChange={(v) => updateField('end_date', v || null)}
            />

            <div className="space-y-3 rounded-lg bg-blue-50 p-4 sm:col-span-2">
              <p className="mb-2 text-sm font-medium text-blue-900">
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
                  <span className="text-sm font-medium text-gray-700">Long-term project</span>
                  <p className="mt-1 text-xs text-gray-600">
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
                  <p className="mt-1 text-xs text-gray-600">
                    When enabled, donors can input any amount directly instead of selecting
                    quantity. All donations will be aggregated into single records.
                  </p>
                </div>
              </label>

              <div className="mt-2 border-t border-blue-200 pt-2">
                <p className="text-xs font-medium text-blue-800">
                  ⚠️ Note: These settings cannot be changed after project creation
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* i18n Fields - Optional */}
        <div className="border-b pb-4">
          <h3 className="mb-3 font-body text-lg font-semibold">Internationalization (Optional)</h3>
          <p className="mb-4 text-sm text-gray-600">
            Provide translations for different languages. Leave empty to use the basic information
            above.
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

        <div className="flex justify-end space-x-3 border-t pt-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Creating...' : 'Create Project'}
          </button>
        </div>
      </form>
    </AdminBaseModal>
  )
}
