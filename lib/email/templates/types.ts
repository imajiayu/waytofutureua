export interface EmailTemplate {
  name: string
  fileName: string
  subject: {
    en: string
    zh: string
    ua: string
  }
  projectId?: string
}

export interface TemplateContent {
  en: string
  zh: string
  ua: string
}
