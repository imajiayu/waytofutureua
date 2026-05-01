'use client'

interface Props {
  result: { success: boolean; sent: number; failed: number }
  onClose: () => void
}

export default function BroadcastResultView({ result, onClose }: Props) {
  return (
    <div className="space-y-4">
      <div
        className={`rounded-lg p-4 ${result.success ? 'border border-green-200 bg-green-50' : 'border border-yellow-200 bg-yellow-50'}`}
      >
        <div className="flex items-start gap-3">
          <svg
            className={`h-6 w-6 flex-shrink-0 ${result.success ? 'text-green-600' : 'text-yellow-600'}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <div>
            <h3 className={`font-medium ${result.success ? 'text-green-900' : 'text-yellow-900'}`}>
              {result.success ? 'Broadcast Sent Successfully!' : 'Broadcast Completed with Errors'}
            </h3>
            <div className="mt-2 text-sm text-gray-700">
              <p>Successfully sent: {result.sent}</p>
              {result.failed > 0 && <p>Failed: {result.failed}</p>}
            </div>
          </div>
        </div>
      </div>

      <button
        onClick={onClose}
        className="w-full rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700"
      >
        Close
      </button>
    </div>
  )
}
