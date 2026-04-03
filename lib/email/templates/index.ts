export interface EmailTemplate {
  name: string // 模板名称（用于显示）
  fileName: string // 文件名（不含扩展名）
  subject: {
    en: string
    zh: string
    ua: string
  }
  projectId?: string // 关联的项目 ID（用于生成 project_url）
}

export interface TemplateContent {
  en: string
  zh: string
  ua: string
}

// ==================== 静态模板注册表 ====================
// 在 Vercel serverless 环境中，fs 模块无法正常工作
// 因此需要静态注册所有可用的模板和内容
//
// 添加新模板步骤：
// 1. 在 broadcast/{template-name}/index.ts 创建模板定义
// 2. 在 content/{template-name}/ 创建 en.html, zh.html, ua.html
// 3. 在下方导入模板定义和 HTML 内容
// 4. 将模板添加到 REGISTERED_TEMPLATES 数组
// 5. 将内容添加到 TEMPLATE_CONTENTS 映射

// 模板定义
import project0Ongoing from './broadcast/project0-ongoing'
import project3Completed from './broadcast/project3-completed'
import project4Ongoing from './broadcast/project4-ongoing'
import project5Ongoing from './broadcast/project5-ongoing'

// HTML 内容（通过 webpack asset/source 导入）
import project0OngoingEn from './content/project0-ongoing/en.html'
import project0OngoingZh from './content/project0-ongoing/zh.html'
import project0OngoingUa from './content/project0-ongoing/ua.html'
import project3CompletedEn from './content/project3-completed/en.html'
import project3CompletedZh from './content/project3-completed/zh.html'
import project3CompletedUa from './content/project3-completed/ua.html'
import project4OngoingEn from './content/project4-ongoing/en.html'
import project4OngoingZh from './content/project4-ongoing/zh.html'
import project4OngoingUa from './content/project4-ongoing/ua.html'
import project5OngoingEn from './content/project5-ongoing/en.html'
import project5OngoingZh from './content/project5-ongoing/zh.html'
import project5OngoingUa from './content/project5-ongoing/ua.html'
import { logger } from '@/lib/logger'

const REGISTERED_TEMPLATES: EmailTemplate[] = [
  project0Ongoing,
  project3Completed,
  project4Ongoing,
  project5Ongoing,
]

// 静态内容映射
const TEMPLATE_CONTENTS: Record<string, TemplateContent> = {
  'project0-ongoing': {
    en: project0OngoingEn,
    zh: project0OngoingZh,
    ua: project0OngoingUa,
  },
  'project3-completed': {
    en: project3CompletedEn,
    zh: project3CompletedZh,
    ua: project3CompletedUa,
  },
  'project4-ongoing': {
    en: project4OngoingEn,
    zh: project4OngoingZh,
    ua: project4OngoingUa,
  },
  'project5-ongoing': {
    en: project5OngoingEn,
    zh: project5OngoingZh,
    ua: project5OngoingUa,
  },
}

/**
 * 获取所有可用的邮件模板
 * 使用静态注册表（兼容 Vercel serverless）
 * @returns 模板列表（name + fileName）
 */
export function getAvailableTemplates(): { name: string; fileName: string }[] {
  return REGISTERED_TEMPLATES.map((t) => ({
    name: t.name,
    fileName: t.fileName,
  }))
}

/**
 * 加载指定的邮件模板定义
 * 使用静态注册表查找
 * @param fileName - 模板文件夹名称
 * @returns 模板定义或 null
 */
export function getEmailTemplate(fileName: string): EmailTemplate | null {
  const template = REGISTERED_TEMPLATES.find((t) => t.fileName === fileName)
  if (!template) {
    logger.error('EMAIL', 'Template not found', { fileName })
    return null
  }
  return template
}

/**
 * 加载模板的 HTML 内容（三种语言）
 * 使用静态导入的内容（兼容 Vercel serverless）
 * @param templateName - 模板名称
 * @returns 三种语言的内容
 */
export function loadTemplateContent(templateName: string): TemplateContent | null {
  const content = TEMPLATE_CONTENTS[templateName]
  if (!content) {
    logger.error('EMAIL', 'Template content not found', { templateName })
    return null
  }
  return content
}

/**
 * 替换模板变量
 * @param content - HTML 内容
 * @param variables - 变量映射（如 { unsubscribe_url: "..." }）
 * @returns 替换后的内容
 */
export function replaceTemplateVariables(
  content: string,
  variables: Record<string, string>
): string {
  let result = content

  // 替换所有 {{variable_name}} 格式的变量
  Object.entries(variables).forEach(([key, value]) => {
    const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g')
    result = result.replace(regex, value)
  })

  return result
}

/**
 * 获取完整的邮件模板（定义 + 内容）
 * @param fileName - 模板文件夹名称
 * @returns 模板定义和内容，或 null
 */
export function getCompleteEmailTemplate(fileName: string): {
  template: EmailTemplate
  content: TemplateContent
} | null {
  const template = getEmailTemplate(fileName)
  if (!template) return null

  // 直接使用 fileName 作为文件夹名加载内容
  const content = loadTemplateContent(fileName)
  if (!content) return null

  return { template, content }
}
