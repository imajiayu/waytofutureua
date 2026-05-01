# 重构计划 V3 · 第三轮扫描遗漏点

> **接续**：本文档承接 `REFACTOR_PLAN.md`（V1）和 `REFACTOR_PLAN_V2.md`（V2）。在 V1 / V2 完成后，对全仓再做一次系统扫描，挖出仍可合理收敛的点。
>
> **三条底线**（V1 / V2 沿用）：
>
> 1. **0 视觉变化** — 所有 className、JSX 结构、色板、间距 1:1 搬运。
> 2. **0 业务行为变化** — 状态机、错误码字面量、URL、API 响应字段不动。
> 3. **不做生硬抽象** — 凡是抽完会变成"参数比代码长"的薄壳，一律跳过；扫描结果记入"已扫描但不做"。
>
> **支付排除区**（沿用 V2 约束，不在本轮范围）：
>
> - `components/donate-form/DonationFormCard.tsx` 内的 `handleSubmit` / `handlePaymentMethodSelect` / `handleCryptoSelect` 三函数体
> - `components/donate-form/widgets/*` / `components/market/MarketPaymentWidget.tsx` 的 widget 内部回调与 lifecycle hook 实现细节
> - `lib/payment/wayforpay/` 的签名拼接代码、`lib/payment/nowpayments/` 的 IPN 验签与 `sortObjectKeys`
> - `app/api/webhooks/*` 的状态映射 switch / 响应签名
> - `app/actions/donation/_shared.ts` 中 `prepareDonationContext` / `insertPendingDonations` 的字段集合与 orderReference 生成
>
> **进度追踪约定**：每条任务有唯一 ID，完成后将 `- [ ]` 改为 `- [x]`，并在末尾"变更记录"追加一行。
>
> **文档版本**：1.0 · 创建：2026-05-01

---

## 总览

| 优先级          | 主题                                               | 任务数 | 预估工时 |
| --------------- | -------------------------------------------------- | ------ | -------- |
| **V3-A** 高价值 | 已抽 hook 但未复用 / 跨文件重复 useEffect 收敛     | 3      | 2 h      |
| **V3-B** 拆分   | 大文件搬运式拆分（admin.ts / DonationsTable / 等） | 4      | 5 h      |
| **V3-C** 收敛   | 状态硬编码 / 重复模板 / 错误工厂                   | 4      | 2 h      |
| **V3-D** 类型   | 残留 deprecated import / DonorInfo 类型集中        | 2      | 30 min   |

**累计净减少代码估计**：~700-900 行（admin.ts 拆分 ~400 + DonationsTable 拆分 ~150 + thumbnail 6 重复合 1 减 ~80 + sticky/footer hide 重复合 1 减 ~120 + ProjectCard 双模式分离 ~100 + 其他 ~50）

---

## V3-A · 已建立 hook 但仍存在内联实现的复用

### V3-A-1 · `MarketItemDetail.tsx` 内联 sticky 改用已有的 `useBidirectionalSticky` hook

- [x] **位置**：`components/market/MarketItemDetail.tsx:53-127`
- **背景**：V1 P1-9 已抽出 `lib/hooks/useBidirectionalSticky.ts`，`DonatePageClient.tsx` 已迁移使用，但 `MarketItemDetail.tsx` 自己又内联写了一份**完全等价**的实现（包括 ResizeObserver、rAF 节流、断点切换、>50px 高度变化重置）。
- **对比**：MarketItemDetail.tsx 行 58-127（70 行）= useBidirectionalSticky.ts 实现（98 行核心逻辑）byte-for-byte 等价。
- **动作**：
  1. import `useBidirectionalSticky`
  2. 删除 `useEffect(...)` 内联实现 + `stickyTop` `useState`
  3. 改为：
     ```ts
     const stickyTop = useBidirectionalSticky({
       innerRef: sidebarInnerRef,
       navHeight: NAV_HEIGHT,
       bottomPadding: BOTTOM_PADDING,
       desktopBreakpoint: MOBILE_BREAKPOINT,
     })
     ```
- **验收**：
  - `rg "ResizeObserver" components/market/` 0 命中
  - 商品详情页 desktop 侧边栏 sticky 行为不变（含 form-state 高度变化时的位置重置）
- **风险**：极低（hook 实现完全等价）
- **工作量**：15 min

---

### V3-A-2 · 抽 `useHideAtFooter` hook（DonatePageClient + MarketItemDetail 完全重复的 footer 检测）

- [x] **位置**：
  - `app/[locale]/donate/DonatePageClient.tsx:170-215`（46 行）
  - `components/market/MarketItemDetail.tsx:129-162`（34 行）
- **背景**：两处都是"接近 footer 时设置 `hideSheetAtBottom=true` 给 BottomSheet"的逻辑。两份实现常量都叫 `FOOTER_SAFE_ZONE = 150` / `MOBILE_BREAKPOINT = 1024` / `SCROLL_DEBOUNCE_MS = 100`，唯一差别：DonatePageClient 多打了一行注释。
- **拆分方案**：
  1. 新建 `lib/hooks/useHideAtFooter.ts`：
     ```ts
     interface Options {
       footerSafeZone?: number // 默认 150
       mobileBreakpoint?: number // 默认 1024
       debounceMs?: number // 默认 100
     }
     export function useHideAtFooter(options?: Options): boolean
     ```
     内部封装：debounced scroll listener + resize listener + 移动端独占
  2. 两处调用点改为：
     ```ts
     const hideSheetAtBottom = useHideAtFooter()
     ```
- **验收**：
  - 两处删除 ~80 行重复 useEffect
  - 移动端 BottomSheet 接近 footer 时被隐藏的行为不变（捐赠页 + 义卖页都验证）
  - desktop 不受影响（hook 内部 `window.innerWidth < mobileBreakpoint` 早返回）
- **风险**：极低（纯搬运 + 单一职责 hook）
- **工作量**：30 min

---

### V3-A-3 · 抽 `useLightboxFromUrls(urls)` 收敛 Project detail 重复 useMemo 模板

- [x] **位置**：
  - `components/projects/detail-pages/Project0/index.tsx:51-78`（4 套 lightbox + 4 个 `useMemo<LightboxImage[]>(...map url => ({url}))`）
  - `components/projects/detail-pages/Project3/index.tsx:41-62`（2 套）
  - `components/projects/detail-pages/Project4/index.tsx:42-82`（5 套）
  - `components/projects/detail-pages/Project5/index.tsx:28+`（1 套）
- **动作**：在 `lib/hooks/useLightbox.ts` 末尾追加：
  ```ts
  export function useLightboxFromUrls(urls: ReadonlyArray<string> | null | undefined): {
    lightbox: UseLightboxReturn
    images: LightboxImage[]
  } {
    const lightbox = useLightbox()
    const images = useMemo<LightboxImage[]>(
      () => (urls ? urls.map((url) => ({ url })) : []),
      [urls]
    )
    return { lightbox, images }
  }
  ```
  4 个 Project detail index 页改为：
  ```ts
  const { lightbox: detailLightbox, images: detailLightboxImages } = useLightboxFromUrls(
    content?.images
  )
  ```
- **不做**：Project4 中 `talentLightboxImages`（来自两个不同字段拼接）和 `receiptLightboxImages`（也是两个字段拼接）保持原样——它们不只是 url 数组 map，硬塞进 hook 反而难懂。
- **验收**：每个 Project detail index 文件减少 ~5-15 行；图片点击 → lightbox 打开行为不变
- **风险**：极低（纯封装）
- **工作量**：45 min

---

## V3-B · 大文件搬运式拆分

### V3-B-1 · 拆 `app/actions/admin.ts`（887 → ~250 行 + 4 个新文件）

- [x] **位置**：`app/actions/admin.ts`（最大的 server action 文件）
- **背景**：单文件已 887 行，承担 4 个完全独立的职责：
  - 管理员登录登出（41 行）
  - 项目 CRUD（~85 行）
  - 捐赠状态管理（~330 行，含批量操作）
  - 捐赠结果文件管理（~430 行，含 `uploadDonationResultFile` / `processUploadedImage` / `getDonationResultFiles` / `deleteDonationResultFile` / `createSignedUploadUrl`）

  其中**文件管理段落**有 6 处 `sharp(buffer).resize(300, ...).jpeg({quality: 80}).toBuffer()` + 上传缩略图的样板代码（行 399-414, 442-462, 491-513, 658-674, 682-698, 703-719）。

- **拆分方案**：
  1. 新建 `app/actions/admin/` 目录（用目录而非平铺，避免文件名前缀污染）：
     - `admin/auth.ts` — `adminLogin` / `adminLogout`
     - `admin/projects.ts` — `getAdminProjects` / `createProject` / `updateProject`
     - `admin/donations.ts` — `getAdminDonations` / `updateDonationStatus` / `batchUpdateDonationStatus`
     - `admin/donation-files.ts` — `uploadDonationResultFile` / `processUploadedImage` / `createSignedUploadUrl` / `getDonationResultFiles` / `deleteDonationResultFile`
     - `admin/_helpers.ts`（**仅服务端内部使用，下划线前缀防误用**）：
       - `MIME_TO_EXT` 常量（消除 `uploadDonationResultFile` 与 `createSignedUploadUrl` 重复的 mimeToExt 表）
       - `generateAndUploadThumbnail({ supabase, buffer, donationPublicId, timestamp })` — 收敛 6 处 sharp 缩略图生成
  2. 在 `app/actions/admin.ts` 保留**只做 re-export 的桥接**（避免下游 `import {...} from '@/app/actions/admin'` 全仓改动），形如：
     ```ts
     export * from './admin/auth'
     export * from './admin/projects'
     export * from './admin/donations'
     export * from './admin/donation-files'
     ```
  3. **不动**：所有 server action 函数签名（参数 + 返回类型 + revalidatePath 调用）
- **验收**：
  - `wc -l app/actions/admin.ts` ≤ 30 行（仅 re-export）
  - 每个新文件 ≤ 250 行
  - `rg "sharp\\(.*\\)\\.resize\\(300" app/actions/` 命中数 6 → 1（仅在 `_helpers.ts`）
  - admin 后台手动 smoke：项目创建/编辑、捐赠状态切换、文件上传（图片 + 视频）、文件删除全部正常
  - `npm run type-check` / `lint` / `format:check` / `build` 全绿
- **风险**：中（影响面广，但桥接 re-export 保证调用方零改动）
- **工作量**：2 h（含 smoke 验证）

---

### V3-B-2 · 拆 `components/admin/DonationsTable.tsx`（525 → ~200 行）

- [x] **位置**：`components/admin/DonationsTable.tsx`
- **背景**：V1 P1-5 / P1-6 已拆 `DonationEditModal` / `MarketOrderEditModal`，但表格本身没拆。当前结构：
  - 行 36-172：state、handler、useMemo 分组、useCallback selection（合理保留）
  - 行 175-293：Filters + Toolbar + 批量操作按钮（~120 行 UI）
  - 行 295-499：donationGroups 渲染：mobile card view + desktop table view（~205 行 UI）
- **拆分方案**：
  1. 新建 `components/admin/donations-table/` 目录：
     - `DonationsFiltersBar.tsx` — 状态筛选 + 项目筛选 + 批量选择/操作工具栏（~120 行）
     - `DonationGroupCard.tsx` — 单个 order_reference 分组的 mobile card + desktop table 双视图（~200 行）
     - `types.ts` — `Donation` 行类型 + group 形状
  2. 主文件保留：state、handler、useMemo（donationGroups / selectedDonations / canBatchEditSelected）、最外层 wrapper
- **同时修复**（搬运过程顺手）：
  - 行 192-206 的 14 个状态 `<option>` 改为 `DONATION_STATUSES.map(s => <option key={s} value={s}>{capitalize(s)}</option>)`，与 `MarketOrdersTable` 风格一致
- **验收**：
  - 主文件 ≤ 220 行
  - DonationGroupCard ≤ 220 行
  - 类名字面量（`'rounded-lg border-2 border-gray-300 bg-gray-50'` 等）拆分前后命中数完全一致（用 `rg` 验证）
  - admin 捐赠页：单选 / 批量选择 / 分组选择 / 全选 / 状态筛选 / 项目筛选 / 编辑模态 / 批量编辑 / 打印标签全部正常
- **风险**：低（搬运式，已有成熟先例如 `track-donation-form` / `ProjectDonationList`）
- **工作量**：1.5 h

---

### V3-B-3 · 拆 `components/projects/ProjectCard.tsx`（522 → ~70 + 2x ~250 行）

- [x] **位置**：`components/projects/ProjectCard.tsx`
- **背景**：单文件包含两套完全独立的渲染分支（compact 87-316 行 / full 318-522 行）。两个分支共享的只有 props 解构、name/location/unitName i18n、`useRouter` + navigate 状态。
- **拆分方案**：
  1. 新建 `components/projects/cards/`：
     - `ProjectCardCompact.tsx`（~250 行）— 当前行 88-316 整段搬运
     - `ProjectCardFull.tsx`（~210 行）— 当前行 322-521 整段搬运
     - `shared.ts`（~30 行）— 共用的 `useNavigateToDonate` hook（封装 `setIsNavigating` + `useEffect(pathname)` + `router.push`）
  2. `ProjectCard.tsx` 收成 ~50 行的 dispatcher：
     ```ts
     export default function ProjectCard(props: ProjectCardProps) {
       return props.mode === 'compact'
         ? <ProjectCardCompact {...props} />
         : <ProjectCardFull {...props} />
     }
     ```
- **不做**：背景图片容器 / 渐变遮罩 / Header tags 这些视觉重复**保留**（外观上有微小差异：compact 有 `isSelected` 主题色变化、full 有 `hover:-translate-y-2`），强行抽 `<ProjectCardShell>` 会被 props 撑爆。
- **验收**：
  - 主文件 ≤ 60 行
  - 两个子组件像素级一致（背景图、徽章、进度条、悬停效果）
  - 三个使用方手动验证：首页 ProjectsGallery（compact）、捐赠页 ProjectsGallery（compact）、捐赠页 ProjectDetailContent fallback（如果有 full 用法）
- **风险**：低（搬运式）
- **工作量**：1 h

---

### V3-B-4 · 拆 `components/admin/BroadcastModal.tsx`（509 → ~180 行）

- [x] **位置**：`components/admin/BroadcastModal.tsx`
- **背景**：单文件 3 个完全独立的视图模式（preview / result / send-form），共享 state 但 UI 互不重叠。
- **拆分方案**：
  1. 新建 `components/admin/broadcast/`：
     - `BroadcastPreviewView.tsx`（~75 行）— 当前 273-309 行的 preview 模式
     - `BroadcastResultView.tsx`（~60 行）— 当前 311-352 行的成功/失败结果
     - `BroadcastSendForm.tsx`（~250 行）— 当前 354-503 行的模板选择 + 收件人选择 + 发送按钮
  2. 主组件保留：所有 useState、useEffect 加载模板、handler（handlePreview / handleSend / handleClose / handleBackFromPreview）、外层 modal 容器
- **不做**：BroadcastModal 现有 `max-w-lg ↔ max-w-4xl` 切换动画**保留**（V2 已记录此处不能套 AdminBaseModal）
- **验收**：
  - 主文件 ≤ 200 行
  - 三个子视图分别单独跑：选模板 → 预览 → 返回 → 发送 → 看结果，行为完全一致
  - max-w-lg ↔ max-w-4xl 动画过渡保留
- **风险**：低
- **工作量**：1 h

---

## V3-C · 收敛（重复模板 / 硬编码常量）

### V3-C-1 · `DonationsTable` 14 个状态 `<option>` 硬编码 → 用 `DONATION_STATUSES` 常量

- [x] **位置**：`components/admin/DonationsTable.tsx:192-206`
- **背景**：V1 已在 `lib/donation-status.ts` 导出 `DONATION_STATUSES` 常量数组，但表格内仍然 14 行手写 `<option>`。`MarketOrdersTable.tsx:66` 已经正确用了 `MARKET_ORDER_STATUSES.map`。
- **动作**：
  ```ts
  import { DONATION_STATUSES } from '@/lib/donation-status'
  // ...
  <option value="all">All</option>
  {DONATION_STATUSES.map((s) => (
    <option key={s} value={s}>
      {s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
    </option>
  ))}
  ```
- **注意**：与 V3-B-2 合并到同一个 PR（顺手做）
- **验收**：状态选项顺序与原列表一致（`DONATION_STATUSES` 顺序就是 14 状态语义顺序）；下拉行为不变
- **风险**：极低
- **工作量**：10 min

---

### V3-C-2 · `app/actions/donation.ts` 内 `asWayForPayError` / `asNowPaymentsError` 收敛

- [x] **位置**：`app/actions/donation.ts:79-86`
- **背景**：两个函数都是 `(err: DonationCreationError) => ({ success: false, ...err })`，且类型仅在断言上差异。可以合并为一个泛型函数：
  ```ts
  function asActionError<T extends { success: false }>(err: DonationCreationError): T {
    return { success: false, ...err } as T
  }
  ```
- **动作**：
  1. 替换两处调用为 `asActionError<WayForPayPaymentResult>(prep.err)` 与 `asActionError<NowPaymentsResult>(prep.err)`
  2. 删除两个原函数
- **不做**：保留 `WayForPayPaymentResult` / `NowPaymentsResult` 两个独立类型（它们的 success: true 分支字段不同，不能合并）
- **验收**：错误返回的字段 byte-equal；type-check 通过
- **风险**：低（只动 4 行）
- **工作量**：10 min

---

### V3-C-3 · `lib/hooks/useDonationFileUpload.ts` 与 `useMarketOrderFileUpload.ts` 共享文件验证

- [x] **位置**：
  - `lib/hooks/useDonationFileUpload.ts:24-31, 81-105`（VALID_TYPES + handleFileChange 校验）
  - `lib/hooks/useMarketOrderFileUpload.ts:14-22, 74-86`（VALID_TYPES + validateFiles 函数）
- **背景**：两处的文件类型 / 大小校验几乎完全相同（market 多了 webp）。
- **动作**：
  1. 新建 `lib/file-validation.ts`：
     ```ts
     export const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'] as const
     export const VIDEO_TYPES = ['video/mp4', 'video/quicktime'] as const
     export const MAX_FILE_SIZE = 50 * 1024 * 1024
     export function validateMediaFiles(
       files: File[],
       opts: { allowed: ReadonlyArray<string>; maxSize: number }
     ): { ok: true } | { ok: false; error: string }
     ```
  2. 两个 hook 改用此函数；保留各自的 `VALID_TYPES` 局部常量定义（一个含 webp 一个不含）
- **不做**：不合并 `uploadFile` 实现（一个走 signed URL + processUploadedImage，一个区分 image/video 走两条路径，差异本质）
- **验收**：
  - 两个 hook 仍各自独立、API 不变
  - 校验错误文案不变（"Invalid file type: ..." / "File too large: ..."）
- **风险**：低
- **工作量**：30 min

---

### V3-C-4 · `MarketOrdersTable` 与 `DonationsTable` 移动端 card view 视觉模板对比

- [x] **位置**：
  - `components/admin/DonationsTable.tsx:335-385`（mobile card view）
  - `components/admin/MarketOrdersTable.tsx:80-149`（mobile card view）
- **背景**：两处都用了相似的 `rounded-lg border + p-3 + flex justify-between` 布局，但内容字段差异大（捐赠：donor / amount / project；订单：item / 收件人 / 物流号）。
- **决定**：**跳过**——抽 `<MobileCard>` 通用组件会变薄壳；两处的字段集合、状态徽章位置、点击行为有细节差异，强行合并会被 props 撑爆。
- **记录**：本次评估了但不做；同 V2 已扫描但不做的 `DataTable/AdminTable` 抽象。

---

## V3-D · 类型 / 残留迁移

### V3-D-1 · `DonorInfo` 类型集中到 `types/dtos.ts`

- [x] **位置**：`components/donate-form/DonationFormCard.tsx:30-37`（`export interface DonorInfo`）
- **背景**：`DonatePageClient.tsx` 通过 `import type { DonorInfo } from '@/components/donate-form/DonationFormCard'` 反向依赖 client 组件。V2-D-1 已建立 `types/dtos.ts`，但漏了 `DonorInfo`。
- **动作**：
  1. 把 `DonorInfo` 接口迁到 `types/dtos.ts`
  2. `DonationFormCard.tsx` 改为 `import type { DonorInfo } from '@/types/dtos'` 并仅做 `export type` 透传（保持向后兼容）
  3. `DonatePageClient.tsx` 改为直接从 `@/types/dtos` 导入
- **不做**：不动 `DonationFormCard.tsx` 的支付排除区代码（仅迁移类型 import）
- **验收**：`rg "DonorInfo"` 命中数不变；type-check 通过
- **风险**：极低
- **工作量**：10 min

---

### V3-D-2 · 评估：剩余 `SupportedLocale` 引用

- [x] **审计**：扫描结果
  ```
  components/donate-form/DonationFormCard.tsx — 7 处（支付排除区，保留）
  app/actions/donation/_shared.ts — 通过 getProjectName/getUnitName 间接（支付排除区，保留）
  app/api/webhooks/wayforpay/route.ts — 2 处（支付排除区，保留）
  app/api/webhooks/nowpayments/route.ts — 2 处（支付排除区，保留）
  ```
- **决定**：**全部保留** —— 全部位于 V2 / V3 划定的支付排除区，按 V2 约定不在自动化重构范围；待未来手动 PR 时一并清理（可能在 V2-E-1 / V2-F-1 后续手动验证 PR 中顺带做）。
- **不做**：本任务不在 V3 范围内；记录到"已扫描但不做"
- **风险**：—
- **工作量**：—（仅审计）

---

## 已扫描但**不做**的项

记录原因，未来若有人重新讨论可以直接看到当时的判断。

| 跳过项                                                                   | 理由                                                                                                                                                   |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `EmailOTPForm.tsx` 366 行（LIGHT/DARK 主题表）                           | LIGHT/DARK 是设计上的对称双主题；强行合并会让组件接受多余 `theme: 'light'\|'dark'` 又走分支，反而难读。当前结构清晰，跳过。                            |
| `CryptoSelector.tsx` 443 行的 UI 拆分                                    | 紧邻支付排除区（被 `DonationFormCard` 直接渲染），拆分需要 sandbox 测试加密币流；本次范围排除。                                                        |
| `icons/index.tsx` 33 个 SVG wrapper 收敛为 `<Icon path>` 工厂            | 当前每个 export const 都是 tree-shakeable 的纯函数；统一工厂反而增加运行时分支。33 个组件总计 ~5KB，已经是从 lucide-react ~150KB 减下来的优化产物。    |
| `useDonationFileUpload` / `useMarketOrderFileUpload` 进一步合并          | 上传策略差异本质（单条 signed URL + processUploadedImage vs image/video 双路径 + category），强行合并会变成"参数比代码长"。仅校验逻辑下沉到 V3-C-3。   |
| `ProjectResultsMosaic.tsx` 380 行（230 行 MOSAIC_ITEMS 数据）            | 数据已是字面量数组，搬到 `.data.ts` 文件只是文件分割的形式收益；没业务功能改善，跳过。                                                                 |
| `lib/i18n-utils.ts` 三个 `@deprecated` wrapper 删除                      | 仍有支付排除区文件（DonationFormCard、\_shared.ts、webhook routes）在用；删除会破坏排除区文件，必须等手动 PR。                                         |
| `ProjectsGallery.tsx` / `MobileCarousel.tsx` 等其它 scroll listener      | 它们是各自独立的 carousel/snap 逻辑（计算可见 index、检测 snap edge 等），与 `useHideAtFooter` / `useBidirectionalSticky` 是不同语义，不要强行合并。   |
| `BroadcastModal` cancellation cleanup（行 81-109 用了 `cancelled` flag） | 已经正确使用 `let cancelled = false` + cleanup 模式，无问题。                                                                                          |
| 抽 `<MobileCardItem>` 共用组件（DonationsTable / MarketOrdersTable）     | 字段集合、状态徽章、点击行为差异大；抽出来 props 接口比 JSX 还长。同 V2 已扫描但不做的 DataTable 抽象一致。                                            |
| `noUncheckedIndexedAccess` TS 严格度                                     | V1 P2-5 / V2 已明确跳过：100+ 索引访问会被波及，多数会改为 `!` 反而降低代码质量。                                                                      |
| 公共 Tailwind 工具类（如 `CARD_BASE`）                                   | V2 已扫描但不做：35+ 处 `rounded-lg border border-gray-200 bg-white p-4` 抽出后维护成本 > 阅读成本，prettier 已规整。                                  |
| `<Image>` `sizes` 属性补全                                               | V2-C-3 已评估：Footer 用 fill+cover，渲染宽度 = 父元素 = 100vw。其它图片现状无明显问题。                                                               |
| `next/image` 替换 `public/images/` 中 webp                               | 资产已是 webp + 合理 fixed size；切 `<Image>` 收益微小但工作量大。                                                                                     |
| Tailwind `darkMode: 'class'` 启用                                        | 没有产品需求，沿用 V1 V2 决策。                                                                                                                        |
| `setTimeout` cleanup（FadeInSection / CollapsibleGallery / PrintLabels） | 这些 setTimeout 在 useEffect 之外，组件卸载时不会触发 setState。FadeInSection 的 setTimeout 在 IntersectionObserver 回调中，组件已 unobserve，无泄漏。 |

---

## 执行建议

### 推荐顺序（最低返工）

1. **先做收敛类**（小步快跑，影响小）：
   - V3-A-1 / V3-A-2 / V3-A-3 — hook 复用
   - V3-C-1 / V3-C-2 — 状态硬编码 + asActionError
   - V3-D-1 — DonorInfo 类型迁移
2. **再做拆分类**（搬运式，需 smoke）：
   - V3-B-3（ProjectCard 双模式分离，最简单）
   - V3-B-2（DonationsTable，含 V3-C-1 的状态选项收敛）
   - V3-B-4（BroadcastModal）
   - V3-B-1（admin.ts，最大体量，最后做）
3. **最后做 hook 共享**：
   - V3-C-3（文件验证）

### 每个 PR 的验证清单

- [ ] `npm run type-check` 通过
- [ ] `npm run lint` 全绿
- [ ] `npm run format:check` 通过
- [ ] `npm run build` 成功
- [ ] 手动 smoke：
  - 首页 / 捐赠流程 / 捐赠追踪
  - admin 项目页 / 捐赠页（含批量 + 文件上传 + 删除）
  - admin 义卖页（订单 + 商品）
  - 义卖商品详情页（mobile BottomSheet 行为）
- [ ] 关键 className token 命中数（用 `rg "ukraine-blue-500"` 等）拆分前后一致

### PR 拆分

- **PR-1**："V3 hook 复用与类型集中"：V3-A-1 + V3-A-2 + V3-A-3 + V3-D-1（共 ~2 h）
- **PR-2**："V3 收敛"：V3-C-1 + V3-C-2 + V3-C-3（共 ~1 h）
- **PR-3**："V3 ProjectCard 双模式分离"：V3-B-3（~1 h）
- **PR-4**："V3 DonationsTable 拆分"：V3-B-2（含 V3-C-1，~1.5 h）
- **PR-5**："V3 BroadcastModal 拆分"：V3-B-4（~1 h）
- **PR-6**："V3 admin.ts 拆分"：V3-B-1（~2 h，单独 PR，影响面最大）

---

## 完成后的预期效果

- **代码量**：估算净减少 ~700-900 行
  - admin.ts 887 → ~30（仅 re-export）+ 4 个 ≤ 250 文件 — 净减约 100-200（重复消除）
  - DonationsTable 525 → ~220 + 子组件拆出（结构更清晰）
  - ProjectCard 522 → ~50 + 两个 ~250
  - BroadcastModal 509 → ~200 + 三个子视图
  - thumbnail 6 重复 → 1 helper（~80 行净减）
  - sticky/footer hide 重复 → 1 hook（~120 行净减）
- **可维护性**：
  - 7 处文件管理 / sticky / footer-hide / lightbox 模板收敛为 hook / helper
  - admin.ts 4 个职责按文件分离，每个文件 ≤ 250 行
  - 状态选项不再硬编码（DONATION_STATUSES.map）
  - DonorInfo / RPC DTO 类型集中在 `types/dtos.ts`
- **0 用户感知**：视觉、交互、文案、URL、API 响应字段、状态机映射均不变
- **支付排除区不动**：DonationFormCard 三大 handler / widget lifecycle / 签名拼接 / webhook 状态映射 / `_shared.ts` orderReference 生成全部保留

---

## 变更记录

| 日期       | 任务 ID | 执行人 | 备注                                                                                                                                                           |
| ---------- | ------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-05-01 | —       | Claude | V3 初版创建                                                                                                                                                    |
| 2026-05-01 | V3-A-1  | Claude | MarketItemDetail 内联 sticky → useBidirectionalSticky；删除 70 行 useEffect + 未用的 useState                                                                  |
| 2026-05-01 | V3-A-2  | Claude | 新建 `lib/hooks/useHideAtFooter.ts`；DonatePageClient + MarketItemDetail 共减约 80 行重复 footer 检测                                                          |
| 2026-05-01 | V3-A-3  | Claude | useLightbox.ts 末尾追加 `useLightboxFromUrls`；Project0（2 处）+ Project4（2 处）使用；Project3/5 因 caption / 多源拼接保留原样                                |
| 2026-05-01 | V3-D-1  | Claude | `DonorInfo` 接口迁到 `types/dtos.ts`；DonationFormCard re-export 兼容；DonatePageClient 改用 `@/types/dtos` 直接 import；type-check / lint / build 全绿        |
| 2026-05-01 | V3-C-2  | Claude | `donation.ts` 内 asWayForPayError + asNowPaymentsError 合并为 `asActionError<T>` 泛型 helper                                                                   |
| 2026-05-01 | V3-C-3  | Claude | 新建 `lib/file-validation.ts`；两个文件上传 hook 共享 validateMediaFiles；formatInvalidType / formatOversized 函数式注入保证错误文案 byte-equal                |
| 2026-05-01 | V3-C-1  | Claude | DonationsTable 14 个状态 `<option>` 改为 `DONATION_STATUSES.map`；snake_case → Title Case 通过本地 split/title-case 完成，文案与原值一致                       |
| 2026-05-01 | V3-B-3  | Claude | ProjectCard 拆分为 dispatcher (48) + ProjectCardCompact (279) + ProjectCardFull (248)；JSX className/SVG path 1:1 搬运；type-check / lint / build 全绿         |
| 2026-05-01 | V3-B-2  | Claude | DonationsTable 525→220 + DonationsFiltersBar (153) + DonationGroupCard (214) + types (24)；handlers/useMemo 留主文件；JSX 1:1；type-check/lint/build 全绿      |
| 2026-05-01 | V3-B-4  | Claude | BroadcastModal 509→303 + 三视图（PreviewView 62 / ResultView 43 / SendForm 210）；max-w-lg/max-w-4xl 切换动画保留；type-check/lint/build 全绿                  |
| 2026-05-01 | V3-B-1  | Claude | admin.ts 887→12 (re-export) + 5 文件（auth 30 / projects 87 / donations 238 / donation-files 444 / \_helpers 71）；thumbnail 6 重复→1 helper；MIME_TO_EXT 单点 |
