# 重构计划 · 性能与代码规范

> **范围**：本文档只覆盖**性能 + 代码规范**优化，**不涉及支付流程**。
> 明确排除的文件/模块：
>
> - `components/donate-form/DonationFormCard.tsx`（包含支付入口逻辑）
> - `components/donate-form/widgets/*`（WayForPay / NowPayments widget）
> - `lib/wayforpay/`、`lib/payment/`、`lib/market/wayforpay.ts`
> - `app/api/webhooks/*`
> - `app/actions/donation.ts` 与 `app/actions/market-sale.ts` 中与支付参数生成/签名相关的代码段（数据库写入、校验、邮件发送等周边逻辑可改）
>
> **进度追踪约定**：每条任务有唯一 ID（如 `P0-1`）。完成后将 `- [ ]` 改为 `- [x]`，并在"变更记录"追加一行。不要删除已完成项。
>
> **文档版本**：1.0 · 最后更新：2026-04-21

---

## 总览 · 按优先级

| 优先级          | 说明                                       | 任务数 |
| --------------- | ------------------------------------------ | ------ |
| **P0** 必做     | 工程化基础 + 高价值性能修复 + 严重规范问题 | 8      |
| **P1** 应做     | 代码重复收敛、设计系统初建、中度性能修复   | 9      |
| **P2** 有余力做 | 架构进化、清理、严格度提升                 | 9      |

---

## P0 · 工程化与高影响修复

### P0-1 · 引入 Prettier + tailwindcss 插件

- [x] **目标**：确立代码格式化基线，消除 diff 噪声
- **动作**：
  1. `npm i -D prettier prettier-plugin-tailwindcss`
  2. 新建 `.prettierrc`：`{ "semi": false, "singleQuote": true, "trailingComma": "es5", "printWidth": 100, "plugins": ["prettier-plugin-tailwindcss"] }`
  3. 新建 `.prettierignore`：忽略 `.next/`、`public/`、`supabase/migrations/`、`messages/*.json`
  4. 在 `package.json` scripts 加 `"format": "prettier --write ."` 和 `"format:check": "prettier --check ."`
  5. 执行一次全量 format（独立 commit，便于 review）
- **验收**：`npm run format:check` 退出码 0

### P0-2 · 扩充 ESLint 规则

- [x] **目标**：拦截 hooks 误用 / a11y / 未使用变量等类低级错误
- **动作**：
  1. 新建 `.eslintrc.json` 扩展 `next/core-web-vitals`
  2. 加入插件：`eslint-plugin-react-hooks`（已内置 next）、`eslint-plugin-jsx-a11y`、`eslint-plugin-simple-import-sort`
  3. 规则：`react-hooks/exhaustive-deps: error`、`simple-import-sort/imports: warn`、`@next/next/no-img-element: error`
  4. 跑一次 `npm run lint -- --fix`，分别记录 error/warning 数量
- **验收**：`npm run lint` 全绿（或把已知暂不处理的放进 eslint-disable + 注释）

### P0-3 · 替换 `lib/supabase/admin-auth.ts` 中的 `console.error`

- [x] **位置**：`lib/supabase/admin-auth.ts:58`
- **问题**：`is_admin` RPC 失败时直接 `console.error`，生产日志与 `logger` 分叉
- **动作**：替换为 `logger.error('AUTH', 'is_admin RPC failed', { error: rpcError.message })`
- **验收**：全仓 `rg "console\\.(log|error|warn)"` 只剩下 `lib/logger*.ts`、`scripts/`、`lib/email/templates/test-templates.ts`

### P0-4 · Cloudinary Buffer `@ts-ignore` 规范化

- [x] **位置**：`lib/cloudinary.ts:61-62, 176-177`
- **问题**：往 Buffer 上挂 `_contentType` 并用 `@ts-ignore` 绕过
- **动作**：改为显式的 `{ buffer: Buffer; contentType: string }` tuple，或定义 `interface BufferWithContentType extends Buffer { _contentType?: string }`
- **验收**：文件内 0 处 `@ts-ignore`

### P0-5 · 删除首页 Section 的无效 `"use client"`

- [x] **目标**：减少首屏 JS，把能静态化的组件还给服务端
- **位置**：
  - `components/home/ApproachSection.tsx`（仅 `handleScrollToCompliance` 需要客户端）
  - `components/home/ImpactSection.tsx`（纯静态卡片 + 一个 MobileCarousel）
  - `components/home/MissionSection.tsx`（纯静态）
- **动作**：
  1. MissionSection → 直接去掉 `'use client'`
  2. ImpactSection → 拆出 `ImpactCarousel`（客户端），Section 本体 RSC
  3. ApproachSection → 拆出 `ScrollToComplianceButton`（小的客户端按钮），Section 本体 RSC
- **验收**：`rg '"use client"' components/home/` 只剩下真正需要交互的组件

### P0-6 · `as any` 在 i18n key 上的三处收敛

- [x] **位置**：`components/home/ApproachSection.tsx:74,95,100`、`components/home/ImpactSection.tsx:58,82,91`、`components/home/ComplianceSection.tsx:52`
- **动作**：定义 `as const` 元组
  ```ts
  const APPROACH_KEYS = ['transparent', 'efficient', 'direct'] as const
  type ApproachKey = (typeof APPROACH_KEYS)[number]
  ```
  再用模板串引用 `t(\`approach.${k}.title\`)`，消除 `as any`
- **验收**：这三个文件里 0 处 `as any`

### P0-7 · JSZip 按需加载

- [x] **位置**：`components/donation-display/DonationResultViewer.tsx` 顶部 `import JSZip from 'jszip'`
- **问题**：JSZip（~ 100KB gzipped）在页面加载时被立即拉入，即使用户从不点"下载全部"
- **动作**：把 import 移到 `handleDownloadAll` 内部：`const JSZip = (await import('jszip')).default`
- **验收**：`next build` 分析 DonationResultViewer 的 chunk 不再包含 jszip

### P0-8 · 项目详情页组件按需加载

- [x] **位置**：`app/[locale]/donate/DonatePageClient.tsx:10-14`
- **问题**：6 个 `Project{N}DetailContent` 全部静态 import，但单次渲染只会用 1 个
- **动作**：
  ```ts
  const Project0DetailContent = dynamic(
    () => import('@/components/projects/detail-pages/Project0'),
    { ssr: true }
  )
  // 其余类推
  ```
- **验收**：每个 project detail 打进独立 chunk，donate 页初始 bundle 减小

---

## P1 · 代码重复与设计系统

### P1-2 · admin FormField

- [x] 新建 `components/admin/ui/FormField.tsx`：`FormField`（label/hint/error 包装）+ `TextField`/`SelectField`（合成控件）+ `ADMIN_INPUT_CLASS`。
- [x] 改造 4 个 admin 模态：ProjectEditModal（8 处）、ProjectCreateModal（8 处）、MarketItemCreateModal（3 处）、MarketItemEditModal（3 处）。
- 前台未做：3 套独立视觉语言（track-donation 圆角大+图标 label、ShippingAddressForm 复合组件、admin 标准），统一会改样式或沦为薄壳。

### P1-3 · `<EmptyState>` + `<FilterBar>`

- [x] 新建 `components/ui/EmptyState.tsx`：`py-8 text-center text-gray-400` 包装；用于 MarketItemsTable / MarketOrdersTable / SubscriptionsTable 共 5 处。
- [x] 新建 `components/admin/ui/FilterBar.tsx`：卡片外壳 + grid/flex 布局；用于 SubscriptionsTable 1 处。
- DataTable/AdminTable 未做：4 个表的批量选择/双视图/列结构差异过大，抽象沦为薄壳；DonationsTable 的双 label 切换、MarketOrdersTable 的 inline 筛选都不适合套 FilterBar。

### P1-5 · 拆分 `DonationEditModal.tsx`

- [x] **位置**：`components/admin/DonationEditModal.tsx`
- **执行**：拆出 `DonationStatusSection` / `DonationFileTransitionUpload` / `DonationFileLibrary` / `DonationFileRow` / `DonationInfoPanel` / `DonationHistorySection` + `useDonationFileUpload` hook。
- **结果**：748→145 行；子组件最大 161 行（均 ≤ 200）。

### P1-6 · 拆分 `MarketOrderEditModal.tsx`

- [x] **位置**：`components/admin/MarketOrderEditModal.tsx`
- **执行**：拆出 `MarketOrderInfoPanel` / `MarketOrderStatusSection` / `MarketOrderTransitionUpload` / `MarketOrderFileLibrary` / `MarketOrderFileGroup` + `useMarketOrderFileUpload` hook。
- **结果**：671→194 行；子组件最大 154 行。

### P1-7 · 拆分 `track-donation-form.tsx`

- [x] **位置**：`app/[locale]/track-donation/track-donation-form.tsx`
- **执行**：搬运式拆分（用户端，className 字面 1:1 复制，0 视觉变化）→ `SearchForm` / `OrderGroupCard` / `RefundConfirmationDialog` + 共享 `types.ts`；主文件保留 state/URL sync/handleSubmit/handleRequestRefund。
- **结果**：717→290 行（接近 220 目标但未达；主文件剩余以状态编排和 handleRequestRefund 为主，进一步拆分边际收益小）。

### P1-8 · 拆分 `ProjectDonationList.tsx`

- [x] **位置**：`components/donation-display/ProjectDonationList.tsx`
- **执行**：搬运式 → `DonationTableDesktop` + `DonationCardMobile` + 共享 `types.ts`；主文件保留 fetch/分组/loading/empty 占位。
- **结果**：305→133 行（接近 120 目标）。

### P1-9 · 抽出 `useBidirectionalSticky` hook

- [x] **位置**：`app/[locale]/donate/DonatePageClient.tsx`
- **执行**：80 行 sticky 内联实现 → `lib/hooks/useBidirectionalSticky.ts`（封装 ResizeObserver / scroll/resize 监听 / rAF 节流 / 断点切换）。
- **结果**：DonatePageClient 中不再直接调用 `requestAnimationFrame` 与 `ResizeObserver`。

### P1-10 · i18n helper 瘦身

- [x] **位置**：`lib/i18n-utils.ts`
- **执行**：`getProjectName`/`getLocation`/`getUnitName` 改为一行 `@deprecated` wrapper（保留以兼容支付排除区文件 DonationFormCard），新代码统一用 `getTranslatedText`。`getTranslatedText` 内部紧凑化。
- **结果**：146→91 行（-38%，未达 50% 目标，但冗余 wrapper 已收敛；进一步缩减需删 wrapper，会破坏排除区文件）。

### P1-11 · 统一 `AppLocale` 类型

- [x] **执行**：`types/index.ts` 新增 `AppLocale` + `VALID_LOCALES` + `isAppLocale` 守卫；`SupportedLocale` / `DonationLocale` 改为 `@deprecated` 别名；全仓非排除区文件迁移到 `AppLocale`。
- **结果**：全仓字面量 `'en' | 'zh' | 'ua'` 类型定义仅 `types/index.ts` 一处（其余皆派生别名）。

---

## P2 · 清理与严格度提升

### P2-1 · 收敛 `market-sale.ts` 的 `locale as any`

- [ ] **位置**：`app/actions/market-sale.ts:28`（及附近 `as any`）
- **动作**：用类型守卫
  ```ts
  const VALID_LOCALES = ['en', 'zh', 'ua'] as const
  type Locale = (typeof VALID_LOCALES)[number]
  const isLocale = (x: unknown): x is Locale => VALID_LOCALES.includes(x as Locale)
  ```
- **验收**：该文件非支付段落 0 处 `as any`

### P2-2 · 图片 `alt` 补全

- [ ] **位置**：
  - `components/home/ProjectResultsMosaic.tsx:114,153,182`（mosaic 图片当前 `alt=""`）
  - 全仓 `rg 'alt=""' components/` 复核，保留装饰性图片空 alt，其余补文字
- **动作**：补具备描述性的 alt，优先从 i18n 读取（如 `t('projectResultImage', { projectId })`）
- **验收**：`rg 'alt=""' components/` 结果只剩已确认的装饰性图片

### P2-3 · List key 使用 index 的修正

- [ ] **位置**：
  - `components/home/ApproachSection.tsx:100-117`
  - `components/layout/Footer.tsx:184`
  - `components/projects/detail-pages/Project0/sections/TeamSection.tsx`
- **动作**：改为稳定 key（`member.name`、`info.label` 等）
- **验收**：以上三处无 `key={index}`

### P2-4 · `next.config.js` 图片与性能配置

- [ ] **动作**：
  1. `images.remotePatterns` 的 `**.supabase.co` 改为具体项目域名（`<project-ref>.supabase.co`）
  2. 加 `experimental.optimizePackageImports: ['i18n-iso-countries', 'react-international-phone']`（按实际 import 挑选）
  3. 评估 `serverActions.bodySizeLimit: '50mb'` 是否需要这么大——如果所有大文件都走 signed URL 直传 Storage，改为 `'5mb'`
- **验收**：三项修改到位，`next build` 无新 warning

### P2-5 · `tsconfig` 严格度

- [ ] **动作**：加入 `"noUncheckedIndexedAccess": true`、`"noImplicitOverride": true`，`npm run type-check` 修复新曝光的错误（数量不可预测，发现较多可拆成独立 PR）
- **验收**：`tsc --noEmit` 通过

### P2-6 · 邮件 sender 共享骨架

- [ ] **位置**：`lib/email/senders/*.ts` 多个 sender 重复 try/catch + `resend.emails.send()` + logger
- **动作**：抽 `lib/email/send.ts` 的 `sendEmail({ to, subject, html, text, category, tags? })`，内部处理重试/日志/失败返回
- **验收**：每个 sender 主体只剩"组装模板 + 调 `sendEmail()`"两行

### P2-7 · `FormField` / Zod 公用校验收敛

- [ ] **位置**：`lib/validations.ts` + `lib/market/market-validations.ts`
- **问题**：邮箱、电话、收货地址等 schema 在两处各自定义过
- **动作**：邮箱/电话/必填字符串等"原子 schema"抽到 `lib/validations/base.ts`，业务 schema 组合之
- **验收**：`rg "z.string().email\\("` 只剩一两处（业务组合处）

### P2-8 · 未引用的 project 图片清理

- [ ] **位置**：`public/images/projects/` 有 ~24 张 JSON 里未引用的图片
- **动作**：
  1. 脚本化扫描：`scripts/find-unused-project-images.ts`（对照 `public/content/projects/*.json` 和组件中动态引用的命名模式 `employer${i}` / `progress${i}`）
  2. 人工 review 输出，确认无用的删掉
- **验收**：扫描脚本产出清单 + 清理 commit

### P2-9 · 相对导入收敛到 `@/` 别名

- [ ] **问题**：`components/admin/` 中 22 处 `from '../../'` 样式的相对 import
- **动作**：批量改写为 `@/` 路径别名（可用 codemod 或 VSCode 自动 import 重写）
- **验收**：`rg "from ['\"]\\.\\./" components/admin/` 结果为 0

---

## 执行建议

1. **分 PR 策略**
   - P0-1 / P0-2 各自独立 PR（基础设施类改动 diff 大但逻辑简单）
   - P0-3 ~ P0-8 可以合成 1 个 PR（逻辑独立、体量小）
   - P1 每条独立 PR，便于 review 和回滚
   - P2-5 / P2-9 可能 diff 很大，拆成 2-3 个小 PR（按模块）

2. **避免返工的前置顺序**
   - 先做 P0-1 / P0-2（Prettier + ESLint），再做后续任何涉及多文件改动的任务——否则 format diff 会掩盖真实改动

3. **验证清单（每个 PR 都跑一遍）**
   - `npm run type-check`
   - `npm run lint`
   - `npm run format:check`
   - `npm run build` 成功，对比 `.next/analyze`（若配置了 bundle analyzer）前后差异
   - 手动 smoke：首页 / 捐赠追踪 / 管理后台项目页 / 义卖商品列表

---

## 变更记录

| 日期       | 任务 ID | 执行人 | 备注                                                                                  |
| ---------- | ------- | ------ | ------------------------------------------------------------------------------------- |
| 2026-04-21 | —       | Claude | 初版文档创建                                                                          |
| 2026-04-30 | P0-1    | Claude | Prettier + tailwindcss 插件接入，全量 format 236 文件                                 |
| 2026-04-30 | P0-2    | Claude | ESLint 规则启用 + 修复（含 hook deps、unescaped entities、`<img>` per-line disable）  |
| 2026-04-30 | P0-3    | Claude | admin-auth.ts console.error → logger.error('AUTH', ...); LogCategory 加 'AUTH' 分类   |
| 2026-04-30 | P0-4    | Claude | cloudinary.ts fetchWithRetry 改返 `{ buffer, contentType }` tuple，移除 @ts-ignore    |
| 2026-04-30 | P0-5    | Claude | MissionSection / ImpactSection 改 RSC；ApproachSection 抽 ScrollToComplianceButton    |
| 2026-04-30 | P0-6    | Claude | 首页 7 处 `as any` 全部移除（next-intl 未启用 strict typed messages，可直接传模板串） |
| 2026-04-30 | P0-7    | Claude | DonationResultViewer JSZip 改 `await import('jszip')` 按需加载                        |
| 2026-04-30 | P0-8    | Claude | DonatePageClient 4 个 ProjectNDetailContent 改 next/dynamic                           |
| 2026-04-30 | P1-10   | Claude | i18n-utils 瘦身：getProjectName/getLocation/getUnitName 改一行 @deprecated（38%）     |
| 2026-04-30 | P1-11   | Claude | AppLocale + VALID_LOCALES 统一到 types/index.ts；SupportedLocale/DonationLocale 别名  |
| 2026-04-30 | P1-9    | Claude | 抽出 useBidirectionalSticky hook，DonatePageClient 删除 80 行 sticky 内联实现         |
| 2026-04-30 | P1-5    | Claude | DonationEditModal 748→145，拆出 5 子组件 + useDonationFileUpload hook                 |
| 2026-04-30 | P1-6    | Claude | MarketOrderEditModal 671→194，拆出 5 子组件 + useMarketOrderFileUpload hook           |
| 2026-04-30 | P1-3    | Claude | EmptyState（5 处）+ admin FilterBar（1 处）；DataTable 跳过（结构差异过大）           |
| 2026-04-30 | P1-2    | Claude | FormField/TextField/SelectField 改造 4 个 admin 模态；前台 3 套样式不强行统一         |
| 2026-04-30 | P1-7    | Claude | track-donation-form 717→290，拆出 SearchForm/OrderGroupCard/RefundConfirmationDialog  |
| 2026-04-30 | P1-8    | Claude | ProjectDonationList 305→133，拆出 DonationTableDesktop + DonationCardMobile           |
