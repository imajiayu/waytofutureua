# 重构计划 V5 · 第五轮扫描遗漏点

> **接续**：本文档承接 `REFACTOR_PLAN.md`（V1）/ V2 / V3 / V4。四轮全部完成后，按 V4 末尾"元层面"提出的"操作 E-I"（SQL ↔ 代码一致性 / 死代码 / 依赖审视 / a11y-SEO / RLS 与 client 权限）+ 复跑"操作 A-D"，对全仓再做一轮系统扫描。
>
> **两条底线**（V1–V4 沿用，不变）：
>
> 1. **0 视觉变化** — 所有 className、JSX 结构、色板、间距 1:1 搬运。
> 2. **0 业务行为变化** — 状态机、错误码字面量、URL、API 响应字段、签名字节、orderReference 格式不动。
>
> **范围说明（与 V4 一致）**：不再设支付排除区。签名拼接、状态映射、orderReference 格式仍维持原样不动；纯逻辑收敛 / 类型迁移 / 死代码删除全部纳入。
>
> **进度追踪约定**：每条任务有唯一 ID，完成后将 `- [ ]` 改为 `- [x]`，并在末尾"变更记录"追加一行。
>
> **文档版本**：1.0 · 创建：2026-05-01

---

## 写在前面 · V5 这一轮新发现的来源

V4 末尾提出了五个新扫描操作（E/F/G/H/I）作为"V5 启动前应当做的"。本轮按这五个操作 + 重跑 A-D（file-internal cross-block / 数据常量散布 / 返回类型 union / 环境变量 fallback）做全仓扫描。

**结果**：操作 F（死代码 / 孤儿 export 审计）找出本轮**最大的单项收益** —— `lib/supabase/queries.ts` 中 8 个 export 实际无人调用，仅 2 个在用（225 → 约 80 行）。这个发现解释了为什么"重构本身就是问题生成器"（V4 第 1 条盲区）：V1-V4 的拆分动作为新代码搬出新位置，但旧位置的"遗留入口"没人回头删；前四轮用的扫描方法（按文件大小排序、按已知模式找重复）都触发不到"已经无人调用的旧 export"。

**操作 H**（a11y / SEO）扫了 16 处 `alt=""` + 139 处无 `aria-label` 的 button —— 但人工抽查后发现 16 处 `alt=""` 都是装饰性图（hero / footer / mosaic 背景图），按 WCAG 装饰图规范应当用空 alt；而 button 大多有可见文字，icon-only 的极少数已经在用 `aria-label`。本轮 a11y/SEO 维度判定**不做**。

**操作 G**（第三方依赖）扫了所有 dep：`i18n-iso-countries` 已配 `optimizePackageImports`；`jszip` 已经是 `await import('jszip')` 按需；`sharp` 仅在 server action / API route；`@sentry/nextjs` 配置了 `treeshake.removeDebugLogging`。无明显可移除项。

**操作 I**（RLS ↔ client 权限）：所有 `createServiceClient()` 调用点都在 webhook（合理）+ market-sale 的 `decrement_stock`/`restore_stock` SECURITY DEFINER 调用（合理）；所有 `createAnonClient()` 调用都是公开查询（合理）。有 1 处 `(service.rpc as any)('create_market_order_atomic'...)` —— 与操作 E 重叠，原因是 `types/database.ts` 没有 `create_market_order_atomic` 的 RPC 类型（迁移后未重新生成）。

---

## 总览

| 优先级               | 主题                                                             | 任务数 | 预估工时       |
| -------------------- | ---------------------------------------------------------------- | ------ | -------------- |
| **V5-A** 死代码清理  | queries.ts / action-utils / Locale deprecated / 同名重复实现     | 4      | 1.5 h          |
| **V5-B** 跨文件常量收敛 | LOCALE_LABELS / CATEGORY_* / storage bucket / dynamic 包装    | 5      | 2 h            |
| **V5-C** 类型字面量迁移 | 6 处 `'en' \| 'zh' \| 'ua'` → AppLocale                       | 1      | 30 min         |
| **V5-D** URL 单点    | 9 处 `process.env.NEXT_PUBLIC_APP_URL \|\|` fallback → BASE_URL | 1      | 20 min         |
| **V5-E** 行为修正候选 | RPC 类型重新生成（消除 service.rpc as any）— 不在 V5 范围      | 1      | —              |

**累计净减少代码估计**：~280 LOC
- V5-A-1 queries.ts 8 死 export -145
- V5-A-2 action-utils.ts 删除 -28
- V5-A-3 Locale → AppLocale -14
- V5-A-4 server.ts vs admin-auth.ts cookies adapter -20
- V5-B-1 LOCALE_LABELS 单点 -10
- V5-B-2 CATEGORY_LABELS / CATEGORY_ORDER 单点 -16
- V5-B-3 storage bucket 常量化 -14（每处 -1.4 平均）
- V5-B-4 LazyImageLightbox 收敛 -14（每处 -2 × 7 处）
- V5-B-5 BASE_URL 收敛 fallback -10
- V5-C-1 `'en' | 'zh' | 'ua'` → AppLocale -8
- V5-D-1 同 V5-B-5

---

## V5-A · 死代码清理

> 这一节是 V5 真正的**硬骨头**——前四轮没扫到的最大盲区。每一项都是 V1-V4 多次拆分留下的"无人调用的旧入口"。

### V5-A-1 · 删除 `lib/supabase/queries.ts` 中 8 个无人调用的 export

- [x] **位置**：`lib/supabase/queries.ts`（225 行,10 个 export）
- **背景**：grep `from '@/lib/supabase/queries'` 全仓只命中 3 处，且只 import 了 2 个函数：
  - `getAllProjectsWithStats` — 在用（`app/[locale]/donate/page.tsx`、`components/projects/ProjectsGrid.tsx`）
  - `getProjectStats` — 在用（`app/actions/donation/_shared.ts`）

  其余 8 个 export 全部为孤儿，原本设计意图被 `app/actions/admin/projects.ts` / `app/actions/admin/donations.ts` 同名函数取代（admin 后台都 import 自 `@/app/actions/admin`，不是 `@/lib/supabase/queries`）：

  | 函数                  | 实际替代物                            | 命中数 |
  | --------------------- | ------------------------------------- | ------ |
  | `getProjects`         | （无业务调用）                        | 0      |
  | `getProjectById`      | （无业务调用）                        | 0      |
  | `getActiveProjects`   | （无业务调用）                        | 0      |
  | `getDonations`        | `getAdminDonations` in `admin/donations.ts` | 0      |
  | `createProject`       | `createProject` in `admin/projects.ts`     | 0      |
  | `createDonation`      | （无业务调用，donation 创建走 `_shared.ts.insertPendingDonations`） | 0      |
  | `updateProject`       | `updateProject` in `admin/projects.ts`     | 0      |
  | `updateDonationStatus`| `updateDonationStatus` in `admin/donations.ts` | 0      |

- **动作**：
  1. 删除上述 8 个 export 函数（行 14-58 + 122-225 的全部）
  2. 保留 `getProjectStats` + `getAllProjectsWithStats` + 顶部 import
  3. **不动**：现有 `// @ts-expect-error` 注释（行 171）会随 `createProject` 删除一起消失，无需单独处理
- **验收**：
  - `lib/supabase/queries.ts` 从 225 行 → ~80 行
  - `npm run type-check` 通过（这 8 个 export 无业务调用）
  - `npm run build` 成功
  - `rg "getProjects\\(|getProjectById\\(|getActiveProjects\\(|createDonation\\(" --glob '!lib/supabase/queries.ts'` 0 命中
- **风险**：低（grep 已验证 0 调用方）
- **工作量**：30 min

---

### V5-A-2 · 删除 `lib/action-utils.ts`（V2-A-5 残留）

- [x] **位置**：`lib/action-utils.ts`（30 行，含 `tryAction<T>` helper）
- **背景**：V2-A-5 创建了 `tryAction` 作为 server action try/catch 模板的收敛基础设施，但当时审计后发现"绝大多数 catch 块都有具体业务错误码（rate_limited / invalid_email 等），不符合通用错误返回模板" → 跳过批量迁移。从那以后**没有任何文件调用过 tryAction**。

  验证：`grep -rln "tryAction\\|action-utils" app/ components/ lib/ 2>/dev/null` 仅命中 `lib/action-utils.ts` 自身。

- **动作**：直接 `rm lib/action-utils.ts`。
- **验收**：
  - `npm run type-check` / `npm run build` 通过
  - `rg "action-utils|tryAction"` 全仓 0 命中
- **风险**：极低（孤儿基础设施，0 调用）
- **工作量**：5 min

---

### V5-A-3 · 完成 `lib/email/types.ts` 内 `Locale` → `AppLocale` 迁移 + 删除 deprecated 别名

- [x] **位置**：`lib/email/types.ts:7-8`（`@deprecated export type Locale = AppLocale`）+ lib/email/ 内 17 处 `Locale` 引用
- **背景**：V4-B 系列任务把 `lib/i18n-utils.ts` 的 `SupportedLocale` 别名清理掉了，但漏了 `lib/email/types.ts` 内**同样属于 deprecated**的 `Locale` 类型别名。`lib/email/` 内部 17 处仍在用 `Locale`，应统一收敛到 `AppLocale`：

  | 文件                                                            | 用法                                            |
  | --------------------------------------------------------------- | ----------------------------------------------- |
  | `lib/email/types.ts:7-8`                                        | `@deprecated` 别名定义                          |
  | `lib/email/index.ts:18`                                         | re-export `Locale`                              |
  | `lib/email/client.ts:8,40`                                      | type import + 函数参数                          |
  | `lib/email/utils.ts:5,40,48`                                    | type import + `getTrackingUrl` / `getMarketOrdersUrl` 参数 |
  | `lib/email/send.ts:5,9`                                         | type import + `BaseEmailParams.locale`          |
  | `lib/email/types.ts:15`                                         | `BaseEmailParams.locale: Locale`                |
  | `lib/email/templates/base/components.ts:19,27,64,114`           | createHeader/createFooter/createSignature 参数  |
  | `lib/email/templates/base/layout.ts:12,18`                      | createEmailLayout 参数                          |
  | `lib/email/templates/transactional/*/content.ts`（6 个文件）    | `Record<Locale, XContent>` × 6                  |
  | `app/actions/email-broadcast.ts:23,110,126,209`                 | `BroadcastRecipient.locale` + reduce + as       |
  | `app/actions/subscription.ts:21,28,40`                          | `EmailSubscription.locale` + 函数签名           |
  | `app/actions/market-admin.ts:280`                               | `as import('@/lib/email/types').Locale`         |

- **动作**：
  1. 全仓批量替换 `lib/email/types.ts` 来源的 `Locale` → `AppLocale`（用 `import type { AppLocale } from '@/types'` 替换 `import { Locale } from '...types'`）
  2. 删除 `lib/email/types.ts:7-8` 的 `@deprecated export type Locale = AppLocale`
  3. 删除 `lib/email/index.ts:18` 的 `Locale` re-export
  4. `app/actions/market-admin.ts:280` 的 `as import('@/lib/email/types').Locale` 改为 `as AppLocale`（直接从 `@/types` 导入）
- **验收**：
  - `rg "from.*email/types.*Locale|email.*Locale,?" --glob '*.ts' --glob '*.tsx'` 0 命中（除 `AppLocale` 自身）
  - `rg "import.*\\bLocale\\b.*from.*types" lib/email/` 0 命中
  - 三种语言下邮件渲染、broadcast 收件人 reduce、subscription 创建均与重构前一致
- **风险**：低（`Locale` 当前定义就是 `AppLocale`，类型语义完全相同；纯 import 路径改写）
- **工作量**：30 min

---

### V5-A-4 · `lib/supabase/server.ts` 与 `lib/supabase/admin-auth.ts` cookies 适配器收敛

- [x] **位置**：
  - `lib/supabase/server.ts:7-30`（`createServerClient`，含 `cookieStore.getAll/setAll + try` 14 行）
  - `lib/supabase/admin-auth.ts:10-34`（`createAuthClient`，cookies 处理逻辑 byte-equal 复制）
- **背景**：两个文件的 cookies 适配器实现完全相同：
  ```ts
  cookies: {
    getAll() { return cookieStore.getAll() },
    setAll(cookiesToSet) {
      try {
        cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
      } catch {
        // 在某些 Next.js 上下文中可能无法设置 cookie
      }
    }
  }
  ```
  且两个 `createServerClient` / `createAuthClient` 函数本身**也是同一种实现**（同样的 `createSSRClient` 调用、同样的 SUPABASE_URL/ANON_KEY）。

- **拆分方案**（保守）：
  1. 在 `lib/supabase/server.ts` 顶部抽出 file-local helper（**不导出**，避免新增公共 API）：
     ```ts
     async function createCookieAdapter() {
       const cookieStore = await cookies()
       return {
         getAll: () => cookieStore.getAll(),
         setAll: (cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) => {
           try {
             cookiesToSet.forEach(({ name, value, options }) =>
               cookieStore.set(name, value, options)
             )
           } catch {
             // Next.js 部分上下文不允许设置 cookie
           }
         },
       }
     }
     ```
  2. `createServerClient` 改为 `cookies: await createCookieAdapter()`
  3. `lib/supabase/admin-auth.ts:createAuthClient` 改为 `import { createServerClient } from './server'` 并直接 re-export（**或** `createAuthClient = createServerClient` 别名）—— 因为两者实现已完全等价
- **不做**：
  - **不合并** `createAuthClient` 与 `createServerClient` 的对外名称（admin/* 多处 import `createAuthClient`，强行重命名会扩大改动面）
  - **不下沉** cookieAdapter 到 `lib/supabase/cookies.ts`（仅两处使用，文件级 helper 即可）
- **验收**：
  - `lib/supabase/admin-auth.ts:createAuthClient` 不再含 cookies 配置代码块
  - 两个文件总行数减约 20-25 行
  - admin 登录 / market 买家登录 / SSR 页面认证均正常（cookies 读写行为不变）
- **风险**：中（cookie 处理是认证关键路径，必须验证 admin 登录 + 买家 OTP 登录两条流程）
- **工作量**：45 min（含手动验证）

---

## V5-B · 跨文件常量收敛

### V5-B-1 · `LOCALE_LABELS` 抽到 `lib/i18n-utils.ts`

- [x] **位置**：
  - `components/admin/broadcast/BroadcastSendForm.tsx:8-12`
  - `components/admin/broadcast/BroadcastPreviewView.tsx:5-9`
- **背景**：两处都是 `Record<AppLocale, string> = { en: 'English', zh: '中文', ua: 'Українська' }` byte-equal。这个表本身和 `lib/i18n-utils.ts:JS_LOCALE_MAP`（`Record<AppLocale, string>` 的另一个 locale 显示名映射）属于同类常量。
- **动作**：
  1. 在 `lib/i18n-utils.ts` 末尾追加：
     ```ts
     /** Locale 在 UI 中的展示名（broadcast 收件人选择 / preview 标题等） */
     export const LOCALE_DISPLAY_NAMES: Record<AppLocale, string> = {
       en: 'English',
       zh: '中文',
       ua: 'Українська',
     }
     ```
  2. 两处 `BroadcastSendForm` / `BroadcastPreviewView` import + 使用 `LOCALE_DISPLAY_NAMES` 替换本地 `LOCALE_LABELS`
- **不做**：
  - **不动** `JS_LOCALE_MAP`（用途是 `Date.toLocaleString()` 的 BCP-47 lang tag，与 UI 展示名不是同一物）
- **验收**：
  - 两处文件各减 4 行
  - broadcast 模板预览与发送页面 locale 标签展示不变
- **风险**：极低
- **工作量**：15 min

---

### V5-B-2 · `CATEGORY_LABELS` + `CATEGORY_ORDER` 抽到 `lib/market/market-categories.ts`

- [x] **位置**：
  - `components/admin/MarketOrderEditModal.tsx:29`（`CATEGORY_LABELS`）
  - `components/admin/market-order/MarketOrderTransitionUpload.tsx:5`（`CATEGORY_LABELS`，与上面 byte-equal）
  - `components/market/MarketProofViewer.tsx:18`（`CATEGORY_ORDER`）
  - `components/market/OrderProofSection.tsx:15`（`CATEGORY_ORDER`，与上面 byte-equal）
  - `app/actions/market-order-files.ts:10`（`CATEGORIES = ['shipping', 'completion']`，同值）
  - `app/actions/market-order-files.ts:277, 341`（`categoriesToShow = ['shipping', 'completion']`，inline 字面量）
- **背景**：5 处散布定义同一份"shipping → 'Shipping Proof' / completion → 'Completion Proof'"语义。
- **动作**：
  1. 新建 `lib/market/market-categories.ts`：
     ```ts
     import type { MarketOrderFileCategory } from '@/types/market'

     /** 凭证类别的稳定遍历顺序（管理员上架 → 完成的物流时序） */
     export const MARKET_ORDER_CATEGORIES: MarketOrderFileCategory[] = ['shipping', 'completion']

     /** 凭证类别在管理员后台的展示名（admin 端，全英文） */
     export const MARKET_ORDER_CATEGORY_LABELS: Record<MarketOrderFileCategory, string> = {
       shipping: 'Shipping Proof',
       completion: 'Completion Proof',
     }
     ```
  2. 5 处使用方改 import；inline 字面量也替换为常量
- **不做**：
  - **不动** `MAGIC_BYTES` / `BUCKET` / `MAX_FILE_SIZE`（语义不同，已经是单点）
- **验收**：
  - 5 处使用 `import { MARKET_ORDER_CATEGORIES, MARKET_ORDER_CATEGORY_LABELS } from '@/lib/market/market-categories'`
  - admin 后台凭证上传与展示、买家订单凭证查看像素级一致
- **风险**：低
- **工作量**：30 min

---

### V5-B-3 · `'donation-results'` storage bucket 常量化

- [x] **位置**：`'donation-results'` 字面量在 ~10 处硬编码（`app/actions/admin/donation-files.ts` 4 处 + `app/actions/admin/donations.ts` 2 处 + `app/actions/admin/_helpers.ts` 1 处 + `app/actions/donation-result.ts` 3 处）
- **背景**：`market-order-files.ts:9` 已经用了 `const BUCKET = 'market-order-results'` 单点定义，捐赠侧**没跟上**。
- **动作**：
  1. 新建 `lib/supabase/storage-buckets.ts`：
     ```ts
     /** Supabase Storage bucket 名字单点定义 */
     export const STORAGE_BUCKETS = {
       /** 捐赠成果照片/视频（管理员上传，公开可读） */
       donationResults: 'donation-results',
       /** 义卖订单凭证（管理员上传，公开可读） */
       marketOrderResults: 'market-order-results',
     } as const
     ```
  2. 替换 10 处 `'donation-results'` → `STORAGE_BUCKETS.donationResults`
  3. `market-order-files.ts:9` 的 local `BUCKET` 改为 `import { STORAGE_BUCKETS } ... const BUCKET = STORAGE_BUCKETS.marketOrderResults`（保留 local alias 兼容现有调用面）
- **不做**：
  - **不改**任何 RLS storage policy / bucket 物理名（仅代码侧字面量收敛，Supabase 端 bucket 名不动）
- **验收**：
  - `rg "'donation-results'" --glob '!**/storage-buckets.ts'` 仅在新建文件中出现
  - 上传 / 列文件 / 删除 / 获取 publicUrl 流程行为不变
- **风险**：低（仅字面量替换；bucket 名是字符串值，不影响行为）
- **工作量**：30 min

---

### V5-B-4 · 抽 `LazyImageLightbox.tsx` 收敛 7 处 dynamic 重复

- [x] **位置**：`dynamic(() => import('@/components/common/ImageLightbox'), { ssr: false })` 在 7 处重复：
  - `components/projects/detail-pages/Project0/index.tsx:38`
  - `components/projects/detail-pages/Project3/index.tsx:28`
  - `components/projects/detail-pages/Project4/index.tsx:30`
  - `components/projects/detail-pages/Project5/index.tsx:19`
  - `components/projects/shared/ProjectResultsMasonry.tsx:11`
  - `components/projects/shared/UnifiedResultsSection.tsx:12`
  - `components/donation-display/DonationResultViewer.tsx:14`
- **背景**：每个文件都自己写一份 dynamic 包装。`ImageLightbox` 是图片灯箱，含 image preview + caption + arrow nav，体积约 8KB gzip，按需加载合理。但每次都重复包装是模板复制。
- **动作**：
  1. 新建 `components/common/LazyImageLightbox.tsx`：
     ```ts
     'use client'
     import dynamic from 'next/dynamic'
     /** 按需加载的 ImageLightbox（{ ssr: false } + 透明 props 转发） */
     export default dynamic(() => import('./ImageLightbox'), { ssr: false })
     ```
  2. 7 处使用方把 `import dynamic from 'next/dynamic'` + `const ImageLightbox = dynamic(...)` 替换为 `import ImageLightbox from '@/components/common/LazyImageLightbox'`
  3. 内部使用名 `<ImageLightbox ...>` 不变（仍叫 `ImageLightbox`，符合现有阅读习惯）
- **不做**：
  - **不动** `ImageLightbox.tsx` 自身（保持作为 SSR-friendly 的"原始组件"，高级用户仍可直接 import 同步版本）
  - **不抽** `BottomSheet` 的 dynamic 包装（仅 2 处使用，且配置不同 —— `MarketItemDetail` 加了 `loading: () => null`，`DonatePageClient` 没加）
- **验收**：
  - 7 处使用方各减 2-3 行（去掉 dynamic import 与 const）
  - bundle 体积持平（dynamic chunk 仍按 ImageLightbox 一份生成）
  - 5 个项目详情页 + UnifiedResultsSection + ProjectResultsMasonry + DonationResultViewer 灯箱打开/关闭行为不变
- **风险**：极低（纯模板收敛）
- **工作量**：20 min

---

### V5-B-5 · `process.env.NEXT_PUBLIC_APP_URL` fallback 字面量 → `BASE_URL`

- [x] **位置**：9 处 `process.env.NEXT_PUBLIC_APP_URL || 'https://waytofutureua.org.ua'`（V4-D-1 已统一默认值，本任务消除字面量重复）：
  - `app/[locale]/opengraph-image.tsx:18`
  - `app/actions/donation.ts:109, 235`
  - `components/admin/BroadcastModal.tsx:143, 156`
  - `lib/payment/wayforpay/server.ts:16`
  - `lib/market/wayforpay.ts:13`
  - `lib/email/broadcast.ts:39`
  - `lib/email/utils.ts:41, 49`
- **背景**：`lib/constants.ts` 已定义 `export const BASE_URL = 'https://waytofutureua.org.ua'`。9 处仍然字面量重复同一值。
- **动作**：
  1. 全部 fallback 替换为 `BASE_URL`：
     ```ts
     // before
     const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://waytofutureua.org.ua'
     // after
     const baseUrl = process.env.NEXT_PUBLIC_APP_URL || BASE_URL
     ```
  2. 各文件加 `import { BASE_URL } from '@/lib/constants'`
- **不做**：
  - **不**把整段 `process.env.X || BASE_URL` 抽成 helper 函数（这是 9 行字面量收敛，做成函数反而模糊；保留 inline 形式让读者一眼看到环境变量来源）
  - **不动** 取值优先级（`||` 语义保持：env 是空字符串也用 fallback；`??` 仅 nullish 才回退，行为会变）
- **验收**：
  - `rg "'https://waytofutureua\\.org\\.ua'" --glob '!docs/' --glob '!lib/constants.ts'` 0 命中
  - 邮件链接 / Open Graph / WayForPay returnUrl 生成与重构前 byte-equal
- **风险**：极低（同一字符串字面量替换为同名常量）
- **工作量**：20 min

---

## V5-C · 类型字面量迁移

### V5-C-1 · 6 处 `'en' | 'zh' | 'ua'` 联合字面量 → `AppLocale`

- [x] **位置**：V4-B-2 已迁移大部分 `SupportedLocale` cast，但仍有 6 处直接写联合字面量（不是 deprecated 别名）：
  - `app/[locale]/market/orders/page.tsx:290` — `as 'en' | 'zh' | 'ua'`
  - `app/actions/donation/_shared.ts:39` — `locale: 'en' | 'zh' | 'ua'` 字段
  - `app/api/webhooks/wayforpay-market/route.ts:309` — `as 'en' | 'zh' | 'ua'`
  - `components/admin/SubscriptionsTable.tsx:22` — `'all' | 'en' | 'zh' | 'ua'`（混合 locale + sentinel）
  - `lib/supabase/queries.ts:190` — `locale?: 'en' | 'zh' | 'ua'`（**注意**：本字段位于 V5-A-1 待删除的 `createDonation` 函数中，**V5-A-1 完成后此处自动消失**）
  - `lib/email/broadcast.ts:8` — `locale: 'en' | 'zh' | 'ua'` 字段（位于 `BroadcastEmailParams`）
- **动作**：
  1. 5 处（除 SubscriptionsTable）直接替换为 `AppLocale`：
     ```ts
     import type { AppLocale } from '@/types'
     // ... locale: AppLocale  /  as AppLocale
     ```
  2. SubscriptionsTable.tsx:22 改为 `'all' | AppLocale`（保留 'all' sentinel 语义）
- **不做**：
  - **不动** `app/api/donate/success-redirect/route.ts:25` / `app/api/unsubscribe/route.ts:46` 中的 `['en', 'zh', 'ua'].includes(rawLocale) ? rawLocale : 'en'` 这种**值数组**运行时检查（用 `VALID_LOCALES` 替换会改 import 面，价值小且 V4-B-2 也保留了类似模式）
- **验收**：
  - `rg "'en' \\| 'zh' \\| 'ua'" --glob '*.ts' --glob '*.tsx'` 仅命中 `types/index.ts:VALID_LOCALES`（值定义）和 SubscriptionsTable（'all' 联合）
  - type-check 通过；SubscriptionsTable 筛选行为不变
- **风险**：极低（`AppLocale = 'en' | 'zh' | 'ua'` 类型完全等价）
- **工作量**：20 min

---

## V5-D · 行为修正候选（不在 V5 范围）

### V5-D-1 · 重新生成 `types/database.ts` 修复 `(service.rpc as any)('create_market_order_atomic')`

- [ ] **位置**：`app/actions/market-sale.ts:79`（`(service.rpc as any)`）
- **背景**：`create_market_order_atomic` RPC 在 `supabase/migrations/20260331200000_create_market_order_atomic.sql` 定义，但 `types/database.ts` 是 baseline 之前生成的快照，没有这个 RPC 的类型。代码侧只能用 `(service.rpc as any)` 逃逸。
- **为什么不在 V5 范围**：
  1. 重新生成需要 `supabase login` + `supabase link --project-ref` + 网络访问，超出 auto mode 自动化范围
  2. 重新生成会顺带更新所有表/视图的类型 schema，可能引入大量 diff（不一定全是好事——历史 `// @ts-expect-error` 注释可能因类型放宽而失效）
  3. 改动 `types/database.ts` 影响面跨整个代码库，必须人工逐一验证 type-check
- **建议下一步**：单独建一个非重构 PR：
  ```bash
  supabase login
  supabase link --project-ref <REF>
  supabase gen types typescript --linked > types/database.ts
  npm run type-check  # 修复任何新出现的类型错误
  ```
  完成后 `(service.rpc as any)` 可改为正常调用，且其他 `// @ts-expect-error` 也可能消除。
- **风险评估（如做）**：中（schema 漂移会让 type-check 出现新错误，需要人工修复）
- **工作量（如做）**：1-2 h（视 type-check 错误数）

---

## 已扫描但**仍不做**的项

V5 显式回头复审了 V4 的"已扫描但不做"列表 + 本轮新评估项。下表仅列**判定有变化或本轮新加的**项。

| 跳过项                                                                              | V5 判定                                                                                                                                                                                       |
| ----------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **操作 A 复审**：`lib/email/templates/base/components.ts` 内 4 个 box 函数合并  | **维持不做**。重新读了 4 个函数（createInfoBox / createSuccessBox / createActionBox / createErrorBox），每个 12 行，`background: linear-gradient(...)` 颜色是品牌视觉资产 4 套独立语义，参数化反而让调用面 `createBox({ variant: 'success', title, content })` 比直接 `createSuccessBox(title, content)` 长。V4 评估有效。 |
| **操作 G**：`i18n-iso-countries` 进一步按需                                          | `next.config.js` 已在 `experimental.optimizePackageImports` 中，next 编译期会做 tree-shake；JSON locale 文件（en/uk/zh）由 `CountrySelect.tsx` 静态 import 后通过 `countries.registerLocale()` 一次性注册，是 i18n-iso-countries 推荐用法。无优化空间。 |
| **操作 G**：`@vercel/analytics` 是否需要                                             | 已在 `app/[locale]/layout.tsx` 引入，是产品决策（cf. Vercel 后台分析）。无需评估替代。                                                                                                       |
| **操作 H**：16 处 `alt=""`                                                           | **不做**。逐一抽查后全是装饰性图（hero 背景 / footer 背景 / mosaic 内嵌装饰 / opengraph-image 内嵌图层），按 WCAG 2.1 装饰图规范 `alt=""` 是正确的（screen reader 跳过）。改成有意义 alt 反而生成无意义噪音。 |
| **操作 H**：139 处 `<button` 无 `aria-label`                                          | **不做**。绝大多数都有可见文字（`{t('submit')}` 或 `Save changes`），不需要 aria-label；少数 icon-only 按钮（CopyButton / 关闭 modal 的 ✕）实际已有 aria-label。grep 估算 139 是高估，实际缺失数 ≤ 5（如有也属个别），不值得专门一轮。 |
| **操作 I**：`(fullOrder.market_items as any)?.title_i18n`（webhook market route 行 312） | **不做**。Supabase 嵌套查询返回类型推断不准（`market_items(title_i18n)` 在 generated 类型里是 `null \| MarketItem[]`，单条查询时实际是单对象），且这是 webhook 关键路径，V4 已设为不动。等待 RPC 类型重新生成（V5-D-1）后一并消除。 |
| **操作 J**：webhook `sendXxxEmail` + `try/catch + log` 模板                          | **不做**。grep 统计：`wayforpay/route.ts` 内 2 处（paid email + refund email）+ `nowpayments/route.ts` 内 2 处（同样的 paid + refund）。每段 try/catch 体内日志 category 不同（`'WEBHOOK:WAYFORPAY'` vs `'WEBHOOK:NOWPAYMENTS'`），且邮件发送是 fire-and-forget 的关键容错点，错误处理逻辑不应集中（避免某个 webhook 的"已发送 + DB 写入"前后顺序被误抽象）。V4-A-5 抽了 payload 构造，剩下的 `await sendXxx(payload) + log + try/catch` 是合理的内联模板。 |
| **dynamic `BottomSheet` 包装**收敛                                                   | **不做**。仅 2 处使用：`DonatePageClient`（无 loading）和 `MarketItemDetail`（含 `loading: () => null`）。配置不一致，强行收敛会让其中一处行为变化。 |
| **`createServerClient` vs `createAuthClient` 函数级合并**                            | **部分做**（V5-A-4 仅抽 cookies adapter，不合并外层函数名）。两个函数名各自被 8+/5+ 文件 import，重命名涉及全仓改动；当前实现已通过 V5-A-4 cookies adapter 收敛了重复代码块。函数名留作语义入口（admin auth 走 `createAuthClient`、SSR 页面走 `createServerClient`）。 |
| **`lib/email/templates/transactional/*/content.ts` 的 6 个 `Record<Locale, ...>` 文件结构合并** | **不做**。每个文件对应一个邮件模板的 i18n 文案表，结构同构但字段定义不同（payment-success 有 `paymentMethod`、market-order-shipped 有 `tracking` 等），合并需要超长 union 类型，反而模糊。当前每个文件 30-80 行，单一职责清晰。 |
| **替换 `next.config.js` Sentry tunnelRoute 配置**                                    | **不做**。`/monitoring` rewrite 是绕过 ad-blocker 的标准做法，无优化空间。 |
| **`messages/{en,zh,ua}.json` schema 校验工具**                                       | **不做**。V4 用 Python 验证 786 个 key 完全对齐；当前没有自动化校验工具，但项目体量下手工对齐 + tsc 错误（next-intl 类型）已经够用。引入工具属基础设施投资，不在重构范围。 |
| **删除 `app/actions/admin.ts` 桥接文件**                                             | **不做**。V3-B-1 留下来的 12 行 re-export 桥接是 admin/* 拆分时的兼容层；删除会触发整个 components/admin/ 的 import 路径修改（`@/app/actions/admin` → `@/app/actions/admin/projects` 等），收益微小。 |

---

## 执行建议

### 推荐顺序（最低返工）

1. **先做死代码清理（极低风险，最大收益）**：
   - V5-A-1（queries.ts 8 死 export）
   - V5-A-2（action-utils.ts 删除）
   - 这两条独立 PR，型 check 通过即可
2. **再做类型迁移（V4-B 完成后的尾巴）**：
   - V5-A-3（Locale → AppLocale 完整迁移）
   - V5-C-1（`'en' | 'zh' | 'ua'` 字面量 → AppLocale）
   - 合 1 个 PR
3. **再做常量收敛（搬运式，UI 0 视觉变化）**：
   - V5-B-1（LOCALE_LABELS）
   - V5-B-2（CATEGORY_LABELS / ORDER）
   - V5-B-3（storage bucket 常量化）
   - V5-B-4（LazyImageLightbox）
   - 合 1 个 PR
4. **最后做 fallback 收敛 + cookies adapter**：
   - V5-B-5（NEXT_PUBLIC_APP_URL → BASE_URL）
   - V5-A-4（cookies adapter，需手动验证认证）
   - 各自独立 PR（A-4 涉及认证关键路径，单独 review）

### 每个 PR 的验证清单

- [ ] `npm run type-check` 通过
- [ ] `npm run lint` 全绿
- [ ] `npm run format:check` 通过
- [ ] `npm run build` 成功
- [ ] 手动 smoke：
  - 首页 / 捐赠流程 / 捐赠追踪
  - admin 项目页 / 捐赠页（项目创建 / 捐赠状态切换 / 文件上传 / 删除）
  - admin 义卖页（订单 + 商品 + 凭证上传）
  - 义卖商品详情页 / 买家订单页
  - **V5-A-4 专项**：admin 登录登出 + market 买家 OTP 登录登出，验证 cookie 读写
  - **V5-A-3 专项**：跑一遍 broadcast 邮件预览 + 三 locale 实际发送，确认收件人 reduce / locale group 不变
- [ ] 关键 className token / 字面量命中数（用 `rg "donation-results"` 等）拆分前后一致

### PR 拆分

- **PR-1**："V5 死代码清理"：V5-A-1 + V5-A-2（35 min）
- **PR-2**："V5 Locale → AppLocale 完整迁移"：V5-A-3 + V5-C-1（50 min）
- **PR-3**："V5 跨文件常量收敛"：V5-B-1 + V5-B-2 + V5-B-3 + V5-B-4 + V5-B-5（2 h）
- **PR-4**："V5 cookies adapter 抽出"：V5-A-4（45 min · 含手动认证流程验证）

---

## 完成后的预期效果

- **代码量**：估算净减少 ~280 LOC
  - V5-A-1 queries.ts 8 死 export -145
  - V5-A-2 action-utils.ts 删除 -28
  - V5-A-3 Locale 别名 + 17 处 import -14
  - V5-A-4 cookies adapter -20
  - V5-B-1 LOCALE_LABELS -10
  - V5-B-2 CATEGORY_* -16
  - V5-B-3 storage bucket -14
  - V5-B-4 LazyImageLightbox -14
  - V5-B-5 BASE_URL -10
  - V5-C-1 `'en' | 'zh' | 'ua'` -8
- **死代码消除**：
  - `lib/supabase/queries.ts` 从 10 export → 2 export
  - `lib/action-utils.ts` 整体删除
  - `lib/email/types.ts` deprecated `Locale` 别名删除
- **常量单点定义**：
  - `LOCALE_DISPLAY_NAMES`（broadcast UI）→ `lib/i18n-utils.ts`
  - `MARKET_ORDER_CATEGORIES` / `MARKET_ORDER_CATEGORY_LABELS` → `lib/market/market-categories.ts`
  - `STORAGE_BUCKETS` → `lib/supabase/storage-buckets.ts`
  - 7 处 `dynamic ImageLightbox` → 1 个 `LazyImageLightbox`
  - `BASE_URL` 取代 9 处字面量
- **类型一致性**：
  - 全仓 `'en' | 'zh' | 'ua'` 联合字面量仅在 `types/index.ts:VALID_LOCALES`（值定义）+ SubscriptionsTable（'all' 联合）；其余皆 `AppLocale`
  - `lib/email/` 内不再使用 deprecated `Locale` 别名
- **0 用户感知**：视觉、交互、文案、URL、API 响应字段、签名字节、orderReference 格式、状态机映射、邮件 payload 字段集合均不变
- **遗留候选项**（不在 V5 范围）：
  - V5-D-1：重新生成 `types/database.ts`（消除 `(service.rpc as any)`），需 supabase login + 人工验证 type-check 错误

---

## 元层面：V6 还可能存在哪些盲区？

V5 本轮覆盖了"操作 E/F/G/H/I"（V4 末尾的预设）+ 复跑 A-D。但 V6 之后可能还有这些维度：

- **操作 K**：**测试基建评估的具体执行**——V4-C-1 / V4-C-2 提议引入 vitest + husky pre-commit，但被标为"评估完成后单独立项"。V6 可能要把这一步落实，不光是评估而是真正引入。
- **操作 L**：**dependency 升级影响**——`next 15.5.15`、`react 19.2.5`、`@supabase/ssr 0.8.0` 等关键依赖版本是否到了下一 major？升级会带来什么 API 变化？V5 没扫。
- **操作 M**：**lib/email/templates 模板内 `Locale` 改完后，6 个 `content.ts` 的 `Record<AppLocale, XContent>` 字段对齐校验**——目前是手工对齐三种语言的字段，缺了某 locale 的某字段在运行时才会暴露 `undefined`。V6 可考虑加 type-level 完整性约束（exhaustive check）。
- **操作 N**：**SQL migration 文件版本号一致性 / chronological ordering**——`supabase/migrations/` 28 个文件，命名格式各异（`20260109` / `20260121` / `20260328` / `20260331_400000`），随着 V5 不动 migration 但下次新 migration 时可能产生命名歧义。
- **操作 O**：**runtime 环境变量校验**——目前 `process.env.X!` 模式遍布全仓（如 `NEXT_PUBLIC_SUPABASE_URL!`），缺失变量会在第一次访问时崩。可加启动时 `lib/env.ts` 用 zod 集中校验。
- **操作 P**：**性能预算 + bundle analyzer**——V1 P0 引入了 `dynamic` 拆分、V2 P2-4 加了 `optimizePackageImports`、V3 / V4 几次 dynamic + lazy。但**没有人运行过 next build 后的 chunk 大小分析**确认这些优化的实际效果。

V6 启动前应至少做一次 `ANALYZE=true npm run build` + bundle visualizer，确认 V1-V5 的体积优化目标真的达成。

---

## 变更记录

| 日期       | 任务 ID | 执行人 | 备注                                                                                                                                                            |
| ---------- | ------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-05-01 | —       | Claude | V5 初版（v1.0）创建 · 操作 E/F/G/H/I + 复跑 A-D 全仓扫描后整合 |
| 2026-05-02 | V5-A-1  | Claude | 删除 queries.ts 8 个死 export（225 → 63 行）|
| 2026-05-02 | V5-A-2  | Claude | 删除 lib/action-utils.ts（30 行孤儿基础设施）|
| 2026-05-02 | V5-A-3  | Claude | lib/email/types.ts 删 Locale 别名 + 全仓 17 处 → AppLocale；额外清理 subscription/email-broadcast 的 local Locale 别名 |
| 2026-05-02 | V5-A-4  | Claude | createAuthClient = createServerClient 别名（cookies adapter 不再重复）|
| 2026-05-02 | V5-B-1  | Claude | LOCALE_DISPLAY_NAMES 抽到 lib/i18n-utils.ts；BroadcastSendForm/PreviewView 各减 4 行 |
| 2026-05-02 | V5-B-2  | Claude | 新建 lib/market/market-categories.ts 收敛 5 处 CATEGORY_LABELS/CATEGORY_ORDER + market-order-files.ts 内的 CATEGORIES 与 inline `['shipping', 'completion']` |
| 2026-05-02 | V5-B-3  | Claude | 新建 lib/supabase/storage-buckets.ts；20 处 'donation-results' + 1 处 'market-order-results' 全部收敛到 STORAGE_BUCKETS |
| 2026-05-02 | V5-B-4  | Claude | 新建 components/common/LazyImageLightbox.tsx；7 处 dynamic 包装收敛 |
| 2026-05-02 | V5-B-5  | Claude | 9 处 NEXT_PUBLIC_APP_URL fallback + lib/email/config.ts websiteUrl 收敛到 BASE_URL |
| 2026-05-02 | V5-C-1  | Claude | 5 处 `'en' \| 'zh' \| 'ua'` 联合字面量 → AppLocale（queries.ts 一处随 V5-A-1 自动消失，剩 5 处迁移）|
