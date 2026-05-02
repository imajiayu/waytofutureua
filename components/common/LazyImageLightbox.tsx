'use client'

import dynamic from 'next/dynamic'

/** 按需加载的 ImageLightbox（{ ssr: false } + 透明 props 转发） */
const LazyImageLightbox = dynamic(() => import('./ImageLightbox'), { ssr: false })

export default LazyImageLightbox
