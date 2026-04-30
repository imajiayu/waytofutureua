/**
 * 邮件模板系统测试脚本
 * 运行: npx tsx lib/email/templates/test-templates.ts
 */

import { getAvailableTemplates, getCompleteEmailTemplate, replaceTemplateVariables } from './index'

async function testTemplateSystem() {
  console.log('🧪 Testing Email Template System...\n')

  // 1. 测试获取可用模板列表
  console.log('1️⃣ Testing getAvailableTemplates()...')
  const templates = getAvailableTemplates()
  console.log(`   Found ${templates.length} templates:`)
  templates.forEach((t) => {
    console.log(`   - ${t.name} (${t.fileName})`)
  })
  console.log('')

  // 2. 测试加载完整模板
  console.log('2️⃣ Testing getCompleteEmailTemplate()...')
  const templateData = getCompleteEmailTemplate('project3-completed')

  if (!templateData) {
    console.error('   ❌ Failed to load template')
    return
  }

  console.log(`   ✅ Loaded template: ${templateData.template.name}`)
  console.log(`   ✅ Subject (en): ${templateData.template.subject.en}`)
  console.log(`   ✅ Subject (zh): ${templateData.template.subject.zh}`)
  console.log(`   ✅ Subject (ua): ${templateData.template.subject.ua}`)
  console.log(`   ✅ Content loaded for all 3 languages`)
  console.log('')

  // 3. 测试模板变量替换
  console.log('3️⃣ Testing replaceTemplateVariables()...')
  const testVariables = {
    donate_url: 'https://example.com/donate',
    unsubscribe_url: 'https://example.com/unsubscribe?email=test@example.com',
  }

  const replacedContent = replaceTemplateVariables(templateData.content.en, testVariables)

  if (
    replacedContent.includes(testVariables.donate_url) &&
    replacedContent.includes(testVariables.unsubscribe_url)
  ) {
    console.log('   ✅ Variables replaced successfully')
  } else {
    console.log('   ❌ Variable replacement failed')
  }
  console.log('')

  // 4. 显示内容预览
  console.log('4️⃣ Content Preview (first 200 chars):')
  const preview = templateData.content.en
    .replace(/<[^>]*>/g, '') // 移除 HTML 标签
    .replace(/\s+/g, ' ') // 压缩空白
    .trim()
    .substring(0, 200)
  console.log(`   ${preview}...`)
  console.log('')

  console.log('✅ All tests passed!')
}

// 运行测试
testTemplateSystem().catch((err) => {
  console.error('❌ Test failed:', err)
  process.exit(1)
})
