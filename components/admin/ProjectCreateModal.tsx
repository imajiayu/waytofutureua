'use client'

import { useState } from 'react'

import { createProject } from '@/app/actions/admin'
import { useAsyncForm } from '@/lib/hooks/useAsyncForm'
import type { I18nText } from '@/types'
import type { Database } from '@/types/database'

import AdminBaseModal from './AdminBaseModal'
import I18nFieldGroup from './I18nFieldGroup'
import AdminButton from './ui/AdminButton'
import { SelectField, TextField } from './ui/FormField'

type Project = Database['public']['Tables']['projects']['Row']
type ProjectInsert = Database['public']['Tables']['projects']['Insert']

interface Props {
  onClose: () => void
  onCreated: (project: Project) => void
}

export default function ProjectCreateModal({ onClose, onCreated }: Props) {
  const [formData, setFormData] = useState<Partial<ProjectInsert>>({
    unit_price: 100,
    target_units: 0,
    start_date: new Date().toISOString().split('T')[0],
    status: 'planned',
    is_long_term: false,
    aggregate_donations: false,
  })

  const {
    loading,
    error,
    onSubmit: handleSubmit,
  } = useAsyncForm(
    async () => {
      const newProject = await createProject(formData as ProjectInsert)
      onCreated(newProject)
    },
    { fallbackError: 'Failed to create project' }
  )

  const updateField = <K extends keyof ProjectInsert>(field: K, value: ProjectInsert[K]) => {
    setFormData({ ...formData, [field]: value })
  }

  return (
    <AdminBaseModal title="Create New Project" onClose={onClose} error={error}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Translations — single source of truth for project name / location / unit name */}
        <div className="border-b pb-4">
          <h3 className="mb-3 font-body text-lg font-semibold">Translations</h3>
          <p className="mb-4 text-sm text-gray-600">
            English is required and used as the canonical fallback. Unit name is only read for
            non-aggregated projects (aggregated projects display amounts in USD).
          </p>
          <div className="space-y-6">
            <I18nFieldGroup
              title="Project Name"
              requiredLocale="en"
              value={formData.project_name_i18n as I18nText}
              onChange={(v) => updateField('project_name_i18n', v)}
              placeholders={{ en: 'Project Name', zh: '项目名称', ua: 'Назва проекту' }}
            />
            <I18nFieldGroup
              title="Location"
              requiredLocale="en"
              value={formData.location_i18n as I18nText}
              onChange={(v) => updateField('location_i18n', v)}
              placeholders={{ en: 'Location', zh: '地点', ua: 'Розташування' }}
            />
            <I18nFieldGroup
              title="Unit Name (non-aggregated only)"
              requiredLocale={formData.aggregate_donations ? undefined : 'en'}
              value={formData.unit_name_i18n as I18nText}
              onChange={(v) => updateField('unit_name_i18n', v)}
              placeholders={{ en: 'unit', zh: '件', ua: 'одиниця' }}
            />
          </div>
        </div>

        {/* Status */}
        <div className="border-b pb-4">
          <h3 className="mb-3 font-body text-lg font-semibold">Status</h3>
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

        <div className="flex justify-end space-x-3 border-t pt-4">
          <AdminButton variant="secondary" onClick={onClose}>
            Cancel
          </AdminButton>
          <AdminButton type="submit" variant="primary" disabled={loading}>
            {loading ? 'Creating...' : 'Create Project'}
          </AdminButton>
        </div>
      </form>
    </AdminBaseModal>
  )
}
