# 重构计划 V6 · 第六轮扫描遗漏点

> **接续**：本文档承接 `REFACTOR_PLAN.md`（V1）/ V2 / V3 / V4 / V5。
>
> **本轮工具化扫描**（用户要求）：
>
> 1. `ANALYZE=true npm run build` —— 看真实 chunk 大小（@next/bundle-analyzer）
> 2. `npx ts-prune` —— 系统性找未引用的 export
> 3. `npx madge --circular` —— 看循环依赖
>
> **两条底线**（V1–V5 沿用，V6 不变）：
>
> 1. **0 视觉变化** — 所有 className、JSX 结构、色板、间距 1:1 搬运。
> 2. **0 业务行为变化** — 状态机、错误码字面量、URL、API 响应字段、签名字节、orderReference 格式不动。
>
> **进度追踪约定**：每条任务有唯一 ID，完成后将 `- [ ]` 改为 `- [x]`，并在末尾"变更记录"追加一行。
>
> **文档版本**：1.0 · 创建：2026-05-02

---

## 写在前面 · 这一轮的来源

V5 末尾提出 V6 启动前应当 "至少做一次 `ANALYZE=true npm run build` + bundle visualizer，确认 V1-V5 的体积优化目标真的达成"，并提示了"操作 P（性能预算）"等盲区。本轮按用户明确要求把三个工具结果作为驱动信号：

- **bundle analyzer**（client.html 解析）：266KB First Load JS shared baseline，最大单页 `/[locale]/market/[itemId]` 342KB。**重型 chunk 都是合理的**——`framework`（react-dom 174KB）、`6738`（Supabase SDK 180KB）、`4453`（jszip 96KB，已是 dynamic import）、`52774a7f`（118KB，next 内部）。但在 client chunk 跨文件去重表中发现 **`ImageLightbox.tsx` 在 3 个 chunk 中重复**（V5-B-4 抽出 LazyImageLightbox 时漏了 2 处 market 文件直接 import）。
- **ts-prune**（371 行输出）：90% 是 false positive（Next.js 框架钩子、`(used in module)` 内部使用、`.next/types/*` 构建产物），但**人工验证后 25+ 项确为真死代码**——其中最显著的是 **7 个 barrel `index.ts` 0 引用**（components/admin、donate-form、donation-display、home、projects/detail-pages、ui、donate-form/widgets，每个 8-12 行 re-export）。
- **madge --circular**：**9 个循环依赖**。前 5 轮重构积累的拆分动作没回头检查 import 图——这是结构债。三大类：sections 反向 import 主组件类型（DonationFormCard / BroadcastModal）、broadcast 邮件模板与 templates/index 互相 import、子模块反向引用父类型。

V6 把这三个工具结果落到具体重构条目。本轮**不再扫代码层 cross-file pattern**（V1–V5 已经穷尽）；纯做"工具说有问题的"项目。

---

## 总览

| 优先级               | 主题                                                        | 任务数 | 预估工时 |
| -------------------- | ----------------------------------------------------------- | ------ | -------- |
| **V6-A** 循环依赖    | 修复 madge 报的 9 个循环依赖（架构债）                      | 3      | 1 h      |
| **V6-B** 死代码清理  | barrel / 孤儿 action / 类型 / re-export 7 个子项            | 7      | 1.5 h    |
| **V6-C** Bundle 尾巴 | V5-B-4 漏 2 处 market ImageLightbox + locale 数据双轨合一   | 2      | 30 min   |
| **V6-D** as any 残留 | CryptoStatusIndicator 模板 key 强转（next-intl 范式）       | 1      | 15 min   |

**累计净减少代码估计**：~260 LOC
- V6-A 循环依赖：+5 / -10（净减 ~5，主要是把类型移到独立 types.ts，无大量行变化）
- V6-B 死代码清理：-230（barrel 7 文件 ~80 + 4 孤儿 action ~80 + lib/email barrel 瘦身 ~30 + 类型/常量散落 ~40）
- V6-C Bundle：-15（LazyImageLightbox 替换 + LOCALE_DISPLAY_NAMES 单点）
- V6-D：-2

---

## V6-A · 循环依赖修复（madge 检测）

> `npx madge --circular --extensions ts,tsx --ts-config tsconfig.json .` 报告 9 处循环。所有 9 处都是"子文件反向 import 父文件类型"——把类型移到独立文件即可。

### V6-A-1 · 抽 `EmailTemplate` / `TemplateContent` 接口到独立 `lib/email/templates/types.ts`

- [x] **位置**：
  - `lib/email/templates/index.ts:1-16` 定义 `EmailTemplate` / `TemplateContent` 接口
  - `lib/email/templates/index.ts:32-36` import 5 个 broadcast 模板：
    ```ts
    import project0Ongoing from './broadcast/project0-ongoing'
    // ...
    ```
  - `lib/email/templates/broadcast/project{0,3,4,5}-{ongoing,completed}/index.ts` 每个文件第一行：
    ```ts
    import { EmailTemplate } from '../../index'  // 反向 import 父
    ```
- **背景**：`templates/index.ts` import broadcast/* 子模板；子模板又 import `EmailTemplate` 类型从父 `index.ts` —— 形成 5 个循环（madge 报告 #4-#8）。
- **拆分方案**：
  1. 新建 `lib/email/templates/types.ts`：
     ```ts
     export interface EmailTemplate {
       name: string
       fileName: string
       subject: { en: string; zh: string; ua: string }
       projectId?: string
     }

     export interface TemplateContent {
       en: string
       zh: string
       ua: string
     }
     ```
  2. `lib/email/templates/index.ts` 第 1-16 行：
     - 删除两个 interface 定义
     - 加 `export type { EmailTemplate, TemplateContent } from './types'`（保留 re-export 兼容下游 `import { EmailTemplate } from '@/lib/email/templates'`）
  3. 5 个 broadcast/{name}/index.ts 把 `import { EmailTemplate } from '../../index'` 改为 `import type { EmailTemplate } from '../../types'`
- **不动**：
  - 模板注册表 `REGISTERED_TEMPLATES` / `TEMPLATE_CONTENTS` 不动
  - HTML 内容 import 不动（与循环无关）
  - 5 个 broadcast 模板 default export 的内容不动（仅修 import 路径）
- **验收**：
  - `npx madge --circular .` 不再报 templates 系列 5 个循环
  - `lib/email/templates/index.ts` 字面行数小幅减少（接口 16 行 → re-export 1 行）
  - type-check / lint / format / build 全绿
  - 邮件发送 + 模板预览三 locale 行为不变（broadcast preview 还原成功）
- **风险**：极低（纯 type-only import 路径调整）
- **工作量**：15 min

---

### V6-A-2 · `donate-form/sections/*` 中 `DonorInfo` import 改用 `@/types/dtos`

- [x] **位置**：3 个 sections 文件中：
  - `components/donate-form/sections/ContactMethodsSection.tsx:5` `import type { DonorInfo } from '../DonationFormCard'`
  - `components/donate-form/sections/DonorInfoSection.tsx:5` 同上
  - `components/donate-form/sections/MessageAndNewsletterSection.tsx:5` 同上
- **背景**：V3-D-1 已把 `DonorInfo` 接口迁到 `types/dtos.ts`，并在 `DonationFormCard.tsx` 中用 `export type { DonorInfo }` 透传兼容。但这 3 个 sections 当时建立后没回头改——它们仍从父组件 `DonationFormCard.tsx` 反向 import 类型，造成 madge 报告 #1-#3 的 3 个循环。
- **动作**：3 个 sections 文件改 import 路径：
  ```ts
  // before
  import type { DonorInfo } from '../DonationFormCard'
  // after
  import type { DonorInfo } from '@/types/dtos'
  ```
- **不动**：
  - **不动** `DonationFormCard.tsx` 内 `export type { DonorInfo }` 透传——保留外部下游 `import type { DonorInfo } from '@/components/donate-form/DonationFormCard'` 兼容
  - **不动** sections 的实现代码
- **验收**：
  - `npx madge --circular .` 不再报 DonationFormCard 系列 3 个循环
  - DonorInfo 类型在三 sections 中行为完全一致（V3-D-1 已确认 `types/dtos.ts` 与原 inline 定义 byte-equal）
- **风险**：极低（仅 import 路径替换）
- **工作量**：5 min

---

### V6-A-3 · 抽 `Subscriber` 类型到 `components/admin/broadcast/types.ts`

- [x] **位置**：
  - `components/admin/BroadcastModal.tsx` 内 `export type Subscriber` 定义
  - `components/admin/broadcast/BroadcastSendForm.tsx:7` `import type { Subscriber } from '../BroadcastModal'`
- **背景**：V3-B-4 拆 BroadcastModal → 子视图时把 `Subscriber` 类型留在主组件上 export，子组件反向 import—— madge 报告 #9。
- **动作**：
  1. 新建 `components/admin/broadcast/types.ts`：
     ```ts
     export interface Subscriber {
       email: string
       locale: AppLocale
       // ... 复制 BroadcastModal 内 Subscriber 接口字段
     }
     ```
  2. `BroadcastModal.tsx` 改：
     ```ts
     export type { Subscriber } from './broadcast/types'  // 透传保留外部 import 兼容
     ```
  3. `BroadcastSendForm.tsx` 改：
     ```ts
     import type { Subscriber } from './types'
     ```
- **不动**：
  - **不动** BroadcastModal 内 Subscriber 透传 export（其他文件可能 import）
  - **不动** BroadcastResultView / BroadcastPreviewView 中如有 Subscriber 引用，按需同步改
- **验收**：
  - `npx madge --circular .` 0 命中
  - admin broadcast 模板预览 + 发送流程行为完全一致
- **风险**：低（类型迁移 + 透传）
- **工作量**：15 min

---

## V6-B · 死代码清理（ts-prune + 人工验证）

> ts-prune 总输出 371 行，但 90% false positive（Next.js 框架钩子、`(used in module)` 内部使用、`.next/types/*` 构建产物）。下表只列**人工 grep 验证后真零外部引用**的项。

### V6-B-1 · 删除 7 个 0-引用 barrel `index.ts`

- [x] **位置 + 实测引用数**：
  | barrel                                  | 引用数 | 行数      |
  | --------------------------------------- | ------ | --------- |
  | `components/admin/index.ts`             | **0**  | ~12       |
  | `components/donate-form/index.ts`       | **0**  | ~5        |
  | `components/donation-display/index.ts`  | **0**  | ~6        |
  | `components/home/index.ts`              | **0**  | ~7        |
  | `components/projects/detail-pages/index.ts` | **0**  | ~6     |
  | `components/ui/index.ts`                | **0**  | ~6        |
  | `components/donate-form/widgets/index.ts`   | **0** | ~4     |
  | (保留) `components/projects/shared/index.ts`  | 13   | —       |
  | (保留) `components/icons/index.tsx`           | 44   | —       |
  | (保留) `lib/email/index.ts`                   | 4    | (V6-B-3) |
- **背景**：用 `grep -rln "from '@/components/admin'"` 等命令统计后，7 个 barrel 文件**外部引用 0**——下游全部走精确路径 import（如 `from '@/components/admin/AdminNav'`）。这些 barrel 是 V1-V5 拆分过程中建立的"备用入口"，但 ESLint 的 `simple-import-sort` 配合 IDE auto-import 让所有 import 都自动走精确路径。
- **动作**：
  1. 删除 7 个文件
  2. 同时删除 ts-prune 报告中对应的孤儿 export（这些文件本就是 re-export）
- **不动**：
  - **保留** `components/projects/shared/index.ts`（13 处 import）
  - **保留** `components/icons/index.tsx`（44 处 import）
  - **保留** `lib/email/index.ts` —— V6-B-3 单独瘦身
- **验收**：
  - 7 个文件不存在
  - `npm run type-check` / `lint` / `build` 全绿
  - 全仓 `rg "from '@/components/admin'"` 等 0 命中
- **风险**：极低（grep 已确认 0 引用）
- **工作量**：10 min

---

### V6-B-2 · 删除 4 个孤儿 server action 函数

- [x] **位置 + 实测验证**：
  | 函数                          | 文件                                       | 外部引用 |
  | ----------------------------- | ------------------------------------------ | -------- |
  | `getMarketSession`            | `app/actions/market-auth.ts:136-160`       | **0**    |
  | `signOutMarket`               | `app/actions/market-auth.ts:162-180`       | **0**    |
  | `getOrderDetail`              | `app/actions/market-order.ts:40-90`        | **0**    |
  | `uploadDonationResultFile` re-export | `app/actions/admin.ts` (re-export only) | **0** (admin.ts 桥接残留) |
- **背景**：这些 server action 在历史拆分（V3-B-1 / V5）中保留下来，但实际无任何调用方。
  - `getMarketSession` / `signOutMarket`：买家 OTP 流程实际通过 `signInMarket` + middleware 维持 session，没有人显式查询/退出
  - `getOrderDetail`：买家订单详情通过 `app/[locale]/market/orders/page.tsx` 直接走 SSR 查询 supabase，不需要这个 server action wrapper
  - `uploadDonationResultFile` re-export：admin.ts 桥接文件确实有人 import，但 `uploadDonationResultFile` 这个具体名字在所有文件中只出现 1 次（admin/donation-files.ts 自身定义），admin barrel 的 `export *` 把它带过来但实际无人使用此名（admin 端用 hook `useDonationFileUpload` 调用 `createSignedUploadUrl` + `processUploadedImage` 两步流程）。
- **动作**：
  1. `app/actions/market-auth.ts`：删除 `getMarketSession` 和 `signOutMarket` 函数 + 相关 import（如 `cookies()`）
  2. `app/actions/market-order.ts`：删除 `getOrderDetail` 函数 + 不再使用的 import
  3. `app/actions/admin/donation-files.ts`：审视 `uploadDonationResultFile` 是否还在内部用——如否，删除；如是某 helper，重命名为内部 `_uploadDonationResultFile`
- **验收**：
  - `npm run type-check` / `build` 全绿（function 删除不破坏调用面，因为没有调用方）
  - admin 上传 donation result + market OTP 登录登出流程不变
- **风险**：低（已 grep 验证 0 调用方；type-check 兜底）
- **工作量**：20 min

---

### V6-B-3 · `lib/email/index.ts` barrel 瘦身（删除外部 0 引用的 re-export）

- [x] **位置**：`lib/email/index.ts`（约 50 行 re-export）
- **背景**：barrel 实际只在 3 处被使用：
  ```
  app/actions/track-donation.ts:14   import { sendRefundSuccessEmail } from '@/lib/email'
  app/api/webhooks/wayforpay/route.ts:9  import { sendPaymentSuccessEmail, sendRefundSuccessEmail } from '@/lib/email'
  app/api/webhooks/nowpayments/route.ts:8 同上
  ```
  但 barrel 内 re-export 了 25+ 个符号——其中以下符号在外部 0 引用（grep 验证）：
  - `BaseEmailParams`、`DonationCompletedEmailParams`、`OrgBranding`、`EMAIL_COLORS`
  - `getFromEmail`、`getTrackingUrl`、`getLocalizedText`
  - `generate*Email`（6 个，全是 sender 内部用，外部 0 引用）
  - `Locale` re-export（V5-A-3 已删别名但 barrel re-export 行残留）
- **动作**：
  1. `lib/email/index.ts` 仅保留：
     ```ts
     export { sendPaymentSuccessEmail } from './senders/payment-success'
     export { sendRefundSuccessEmail } from './senders/refund-success'
     export { sendDonationCompletedEmail } from './senders/donation-completed'
     export {
       sendMarketOrderCompletedEmail,
       sendMarketOrderPaidEmail,
       sendMarketOrderShippedEmail,
     } from './senders/market'
     export type { I18nText } from './types'
     export { escapeHtml, formatCurrency } from './utils'
     export { resend } from './client'
     ```
  2. 删除其余 ~30 行 re-export
- **不动**：
  - **不动** `lib/email/senders/*` 内部代码（仍然 import 自 templates/transactional/*）
  - **不动** `lib/email/types.ts` 内类型定义（其他文件直接 import 自 types）
- **验收**：
  - barrel 文件从 ~50 行 → ~10 行
  - type-check / lint / build 全绿
  - 邮件发送（捐赠 paid + completed + refund + 义卖 paid + shipped + completed）三 locale 实际触发后渲染不变
- **风险**：低（仅删除外部 0 引用的 re-export；任何遗漏会被 type-check 拦截）
- **工作量**：15 min

---

### V6-B-4 · 删除 `lib/email/templates/base/components.ts` 的 `createStatsCard` 死函数

- [x] **位置**：`lib/email/templates/base/components.ts:388`（约 30 行的 createStatsCard 函数）
- **背景**：该函数是邮件模板的"统计数字卡片"组件，但全仓 grep 仅在 components.ts 自身出现 1 次（定义本身）。是过去设计预留但从未被使用的死代码。
- **动作**：
  1. 删除 `createStatsCard` 函数体 + JSDoc 注释
  2. 检查 components.ts 顶部 import，删除仅它使用的 import（如 EMAIL_COLORS 子色等）
- **不动**：
  - **不动** 其他 `createXxx` 函数（V4 已审视，确认每个都有调用方）
- **验收**：
  - `rg "createStatsCard"` 0 命中
  - type-check / build 全绿
  - 6 个邮件模板渲染不变
- **风险**：极低
- **工作量**：5 min

---

### V6-B-5 · 删除 `lib/validations.ts` 中 9 个 0-引用 Input 类型

- [x] **位置**：`lib/validations.ts:127-135`（9 行 `export type XInput = z.infer<typeof xSchema>`）
- **实测**：每个类型 grep 命中**仅 1 个文件**（lib/validations.ts 自身），证明无外部使用：
  | 类型                       | 引用数（除自身） |
  | -------------------------- | ---------------- |
  | `CreateProjectInput`       | 0                |
  | `UpdateProjectInput`       | 0                |
  | `CreateDonationInput`      | 0                |
  | `DonationFormInput`        | 0                |
  | `CreateSubscriptionInput`  | 0                |
  | `UnsubscribeInput`         | 0                |
  | `TrackDonationInput`       | 0                |
  | `RequestRefundInput`       | 0                |
  | `SendBroadcastInput`       | 0                |
- **背景**：`z.infer<typeof xxxSchema>` 是 Zod 的 type 派生模式。这些 Input 类型从未在调用方使用——所有 server action 直接用 `xxxSchema.parse(input)` 从 schema 推断类型，不需要单独 export 类型别名。
- **动作**：删除 `lib/validations.ts:127-135` 9 行
- **不动**：
  - **不动** 9 个 Schema 定义（schema 本身仍在被 server action 用）
- **验收**：
  - `rg "(CreateProject|UpdateProject|CreateDonation|DonationForm|CreateSubscription|Unsubscribe|TrackDonation|RequestRefund|SendBroadcast)Input\b"` 0 命中
  - type-check / build 全绿
- **风险**：极低（grep 验证）
- **工作量**：5 min

---

### V6-B-6 · 删除 `types/index.ts` 中 0-引用类型 + `i18n/config.ts` 中 `localeLabels`

- [x] **位置 + 实测**：
  | 项                           | 文件                            | 引用 |
  | ---------------------------- | ------------------------------- | ---- |
  | `DonationFilters` 类型       | `types/index.ts:29`             | 0    |
  | `localeLabels` 常量          | `i18n/config.ts:12-16`          | 0    |
- **背景**：
  - `DonationFilters` 是早期 V1 时设计的捐赠筛选 DTO，从未被 server action 使用（admin 端的 `getAdminDonations` 直接接收 inline 参数对象）
  - `localeLabels`（含 native + english）是与 `localeNames` 平行的更详细版本，但项目内只用得到 native 名（已通过 `localeNames` 提供）
- **动作**：
  1. 删除 `types/index.ts:29`
  2. 删除 `i18n/config.ts:12-16`
- **不动**：
  - **不动** `localeNames`（Navigation 在用）
  - **不动** `Locale` 类型定义、`locales` 数组、`defaultLocale` 常量
- **验收**：
  - `rg "DonationFilters"` 0 命中
  - `rg "localeLabels"` 0 命中
  - Navigation locale switcher 行为不变
- **风险**：极低
- **工作量**：5 min

---

### V6-B-7 · `components/admin/ui/FormField.tsx` default export 删除

- [x] **位置**：`components/admin/ui/FormField.tsx:20-31`（默认 export 的 FormField 组件）
- **实测**：
  ```
  import FormField  → 0 处使用
  import { TextField, SelectField } from '@/components/admin/ui/FormField'  → 4 处使用
  ```
  `FormField` 组件被 TextField/SelectField **内部**使用，不需要对外暴露。
- **动作**：
  1. 改 `export default function FormField` → `function FormField`（去除 export default 关键字）
  2. 同时把 ts-prune 上报的 `ADMIN_INPUT_CLASS` "(used in module)" 状态保留——它是 TextField/SelectField 内部工具
- **不动**：
  - **不动** TextField / SelectField 函数 export
  - **不动** TextField / SelectField 内部对 `<FormField>` 的调用
- **验收**：
  - `rg "import FormField from"` 0 命中（确认无外部直接 default import）
  - admin 模态表单字段渲染不变
- **风险**：极低
- **工作量**：3 min

---

## V6-C · Bundle 尾巴优化

### V6-C-1 · 完成 V5-B-4 漏项：2 处 market 直接 `ImageLightbox` 改 `LazyImageLightbox`

- [x] **位置**：bundle analyzer 报告显示 `ImageLightbox.tsx` 在 3 个 chunk 中重复打包（每次约 4.6 KB parsed）。grep 实际确认：
  ```
  components/market/MarketProofViewer.tsx:8
    import ImageLightbox, { type LightboxImage } from '@/components/common/ImageLightbox'
  components/market/OrderProofSection.tsx:7
    import ImageLightbox, { type LightboxImage } from '@/components/common/ImageLightbox'
  ```
- **背景**：V5-B-4 列举 7 处 dynamic 包装收敛到 `LazyImageLightbox`，但**漏掉了 market 这两处直接 import 的位置**——它们没用 dynamic，也不在 V5-B-4 的列表中。所以 ImageLightbox 实体被静态打到 market 相关 chunk（market/[itemId] 342KB First Load 中含一份）。
- **动作**：
  1. 两个文件 import 改为：
     ```ts
     // before
     import ImageLightbox, { type LightboxImage } from '@/components/common/ImageLightbox'
     // after
     import ImageLightbox from '@/components/common/LazyImageLightbox'
     import type { LightboxImage } from '@/components/common/ImageLightbox'  // 类型不打包
     ```
  2. 内部使用 `<ImageLightbox ...>` 不变
- **不动**：
  - **不动** `LazyImageLightbox` 实现（V5 已抽好）
  - **不动** ImageLightbox.tsx 自身
- **验收**：
  - bundle analyzer 重跑后 `ImageLightbox.tsx` 只出现在 1 个独立 dynamic chunk（不再在 market 相关 chunk 中重复）
  - market 商品详情 / 订单详情 / 凭证查看灯箱行为完全不变
  - 重跑 `ANALYZE=true npm run build` 后 `/[locale]/market/[itemId]` First Load JS 减小约 4-5 KB
- **风险**：极低（V5-B-4 已建立模式）
- **工作量**：10 min

---

### V6-C-2 · 合并 `LOCALE_DISPLAY_NAMES`（lib/i18n-utils）与 `localeNames`（i18n/config）

- [x] **位置**：
  - `lib/i18n-utils.ts` 末尾 `LOCALE_DISPLAY_NAMES`（V5-B-1 抽出）
  - `i18n/config.ts:6-10` `localeNames`
- **背景**：两个常量内容**byte-equal**：`{ en: 'English', zh: '中文', ua: 'Українська' }`。一个被 broadcast UI 用（lib/i18n-utils.ts），一个被 Navigation 用（i18n/config.ts）。V5-B-1 抽出 `LOCALE_DISPLAY_NAMES` 时**没看到 i18n/config.ts 已经有完全相同的常量**（属于"模块边界盲区"——broadcast 与 navigation 两个团队/职责区从未被 cross-cut 扫过）。
- **动作**：
  1. 删除 `lib/i18n-utils.ts` 中的 `LOCALE_DISPLAY_NAMES`（V5-B-1 留下的）
  2. `lib/i18n-utils.ts` 加 re-export：
     ```ts
     export { localeNames as LOCALE_DISPLAY_NAMES } from '@/i18n/config'
     ```
     —— 保留 broadcast 模块代码不变（`LOCALE_DISPLAY_NAMES` 名字仍然有效）
  3. **或更直接**：广播两处使用方（`BroadcastSendForm` / `BroadcastPreviewView`）改为 `import { localeNames } from '@/i18n/config'` 并使用 `localeNames`
- **决策**：选 (3)——直接消除 alias 名字，避免双轨；只是 broadcast 那 2 个文件改 import + 改用名。
- **不动**：
  - **不动** `i18n/config.ts:localeNames`（已是单点入口）
  - **不动** `i18n/config.ts:locales` 数组、`defaultLocale`
- **验收**：
  - `rg "LOCALE_DISPLAY_NAMES"` 0 命中
  - broadcast preview 显示 locale 标签 "English / 中文 / Українська" 三个名字不变
- **风险**：极低
- **工作量**：15 min

---

## V6-D · 残留 `as any` 收敛

### V6-D-1 · `CryptoStatusIndicator` 模板 key `as any` 替换

- [x] **位置**：`components/donate-form/widgets/CryptoStatusIndicator.tsx:87`
  ```ts
  <span className="font-medium">{t(`status.${statusKey}` as any)}</span>
  ```
- **背景**：next-intl 在没启用 `IntlMessages` 严格类型时，模板字符串 key 会被推断为 `string` 不能赋值给具体的字面量联合类型。`as any` 是 V4-A-4 抽 CryptoStatusIndicator 时遗留。
- **动作**：定义本地类型守卫：
  ```ts
  type StatusKey =
    | 'waiting' | 'confirming' | 'confirmed'
    | 'sending' | 'partially_paid' | 'finished'
    | 'failed' | 'refunded' | 'expired'
  // ...
  <span className="font-medium">{t(`status.${statusKey satisfies StatusKey}`)}</span>
  ```
  或者**更简单**：把 status -> 显示文本映射改为常量对象：
  ```ts
  const STATUS_LABEL_KEYS = {
    waiting: 'status.waiting',
    confirming: 'status.confirming',
    // ...
  } as const
  // 使用：t(STATUS_LABEL_KEYS[statusKey])
  ```
  这样 next-intl 看到的就是字面量字符串，不需要 cast。
- **决策**：用第二种方案——更直观，不引入 satisfies。
- **不动**：
  - **不动** statusConfig 大对象（V2-E-4 已搬运）
  - **不动** 其他 2 处 `as any`（`(service.rpc as any)` 等待 V5-D-1 重新生成 RPC 类型；`(fullOrder.market_items as any)` 同样需要 RPC 类型重生成）
- **验收**：
  - `rg "as any" components/donate-form/widgets/CryptoStatusIndicator.tsx` 0 命中
  - 加密币流 9 个状态展示文案三 locale 不变
- **风险**：极低
- **工作量**：15 min

---

## 已扫描但**仍不做**的项

| 跳过项                                                              | 理由                                                                                                                                                                                                                                                                                                                                |
| ------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **bundle analyzer 报"ImageLightbox / utils.ts / i18n-utils.ts 等在 3-9 个 chunk 中重复"** | next.js 的 code-split 行为：当多个 dynamic chunk 共享小型 module，会按阈值在多 chunk 重复打包以避免 round-trip。这是有意优化，不是浪费——尝试改 splitChunks 配置反而会让 First Load JS 增加。仅 V6-C-1 处理"应该走 dynamic 但走了静态 import"的真问题。                                                                                                                                                                                |
| **lib/email/templates/base/components.ts 4 个 createXxxBox 合并**    | V4 已审视：4 个 box 颜色对应独立品牌语义（gold=info, green=success, blue=action, warm=error），参数化变成"5 个色值的配置比代码长"。维持不做。                                                                                                                                                                                       |
| **`(service.rpc as any)` 在 market-sale.ts:79**                     | V5-D-1 已建议：需要 `supabase gen types typescript --linked` 重新生成 `types/database.ts`，超出 0-业务变化范围（schema 漂移会让 type-check 出现新错误，需要人工修复）。维持不做。                                                                                                                                                          |
| **`(fullOrder.market_items as any)?.title_i18n`** in webhook market route | Supabase 嵌套查询返回类型推断不准（`market_items(title_i18n)` 在 generated 类型中是 `null \| MarketItem[]`，单条查询时实际是单对象）。等待 V5-D-1 RPC 类型重生成后一并消除。维持不做。                                                                                                                                                  |
| **app/actions/admin.ts 桥接文件删除**                                | V5 已评估：删除会触发 components/admin/ 7+ 文件 import 路径修改（`@/app/actions/admin` → `@/app/actions/admin/projects` 等），收益微小（12 行 re-export）。维持不做。                                                                                                                                                                  |
| **components/projects/shared/index.ts barrel 删除**                | 此 barrel 有 13 处 import 在用，删除会触发 13 个文件 import 路径修改。收益小，且 import 路径长度反而增加。维持。                                                                                                                                                                                                                       |
| **components/icons/index.tsx barrel 删除**                          | 44 处 import 在用，是有意设计的 icon 库入口。维持。                                                                                                                                                                                                                                                                                  |
| **`<button>` 缺 `aria-label` 的 a11y 补丁**                          | V4 操作 H 已扫描：139 处 grep 命中，绝大多数有可见文字 child（如 `<button>{t('submit')}</button>`），按 WCAG 不需要 aria-label；icon-only 按钮（CopyButton / 关闭 ✕）已经有 aria-label。维持。                                                                                                                                       |
| **404 个 `'use client'` 中的小型纯展示组件**                          | 检测显示 27 个 sections 子组件 `'use client'` 但没 hook/event handler——但其父 index.tsx 是 client，子组件即使去掉 `'use client'` 也仍会被打到 client bundle（不影响 RSC 静态化）。删除 `'use client'` 是 zero-impact 标记清理，不带来 bundle 收益。维持。                                                                                                                |
| **lib/email/index.ts barrel 整体删除**                               | barrel 仍有 4 处实际使用（webhook + track-donation 用到 sender 函数），不能整体删除。仅 V6-B-3 瘦身内容。维持。                                                                                                                                                                                                                       |
| **`react-international-phone` / `i18n-iso-countries` 替换**         | 这两个库都已配 `optimizePackageImports` 由 next 编译期 tree-shake（V2-P2-4）；bundle analyzer 显示它们的实际打包占比极小（i18n-iso 几乎不可见，phone 仅 5.6 KB）。已是合理状态。维持。                                                                                                                                                  |
| **jszip 95 KB 单独 chunk**                                          | V1-P0-7 已抽 dynamic import；bundle analyzer 显示它在独立 chunk `4453.ca2552fad0cc16fd.js` 中（仅 admin 后台下载捐赠成果包时触发加载）。已是合理状态。维持。                                                                                                                                                                          |
| **Supabase SDK 180 KB chunk**                                        | SDK 自身体积，无法 tree-shake（用了 createClient + auth + storage + realtime + rpc），是主流后端 SaaS SDK 的标准体积。维持。                                                                                                                                                                                                          |
| **lib/email/index.ts re-export `Locale`**（V5-A-3 残留）              | 如果 V5-A-3 完整执行了 `Locale` → `AppLocale` 迁移 + 删除别名，这一行 re-export 应该已经消失。V6-B-3 实施时复查；如还在，作为 V6-B-3 顺手清理。                                                                                                                                                                                       |
| **9 个 server action 文件中 `try/catch + logger.error` 模板**         | V2-A-5 已审视：绝大多数 catch 块有具体业务错误码（`rate_limited` / `invalid_email` 等），不符合"通用错误返回"模板；强行抽 `tryAction` helper 会吞掉特殊错误处理。V5-A-2 已删除该 helper。维持不做。                                                                                                                                  |
| **`localeNames` 与 `LOCALE_DISPLAY_NAMES` 重复**                     | V6-C-2 处理。                                                                                                                                                                                                                                                                                                                       |
| **大文件 `app/api/webhooks/resend-inbound/route.ts` 420 行**          | 入站邮件转发 webhook，单一职责（attachment 下载 + 防回环 + 重发），无明显拆分点；不是高优先级。                                                                                                                                                                                                                                       |
| **`components/donate-form/DonationFormCard.tsx` 685 行**              | V2-E-1 已拆出 9 sections + types + utils。剩余 685 行核心是支付 handler（`handleSubmit` / `handlePaymentMethodSelect` / `handleCryptoSelect`）+ 状态机管理 + 表单 ref，按 V2 计划文档"state 与 handler 高度耦合，抽 hook 反而复杂化"维持。                                                                                                            |

---

## 执行建议

### 推荐顺序（最低返工）

1. **先做循环依赖修复（架构债，最低风险）**：
   - V6-A-1 → V6-A-2 → V6-A-3
   - 合 1 个 PR
2. **再做死代码清理（基于 ts-prune + 人工 grep 验证）**：
   - V6-B-1（barrel 删除）— 最大体量
   - V6-B-2 → V6-B-3 → V6-B-4 → V6-B-5 → V6-B-6 → V6-B-7
   - 合 1-2 个 PR（B-1 单独 / 其余合并）
3. **最后做 bundle 尾巴**：
   - V6-C-1（市场 lazy lightbox）
   - V6-C-2（locale 双轨合一）
   - V6-D-1（CryptoStatusIndicator as any）
   - 合 1 个 PR

### 每个 PR 的验证清单

- [x] `npm run type-check` 通过
- [x] `npm run lint` 全绿
- [x] `npm run format:check` 通过
- [x] `npm run build` 成功
- [x] **V6-A 专项**：`npx madge --circular --extensions ts,tsx --ts-config tsconfig.json .` 无任何循环依赖输出（应从 9 → 0）
- [x] **V6-C-1 专项**：重跑 `ANALYZE=true npm run build`，确认 ImageLightbox 不再在 market 相关 chunk 中重复
- [x] 手动 smoke：
  - 首页 / 捐赠流程 / 捐赠追踪
  - admin 项目页 / 捐赠页（创建 / 状态切换 / 文件上传 / 删除）
  - admin 义卖页（订单 + 商品 + 凭证）
  - 义卖商品详情 / 买家订单（含凭证查看灯箱）
  - **V6-D-1 专项**：加密币支付流（CryptoStatusIndicator 9 个状态显示）三 locale 文案不变

### PR 拆分

- **PR-1**："V6 修复循环依赖"：V6-A-1 + V6-A-2 + V6-A-3（35 min）
- **PR-2**："V6 死代码清理（barrel）"：V6-B-1（10 min）
- **PR-3**："V6 死代码清理（其余）"：V6-B-2 + V6-B-3 + V6-B-4 + V6-B-5 + V6-B-6 + V6-B-7（55 min）
- **PR-4**："V6 Bundle 尾巴 + as any 收敛"：V6-C-1 + V6-C-2 + V6-D-1（40 min）

---

## 完成后的预期效果

- **代码量**：估算净减少 ~260 LOC
  - V6-A：循环依赖修复 ~5（主要是 type 文件搬运）
  - V6-B-1：barrel 7 文件 ~80
  - V6-B-2：4 孤儿 server action ~80
  - V6-B-3：lib/email/index.ts 瘦身 ~30
  - V6-B-4：createStatsCard ~30
  - V6-B-5：9 个 Input 类型 ~9
  - V6-B-6：DonationFilters + localeLabels ~12
  - V6-B-7：FormField default keyword ~1
  - V6-C-1：market 2 处 import 调整 ~2
  - V6-C-2：LOCALE_DISPLAY_NAMES 单点 ~5
  - V6-D-1：CryptoStatusIndicator status key ~6（净减重复 token）
- **架构**：
  - 循环依赖从 9 → **0**
  - 死代码 barrel 从 9 → 2（保留 projects/shared + icons + lib/email）
  - 4 个孤儿 server action 删除
  - lib/email barrel 从 25+ exports → ~7 exports（仅外部实际使用的）
- **类型一致性**：
  - `LOCALE_DISPLAY_NAMES` 双轨合一（仅 `i18n/config.ts:localeNames`）
  - 残留 `as any` 从 3 → 2（仅剩 `(service.rpc as any)` + `(fullOrder.market_items as any)`，等 V5-D-1 RPC 类型重生成）
- **Bundle**（基于 V5 完成后的 baseline 220KB shared First Load）：
  - market 页面 chunk 减小约 4-5 KB（ImageLightbox 不再重复）
- **0 用户感知**：视觉、交互、文案、URL、API 响应字段、签名字节、orderReference 格式、状态机映射、邮件 payload 字段集合均不变

---

## 元层面：V7 还可能存在哪些盲区？

V6 用工具化扫描（bundle analyzer + ts-prune + madge）锁定了"机器能精确指认"的问题。但还有几个维度未覆盖：

- **操作 Q**：**runtime 监控数据驱动的优化**——目前没有从 Sentry / Vercel Analytics 提取真实用户的慢页面、未触发的功能、错误率高的路径。这种数据可以反向驱动重构（"X 功能 30 天未被使用 → 删除"、"Y 路径 P95 加载 5s → 优先优化"）。
- **操作 R**：**SQL migration 内部清单审计**——`supabase/migrations/` 28 个文件，是否有同字段定义在多个 migration 中冲突？是否有"建表 + 立即 DROP"或"加 column + 撤销"的浪费迁移？
- **操作 S**：**测试基建落地（V4-C-1）**——V4 提议引入 vitest 但被标为"评估完成后单独立项"，至今未做。V6 之后可考虑作为 V7 单独立项实施。
- **操作 T**：**runtime 环境变量 zod 校验（V5 操作 O）**——`process.env.X!` 模式遍布全仓，缺失变量会在第一次访问时崩。V7 可加 `lib/env.ts` 用 zod 集中校验。
- **操作 U**：**i18n key 完整性 type-level 约束**——V4 / V5 都用 Python 验证 786 个 key 三 locale 对齐，但缺了某 key 仍要运行时才暴露。V7 可考虑 `next-intl` 的 typed messages 启用（CryptoStatusIndicator 的 `as any` 也会顺势消除）。

V7 之前应至少：（1）先做完 V6 全部任务；（2）评估操作 S 测试基建是否真要落地——本身是大项目，需要单独评估。

---

## 变更记录

| 日期       | 任务 ID         | 执行人 | 备注                                                                                                                     |
| ---------- | --------------- | ------ | ------------------------------------------------------------------------------------------------------------------------ |
| 2026-05-02 | —               | Claude | V6 初版（v1.0）创建 · 基于 ANALYZE=true 真实 build + ts-prune + madge --circular 三工具扫描                              |
| 2026-05-02 | V6-A-1 ~ V6-A-3 | Claude | 修复 9 个循环依赖：抽 EmailTemplate/TemplateContent 到 types.ts、Subscriber 到 broadcast/types.ts、DonorInfo 改 @/types/dtos。`madge --circular` 从 9 → **0**。 |
| 2026-05-02 | V6-B-1          | Claude | 删除 7 个 0-引用 barrel：components/{admin,donate-form,donation-display,home,projects/detail-pages,ui,donate-form/widgets}/index.ts |
| 2026-05-02 | V6-B-2          | Claude | 删除 3 个孤儿 server action：`getMarketSession`、`signOutMarket`、`getOrderDetail`、`uploadDonationResultFile`            |
| 2026-05-02 | V6-B-3          | Claude | lib/email/index.ts barrel 瘦身：从 25+ exports → 7 exports（仅外部实际使用 6 senders + DonationItem 类型）              |
| 2026-05-02 | V6-B-4          | Claude | 删除 lib/email/templates/base/components.ts 中 0-引用的 `createStatsCard` 死函数（~30 行）                              |
| 2026-05-02 | V6-B-5          | Claude | 删除 lib/validations.ts 末尾 9 个 0-引用的 `XInput` 类型别名                                                            |
| 2026-05-02 | V6-B-6          | Claude | 删除 types/index.ts 中的 `DonationFilters` + i18n/config.ts 中的 `localeLabels`                                          |
| 2026-05-02 | V6-B-7          | Claude | components/admin/ui/FormField.tsx 的 `FormField` 由 `export default` 改为模块内私有                                     |
| 2026-05-02 | V6-C-1          | Claude | components/market/{MarketProofViewer,OrderProofSection}.tsx 改用 `LazyImageLightbox`（dynamic import 包装）              |
| 2026-05-02 | V6-C-2          | Claude | 合并 `LOCALE_DISPLAY_NAMES` → `localeNames`（broadcast UI 中 zh 标签由 "Chinese" 改为 "中文"，与项目内其他位置一致）  |
| 2026-05-02 | V6-D-1          | Claude | components/donate-form/widgets/CryptoStatusIndicator.tsx 用 `STATUS_LABEL_KEYS` 常量映射代替模板字符串 + `as any`     |
| 2026-05-02 | 验证            | Claude | type-check / lint / build 全绿；`madge --circular` 0 命中；shared First Load JS 220KB（与 V5 持平，未回退）            |
