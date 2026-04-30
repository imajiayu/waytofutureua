'use client'

import { useState } from 'react'

import { updateProject } from '@/app/actions/admin'
import { formatDateTime } from '@/lib/i18n-utils'
import type { I18nText } from '@/types'
import type { Database } from '@/types/database'

import AdminBaseModal from './AdminBaseModal'
import I18nFieldGroup from './I18nFieldGroup'
import { SelectField, TextField } from './ui/FormField'

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

  const updateField = (field: keyof Project, value: Project[keyof Project]) => {
    setFormData({ ...formData, [field]: value })
  }

  return (
    <AdminBaseModal title={`Edit Project #${project.id}`} onClose={onClose} error={error}>
      {/* Read-only fields */}
      <div className="mb-6 space-y-2 rounded-lg bg-gray-50 p-4 text-sm">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
        <div className="mt-2 border-t border-gray-200 pt-2">
          <p className="text-xs italic text-gray-600">
            Note: Long-term and Aggregate Donations flags can only be set during project creation
            and cannot be modified afterwards.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Basic Info */}
        <div className="border-b pb-4">
          <h3 className="mb-3 font-body text-lg font-semibold">Basic Information</h3>
          <div className="space-y-4">
            <TextField
              label="Project Name"
              required
              value={formData.project_name}
              onChange={(v) => updateField('project_name', v)}
            />
            <TextField
              label="Location"
              required
              value={formData.location}
              onChange={(v) => updateField('location', v)}
            />
            <SelectField
              label="Status"
              required
              value={formData.status || 'planned'}
              onChange={(v) => updateField('status', v)}
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
              value={formData.unit_price}
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
              onChange={(v) => updateField('unit_name', v)}
            />
          </div>
        </div>

        {/* Dates */}
        <div className="border-b pb-4">
          <h3 className="mb-3 font-body text-lg font-semibold">Timeline</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <TextField
              label="Start Date"
              type="date"
              required
              value={formData.start_date}
              onChange={(v) => updateField('start_date', v)}
            />
            <TextField
              label="End Date"
              type="date"
              value={formData.end_date || ''}
              onChange={(v) => updateField('end_date', v || null)}
            />
          </div>
        </div>

        {/* i18n Fields */}
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
            {loading ? 'Saving...' : 'Save'}
          </button>
        </div>
      </form>
    </AdminBaseModal>
  )
}
