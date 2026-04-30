import Image from 'next/image'

interface ProjectHeroBaseProps {
  imageSrc: string
  imageAlt: string
  heightClass?: string
  gradientOverlays: string[]
  glowEffects?: React.ReactNode
  overlayEffects?: React.ReactNode
  children: React.ReactNode
}

export default function ProjectHeroBase({
  imageSrc,
  imageAlt,
  heightClass = 'h-[40vh] min-h-[280px] md:h-[45vh] md:min-h-[320px]',
  gradientOverlays,
  glowEffects,
  overlayEffects,
  children,
}: ProjectHeroBaseProps) {
  return (
    <section className={`relative ${heightClass} group overflow-hidden rounded-xl md:rounded-2xl`}>
      <div className="absolute inset-0">
        <Image
          src={imageSrc}
          alt={imageAlt}
          fill
          sizes="(max-width: 1280px) 100vw, 1280px"
          className="object-cover transition-transform duration-700 group-hover:scale-105"
          priority
        />
        {gradientOverlays.map((gradient, i) => (
          <div key={i} className={`absolute inset-0 ${gradient}`} />
        ))}
        {glowEffects}
      </div>
      {overlayEffects}
      <div className="absolute inset-0 flex flex-col justify-end p-4 md:p-6">{children}</div>
    </section>
  )
}
