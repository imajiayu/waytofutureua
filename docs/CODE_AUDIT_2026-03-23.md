# 代码审查报告 — 分步执行计划

> **审查日期**: 2026-03-23
> **审查范围**: 安全、类型安全、i18n、性能、可访问性、样式一致性、项目详情页一致性
> **数据库改动**: 无（全部为应用层修改）

---

## 目录

- [第一阶段：安全修复（紧急）](#第一阶段安全修复紧急)
- [第二阶段：安全修复（高优先级）](#第二阶段安全修复高优先级)
- [第三阶段：安全修复（中优先级）](#第三阶段安全修复中优先级)
- [第四阶段：TypeScript 类型安全](#第四阶段typescript-类型安全)
- [第五阶段：React 最佳实践](#第五阶段react-最佳实践)
- [第六阶段：i18n 公开页面修复](#第六阶段i18n-公开页面修复)
- [第七阶段：性能优化](#第七阶段性能优化)
- [第八阶段：可访问性修复](#第八阶段可访问性修复)
- [第九阶段：代码重复提取](#第九阶段代码重复提取)
- [第十阶段：样式一致性](#第十阶段样式一致性)
- [第十一阶段：项目详情页一致性](#第十一阶段项目详情页一致性)
- [附录：建议引入的新规范](#附录建议引入的新规范)

---

## 第一阶段：安全修复（紧急）

> 直接影响支付安全和系统安全，应立即修复。

### 1.1 Webhook 签名比较改用 `crypto.timingSafeEqual`

**问题**: 当前使用 `===` 比较 HMAC 签名，存在时序攻击漏洞，攻击者可通过测量响应时间逐字节推断签名，伪造支付回调。

**涉及文件**:
- `lib/payment/wayforpay/server.ts` — 第 144 行、第 276 行
- `lib/payment/nowpayments/server.ts` — 第 68 行

**修复步骤**:

1. 在两个文件顶部添加 `import crypto from 'crypto'`
2. 将所有 `return calculatedSignature === receivedSignature` 替换为：
   ```typescript
   const a = Buffer.from(calculatedSignature, 'hex')
   const b = Buffer.from(receivedSignature, 'hex')
   if (a.length !== b.length) return false
   return crypto.timingSafeEqual(a, b)
   ```
3. 对 NOWPayments 的 `toLowerCase()` 比较做同样处理（先 toLowerCase 再 Buffer.from）

**验证**: 手动触发测试 webhook，确认签名验证仍然通过。

---

### 1.2 Resend Inbound Webhook 添加签名验证 + HTML 清洗

**问题**: `/api/webhooks/resend-inbound` 完全无身份验证，任何人可发送任意 POST 请求，htmlBody 直接注入转发邮件。

**涉及文件**:
- `app/api/webhooks/resend-inbound/route.ts`

**修复步骤**:

1. 安装 Svix 验证库：`npm install svix`
2. 在 route handler 开头添加 Svix webhook 签名验证：
   ```typescript
   import { Webhook } from 'svix'

   const wh = new Webhook(process.env.RESEND_WEBHOOK_SECRET!)
   const payload = await request.text()
   const headers = {
     'svix-id': request.headers.get('svix-id')!,
     'svix-timestamp': request.headers.get('svix-timestamp')!,
     'svix-signature': request.headers.get('svix-signature')!,
   }
   try {
     wh.verify(payload, headers)
   } catch {
     return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
   }
   ```
3. 在 Resend Dashboard 中获取 Inbound Webhook 的 signing secret，添加到 `.env`：
   ```
   RESEND_WEBHOOK_SECRET=whsec_...
   ```
4. （可选）对 `htmlBody` 做 HTML sanitization，安装 `npm install isomorphic-dompurify` 或使用简单的标签白名单过滤

**验证**: 发送无签名的 POST 请求，确认返回 401。

---

### 1.3 管理员认证改用 `getUser()`

**问题**: `getAdminSession()` 使用 `getSession()` 从 cookie 读取 JWT 但不验证 token 有效性，已撤销的 session 仍可访问管理功能。

**涉及文件**:
- `lib/supabase/admin-auth.ts` — 第 40 行

**修复步骤**:

1. 将 `getAdminSession()` 中的：
   ```typescript
   const { data: { session } } = await supabase.auth.getSession()
   if (!session) return null
   return session
   ```
   改为：
   ```typescript
   const { data: { user }, error } = await supabase.auth.getUser()
   if (error || !user) return null
   return user
   ```
2. 更新所有使用 `getAdminSession()` 返回值的代码，从 `session.user` 改为直接使用 `user`
3. 检查 `requireAdmin()` 函数是否也需要同步更新

**验证**: 登出后用旧 cookie 访问 `/admin/projects`，确认被重定向到登录页。

---

## 第二阶段：安全修复（高优先级）

### 2.1 Server Actions 添加 Zod 运行时验证

**问题**: `createProject` 和 `updateProject` 直接将未验证数据写入数据库，`lib/validations.ts` 中已有 schema 但未使用。

**涉及文件**:
- `app/actions/admin.ts` — 第 67 行（`createProject`）、第 86 行（`updateProject`）
- `lib/validations.ts` — 已有 `createProjectSchema`、`updateProjectSchema`

**修复步骤**:

1. 在 `createProject` 函数开头添加：
   ```typescript
   const validated = createProjectSchema.parse(project)
   ```
   然后使用 `validated` 而非 `project` 写入数据库
2. 在 `updateProject` 函数中做同样处理
3. 包裹 try-catch 处理 `ZodError`，返回结构化错误信息

---

### 2.2 `getDonationResultUrl` 添加访问权限检查

**问题**: 使用 Service Role 客户端无授权检查，任何人可通过猜测 publicId 获取捐赠证明图片。

**涉及文件**:
- `app/actions/donation-result.ts` — 第 11 行（`getDonationResultUrl`）、第 79 行（`getAllDonationResultFiles`）

**修复步骤**:

1. 在返回文件 URL 前，验证请求来源（如：仅允许该捐赠的 donor email 匹配，或仅管理员可访问）
2. 考虑使用 Supabase Storage 的 signed URL（带过期时间），而非直接返回公开 URL

---

### 2.3 文件上传扩展名验证加固

**涉及文件**:
- `app/actions/admin.ts` — 第 342-344 行

**修复步骤**:

1. 将 `fileExt` 从 MIME 类型反查，而非从文件名提取：
   ```typescript
   const mimeToExt: Record<string, string> = {
     'image/jpeg': 'jpg', 'image/png': 'png',
     'image/gif': 'gif', 'video/mp4': 'mp4', 'video/quicktime': 'mov',
   }
   const fileExt = mimeToExt[file.type]
   if (!fileExt) throw new Error('Unsupported file type')
   ```

---

## 第三阶段：安全修复（中优先级）

### 3.1 API 端点停止暴露数据库错误消息

**涉及文件**:
- `app/api/donations/order/[orderReference]/route.ts` — 第 44-45 行
- `app/api/donations/project-public/[projectId]/route.ts` — 第 41-42 行
- `app/actions/subscription.ts` — 第 54-55 行
- `app/api/unsubscribe/route.ts` — 第 74-76 行
- `app/actions/donation-result.ts` — 第 49、71 行

**修复步骤**:

1. 将 `return NextResponse.json({ error: error.message })` 改为：
   ```typescript
   logger.error('Operation failed', { error: error.message, context: '...' })
   return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
   ```
2. 逐个文件检查并替换

---

### 3.2 NOWPayments `PARTIALLY_PAID` 状态映射修复

**涉及文件**:
- `app/api/webhooks/nowpayments/route.ts` — 第 110-119 行

**修复步骤**:

1. 将 `PARTIALLY_PAID` 的 `newStatus` 从 `'paid'` 改为 `'processing'`（或其他表示需人工审核的状态）
2. 设置 `shouldSendEmail = false`（不应给用户发已支付确认邮件）
3. 添加日志记录以便管理员人工处理

---

### 3.3 `success-redirect` locale 白名单验证

**涉及文件**:
- `app/api/donate/success-redirect/route.ts` — 第 25 行、第 69 行

**修复步骤**:

1. 添加白名单验证：
   ```typescript
   const VALID_LOCALES = ['en', 'zh', 'ua']
   const locale = VALID_LOCALES.includes(rawLocale) ? rawLocale : 'en'
   ```

---

### 3.4 `getSubscriptions` 添加管理员角色检查

**涉及文件**:
- `app/actions/subscription.ts` — 第 79-85 行

**修复步骤**:

1. 在 `getUser()` 检查后添加 `is_admin()` RPC 调用：
   ```typescript
   const { data: isAdmin } = await supabase.rpc('is_admin')
   if (!isAdmin) return { data: null, error: 'Forbidden' }
   ```

---

### 3.5 补充安全响应头

**涉及文件**:
- `next.config.js`

**修复步骤**:

1. 在 `headers()` 配置中添加：
   ```javascript
   { key: 'X-Content-Type-Options', value: 'nosniff' },
   { key: 'X-Frame-Options', value: 'DENY' },
   { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
   { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
   ```
2. 考虑将 CSP 中的 `unsafe-inline` 替换为 nonce-based CSP（需配合 Next.js middleware）

---

## 第四阶段：TypeScript 类型安全

### 4.1 统一 `I18nText` 类型定义

**问题**: `types/index.ts` 中 `I18nText = Json`（过宽），`lib/email/types.ts` 中有精确定义，导致 18+ 处 `as any` 强转。

**涉及文件**:
- `types/index.ts` — 第 11 行
- `lib/email/types.ts` — 第 7 行
- `components/admin/ProjectCreateModal.tsx` — 约 10 处 `as any`
- `components/admin/ProjectEditModal.tsx` — 约 8 处 `as any`
- `components/admin/DonationsTable.tsx` — 第 12 行

**修复步骤**:

1. 在 `types/index.ts` 中定义精确类型：
   ```typescript
   export type I18nText = { en?: string; zh?: string; ua?: string }
   ```
2. 删除 `lib/email/types.ts` 中的重复定义，改为从 `@/types` 导入
3. 逐个清除所有 `as any` 强转（搜索 `i18n as any`、`as any)?.en`）
4. 修复 `DonationsTable.tsx` 中的 `project_name_i18n: any`

---

### 4.2 消除 `catch (err: any)` 反模式

**涉及文件**:
- `components/admin/BatchDonationEditModal.tsx:41`
- `components/admin/ProjectCreateModal.tsx:38`
- `components/admin/ProjectEditModal.tsx:30`
- `components/admin/DonationEditModal.tsx:131,170,222,233`

**修复步骤**:

1. 全局搜索 `catch (err: any)` 和 `catch (e: any)`
2. 替换为：
   ```typescript
   catch (err: unknown) {
     const message = err instanceof Error ? err.message : 'Unknown error'
     // ...使用 message
   }
   ```

---

### 4.3 修复 `useProjectContent` 泛型丢失

**涉及文件**:
- `lib/hooks/useProjectContent.ts` — 第 50、53、90 行

**修复步骤**:

1. 将 `useState<any[]>` 改为 `useState<T | null>(null)`（单内容）或 `useState<T[]>([])`（多内容）
2. 修复 `return { data: data as any }` 为正确的泛型返回
3. 移除 `T extends any[]` 约束

---

### 4.4 为 WayForPay Widget 定义参数接口

**涉及文件**:
- `components/donate-form/widgets/WayForPayWidget.tsx` — 第 9、18 行
- `app/actions/donation.ts` — 第 19-26 行（`paymentParams: any`、`allProjectsStats: any[]`）

**修复步骤**:

1. 在 `types/` 或 `lib/wayforpay/` 中定义 `WayForPayParams` 接口
2. 在 `donation.ts` 中将 `allProjectsStats: any[]` 改为 `ProjectStats[]`
3. 替换 Widget 组件中的 `any`

---

## 第五阶段：React 最佳实践

### 5.1 修复 `useEffect` 依赖项缺失

**涉及文件**:
- `components/admin/DonationEditModal.tsx` — 第 68-74 行

**修复步骤**:

1. 用 `useCallback` 包装 `loadFiles`
2. 将 `canManageFiles` 和 `loadFiles` 加入依赖数组：
   ```typescript
   useEffect(() => {
     if (canManageFiles) {
       loadFiles()
     } else {
       setLoadingFiles(false)
     }
   }, [donation.id, canManageFiles, loadFiles])
   ```

---

### 5.2 修复 JSX 内直接调用 Hooks

**涉及文件**:
- `components/home/DonationJourneySection.tsx` — 第 49 行

**修复步骤**:

1. 在组件顶层声明：
   ```typescript
   const tFlow = useTranslations('donationStatusFlow')
   ```
2. 在 JSX 中使用 `tFlow('trackButton')` 替换 `useTranslations('donationStatusFlow')('trackButton')`

---

### 5.3 移除 `setTimeout` hack

**涉及文件**:
- `app/[locale]/track-donation/track-donation-form.tsx` — 第 82-84 行
- `components/donate-form/DonationFormCard.tsx` — 第 301-303 行

**修复步骤**:

1. 将 `setTimeout` 内的逻辑移入 `useEffect`，通过 `useRef` 标记首次挂载：
   ```typescript
   const hasAutoQueried = useRef(false)
   useEffect(() => {
     if (!hasAutoQueried.current && urlEmail && urlId) {
       hasAutoQueried.current = true
       handleAutoQuery(urlEmail, urlId)
     }
   }, [urlEmail, urlId])
   ```

---

### 5.4 替换原生 `alert()`/`confirm()` 弹窗

**涉及文件**:
- `components/admin/DonationEditModal.tsx` — 第 123、132、140 行

**修复步骤**:

1. 用组件内的状态驱动 UI 替换 `confirm()` — 添加确认弹层状态
2. 用 `setError()` 替换 `alert()` — 已有 error 状态
3. 统一语言为英文（与 admin 其他部分一致）

---

### 5.5 考虑减少 Prop Drilling（可选，较大重构）

**涉及文件**:
- `app/[locale]/donate/DonatePageClient.tsx` — 12 个 props 传递给 `DonationFormCard`

**修复步骤**:

1. 将捐赠人信息整合为一个对象 + 单个 onChange handler
2. 或引入 React Hook Form 管理表单状态
3. 合并 `showWidget` 与 `processingState` 冗余状态

---

## 第六阶段：i18n 公开页面修复

### 6.1 修复公开页面硬编码文案

逐个文件修复以下违规，添加翻译键到 `messages/{en,zh,ua}.json`：

| # | 文件 | 行号 | 硬编码内容 | 建议翻译键 |
|---|------|------|-----------|-----------|
| 1 | `app/[locale]/unsubscribed/UnsubscribedClient.tsx` | 30 | `"Loading..."` | 移除 prop 或使用 `t('common.loading')` |
| 2 | `app/[locale]/track-donation/track-donation-form.tsx` | 538 | `"No Donations Found"` | `trackDonation.noDonationsFound` |
| 3 | `components/projects/detail-pages/Project4/index.tsx` | 97 | `"Content not available"` | `projects.contentNotAvailable` |
| 4 | `components/projects/detail-pages/Project5/index.tsx` | 56 | `"Content not available"` | `projects.contentNotAvailable` |
| 5 | `components/common/BottomSheet.tsx` | 193 | fallback `'Donate Now'` | 要求调用方必须传入 `minimizedHint` |
| 6 | `components/projects/detail-pages/Project3/index.tsx` | 51 | `caption: "Receipt ${idx+1}"` | `project3.receiptImageAlt` |
| 7 | `components/projects/detail-pages/Project3/index.tsx` | 114,129,144 | `alt="Event"` | `project3.eventImageAlt` |
| 8 | `components/projects/detail-pages/Project4/index.tsx` | 168 | `alt="Photo ${idx+1}"` | `project4.photoAlt` |
| 9 | `app/[locale]/donate/DonatePageClient.tsx` | 66-70 | 内联三语言文案 | 使用 `t()` |

**修复步骤**:

1. 在 `messages/en.json` 中添加缺失的翻译键
2. 在 `messages/zh.json` 和 `messages/ua.json` 中添加对应翻译
3. 逐个文件替换硬编码文案为 `t('key')`

---

## 第七阶段：性能优化

### 7.1 修复 `<main>` 嵌套（HTML 非法）

**涉及文件**:
- `app/[locale]/layout.tsx` — 第 115 行
- `app/[locale]/page.tsx` — 第 64 行

**修复步骤**:

1. 将 `page.tsx` 中的 `<main>` 改为 `<div>` 或 `<section>`（保留 layout 中的 `<main>`）
2. 检查其他页面是否有类似嵌套

---

### 7.2 首页改用直接文件读取替代 HTTP fetch

**涉及文件**:
- `app/[locale]/page.tsx` — 第 52 行

**修复步骤**:

1. 替换 `fetch(url)` 为：
   ```typescript
   import { readFileSync } from 'fs'
   import path from 'path'

   const filePath = path.join(process.cwd(), 'public', 'content', 'home', `marquee-${locale}.json`)
   const marqueeData = JSON.parse(readFileSync(filePath, 'utf-8'))
   ```

---

### 7.3 添加 Suspense 边界

**涉及文件**:
- `app/[locale]/page.tsx` — `ProjectsGrid` 区域
- `app/[locale]/donate/page.tsx` — 数据加载区域

**修复步骤**:

1. 创建 `app/[locale]/loading.tsx`（全局 fallback）
2. 在首页中用 `<Suspense>` 包裹 `ProjectsGrid`：
   ```tsx
   <Suspense fallback={<ProjectsGridSkeleton />}>
     <ProjectsGrid ... />
   </Suspense>
   ```

---

### 7.4 移除不必要的 `'use client'`

**涉及文件**（仅使用了 `useTranslations`，无其他客户端逻辑）:
- `components/home/MissionSection.tsx`
- `components/home/ImpactSection.tsx`
- `components/projects/shared/ProjectProgressBar.tsx`

**修复步骤**:

1. 移除 `'use client'` 声明
2. 将 `useTranslations` 改为 `await getTranslations`
3. 组件改为 `async function`
4. 确认父组件的 `'use client'` 边界不受影响

> **注意**: 如果这些组件被 `'use client'` 父组件导入，移除 `'use client'` 后它们仍会在客户端运行。此优化主要针对那些被 Server Component 导入的组件。需逐个检查导入链。

---

### 7.5 `DonationJourneySection` 改为 lazy 加载

**涉及文件**:
- `components/home/DonationJourneySection.tsx` — 第 6 行

**修复步骤**:

1. 将静态 import 改为 dynamic：
   ```typescript
   const DonationStatusFlow = dynamic(
     () => import('@/components/donation-display/DonationStatusFlow'),
     { ssr: false }
   )
   ```

---

## 第八阶段：可访问性修复

### 8.1 表单 label 关联 input

**涉及文件**:
- `components/donate-form/DonationFormCard.tsx` — 所有表单字段

**修复步骤**:

1. 为每个 `<input>` 添加 `id` 属性
2. 为对应的 `<label>` 添加 `htmlFor` 属性：
   ```tsx
   <label htmlFor="donor-name">{t('name.label')}</label>
   <input id="donor-name" ... />
   ```

---

### 8.2 可点击 `<div>` 添加键盘支持

**涉及文件**:
- `components/projects/shared/ProjectResultsMasonry.tsx` — 第 96 行
- `components/projects/ProjectResultsMarquee.tsx` — 第 109 行
- 各项目的 EventGallerySection、SuccessStoriesSection 等

**修复步骤**:

1. 将可点击的 `<div>` 改为 `<button>`，或添加：
   ```tsx
   role="button"
   tabIndex={0}
   onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onClick() }}
   ```

---

### 8.3 ImageLightbox 添加 dialog 角色和焦点管理

**涉及文件**:
- `components/common/ImageLightbox.tsx` — 第 110 行

**修复步骤**:

1. 容器添加 `role="dialog"` 和 `aria-modal="true"`
2. 打开时将焦点移到 dialog 内（`useEffect` + `ref.focus()`）
3. 关闭时焦点返回触发元素
4. 添加 ESC 键关闭支持（如果还没有的话）

---

### 8.4 Navigation 语言下拉菜单 ARIA

**涉及文件**:
- `components/layout/Navigation.tsx` — 第 127 行

**修复步骤**:

1. 按钮添加 `aria-expanded={isDropdownOpen}` 和 `aria-haspopup="listbox"`
2. 下拉列表添加 `role="listbox"`

---

### 8.5 装饰性图片 alt 修复

**涉及文件**:
- `app/[locale]/track-donation/page.tsx` — 第 47、58、67、79 行（`alt="Background 1"` → `alt=""`）
- `components/layout/Footer.tsx` — 第 149、159 行（`alt="Footer Background"` → `alt=""`）

---

### 8.6 MobileCarousel 指示器添加 aria-label

**涉及文件**:
- `components/common/MobileCarousel.tsx` — 第 94-98 行

**修复步骤**:

1. 添加 `aria-label={`Go to slide ${index + 1}`}`

---

## 第九阶段：代码重复提取

### 9.1 提取项目进度计算函数

**涉及文件**:
- `components/projects/ProjectCard.tsx` — 第 74-80 行
- `components/projects/shared/ProjectProgressSection.tsx` — 第 21-27 行

**修复步骤**:

1. 在 `lib/` 中创建纯函数：
   ```typescript
   export function getProjectProgress(project: ProjectStats) {
     const currentUnits = project.current_units ?? 0
     const targetUnits = project.target_units ?? 0
     const totalRaised = project.total_raised ?? 0
     const hasValidTarget = targetUnits > 0
     const progressCurrent = project.aggregate_donations ? totalRaised : currentUnits
     return { currentUnits, targetUnits, totalRaised, hasValidTarget, progressCurrent }
   }
   ```
2. 在两个组件中替换重复代码

---

### 9.2 提取 `ProjectHeroBase` 共享组件

**涉及文件**:
- 4 个项目的 `sections/HeroSection.tsx`

**修复步骤**:

1. 在 `components/projects/shared/` 创建 `ProjectHeroBase.tsx`
2. 接受 `imageSrc`、`imageAlt`、`gradientClasses`、`children`（标题/副标题区域）等 props
3. 各项目 HeroSection 改为使用该共享组件，仅传入差异化内容

---

### 9.3 提取 `I18nFieldGroup` 管理员表单组件

**涉及文件**:
- `components/admin/ProjectCreateModal.tsx` — i18n 字段区域（~50 行）
- `components/admin/ProjectEditModal.tsx` — 相同区域

**修复步骤**:

1. 在 `components/admin/` 创建 `I18nFieldGroup.tsx`
2. 接受 `fieldName`、`value`、`onChange`、`placeholders` props
3. 替换两个 Modal 中的重复 JSX

---

### 9.4 合并 `SuppliesSection` 和 `AidListSection`

**涉及文件**:
- `components/projects/detail-pages/Project3/sections/SuppliesSection.tsx`
- `components/projects/detail-pages/Project4/sections/AidListSection.tsx`

**修复步骤**:

1. 在 `components/projects/shared/` 创建 `ExpenseTableSection.tsx`
2. 提取共同的表格 header、行渲染、receipt grid、footer 汇总
3. 通过 props 控制是否启用分组（`category`）、状态标签（`status`）

---

### 9.5 Project0 `AnimatedStatCard` 复用 `AnimatedNumber`

**涉及文件**:
- `components/projects/detail-pages/Project0/sections/StatisticsSection.tsx` — 第 6-82 行
- `components/projects/shared/AnimatedNumber.tsx`

**修复步骤**:

1. 删除 `StatisticsSection` 中的自定义 IntersectionObserver + 动画逻辑
2. 改为使用 `<AnimatedNumber value={stat.value} />`

---

### 9.6 移动 `TwinklingStars` 到 `shared/`

**涉及文件**:
- `components/projects/detail-pages/Project3/components/TwinklingStars.tsx`
- `components/projects/detail-pages/Project4/sections/AidListSection.tsx` — 第 7 行跨项目导入

**修复步骤**:

1. 将 `TwinklingStars.tsx` 移到 `components/projects/shared/`
2. 更新所有导入路径
3. 考虑同时移动 `Snowfall.tsx`

---

### 9.7 统一使用 `MapPinIcon` 替代内联 SVG

**涉及文件**（5 处内联 MapPin SVG）:
- `components/projects/detail-pages/Project4/sections/HeroSection.tsx:81`
- `components/projects/shared/ProjectProgressSection.tsx:60`
- `components/projects/ProjectCard.tsx:161,311`
- `components/donate-form/DonationFormCard.tsx:651`

**修复步骤**:

1. 替换所有内联 `<svg>` 为 `<MapPinIcon className="..." />`
2. 从 `@/components/icons` 导入

---

### 9.8 使用已有 `Loader2Icon` 替代内联加载 SVG

**涉及文件**:
- `components/donate-form/DonationFormCard.tsx:84`
- `components/donate-form/widgets/WayForPayWidget.tsx:395`

---

## 第十阶段：样式一致性

### 10.1 统一颜色系统

**涉及文件**:
- `app/globals.css` — 第 5-48 行（CSS 变量）
- `tailwind.config.js` — 第 32-111 行（重复的颜色定义）

**修复步骤**:

1. 保留 `tailwind.config.js` 中的颜色定义作为唯一来源
2. 删除 `globals.css` 中冗余的 CSS 变量，或让 Tailwind 引用 CSS 变量
3. 确保所有组件使用 Tailwind 类而非 CSS 变量

---

### 10.2 统一动画定义到 `tailwind.config.js`

**涉及文件**:
- `components/projects/detail-pages/Project3/components/TwinklingStars.tsx`（`<style jsx>` 定义 `animate-twinkle`）
- `components/projects/ProjectResultsMarquee.tsx`（`<style jsx>` 定义 `marquee`/`marquee-reverse`）
- `components/projects/detail-pages/Project5/sections/HeroSection.tsx`（`<style jsx>`）

**修复步骤**:

1. 将这些 keyframe 动画注册到 `tailwind.config.js` 的 `theme.extend.keyframes` 和 `animation`
2. 参考已有的 `animate-snowfall` 定义方式
3. 删除组件内的 `<style jsx>` 块

---

### 10.3 inline style 替换为 Tailwind

| 文件 | inline style | Tailwind 替代 |
|------|-------------|--------------|
| `ImpactSection.tsx:79,87` | `fontSize: clamp(...)` | `text-[clamp(1.75rem,_3vw+0.5rem,_2.5rem)]` |
| `DonationStatusProgress.tsx:125` | `top: '-20px'` | `-top-5` |
| `StatisticsSection.tsx:45-52` | `linear-gradient` 硬编码颜色 | `bg-gradient-to-br from-ukraine-blue-500 to-ukraine-blue-700` |
| `BottomSheet.tsx:186-218` | `boxShadow` | `shadow-lg` 或自定义 `shadow-sheet` |
| `MobileCarousel.tsx:73` | `width: '78%'` | `w-[78%]` |

---

### 10.4 移除 `TeamSection` 重复 scrollbar 隐藏

**涉及文件**:
- `components/projects/detail-pages/Project0/sections/TeamSection.tsx` — 第 82 行

**修复步骤**:

1. 删除 `style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}`
2. 保留已有的 `scrollbar-hide` class

---

### 10.5 `BottomSheet` 使用 `useBodyScrollLock` hook

**涉及文件**:
- `components/common/BottomSheet.tsx` — 第 138-157 行

**修复步骤**:

1. 移除手动 `document.body.style.overflow` 操作
2. 使用已有的 `useBodyScrollLock(isExpanded)` hook

---

## 第十一阶段：项目详情页一致性

### 11.1 统一 loading/error 状态处理

**修复步骤**:

1. 创建统一的 skeleton 和 error fallback 模式
2. Project4/5 的 `"Content not available"` 改用翻译键（已在第六阶段处理）
3. Project0 的 `ProjectProgressSection` 包裹 `FadeInSection`

---

### 11.2 统一类型命名

**修复步骤**:

1. `Project3/types.ts` 中的 `ProjectContent` 重命名为 `Project3Content`
2. 更新所有导入

---

### 11.3 清理死代码和杂项

**修复步骤**:

1. 删除 `Project0/types.ts:126-129` 的 `LightboxState` 接口（未使用）
2. 将 `public/images/projects/project-4/` 中的 `.DS_Store` 加入 `.gitignore`
3. 考虑重命名 `result13 2.webp`（移除文件名空格）

---

---

## 附录：建议引入的新规范

以下规范建议添加到 `CLAUDE.md` 或团队开发规范中：

### A1. 禁止 `any` 规范

- 在 ESLint 中启用 `@typescript-eslint/no-explicit-any`
- 所有 `catch` 使用 `unknown` + `instanceof Error` 类型收窄
- CI 中检查 `any` 出现次数不增加

### A2. Webhook 签名验证规范

- 所有 Webhook 必须使用 `crypto.timingSafeEqual` 比较签名
- 所有外部回调端点必须有身份验证

### A3. Server Action 验证规范

- 所有 Server Action 必须使用 Zod schema 做运行时验证
- TypeScript 类型不能替代运行时验证
- 错误响应不得包含数据库内部信息

### A4. 可访问性规范

- 所有可交互元素必须有键盘支持（`role`/`tabIndex`/`onKeyDown`）
- 所有表单 `<label>` 必须通过 `htmlFor` 关联 `<input>`
- 装饰性图片使用 `alt=""`，内容图片使用描述性 alt

### A5. 动画定义规范

- 所有 keyframe 动画统一在 `tailwind.config.js` 中注册
- 禁止组件内 `<style jsx>` 定义动画

### A6. 颜色系统规范

- 颜色统一通过 Tailwind config 管理
- 禁止组件内硬编码颜色值（`#076CB3` 等）
- 使用语义化颜色名（`ukraine-blue-500`）而非原始色值

### A7. 共享组件规范

- 跨项目引用的组件必须放入 `components/projects/shared/`
- 相同逻辑出现 2 次以上应提取为共享工具函数或组件
- 内联 SVG 出现 2 次以上应提取为 icon 组件

### A8. 错误响应规范

- API 端点禁止向客户端返回数据库内部错误消息
- 仅返回通用错误码，详情记录到服务端日志
- `details` 字段仅在开发环境返回

---

## 执行进度追踪

| 阶段 | 描述 | 状态 | Commit |
|------|------|------|--------|
| 第一阶段 | 安全修复（紧急） | ✅ | `8fa7724` |
| 第二阶段 | 安全修复（高优先级） | ✅ | `b691946` |
| 第三阶段 | 安全修复（中优先级） | ✅ | `b691946` |
| 第四阶段 | TypeScript 类型安全 | ✅ | `b691946` |
| 第五阶段 | React 最佳实践 | ✅ | `438892f` |
| 第六阶段 | i18n 公开页面修复 | ✅ | `595536e` |
| 第七阶段 | 性能优化 | ✅ | `ee3c213` |
| 第八阶段 | 可访问性修复 | ✅ | `975335b` |
| 第九阶段 | 代码重复提取 | ✅ | `2dc6cb3` |
| 第十阶段 | 样式一致性 | ✅ | `4c9d242` |
| 第十一阶段 | 项目详情页一致性 | ✅ | `3abade3` |
| 复查修复 | 安全漏洞、事件泄漏、可访问性、i18n、类型安全 | ✅ | `d2398c0` |

### 相关但非审计范围的 Commit

| Commit | 描述 |
|--------|------|
| `8a5ab24` | 新增 Project5 event-2 活动记录，修复图片网格显示限制 |
| `c622ff8` | Admin 人脸打码开关：允许管理员上传图片时选择是否启用自动人脸模糊 |
