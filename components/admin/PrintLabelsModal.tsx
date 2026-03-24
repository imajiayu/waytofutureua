'use client'

import { useState } from 'react'
import type { Database } from '@/types/database'
import AdminBaseModal from './AdminBaseModal'

type Donation = Database['public']['Tables']['donations']['Row']

interface Props {
  donations: Donation[]
  onClose: () => void
}

const PRINT_CSS = `
  @page { size: A4 landscape; margin: 0; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Arial, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif; }
  .label-page {
    width: 297mm;
    height: 210mm;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    page-break-after: always;
  }
  .label-page:last-child { page-break-after: auto; }
  .public-id { font-size: 90pt; font-weight: 900; line-height: 2.2; text-align: center; }
  .donor-name { font-size: 76pt; font-weight: 700; line-height: 2.2; text-align: center; }
  .donor-email { font-size: 42pt; line-height: 2.2; text-align: center; color: #333; }
  .date-text { font-size: 56pt; font-weight: 700; line-height: 2.2; text-align: center; }
`

function buildPrintPage(printWindow: Window, donations: Donation[], dateText: string) {
  const doc = printWindow.document

  const meta = doc.createElement('meta')
  meta.setAttribute('charset', 'utf-8')
  doc.head.appendChild(meta)

  const title = doc.createElement('title')
  title.textContent = 'Donation Labels'
  doc.head.appendChild(title)

  const style = doc.createElement('style')
  style.textContent = PRINT_CSS
  doc.head.appendChild(style)

  for (const donation of donations) {
    const page = doc.createElement('div')
    page.className = 'label-page'

    const idEl = doc.createElement('div')
    idEl.className = 'public-id'
    idEl.textContent = donation.donation_public_id
    page.appendChild(idEl)

    const nameEl = doc.createElement('div')
    nameEl.className = 'donor-name'
    nameEl.textContent = donation.donor_name
    page.appendChild(nameEl)

    const emailEl = doc.createElement('div')
    emailEl.className = 'donor-email'
    emailEl.textContent = donation.donor_email
    page.appendChild(emailEl)

    if (dateText) {
      const dateEl = doc.createElement('div')
      dateEl.className = 'date-text'
      dateEl.textContent = dateText
      page.appendChild(dateEl)
    }

    doc.body.appendChild(page)
  }
}

export default function PrintLabelsModal({ donations, onClose }: Props) {
  const [dateText, setDateText] = useState('')
  const [error, setError] = useState('')

  const handlePrint = () => {
    setError('')
    const printWindow = window.open('', '_blank')
    if (!printWindow) {
      setError('Pop-up blocked. Please allow pop-ups for this site and try again.')
      return
    }
    buildPrintPage(printWindow, donations, dateText.trim())
    printWindow.document.close()
    setTimeout(() => {
      printWindow.focus()
      printWindow.print()
    }, 200)
  }

  return (
    <AdminBaseModal
      title={`Print Labels (${donations.length} selected)`}
      onClose={onClose}
      error={error}
    >
      <div className="space-y-4">
        {/* Date input */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Date (optional)
          </label>
          <input
            type="text"
            value={dateText}
            onChange={(e) => setDateText(e.target.value)}
            placeholder="e.g. 2025-12-25"
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Preview table */}
        <div>
          <h4 className="text-xs font-medium text-gray-600 mb-2 uppercase">
            Selected Donations
          </h4>
          <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-md">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">#</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Public ID</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Donor</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Email</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {donations.map((d, i) => (
                  <tr key={d.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2 text-gray-500">{i + 1}</td>
                    <td className="px-3 py-2 font-mono font-medium">{d.donation_public_id}</td>
                    <td className="px-3 py-2">{d.donor_name}</td>
                    <td className="px-3 py-2 text-gray-500">{d.donor_email}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex justify-end gap-3 pt-2 border-t border-gray-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="px-4 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-800 transition-colors"
          >
            Print ({donations.length})
          </button>
        </div>
      </div>
    </AdminBaseModal>
  )
}
