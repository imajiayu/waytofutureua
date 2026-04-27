/** 站点基础 URL，用于 SEO 元数据、sitemap、JSON-LD 等 */
export const BASE_URL = 'https://waytofutureua.org.ua'

/**
 * hreflang alternates 配置。
 * key 使用 ISO 639-1 标准语言代码（uk = 乌克兰语），
 * value 中的路径使用项目内部路由代码（ua）。
 *
 * x-default 指向 /en（默认 locale），避免 Google 把 bare `/` 当成独立可索引 URL。
 */
export function getAlternates(path: string) {
  const subPath = path.replace(/^\/[^/]+/, '')
  return {
    canonical: `${BASE_URL}${path}`,
    languages: {
      en: `${BASE_URL}/en${subPath}`,
      zh: `${BASE_URL}/zh${subPath}`,
      uk: `${BASE_URL}/ua${subPath}`,
      'x-default': `${BASE_URL}/en${subPath}`,
    },
  }
}
