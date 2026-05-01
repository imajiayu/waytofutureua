# 重构计划 V2 · 增量优化

> **接续**：本文档承接 `REFACTOR_PLAN.md`（V1 的 P0/P1/P2 已全部完成）。
> V2 通过对全仓重新扫描（components/、app/actions/、lib/、public/、配置文件），找出 V1 遗漏或当时认为收益不足、现在重新评估值得做的优化点。
>
> **底线**：所有改动 **0 视觉变化、0 业务行为变化**——纯逻辑收敛、类型安全、性能微调。
>
> **范围调整（与 V1 不同）**：
>
> 本次**全部纳入**——包括关键支付路径：
>
> - 支付组件：`DonationFormCard` / `WayForPayWidget` / `NowPaymentsWidget` / `MarketPaymentWidget`（V2-E）
> - 支付库与 webhook：`lib/payment/wayforpay/`、`lib/payment/nowpayments/`、`lib/market/wayforpay.ts`、`app/api/webhooks/*`、`app/actions/donation.ts` 与 `market-sale.ts` 的支付段落（V2-F）
>
> **关键路径任务的硬性约束**（适用于 V2-E / V2-F 所有任务）：
>
> 1. **签名字节级一致**：HMAC 输入字符串拼接顺序、字段集合、digest 编码（hex/base64）一字节都不许变。每条修改签名相关代码的任务都要求**对照原值生成单元测试**（输入 → 期望 hex），refactor 后跑测试通过才算 done。
> 2. **状态机映射不变**：WayForPay/NowPayments 状态码 → 内部 `DonationStatus` / `MarketOrderStatus` 的映射表保持原样；任何 case 都不许新增或删除。
> 3. **webhook 响应格式不变**：返回签名、时间戳、JSON 结构与目前完全一致（WayForPay 对响应签名敏感）。
> 4. **不动 widget 内部回调函数体**：`onApproved` / `onDeclined` / `onPending` 内部代码保持原样（即便签名上有 `any` 也不在本次类型治理范围）。
> 5. **不动支付提交三函数**：`handleSubmit`、`handlePaymentMethodSelect`、`handleCryptoSelect` 内部代码（含 fire-and-forget newsletter、`activeProjectIdRef` 过期响应丢弃）。
>
> **进度追踪约定**：每条任务有唯一 ID。完成后将 `- [ ]` 改为 `- [x]`，并在末尾"变更记录"追加一行。
>
> **文档版本**：1.0 · 创建：2026-04-30

---

## 总览

| 优先级            | 主题                                                  | 任务数 | 预估总工时 |
| ----------------- | ----------------------------------------------------- | ------ | ---------- |
| **V2-A** 高价值   | 重复模式收敛（hooks / utils / 共享组件）              | 5      | 6-8 h      |
| **V2-B** 类型安全 | deprecated 迁移 + `as any` 收敛                       | 3      | 1.5 h      |
| **V2-C** 性能微调 | 邮件并行 / 远程图片源 / 图片属性 / 客户端组件按需加载 | 4      | 2 h        |
| **V2-D** 代码组织 | DTO 集中 / RPC 类型守卫                               | 2      | 2 h        |
| **V2-E** 巨型拆分 | DonationFormCard 1430 行 + 3 个 widget 拆分           | 5      | 10-14 h    |
| **V2-F** 关键路径 | 支付 actions / lib / webhook 重复收敛                 | 5      | 8-12 h     |

---

## V2-A · 重复模式收敛

### V2-A-1 · 抽 `useAsyncForm` hook（admin modal 表单提交骨架）

- [x] **背景**：5 个 admin modal 重复 `loading / error / handleSubmit + try/catch + finally` 三件套
- **位置**：
  - `components/admin/ProjectEditModal.tsx:27-30`
  - `components/admin/ProjectCreateModal.tsx`
  - `components/admin/MarketItemEditModal.tsx:29-32`
  - `components/admin/MarketItemCreateModal.tsx`
  - `components/admin/BatchDonationEditModal.tsx:34-37`
- **动作**：
  1. 新建 `lib/hooks/useAsyncForm.ts`：
     ```ts
     export function useAsyncForm<T>(submit: (data: T) => Promise<void>) {
       const [loading, setLoading] = useState(false)
       const [error, setError] = useState('')
       const onSubmit = async (data: T, e?: React.FormEvent) => {
         e?.preventDefault()
         setError('')
         setLoading(true)
         try {
           await submit(data)
         } catch (err) {
           setError(err instanceof Error ? err.message : 'Operation failed')
         } finally {
           setLoading(false)
         }
       }
       return { loading, error, onSubmit, setError }
     }
     ```
  2. 5 个 modal 替换内联实现，行数预计每个 -10 行
- **验收**：5 个 modal 都改用 hook；type-check 通过；手动 smoke 验证表单成功/失败/loading 三态展示一致
- **风险**：低（纯逻辑提取，错误信息文案不变）
- **工作量**：1.5 h

---

### V2-A-2 · 抽 `<FileUploadInputPanel>` 共享上传 UI

- [x] **背景**：`DonationFileLibrary` 与 `MarketOrderFileLibrary` 的 "Upload New Files" 区段（input + 文件列表 + 进度条 + 按钮 + 提示）几乎逐字重复
- **位置**：
  - `components/admin/donation/DonationFileLibrary.tsx:82-148`
  - `components/admin/market-order/MarketOrderFileLibrary.tsx:77-138`
- **动作**：
  1. 新建 `components/admin/ui/FileUploadInputPanel.tsx`，props：`{ accept, files, uploading, uploadProgress, multiple, onChange, onUpload, fileInputRef, hint, extras? }`
  2. `extras` slot 用于 Donation 的 face-blur checkbox 和 MarketOrder 的 category select（差异部分外置）
  3. 两个 Library 组件改用此面板
- **验收**：UI 像素级一致（包括 mobile/desktop）；上传流程 3 态（idle/uploading/done）行为不变
- **风险**：中（组件 props 设计需要包容两类差异）
- **工作量**：2 h

---

### V2-A-3 · 抽 `<AdminButton>`（统一 admin 后台按钮样式）

- [x] **背景**：admin 后台 7+ 处重复 `rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50` 与对称的 cancel 按钮
- **位置**（蓝色 primary）：ProjectEditModal、ProjectCreateModal、MarketItemEditModal、MarketItemCreateModal、BatchDonationEditModal、DonationStatusSection、MarketOrderStatusSection
- **动作**：
  1. 新建 `components/admin/ui/AdminButton.tsx`：`variant: 'primary' | 'secondary' | 'success' | 'danger'`，`size: 'sm' | 'md'`
  2. 7 处 inline className 替换为 `<AdminButton variant="primary">`
- **验收**：7 个 modal 的"提交/取消"按钮像素级一致；hover/disabled 行为不变
- **风险**：低（同一套样式集中化）
- **工作量**：1.5 h

---

### V2-A-4 · 抽 `useTableFilters` hook（admin 表格筛选）

- [x] **背景**：3 张 admin 表格重复 `useState(filter) + useMemo(filtered)` 模式
- **位置**：
  - `components/admin/DonationsTable.tsx:32-33`
  - `components/admin/MarketOrdersTable.tsx:25`
  - `components/admin/SubscriptionsTable.tsx:24-26`
- **动作**：新建 `lib/hooks/useTableFilters.ts`：
  ```ts
  export function useTableFilters<T, F>(
    data: T[],
    initial: F,
    predicate: (row: T, filters: F) => boolean
  ) {
    const [filters, setFilters] = useState(initial)
    const filtered = useMemo(() => data.filter((row) => predicate(row, filters)), [data, filters])
    return { filters, setFilters, filtered }
  }
  ```
- **验收**：3 张表筛选行为不变；type-check 通过
- **风险**：低
- **工作量**：1.5 h

---

### V2-A-5 · `withActionErrorHandler` Server Action 错误包装

- [x] **背景**：`app/actions/` 11 个文件共 48 处 `try/catch + logger.error + return { success: false, error }` 模板
- **位置**（统计 `try {` 出现次数）：
  - `admin.ts: 12` / `donation.ts: 6 (除支付段落)` / `market-admin.ts: 7` / `track-donation.ts: 5` / `email-broadcast.ts: 4` / `market-auth.ts: 4` / `market-sale.ts: 3 (除支付段落)` / `subscription.ts: 2` / `market-items.ts: 3` / `donation-result.ts: 1` / `email-history.ts: 1`
- **动作**：
  1. 新建 `lib/action-utils.ts`：
     ```ts
     export async function tryAction<T>(
       category: LogCategory,
       op: string,
       fn: () => Promise<T>
     ): Promise<{ success: true; data: T } | { success: false; error: string }> {
       try {
         return { success: true, data: await fn() }
       } catch (err) {
         logger.error(category, `${op} failed`, {
           error: err instanceof Error ? err.message : String(err),
         })
         return { success: false, error: 'Internal error' }
       }
     }
     ```
  2. **保守迁移**：仅替换"纯包装错误日志 + 通用错误返回"的简单 try/catch（约 30 处）；保留含业务分支返回（如带具体错误码、需要回滚副作用）的 try/catch
  3. **不强制 100% 迁移**——本次目标仅消除模板复制
- **验收**：错误日志格式不变；返回结构兼容现有调用方（`success: false, error: string`）
- **风险**：中（必须仔细 audit 每个 try/catch 是否真的"无业务分支"，避免吞掉特殊错误处理）
- **工作量**：2 h
- **注意**：跳过 `donation.ts` 与 `market-sale.ts` 的支付段落

---

## V2-B · 类型安全收敛

### V2-B-1 · 迁移剩余 deprecated i18n API

- [x] **背景**：`getProjectName / getLocation / getUnitName` 已 `@deprecated`，但 9 个文件仍在调用
- **位置**：
  - `app/[locale]/donate/DonatePageClient.tsx`
  - `app/[locale]/donate/success/DonationIdsList.tsx`
  - `app/[locale]/track-donation/components/RefundConfirmationDialog.tsx`
  - `app/[locale]/track-donation/components/OrderGroupCard.tsx`
  - `components/projects/ProjectCard.tsx`
  - `components/projects/shared/ProjectProgressSection.tsx`
  - `app/actions/donation.ts`（**仅非支付段落**）
  - **保留**：`components/donate-form/DonationFormCard.tsx`（支付排除区）、`lib/i18n-utils.ts`（定义本身）
- **动作**：批量替换为 `getTranslatedText(field_i18n, locale, fallback)`，输出文案完全一致
- **验收**：
  - `rg "getProjectName\(|getLocation\(|getUnitName\(" -g '!components/donate-form/DonationFormCard.tsx' -g '!lib/i18n-utils.ts'` 0 命中
  - 三种语言下展示与重构前一致
- **风险**：极低（这三个函数实现就是 `getTranslatedText` 的薄壳）
- **工作量**：30 min

---

### V2-B-2 · 收敛剩余 `as any`（非支付区）

- [x] **背景**：扫描确认非支付区共 10 处 `as any`，其中 8 处可消除
- **位置**：
  | 文件 | 行 | 处理方式 |
  | --------------------------------------------------- | ----------------- | ------------------------------------------------------------------------------------------------- |
  | `app/[locale]/layout.tsx:109` | `locale as any` | 用 `isAppLocale(locale)` 守卫（已存在于 `types/index.ts`） |
  | `app/[locale]/market/success/page.tsx:165, 167` | `(order as any)` | 定义 `MarketOrderSuccessRow` 局部接口，或用 Database 类型 |
  | `app/[locale]/track-donation/track-donation-form.tsx:177` | `(result as any).status` | result 类型已知，去掉断言或加类型守卫 |
  | `app/actions/track-donation.ts:60, 119` | `(d: any)` | 定义 RPC 返回行接口（`get_donations_by_email_phone` 的 row 类型） |
  | `app/api/donations/order/[orderReference]/route.ts:51` | `(d: any)` | 同上，RPC 返回行接口 |
  | `app/actions/market-admin.ts:281` | `as any` | 用类型守卫缩窄 `fullOrder.market_items` |
  | `components/admin/SubscriptionsTable.tsx:119, 131` | `as any` | 改为 `as typeof filter` / select 值字面量联合类型 |
  | **保留**：`app/actions/market-sale.ts:79` `(service.rpc as any)` | — | 等待 Supabase 类型重新生成（迁移部署后） |
  | **保留**：`lib/supabase/queries.ts:171` `@ts-expect-error` | — | 同上 |
- **动作**：逐处替换；优先做 layout.tsx 与 SubscriptionsTable（最简单）
- **验收**：非支付区 `as any` 计数从 10 → 2（仅剩 RPC 类型相关）
- **风险**：低
- **工作量**：45 min

---

### V2-B-3 · 定义 RPC 返回行 DTO（消除多处 `(d: any)`）

- [x] **背景**：`get_donations_by_email_phone` RPC 在 3 处用 `(d: any)`（V2-B-2 中提到）
- **动作**：
  1. 在 `types/dtos.ts`（新建）或 `types/index.ts` 加：
     ```ts
     export interface DonationByContactRow {
       donation_id: string
       donation_public_id: string
       order_reference: string
       project_id: number
       amount: number
       currency: string
       status: DonationStatus
       created_at: string
       project_name_i18n: Record<string, string>
       // ... 按 RPC SQL 的 RETURNS TABLE 列出
     }
     ```
  2. 三处调用方都用此类型替代 `(d: any)`
- **验收**：3 处 `as any` 消除；type-check 通过
- **风险**：低（DTO 必须与 PL/pgSQL 函数 RETURNS TABLE 一致——通过对照 migration 文件验证）
- **工作量**：30 min

---

## V2-C · 性能微调

### V2-C-1 · `email-broadcast.ts` 多 locale 串行 → 并行

- [x] **位置**：`app/actions/email-broadcast.ts:121` 附近
- **背景**：循环按 locale 调 `sendBroadcastEmail()`，每次内部多次 await Resend；订阅者多时累积延迟显著
- **动作**：
  ```ts
  await Promise.all(
    locales.map((locale) => sendBroadcastEmail({ ..., locale }))
  )
  ```
- **风险**：极低（locale 间无数据依赖；Resend API 支持并发）
- **验收**：手动触发 broadcast 验证多 locale 都收到邮件；时间相比串行明显减少
- **工作量**：15 min

---

### V2-C-2 · `next.config.js` 加 Cloudinary 远程图片源

- [x] **位置**：`next.config.js` 的 `images.remotePatterns`
- **背景**：`lib/cloudinary.ts` 已在用 `res.cloudinary.com`，但 next.config remotePatterns 没列出，未来用 `<Image src="https://res.cloudinary.com/...">` 会报错
- **动作**：加入：
  ```js
  { protocol: 'https', hostname: 'res.cloudinary.com', pathname: '/**' }
  ```
- **不做**：本次**不**批量迁移 `public/images/` 到 Cloudinary（68 MB 资源迁移工作量大、需评估流量收益、可能影响 LCP，单独立项）
- **验收**：build 通过；`<Image>` 引用 cloudinary URL 不再报错
- **风险**：极低
- **工作量**：5 min

---

### V2-C-3 · Footer / 首页关键图片补 `sizes` 属性

- [x] **位置**（决定**跳过**，详见变更记录）：`components/layout/Footer.tsx`（footer.webp 438 KB / footer-mobile.webp 212 KB）
- **背景**：缺 `sizes` 时 Next.js 用默认 `100vw`，desktop 端会下发不必要高分辨率
- **动作**：加 `sizes="(max-width: 768px) 100vw, 60vw"`（按实际占位调整）
- **验收**：DevTools Network 检查响应式图片源选择正确
- **风险**：低（仅影响响应式 srcset 选择）
- **工作量**：15 min

---

### V2-C-4 · `PaymentMethodSelector` / `CryptoSelector` 评估按需加载

- [x] **位置**（决定**跳过**，详见变更记录）：`components/donate-form/PaymentMethodSelector.tsx`、`CryptoSelector.tsx`
- **背景**：用户进入 donate 页就加载这两个 client 组件，但只在表单进入支付步骤后渲染
- **动作**：**先做实测再决定**——
  1. `npm run build`，看这两个组件占 chunk 大小
  2. 若 > 5 KB gzipped 则用 `next/dynamic` 包装；否则**跳过**（dynamic 本身有 wrapper 开销）
- **验收**：根据实测决定；记录决策到变更记录
- **风险**：低（dynamic import 不影响功能，仅时序）
- **工作量**：30 min（含实测）
- **注意**：本任务靠近支付排除区，**只改 import 方式，不动任何业务逻辑**

---

## V2-D · 代码组织

### V2-D-1 · `types/dtos.ts` 集中 Action / API 返回类型

- [x] **背景**：`app/actions/admin.ts:20-23` 局部声明 `type Donation`、`market-order.ts` 声明 `BuyerMarketOrder`、`market-admin.ts` 散落多处类型扩展
- **动作**：
  1. 新建 `types/dtos.ts`，集中：
     - `AdminDonationListItem`（含 projects 嵌套）
     - `BuyerMarketOrder` / `AdminMarketOrder`
     - `DonationByContactRow`（V2-B-3）
     - `ProjectStatsRow`
  2. action 文件改为 `import type { ... } from '@/types/dtos'`
- **验收**：action 文件不再 inline 声明业务 DTO；type-check 通过
- **风险**：低
- **工作量**：1 h
- **注意**：不动 `types/index.ts` 中的 DB 行类型（来自 `database.ts` 派生）

---

### V2-D-2 · 评估 `revalidatePath('/[locale]', 'page')` 能否收敛

- [x] **位置**（决定**跳过**，详见变更记录）：`app/actions/admin.ts:89, 123`
- **背景**：`revalidatePath('/[locale]', 'page')` 重验所有 locale × page，包含 market 等无关页面；`revalidateTag` 更精准
- **动作**：
  1. **审计**：检查 `lib/supabase/queries.ts` 中的 fetch 是否用了 tag（如 `next: { tags: ['projects'] }`）
  2. 若已有 tag：把 `admin.ts` 的 `revalidatePath('/[locale]', 'page')` 替换为 `revalidateTag('projects')` / `revalidateTag('donations')`
  3. 若没有 tag：**跳过**（重构会改 fetch 调用面，超出本次范围）
- **验收**：根据审计结果决定；记录到变更记录
- **风险**：中（tag 若漏了任何一个 fetch 调用方，会导致缓存不刷新）
- **工作量**：30 min（仅审计）+ 30 min（如执行）

---

## V2-E · 支付相关巨型组件拆分

> **黄金法则**（每条任务都适用）：
>
> 1. **搬运式拆分**：父→子的 className 字符串、props 顺序、JSX 结构 1:1 复制。`rg` 验证 className 字面量出现次数不变。
> 2. **状态机不变**：`processingState`、`paymentParams`、`cryptoPaymentData`、`activeProjectIdRef` 等状态字段名、类型、转换图保持不变；ref 不能从父组件迁出。
> 3. **不动支付提交三函数**：`handleSubmit`、`handlePaymentMethodSelect`、`handleCryptoSelect` 内部代码一行不改（包括 fire-and-forget 的 newsletter 订阅、`activeProjectIdRef.current !== requestProjectId` 过期响应丢弃逻辑）。
> 4. **不动 widget 内部回调**：`onApproved` / `onDeclined` / `onPending` 函数体保持原样（即便参数 `any` 也不在本次治理范围）。
> 5. **手动 smoke**：所有 5 个项目的捐赠流（unit-based × 4 + aggregated × 1）+ 义卖订单流 × 1 + 加密货币流 × 1，三种 locale 各跑一遍至 widget 加载（不必真实付款）。

---

### V2-E-1 · 拆 `DonationFormCard.tsx` 表单 UI（1430 → ~600 行）

- [x] **位置**：`components/donate-form/DonationFormCard.tsx`
- **背景**：1430 行单文件，其中 form JSX 占约 600 行（行 793-1399），`PaymentWidgetContainer` 内部子组件占 150 行（行 55-204），主组件 state/handler 占约 200 行
- **拆分方案**（仅拆 UI 与配套常量，**不拆**支付提交逻辑）：

  | 抽出文件                                                          | 行数 | 包含内容                                                                                               |
  | ----------------------------------------------------------------- | ---- | ------------------------------------------------------------------------------------------------------ |
  | `components/donate-form/sections/AmountQuantitySection.tsx`       | ~190 | 聚合项目（amount input + quick options）+ 单位项目（quantity input + quick options），均含字段错误展示 |
  | `components/donate-form/sections/TipSection.tsx`                  | ~135 | tip 标题、康复中心介绍卡片、quick options、input、感谢提示                                             |
  | `components/donate-form/sections/TotalSummarySection.tsx`         | ~55  | 包含 breakdown 与 total ref（用于错误聚焦）                                                            |
  | `components/donate-form/sections/DonorInfoSection.tsx`            | ~95  | name + email 两个字段（含 ref 转发）                                                                   |
  | `components/donate-form/sections/ContactMethodsSection.tsx`       | ~50  | telegram + whatsapp 两个 optional 字段                                                                 |
  | `components/donate-form/sections/MessageAndNewsletterSection.tsx` | ~50  | message textarea + newsletter checkbox                                                                 |
  | `components/donate-form/sections/SubmitSection.tsx`               | ~30  | 提交按钮 + network notice                                                                              |
  | `components/donate-form/sections/ProjectInactiveOverlay.tsx`      | ~30  | 项目未激活时的全卡覆盖层                                                                               |
  | `components/donate-form/sections/EmptyProjectSelected.tsx`        | ~30  | 未选择项目的占位 UI                                                                                    |
  | `components/donate-form/PaymentStateView.tsx`                     | ~150 | 当前 `PaymentWidgetContainer` 内部组件（creating / error 子状态视图）                                  |
  | `components/donate-form/sections/types.ts`                        | ~30  | `FieldKey` 类型 + 共享 props 接口                                                                      |

- **每个 section 的 props 设计原则**：
  - 接收**最小必要 state**（值 + setter + 错误对象 + ref + clearFieldError 回调）
  - **不下沉** validateForm、handleSubmit、handlePaymentMethodSelect 等业务逻辑
  - className 字符串**一字不改**（用 `rg "rounded-lg border border-ukraine-blue-200"` 等关键串验证拆分前后命中数相同）
- **保留在主文件的内容**（约 400 行）：
  - state declarations + ref declarations
  - `useEffect` 重置项目相关字段
  - `clampAmount`、`showFieldError`、`clearFieldError`、`scrollToFormArea`、`validateForm`
  - `handleSubmit`、`handlePaymentMethodSelect`、`handleCryptoSelect`、`handleBack`、`handleBackToMethodSelect`
  - 主返回的 3 分支条件渲染（widget 模式 / no-project / 表单模式）
- **验收**：
  - 主文件 ≤ 450 行
  - `rg "ukraine-blue-500"` 拆前/拆后命中数完全一致
  - type-check / lint / format 全过
  - 三种 locale × 5 个项目（含 aggregated 1 个）手动跑一遍：选金额/数量、填资料、点提交、看到 PaymentMethodSelector → 不点击 confirm（避免触发真实支付）
  - 验证字段错误聚焦行为：故意留空 name → 提交 → 期望视图自动滚动至 name 字段并 focus
  - 验证项目切换：切换项目时所有字段重置（包括 fieldErrors）
- **风险**：中（拆分项多但每项都是单纯搬运）
- **工作量**：4 h（含手动验证）
- **不做**：不抽 `useDonationForm` hook—— state 与 handler 高度耦合（`activeProjectIdRef` + `setProcessingState` 在异步回调内交错使用），抽 hook 反而复杂化。**保留组件内的 useState 集中管理**。

---

### V2-E-2 · 抽 `useWayForPayWidgetLifecycle` hook（去掉 WayForPay/Market 两 widget 的 ~70% 重复）

- [x] **位置**：`components/donate-form/widgets/WayForPayWidget.tsx`（470 行）+ `components/market/MarketPaymentWidget.tsx`（482 行）
- **背景**：通过 `rg` 对比函数签名，两个 widget 内部的以下函数同名同结构：
  - `isMobile()`、`handleWindowError`、`checkWidgetOpened`、`loadWayForPayScript`、`initializeWidget`、`doEarlyCheck`
  - 多个 ref（`scriptLoadedRef`、`hasRedirectedRef`、`widgetOpenedRef`、`widgetEverDetectedRef`、`widgetCheckCompletedRef`、`markedAsFailedRef`、`scriptLoadTimeoutRef`、`widgetOpenCheckTimeoutRef`、`earlyDetectionIntervalRef`）—— 9 个 ref 完全一致
  - 错误状态机（`isLoading` / `error` / `isRedirecting`）一致
- **唯一差异**：
  - `markAsFailed` 调用的 server action 不同（`markDonationWidgetFailed` vs market 版本）
  - 日志 category 不同（`'WIDGET:WAYFORPAY'` vs `'WIDGET:MARKET'`）
  - 跳转 URL 模板可能不同（需对比确认）
  - `onApproved` / `onDeclined` / `onPending` 内部回调不同（**保持不动**，从 widget 组件外部传入）
- **拆分方案**：
  1. 新建 `lib/hooks/useWayForPayWidgetLifecycle.ts`，封装：
     ```ts
     interface Options {
       paymentParams: {
         orderReference: string
         returnUrl: string
         currency: string
         [k: string]: unknown
       }
       markAsFailed: (reason: string) => Promise<void> // 由调用方注入
       onApproved: (response: any) => void // 由调用方注入（保持原 any）
       onDeclined: (response: any) => void
       onPending: (response: any) => void
       logCategory: 'WIDGET:WAYFORPAY' | 'WIDGET:MARKET'
     }
     export function useWayForPayWidgetLifecycle(options: Options): {
       isLoading: boolean
       error: string | null
       isRedirecting: boolean
       containerRef: React.RefObject<HTMLDivElement>
     }
     ```
  2. 内部包含：所有 ref、useEffect 生命周期、`isMobile`、`checkWidgetOpened`、`loadWayForPayScript`、`initializeWidget`、`doEarlyCheck`、`markAsFailed` 包装、`handleWindowError` 监听器
  3. 两个 widget 组件瘦身为：
     - 调 hook 拿状态
     - 渲染 loading / error / iframe 容器 UI（这部分各自有差异）
     - 接收并向 hook 注入 `markDonationWidgetFailed` / `markMarketOrderWidgetFailed`
- **验收**：
  - WayForPayWidget ≤ 180 行；MarketPaymentWidget ≤ 180 行
  - hook 文件 ≤ 350 行
  - 关键 console/logger 输出格式 1:1 一致（`grep "Marking as widget_load_failed"` 调用面不变）
  - 手动验证：捐赠流 + 义卖流分别走到 widget 加载阶段，确认 widget 正常打开/失败检测/超时标记仍工作
- **风险**：**高**（涉及多个 ref + 异步事件 + setTimeout/setInterval 时序，必须 1:1 复制行为）
- **工作量**：5 h（其中 2 h 手动验证 widget 加载/失败/重试边界）
- **不做事项**：
  - **不动** `onApproved` / `onDeclined` / `onPending` 内部代码（保留 widget 组件级注入）
  - **不动** `markDonationWidgetFailed` / `markMarketOrderWidgetFailed` action 调用面
  - **不合并** 两个 widget 的 UI 层（外壳 UI 文案、按钮、路由跳转有差异，强行合并会损失语义）

---

### V2-E-3 · 替换 `NowPaymentsWidget.tsx` 内的 inline `CopyButton` 为全局 `components/common/CopyButton`

- [x] **位置**（决定**跳过**，详见变更记录）：`components/donate-form/widgets/NowPaymentsWidget.tsx:18-61`（行 18-61 内联定义了 CopyButton）
- **背景**：`components/common/CopyButton.tsx` 已存在；NowPaymentsWidget 内的实现是早期 P0/P1 之前的产物
- **动作**：
  1. **先对照**两者的 className、icon、文案、动画时长是否完全一致：
     - 全局版的 className 配色与"emerald-100/700"是否相同
     - 复制成功后 reset 时间是否都是 2000ms
     - 翻译键是否都用 `addressCopied`
  2. **若一致**：直接删除 inline 实现，import 全局 `CopyButton`
  3. **若有差异**：
     - 评估差异是否会影响用户视觉（颜色、icon 大小、间距）
     - 若差异大：**跳过**本任务（保留两份；记录到变更记录"差异性故意保留"）
     - 若差异小（如 padding 1px）：以全局版为准，记录文案/视觉微调（需用户确认）
- **验收**：
  - 切换至加密货币流，复制地址按钮行为不变（点击 → "已复制" → 2 秒后还原）
  - NowPaymentsWidget 行数减少 ~45 行
- **风险**：低（前提是先做对照）
- **工作量**：30 min（含对照 + 验证）
- **可能跳过**：若两者样式差异显著（早期产品不同视觉语言），保留 inline 实现；本任务结果记入变更记录即可

---

### V2-E-4 · 抽 `formatCountdown` + `StatusIndicator` 子组件出独立文件（NowPaymentsWidget 内部清理）

- [x] **位置**：`components/donate-form/widgets/NowPaymentsWidget.tsx`
  - `formatCountdown`（行 64-70，纯函数）
  - `StatusIndicator`（行 73-~170，约 100 行的 UI 组件含 `statusConfig` 大对象）
- **动作**：
  1. `lib/payment/format-countdown.ts` 容纳 `formatCountdown`（纯工具函数）
  2. `components/donate-form/widgets/CryptoStatusIndicator.tsx` 容纳 `StatusIndicator`
  3. NowPaymentsWidget 主组件 import 使用
- **验收**：
  - NowPaymentsWidget 主文件 ≤ 250 行（拆掉 ~150 行后；E-3 进一步 -45 行）
  - 加密货币流的状态显示（waiting / confirming / confirmed / failed / expired 等）展示完全一致
- **风险**：极低（纯展示组件 + 纯函数）
- **工作量**：30 min
- **注意**：不动 `statusConfig` 对象的内容，原样搬运

---

### V2-E-5 · `DonationFormCard` 内的 `PaymentWidgetContainer` 抽出独立文件

- [x] **位置**：`components/donate-form/DonationFormCard.tsx:55-204`（150 行的内部子组件）
- **背景**：当前是 file-local function；拆出后职责清晰、便于阅读
- **动作**：
  1. 新建 `components/donate-form/PaymentStateView.tsx`，导出 `default function PaymentStateView({ processingState, paymentParams, amount, locale, error, onBack })`
  2. 父组件 import 使用
  3. 与 V2-E-1 合并为同一 PR（同属拆分 DonationFormCard）
- **验收**：
  - creating / error 两态视图渲染像素级一致
  - rendered className `'rounded-lg border border-ukraine-blue-200'` 等关键 token 出现次数不变
- **风险**：极低（已是局部纯函数）
- **工作量**：15 min（与 E-1 合并 PR）

---

### V2-E 任务总览与执行顺序

| 任务 | 依赖                 | 视觉风险 | 行为风险 | 工作量 |
| ---- | -------------------- | -------- | -------- | ------ |
| E-5  | 无                   | 0        | 极低     | 15 min |
| E-1  | 含 E-5               | 0        | 中       | 4 h    |
| E-3  | 无（依赖 V1 完成度） | 0~低     | 极低     | 30 min |
| E-4  | 无                   | 0        | 极低     | 30 min |
| E-2  | 建议最后做           | 0        | **高**   | 5 h    |

**推荐 PR 拆分**：

- PR-1（DonationFormCard 拆分）：E-5 + E-1 一起
- PR-2（NowPayments 清理）：E-3 + E-4
- PR-3（widget lifecycle hook）：E-2 单独 —— 必须**完整 widget 流测试**（含真实支付沙箱环境，若有）

---

## V2-F · 关键路径（支付 actions / lib / webhook）

> **前置工作**（每个 V2-F 任务都要做一遍）：
>
> 1. 在 `__tests__/payment-snapshot/` 下记录当前签名/响应格式的 fixture（输入 → 期望 HMAC hex），重构后跑 fixture 验证。
> 2. 改动签名相关行 → 必须用 git 比对 HMAC 输入字符串的拼接，确认拼接顺序、分隔符（如逗号、分号、空格）一字节不变。
> 3. 任务完成的"验收"项必须包含：**实际触发一次 sandbox 支付**（如 WayForPay test mode）+ **手动构造 webhook 请求**（用历史日志中真实 payload 重放）。

---

### V2-F-1 · `createWayForPayDonation` 与 `createNowPaymentsDonation` 共享前置逻辑抽出

- [x] **位置**：`app/actions/donation.ts:112-424`（createWayForPayDonation, 312 行）+ `app/actions/donation.ts:459-753`（createNowPaymentsDonation, 294 行）
- **背景**：两函数前置流程几乎相同——
  - 输入校验（Zod）
  - 项目存在性检查 + 状态检查
  - 单价/金额计算（aggregated vs unit-based 两种）
  - 库存/上限检查（`createQuantityExceededError` / `createAmountLimitExceededError`）
  - 创建 donation 数据库记录（含 project_id、quantity、amount、donor 信息、tip、locale）
  - 拉取 `allProjectsStats` 用于客户端更新
  - **差异**：仅最后"生成 payment params" 部分不同（WayForPay 走 `createWayForPayPayment`、NowPayments 走 `createNowPaymentsPayment`）
- **拆分方案**：
  1. 新建 `app/actions/donation/_shared.ts`：

     ```ts
     export interface DonationCreationInput {
       /* 共同字段 */
     }
     export interface DonationCreationContext {
       project: ProjectStats
       calculatedAmount: number
       calculatedQuantity: number
       donationRecords: DonationRow[] // 已写入 DB 的行
       orderReference: string
       allProjectsStats: ProjectStats[]
     }
     export type DonationCreationError =
       | { error: 'quantity_exceeded'; remainingUnits: number }
       | { error: 'amount_limit_exceeded'; maxQuantity: number }
       | { error: 'project_not_found' }
       | { error: 'project_not_active' }
       | { error: 'validation_error'; details: string }

     export async function prepareDonationContext(
       input: DonationCreationInput
     ): Promise<
       { ok: true; ctx: DonationCreationContext } | ({ ok: false } & DonationCreationError)
     >
     ```

  2. `createWayForPayDonation` 与 `createNowPaymentsDonation` 改为：
     ```ts
     const result = await prepareDonationContext(input)
     if (!result.ok) return { success: false, ...result }
     // 各自调用 createWayForPayPayment / createNowPaymentsPayment 生成 payment params
     return { success: true, paymentParams/paymentData, allProjectsStats: result.ctx.allProjectsStats }
     ```
  3. **不动**：`createWayForPayPayment` / `createNowPaymentsPayment` 调用面（包括传参顺序、字段值），仅前置准备阶段共享
  4. **不动**：DB 写入的字段集合、orderReference 生成规则、tip_donation 处理（如果是单独 donation row）

- **验收**：
  - 两个函数主体各自 ≤ 80 行
  - 三种错误类型（`quantity_exceeded` / `amount_limit_exceeded` / `project_not_found`）的客户端响应字段完全一致
  - 沙箱实测：法币支付 + 加密支付各跑一遍，确认 donation 记录字段、status、order_reference 生成规则不变
- **风险**：**高**（涉及 5 个项目的 4 种项目类型组合：长期 × 聚合、长期 × 非聚合、定期 × 聚合、定期 × 非聚合）
- **工作量**：4 h（含 fixture 测试）
- **不做**：不抽 `prepareDonationContext` 进 `lib/`——它依赖 supabase server client + zod schema，留在 `app/actions/` 边界更清晰。

---

### V2-F-2 · WayForPay 签名相关函数的辅助层共享（**仅辅助函数，不动签名公式**）

- [ ] **位置**：`lib/payment/wayforpay/server.ts`
- **背景**：5 个签名相关函数：
  - `generateSignature(values: (string|number)[])` — payment params 签名
  - `generateWebhookResponseSignature(...)` — 响应签名
  - `verifyWayForPaySignature(body, sig)` — 入站验签
  - `verifyRefundResponseSignature(...)` — 退款响应验签
  - `createWayForPayRefund` — 退款请求（内部含签名）
- **观察**：
  - 它们都用同一份 HMAC-MD5 + secret_key + ';' join 模式
  - 但输入字段集合、拼接顺序各不同（这是 WayForPay 协议规定，不能动）
- **动作**（**保守**改造）：
  1. 抽一个**底层 helper**（不暴露 export）：
     ```ts
     function hmacMd5Concat(secret: string, parts: (string | number)[], joiner = ';'): string {
       const concatString = parts.join(joiner)
       return crypto.createHmac('md5', secret).update(concatString).digest('hex')
     }
     ```
  2. 现有 5 个函数改为调 `hmacMd5Concat`，但**字段集合 + 顺序保持原样不动**
  3. **不合并** generateSignature 和 generateWebhookResponseSignature——它们的字段不同，强行参数化反而模糊
  4. **不动** WAYFORPAY_STATUS 常量
- **验收**：
  - 准备 fixture：3-5 组真实 payment params（脱敏）+ 期望 HMAC hex；refactor 后所有 fixture 通过
  - 用 git diff 检查每个函数体——**HMAC.update(string) 的 string 拼接结果必须与重构前 byte-equal**
  - 沙箱实测：发起一次 WayForPay test 支付 + 收一次 webhook，确认验签通过
- **风险**：**高**（错一个分隔符 → 全站支付崩溃）
- **工作量**：1.5 h（30 min 实现 + 1 h 测试）
- **可能跳过**：若实施时发现底层 helper 收益太小（HMAC-MD5 一行就能写完），评估后保留 5 个函数各自的实现，**仅做注释优化**——记录到变更记录

---

### V2-F-3 · `wayforpay/route.ts` 与 `wayforpay-market/route.ts` 共享框架抽出

- [x] **位置**：`app/api/webhooks/wayforpay/route.ts`（293 行）+ `app/api/webhooks/wayforpay-market/route.ts`（372 行）
- **背景**：两个 webhook 共享框架代码——
  - 入口 `POST(req)` + `req.json()`
  - `verifyWayForPaySignature` 校验
  - 失败时返回 `{ error: 'Invalid signature' }, 400`
  - 状态码映射 switch（虽然 case 集合略有差异）
  - `respondWithAccept(orderReference)`：返回响应签名 + 时间（两文件分别在 289、368 行实现，函数体可能完全相同）
- **拆分方案**：
  1. **先 diff 两个 `respondWithAccept`**：用 `diff app/api/webhooks/wayforpay/route.ts app/api/webhooks/wayforpay-market/route.ts` 比对函数体；若一致 → 抽 `lib/payment/wayforpay/webhook-response.ts`
  2. 抽 `lib/payment/wayforpay/webhook-handler.ts`：
     ```ts
     export async function parseAndVerifyWayForPayWebhook(
       req: Request
     ): Promise<{ ok: true; body: WayForPayWebhookBody } | { ok: false; response: NextResponse }>
     ```
     封装：JSON parse + 签名验证 + 失败响应（400）
  3. 两个 route 主体改为：
     ```ts
     const result = await parseAndVerifyWayForPayWebhook(req)
     if (!result.ok) return result.response
     // 从这里开始 donation / market 各自处理状态映射 + DB 更新 + 邮件发送
     ```
  4. **不动**：状态映射 switch 的 case 集合、DB 更新字段、邮件发送时机
- **验收**：
  - 两个 route 主体减少约 60-80 行
  - 用历史 webhook 日志中的真实 payload 重放（curl POST），验证 signed/declined/pending/refunded 四种状态都能正确处理
  - `respondWithAccept` 输出的响应签名与重构前 byte-equal
- **风险**：**中-高**（webhook 是回调路径，错了无法补救——支付状态会丢失）
- **工作量**：3 h（含真实 payload 重放测试）
- **不做**：
  - **不合并** market 与 donation 的状态机或 DB 更新逻辑——它们操作的是不同表、不同字段
  - **不优化** `nowpayments/route.ts`——它的 IPN 协议格式与 WayForPay 完全不同，强行抽象只会增加复杂度
  - **不动** `resend-inbound/route.ts`（420 行的入站邮件 webhook，与支付无关）

---

### V2-F-4 · `nowpayments/server.ts` 内 `sortObjectKeys` 与 `getFallbackMinimum` 单元化

- [ ] **位置**：`lib/payment/nowpayments/server.ts`
  - `sortObjectKeys`（行 23-，递归排序，签名前置）
  - `getFallbackMinimum`（行 199-）
- **背景**：
  - `sortObjectKeys` 是签名计算的关键前置步骤，目前位于文件内部，无单元测试覆盖
  - `getFallbackMinimum` 在外部 API 失败时使用，逻辑分支较多
- **动作**：
  1. **不移动**这两个函数（`sortObjectKeys` 与签名验证强耦合，搬到 `lib/utils.ts` 反而增加心智负担）
  2. **加注释 + 加单元测试**：
     - `sortObjectKeys`：3 个 fixture（嵌套对象、数组、null/undefined 边界）
     - `verifyNowPaymentsSignature`：用历史 IPN payload + 签名做 fixture（脱敏 amount 等）
  3. 检查 `Record<string, any>` —— 改为 `Record<string, unknown>`，验签函数内做类型守卫
- **验收**：
  - 单元测试覆盖签名验证主路径
  - sandbox NowPayments 加密币支付 + 收 IPN 验签通过
- **风险**：低（只加测试，不改实现）
- **工作量**：1.5 h（fixture 准备 + 测试）

---

### V2-F-5 · `app/actions/donation.ts` 内 `createQuantityExceededError` / `createAmountLimitExceededError` 与 NowPayments 版本统一

- [x] **位置**：`app/actions/donation.ts:78-111`
- **背景**：这两个错误工厂函数只在 `createWayForPayDonation` 内部用；如果 V2-F-1 实施了，`createNowPaymentsDonation` 里也会用同一组错误代码——本任务承接 V2-F-1
- **动作**：
  1. 若 V2-F-1 完成：错误工厂搬到 `_shared.ts`，两个支付函数共享
  2. 若 V2-F-1 跳过：保持现状不动
  3. 顺带：`(d: any)` 在 `track-donation.ts` 中的 RPC 行类型（V2-B-3 已列出）确认与 donation 创建时的 row 字段一致
- **验收**：错误代码字符串（`'quantity_exceeded'` / `'amount_limit_exceeded'` / `'project_not_found'`）与重构前完全一致——这些字符串被客户端用作 switch case，不能改
- **风险**：低（仅在 V2-F-1 基础上的随附整理）
- **工作量**：30 min
- **依赖**：V2-F-1 必须先完成

---

### V2-F 任务总览与执行顺序

| 任务 | 依赖 | 视觉风险 | 行为风险  | 工作量 |
| ---- | ---- | -------- | --------- | ------ |
| F-4  | 无   | 0        | 低        | 1.5 h  |
| F-1  | 无   | 0        | **高**    | 4 h    |
| F-5  | F-1  | 0        | 低        | 30 min |
| F-2  | 无   | 0        | **高**    | 1.5 h  |
| F-3  | 无   | 0        | **中-高** | 3 h    |

**推荐 PR 拆分**：

- PR-1：F-4（仅加测试，最低风险，先做铺垫）
- PR-2：F-2（签名 helper 抽取）—— 必须含 fixture 测试
- PR-3：F-3（webhook 框架抽取）—— 必须含 webhook payload 重放测试
- PR-4：F-1 + F-5 一起 —— 4 种项目类型组合的 sandbox 实测

**建议**：每个 V2-F PR 由不同人做 review，不要堆叠在一起部署。每次部署后观察 24 h 支付/退款数据，确认无异常再做下一个。

---

## 已扫描但**不做**的项（避免误工）

记录这些原因，未来若有人重新讨论可直接看到当时的判断：

| 跳过项                                               | 理由                                                                                                                             |
| ---------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| BroadcastModal 迁移 `AdminBaseModal`                 | BroadcastModal 有 preview 切换 `max-w-lg ↔ max-w-4xl` 动画过渡；AdminBaseModal 仅支持固定 `'3xl' \| '4xl'`，强行迁移会改样式     |
| ProjectsGallery 等 scroll 监听 cleanup 缺失          | 实际 grep `addEventListener('scroll'` ↔ `removeEventListener('scroll'` 文件名一一对应，全部都有 cleanup；agent 误报              |
| `getAllProjectsWithStats` 加 React `cache()`         | 调用方在不同 page 路由（`/` 与 `/donate`）的不同请求间发生；React `cache()` 仅在单次请求内去重，跨请求无效                       |
| `revalidatePath` 全面改 `revalidateTag`              | 已在 V2-D-2 列为"先审计再决定"；fetch 调用面没全用 tag，强行迁移风险大                                                           |
| `DonatePageClient` 容器层 RSC 改造                   | 紧邻支付排除区，且当前 sticky/dynamic import/项目选择器都依赖 client state，改动收益有限风险高                                   |
| 公共 Tailwind 工具类（`CARD_BASE` 等）               | 35+ 处 `rounded-lg border border-gray-200 bg-white p-4`——抽出后维护成本高于阅读成本，prettier-plugin-tailwindcss 已规整化        |
| 加 `tailwind.config.js` `darkMode`                   | 没有产品需求                                                                                                                     |
| `public/images/` 大批量迁 Cloudinary                 | 68 MB 资源迁移涉及内容流程改造，单独立项评估；本次仅在 next.config 预留远程源（V2-C-2）                                          |
| 添加全局 React.memo 给列表项                         | 当前父组件 `useMemo(filteredX)` + Set 选择已避免大多数重渲染；React 19 的 compiler 也会接管这部分；过度 memo 反而是负担          |
| `noUncheckedIndexedAccess` 严格度                    | V1 已明确跳过：100+ 处索引访问会被波及，多数会改为 `!` 非空断言反而降低代码质量                                                  |
| 收敛 `try/catch` 100% 迁移到 `tryAction`             | 含业务分支返回（具体错误码、回滚副作用）的 try/catch 不应迁移；V2-A-5 仅做"简单包装"约 30 处                                     |
| 把 `lib/supabase/queries.ts` 中的 query builder 抽象 | 各查询的 filter 维度、order、select 字段差异大；强行抽象会变成"参数比代码长"——保持现状                                           |
| 状态转换器 `StatusTransitionValidator<T>` 泛型化     | Donation / MarketItem / MarketOrder 三套规则字段不同（`donation_status` vs `item_status` vs `order_status`），泛型反而增加复杂度 |
| 文件上传统一 `uploadFileToStorage`                   | 客户端上传（`useDonationFileUpload` / `useMarketOrderFileUpload`）与服务端上传（`uploadDonationResultFile`）边界不同，已合理拆分 |

---

## 执行建议

### 推荐顺序（最低返工）

1. **先做类型与文档变更（小步快跑）**：
   - V2-B-1（deprecated 迁移）
   - V2-B-2（`as any` 收敛）
   - V2-B-3（RPC DTO）
   - V2-D-1（types/dtos.ts）

2. **再做 hook / 组件抽取（中体量）**：
   - V2-A-3（AdminButton）
   - V2-A-1（useAsyncForm）
   - V2-A-4（useTableFilters）
   - V2-A-2（FileUploadInputPanel）

3. **最后做行为类改动（需手动验收）**：
   - V2-C-1（broadcast 并行）
   - V2-C-2（cloudinary remote pattern）
   - V2-C-3（图片 sizes）
   - V2-C-4（payment selector dynamic 评估）
   - V2-A-5（tryAction 包装）
   - V2-D-2（revalidateTag 审计）

### 每个 PR 的验证清单

- [ ] `npm run type-check` 通过
- [ ] `npm run lint` 全绿
- [ ] `npm run format:check` 通过
- [ ] `npm run build` 成功
- [ ] 手动 smoke：首页 / 捐赠流程 / 捐赠追踪 / admin 项目页 / admin 捐赠页 / admin 义卖页
- [ ] **支付路径专项验证（V2-E / V2-F 任务必跑）**：
  - WayForPay sandbox 法币支付一次（含 webhook 收到）
  - NowPayments 加密币支付一次（含 IPN 收到）
  - 义卖订单 + WayForPay 支付一次
  - 退款流程一次（手动后台触发）
  - 状态机：触发 widget_load_failed（断网或注释脚本加载）+ 后续重试

### PR 拆分

- 每个 V2-A 任务独立 PR
- V2-B-1 + V2-B-2 + V2-B-3 + V2-D-1 可合并 1 个"类型清理"PR
- V2-C-1 ~ V2-C-3 可合并 1 个"性能微调"PR
- V2-A-5（tryAction）独立 PR——审查重点
- V2-E / V2-F 严格按各自小节列的 PR 拆分顺序部署，**每个 PR 上线后观察 24 h** 再做下一个

---

## 变更记录

| 日期       | 任务 ID | 执行人 | 备注                                                                                                                                                                                                                                                                                                                |
| ---------- | ------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-04-30 | —       | Claude | V2 初版创建                                                                                                                                                                                                                                                                                                         |
| 2026-05-01 | V2-B-1  | Claude | 6 个非支付文件 getProjectName/Location/UnitName → getTranslatedText；DonationFormCard 与 donation.ts 支付段落保留                                                                                                                                                                                                   |
| 2026-05-01 | V2-B-2  | Claude | 收敛非支付区 as any：layout.tsx (isAppLocale 守卫)、market/success/page.tsx、track-donation-form.tsx、market-admin.ts、SubscriptionsTable.tsx                                                                                                                                                                       |
| 2026-05-01 | V2-B-3  | Claude | 新建 types/dtos.ts，定义 DonationByContactRow + OrderDonationsSecureRow；3 处 (d: any) 替换为强类型                                                                                                                                                                                                                 |
| 2026-05-01 | V2-D-1  | Claude | types/dtos.ts 集中 AdminDonationListItem + BuyerMarketOrder；admin.ts 与 market-order.ts 改用集中 DTO                                                                                                                                                                                                               |
| 2026-05-01 | V2-A-3  | Claude | 新增 components/admin/ui/AdminButton.tsx；5 modal + 2 status section 共 ~9 处按钮迁移                                                                                                                                                                                                                               |
| 2026-05-01 | V2-A-1  | Claude | 新增 lib/hooks/useAsyncForm.ts；5 个 admin modal 迁移使用                                                                                                                                                                                                                                                           |
| 2026-05-01 | V2-A-4  | Claude | 新增 lib/hooks/useTableFilters.ts（含 predicate ref 稳定）；DonationsTable + MarketOrdersTable + SubscriptionsTable 迁移                                                                                                                                                                                            |
| 2026-05-01 | V2-A-2  | Claude | 新增 components/admin/ui/FileUploadInputPanel.tsx；DonationFileLibrary + MarketOrderFileLibrary 迁移                                                                                                                                                                                                                |
| 2026-05-01 | V2-C-1  | Claude | email-broadcast.ts 多 locale 串行 for 改 Promise.all 并行                                                                                                                                                                                                                                                           |
| 2026-05-01 | V2-C-2  | Claude | next.config.js 添加 `res.cloudinary.com` remotePatterns                                                                                                                                                                                                                                                             |
| 2026-05-01 | V2-C-3  | Claude | **跳过**：Footer 用 fill+object-cover，渲染宽度=父元素=100vw，改 60vw 会让浏览器选小图被拉伸反而降清晰度，保留 100vw                                                                                                                                                                                                |
| 2026-05-01 | V2-C-4  | Claude | **跳过**：dynamic import 切换会引入加载抖动（视觉变化），且属支付排除区，建议在 V2-E-1 拆分时一并评估                                                                                                                                                                                                               |
| 2026-05-01 | V2-A-5  | Claude | 仅创建 lib/action-utils.ts 基础设施；批量迁移**跳过**——audit 后发现绝大多数 catch 块都有具体业务错误码（rate_limited / invalid_email 等），不符合"通用错误返回"模板                                                                                                                                                 |
| 2026-05-01 | V2-D-2  | Claude | **跳过**：审计 lib/ 全部 fetch 调用，未发现任何 `next: { tags: [...] }` 使用，前提不满足                                                                                                                                                                                                                            |
| 2026-05-01 | V2-E-4  | Claude | 抽出 lib/payment/format-countdown.ts + components/donate-form/widgets/CryptoStatusIndicator.tsx；NowPaymentsWidget 主文件减约 110 行                                                                                                                                                                                |
| 2026-05-01 | V2-E-5  | Claude | 抽出 components/donate-form/PaymentStateView.tsx；DonationFormCard 主文件去掉 file-local PaymentWidgetContainer (约 150 行)                                                                                                                                                                                         |
| 2026-05-01 | V2-E-3  | Claude | **跳过**：内联 CopyButton（emerald-100 紧凑按钮 + stroke icon）与全局 CopyButton（ukraine-blue 圆角大按钮 + fill icon）视觉差异显著，按计划文档"差异大则跳过"原则保留两份                                                                                                                                           |
| 2026-05-01 | V2-E-1  | Claude | **暂缓**：DonationFormCard 拆分为 9 个 sections（4h + 三 locale × 5 项目手动验证），auto mode 无法模拟用户操作；建议手动 PR                                                                                                                                                                                         |
| 2026-05-01 | V2-E-2  | Claude | **暂缓**：useWayForPayWidgetLifecycle hook 涉及 9 个 ref + setTimeout/setInterval 时序，**高**风险，需 sandbox 实测；建议手动 PR                                                                                                                                                                                    |
| 2026-05-01 | V2-F-\* | Claude | **暂缓**：所有 V2-F 任务（支付 actions / lib / webhook 重复收敛）需要 sandbox 真实支付 + webhook 重放 + HMAC fixture 测试，auto mode 无条件验证；建议手动 PR                                                                                                                                                        |
| 2026-05-01 | V2-F-3  | Claude | 抽出 lib/payment/wayforpay/webhook-response.ts 容纳 `respondWithAccept`（两 webhook 函数体已 byte-equal）；webhook-handler 解析层因 market 多两道前置校验未抽取；不动状态映射、DB 更新、签名格式                                                                                                                    |
| 2026-05-01 | V2-E-1  | Claude | DonationFormCard 1265→690 行；拆出 9 个 sections + types/utils + ProjectSummaryHeader；className/JSX 1:1 搬运（token 总数 132=132 byte-equal）；保留 state/refs/handler 三函数与计划一致；type-check / lint / format / build 全绿                                                                                   |
| 2026-05-01 | V2-F-2  | Claude | **不做 helper 抽取**：HMAC-MD5 一行实现，4 个签名函数已通过 generateSignature 共享；项目无测试框架，无法引入 fixture 测试，按计划"评估后保留各自实现"原则跳过；hmac 计算路径不变                                                                                                                                    |
| 2026-05-01 | V2-F-4  | Claude | **暂缓**：项目未配置测试框架（package.json 无 jest/vitest），引入测试运行器超出 0 业务变化范围；建议手动加测试基建后再做                                                                                                                                                                                            |
| 2026-05-01 | V2-F-1  | Claude | **暂缓**：依赖 5 项目 × 4 类型组合 sandbox 实测，auto mode 无条件验证；建议手动 PR                                                                                                                                                                                                                                  |
| 2026-05-01 | V2-F-5  | Claude | **暂缓**：依赖 V2-F-1                                                                                                                                                                                                                                                                                               |
| 2026-05-01 | V2-E-2  | Claude | **暂缓**：useWayForPayWidgetLifecycle 涉及 9 ref + setTimeout/setInterval 时序，必须 sandbox 实测，**高**风险；建议手动 PR                                                                                                                                                                                          |
| 2026-05-01 | V2-F-1  | Claude | 新建 `app/actions/donation/_shared.ts` 抽出 `prepareDonationContext` + `insertPendingDonations`；两 action 各瘦身约 200 行；orderReference 格式 / 错误代码字符串 / DB 字段集合 / `payment_method` 值全部 byte-equal                                                                                                 |
| 2026-05-01 | V2-F-5  | Claude | `createQuantityExceededError` / `createAmountLimitExceededError` 搬到 `_shared.ts`；错误代码 `'quantity_exceeded'` / `'amount_limit_exceeded'` 字面量保留                                                                                                                                                           |
| 2026-05-01 | V2-E-2  | Claude | 新建 `lib/hooks/useWayForPayWidgetLifecycle.ts`；WayForPayWidget 471→167 行，MarketPaymentWidget 482→251 行；9 ref + 15s 脚本超时 + 10s widget-open + 100ms 早检 + errorRef 闭包模式 byte-equal；markAsFailed/logCategory/scriptId/errorMessages 通过 options 注入；hook deps 仅 `paymentParams`（optionsRef 模式） |

---

## 完成后的预期效果

- **代码量**：估算净减少 ~600-800 行（V2-A 重复模板 ~200 行 + V2-E DonationFormCard 主文件 1430→450 + 两个 widget 各 ~470→180 + V2-F webhook 主文件减 ~150）
- **类型安全**：`as any` 从全仓 ~15 处 → 2 处（仅 RPC 类型相关）；deprecated API 调用 0
- **性能**：邮件群发延迟降低（按订阅者 locale 数量近似线性）；Footer 图片移动端少传约 200KB
- **可维护性**：
  - 5 个 admin modal 共享 `useAsyncForm` hook
  - 2 个 WayForPay widget 共享 `useWayForPayWidgetLifecycle` hook（70% 代码消除重复）
  - 2 个 wayforpay webhook 共享框架（验签 + 响应签名）
  - 2 个 donation 创建 action 共享 `prepareDonationContext`
  - DonationFormCard 1430 行 → 9 个 sections（每个 30-190 行，单一职责）
- **0 用户感知**：视觉、交互、文案、URL、API 响应结构、签名字节、状态机映射均不变
- **必须的护栏**：
  - V2-E-2 / V2-F-2 / V2-F-3 必须含 fixture / 重放测试
  - 每个 V2-F PR 上线后观察 24 h 支付/退款数据再继续
