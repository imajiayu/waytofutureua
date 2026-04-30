type PageHeaderProps = {
  title: string
  subtitle: string
  titleColor?: string
}

export default function PageHeader({
  title,
  subtitle,
  titleColor = 'text-gray-900',
}: PageHeaderProps) {
  return (
    <div className="mb-12 text-center">
      <h1 className={`text-4xl font-bold lg:text-5xl ${titleColor} mb-4 font-display`}>{title}</h1>
      <p className="text-xl font-light text-gray-600">{subtitle}</p>
    </div>
  )
}
