/** 站点基础 URL，用于 SEO 元数据、sitemap、JSON-LD 等 */
export const BASE_URL = 'https://waytofutureua.org.ua'

/**
 * hreflang alternates 配置。
 * key 使用 ISO 639-1 标准语言代码（uk = 乌克兰语），
 * value 中的路径使用项目内部路由代码（ua）。
 */
export function getAlternates(path: string) {
  return {
    canonical: `${BASE_URL}${path}`,
    languages: {
      en: `${BASE_URL}/en${path.replace(/^\/[^/]+/, '')}`,
      zh: `${BASE_URL}/zh${path.replace(/^\/[^/]+/, '')}`,
      uk: `${BASE_URL}/ua${path.replace(/^\/[^/]+/, '')}`,
    },
  }
}
