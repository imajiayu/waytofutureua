'use client'

interface Props {
  label: string
}

export default function ScrollToComplianceButton({ label }: Props) {
  const handleClick = () => {
    const complianceSection = document.getElementById('compliance-section')
    if (complianceSection) {
      const navHeight = 80
      const elementPosition = complianceSection.getBoundingClientRect().top
      const offsetPosition = elementPosition + window.pageYOffset - navHeight

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth',
      })
    }
  }

  return (
    <button
      onClick={handleClick}
      className="inline-flex flex-shrink-0 items-center rounded-lg border-2 border-ukraine-blue-500 bg-white px-4 py-2 font-semibold text-ukraine-blue-500 shadow-sm transition-all duration-200 hover:bg-ukraine-blue-50 hover:shadow-md"
    >
      <svg
        className="mr-1.5 h-4 w-4 flex-shrink-0"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </svg>
      <span className="whitespace-nowrap text-sm">{label}</span>
    </button>
  )
}
