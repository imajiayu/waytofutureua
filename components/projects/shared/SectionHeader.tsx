interface SectionHeaderProps {
  title: string
  /** Full Tailwind gradient classes, e.g. "from-cyan-400 to-teal-500" */
  gradientClassName: string
  className?: string
  size?: 'sm' | 'default'
}

export default function SectionHeader({
  title,
  gradientClassName,
  className = 'mb-3',
  size = 'default',
}: SectionHeaderProps) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div
        className={`w-1 ${size === 'sm' ? 'h-5' : 'h-6'} bg-gradient-to-b ${gradientClassName} rounded-full`}
      />
      <h2
        className={`font-display ${
          size === 'sm' ? 'text-base md:text-lg' : 'text-lg md:text-xl'
        } font-bold text-gray-900`}
      >
        {title}
      </h2>
    </div>
  )
}
