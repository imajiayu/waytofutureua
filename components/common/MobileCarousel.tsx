'use client'

import { useTranslations } from 'next-intl'
import { type ReactNode, useCallback, useEffect, useRef, useState } from 'react'

interface MobileCarouselProps {
  children: ReactNode[]
  className?: string
  /** 指示器颜色主题：dark 用于深色背景，light 用于浅色背景 */
  indicatorTheme?: 'dark' | 'light'
}

/**
 * 移动端水平轮播组件
 * - 使用 scroll-snap 实现原生滑动体验
 * - 两侧 peek 露出部分卡片暗示可滑动
 * - 分页指示器显示当前位置
 * - 仅在移动端显示，桌面端隐藏
 */
export default function MobileCarousel({
  children,
  className = '',
  indicatorTheme = 'dark',
}: MobileCarouselProps) {
  const t = useTranslations('common.carousel')
  const scrollRef = useRef<HTMLDivElement>(null)
  const [activeIndex, setActiveIndex] = useState(0)
  const itemCount = children.length

  // 监听滚动位置更新指示器
  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return
    const container = scrollRef.current
    const scrollLeft = container.scrollLeft
    const itemWidth = container.offsetWidth * 0.78 // 卡片宽度约 78%
    const gap = 12 // gap-3 = 12px
    const newIndex = Math.round(scrollLeft / (itemWidth + gap))
    setActiveIndex(Math.min(Math.max(newIndex, 0), itemCount - 1))
  }, [itemCount])

  useEffect(() => {
    const container = scrollRef.current
    if (!container) return
    container.addEventListener('scroll', handleScroll, { passive: true })
    return () => container.removeEventListener('scroll', handleScroll)
  }, [handleScroll])

  // 点击指示器跳转
  const scrollToIndex = (index: number) => {
    if (!scrollRef.current) return
    const container = scrollRef.current
    const itemWidth = container.offsetWidth * 0.78
    const gap = 12
    container.scrollTo({
      left: index * (itemWidth + gap),
      behavior: 'smooth',
    })
  }

  return (
    <div className={`md:hidden ${className}`}>
      {/* 轮播容器 - py-4 为 hover:scale/translate 效果预留空间 */}
      <div
        ref={scrollRef}
        className="scrollbar-hide -my-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 py-4"
        style={{
          scrollPaddingLeft: '16px',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {children.map((child, index) => (
          <div key={index} className="w-[78%] flex-shrink-0 snap-center">
            {child}
          </div>
        ))}
        {/* 右侧填充，确保最后一张卡片可以居中 */}
        <div className="w-4 flex-shrink-0" aria-hidden="true" />
      </div>

      {/* 分页指示器 */}
      <div className="mt-4 flex justify-center gap-2">
        {Array.from({ length: itemCount }).map((_, index) => {
          const isActive = index === activeIndex
          const activeClass =
            indicatorTheme === 'dark' ? 'w-6 h-2 bg-white' : 'w-6 h-2 bg-ukraine-blue-600'
          const inactiveClass =
            indicatorTheme === 'dark'
              ? 'w-2 h-2 bg-white/40 hover:bg-white/60'
              : 'w-2 h-2 bg-gray-400/50 hover:bg-gray-500/70'

          return (
            <button
              key={index}
              onClick={() => scrollToIndex(index)}
              aria-label={t('goToSlide', { number: index + 1 })}
              className={`rounded-full transition-all duration-300 ${isActive ? activeClass : inactiveClass}`}
            />
          )
        })}
      </div>
    </div>
  )
}
