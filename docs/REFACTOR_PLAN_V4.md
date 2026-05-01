# 重构计划 V4 · 第四轮扫描遗漏点

> **接续**：本文档承接 `REFACTOR_PLAN.md`（V1）、`REFACTOR_PLAN_V2.md`（V2）、`REFACTOR_PLAN_V3.md`（V3）。三轮全部完成后，对全仓再做一次系统扫描。
>
> **两条底线**（V1–V3 沿用，V4 不变）：
>
> 1. **0 视觉变化** — 所有 className、JSX 结构、色板、间距 1:1 搬运。
> 2. **0 业务行为变化** — 状态机、错误码字面量、URL、API 响应字段、签名字节、orderReference 格式不动。
>
> **范围说明（与 V3 不同）**：
>
> - V3 把 V2 改动过的支付段落作为"排除区"（保护实测后已稳定的代码）。
> - **V4 不再设支付排除区**——支付路径上的纯逻辑收敛 / 类型迁移 / 文件级搬运全部纳入；签名拼接、状态映射、orderReference 格式仍维持原样不动。
>
> **进度追踪约定**：每条任务有唯一 ID，完成后将 `- [ ]` 改为 `- [x]`，并在末尾"变更记录"追加一行。
>
> **文档版本**：1.1 · 创建：2026-05-01 · 更新：2026-05-01（v1.0 → v1.1：自反思后增补 V4-A-5 ~ V4-A-8 + 修正 V4-D-1 计数）

---

## 写在前面 · 为什么新问题在前三次没扫出来

每一轮扫描结束后再扫一次都能发现新东西，这不是失误，是迭代式重构的固有性质。把六条盲区列在这里，V4 之后的任何一轮扫描都应先回头看这一节，避免重蹈。

| #   | 盲区                              | 表现                                                                                                                                                                                                              |
| --- | --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **重构本身就是问题生成器**        | V1 拆完大文件，V2 才看到原本被埋在里面的代码现在变成了独立小文件之间的横向重复；V2 拆完 DonationFormCard 后，V3 才看到 9 个 sections 之间的相似模式；V3 拆完 admin.ts / DonationsTable 后，V4 才看到新生小文件之间的细碎重复。 |
| 2   | **垂直深度优先，水平广度不足**    | 前三轮按"单文件大小排序 → 拆"和"已知模式 → 找重复"做扫描。但有些重复是"多个 ≤ 200 行小文件之间各有 20 行细碎重复"——单看任何一个都"合理"，需要专门做 cross-file pattern 扫描。例：webhook 文件内"先扣库存 → CAS → 失败回滚"的 pattern 在同一文件出现两次。       |
| 3   | **支付排除区"看了等于没看"**      | V2/V3 的"排除区"约定保护了支付路径，但同时也让 widgets/CryptoSelector/支付 actions 内部的可重构面从未被横向比对。V2-E-1 拆 sections 之后排除区缩小，没人回头扫排除区缩小后留出来的可重构表面。                                                              |
| 4   | **配置 / 数据 / 语义层从未扫过**  | 三轮全部看 `.ts/.tsx`。`messages/{en,zh,ua}.json` 键一致性、`public/content/projects/*.json` schema、Supabase client 创建的语义副本、Resend category 字符串、cookie/storage key、环境变量 fallback 默认值的散布——三轮都没覆盖。本轮发现 `NEXT_PUBLIC_APP_URL` fallback 在 8 处分布（5 处 `localhost:3000` / 3 处 `https://waytofutureua.org.ua`），是潜在 bug。 |
| 5   | **测试 / 工程链短板从未评估**     | 三轮一直把"没有测试框架"作为跳过 V2-F-4 等任务的理由，但**没人评估过引入测试的边际成本**。`tsc/lint/build/format` 都是死的，唯一的"行为"验证完全靠手动 smoke——这本身就值得一个专门的评估任务。                                                          |
| 6   | **"已扫描但不做"列表当成了边界**  | 三轮各自的"已扫描但不做"表共 30+ 项。这些项的判定可能随后续重构反转，但没人回头复审。V4 在每条新任务旁标注是否反转既有判定。                                                                                                                          |

执行 V5 之前应当：（1）回头看这六条盲区；（2）扫描方式应当包含"水平 cross-file pattern 比对"和"配置/数据层全文扫"；（3）显式复审"已扫描但不做"中的项是否随上一轮的拆分而反转。

---

## 自反思补扫（v1.1 新增）· V4 写完后回头看

写完 V4 v1.0 后，用同样方法回头审：**V4 里那些"V1-V3 真的漏掉了"的项（不是评估后跳过的）**为什么会漏？把元层面的盲区落到具体的扫描操作上，再扫一遍补缺。

### 4 个具体扫描操作（V1-V3 缺失）

| 操作 | 描述                                                          | V4 里漏检的项印证                                                                                                                                                  |
| ---- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **A** | **File-internal cross-block 比对**：≥200 行单文件内部，是否有 ≥2 段结构相似的并列代码块？前三轮做的是 cross-file 比对。 | V4-A-1（wayforpay-market webhook 内"扣库存→CAS→失败回滚"在同一文件出现 2 次）。V1-V3 把两个 webhook 互相对比（cross-file），但没看 webhook 文件内部。           |
| **B** | **配置/数据常量散布扫**：grep 所有 `const XXX_(MAP\|LIST\|NAMES\|TYPES\|OPTIONS) =` 在 `components/`、`app/` 下的出现。组件文件里不该住数据。 | V4-A-2（NETWORK_NAMES 表住在 CryptoSelector）。V3 跳过 CryptoSelector 内审视，所以漏。                                                                              |
| **C** | **server action 返回类型 union 同构对比**：`rg "^type [A-Z][A-Za-z]+Result =" app/actions/`，看 success/error union 的 error 分支是否同构。V2-D-1 抽 dtos.ts 时只看了 DB 行类型。 | V4-A-4（WayForPayPaymentResult 与 NowPaymentsResult 的失败分支 byte-equal）。前三轮没做这个 cross-cut 扫。                                                          |
| **D** | **环境变量 fallback 全仓审计**：`rg "process\.env\.[A-Z_]+\s*\|\|" lib/ app/ components/`，看默认值一致性。 | V4-D-1（NEXT_PUBLIC_APP_URL fallback 散布 + 默认值冲突）。前三轮从未做过环境变量散布扫。                                                                            |

### 用这 4 个操作再扫一遍，新增的发现

补扫后又发现 **4 项 V1-V3 + V4 v1.0 都漏的**重复——全部对应上面 4 个扫描操作的盲区类别：

- **操作 A 补扫** → V4-A-5（wayforpay/route.ts 与 nowpayments/route.ts 内"构造邮件 payload"代码 **byte-equal 复制粘贴**，前三轮关注的是 webhook 解析层的 cross-file 共享，没看 webhook 内"业务执行层"的 cross-file 重复）
- **操作 A 补扫** → V4-A-7（track-donation.ts 文件内 trackDonations/requestRefund 两个函数都有"`rpc('get_donations_by_email_verified')` + `as DonationByContactRow[]` cast"模板）
- **操作 B 补扫** → V4-A-6（MIME_TO_EXT 表在 `_helpers.ts` 与 `market-order-files.ts` 各定义一份——V3-B-1 拆 admin.ts 时整合了 admin/* 内部，但漏看 admin/* 之外用同一表的 sibling 文件。这是"模块边界盲区"）
- **操作 B 补扫** → V4-A-8（AMOUNT_OPTIONS / QUANTITY_OPTIONS / TIP_OPTIONS 硬编码数字在 sections 文件——评估为不做但记录）

### 反思的反思：v1.0 → v1.1 的修正

- **V4-D-1 数量修正**：v1.0 计 8 处 fallback，亲自跑 `rg` 后发现是 **10 处**（漏了 BroadcastModal 的 2 处）。说明即便我提出"操作 D"作为方法论，**初次执行也没有扫到底**——必须用 `rg "process\.env\.[A-Z_]+\s*\|\|"` 而不是依赖记忆。下一轮扫描时一定先跑命令再写表。

---

## 总览

| 优先级               | 主题                                                              | 任务数 | 预估工时       |
| -------------------- | ----------------------------------------------------------------- | ------ | -------------- |
| **V4-A** 真重复收敛  | webhook stock-recovery / 邮件 payload / CryptoSelector / 类型 union / RPC helper / MIME_TO_EXT | 8      | 5.5 h          |
| **V4-B** 排除区清理  | 完成 deprecated i18n / SupportedLocale 迁移 + 删除 wrapper        | 3      | 45 min         |
| **V4-C** 工程链      | 测试基建 + pre-commit hook 评估                                   | 2      | 30 min（评估）/ 4 h（实施可选） |
| **V4-D** 行为修正候选 | APP_URL fallback 默认值不一致 — 记录但不在 V4 改                  | 1      | —              |

**累计净减少代码估计**：
- V4-A：~280 LOC
  - V4-A-1 webhook helper -30
  - V4-A-2 NETWORK_NAMES -22
  - V4-A-3 CryptoOptionCard -50
  - V4-A-4 类型 union -25
  - **V4-A-5 webhook 邮件 payload 构造 -80**（新）
  - **V4-A-6 MIME_TO_EXT 共享 -8**（新）
  - **V4-A-7 RPC verify helper -15**（新）
  - **V4-A-8 OPTIONS 数组 评估为不做**（新）
- V4-B：~50 LOC
- V4-C：可能 +200 LOC（测试代码增量，不计入 net）

---

## V4-A · 真重复收敛（前三轮没扫到）

### V4-A-1 · `wayforpay-market` webhook 抽 file-local helper：扣库存 + CAS + 失败回滚

- [x] **位置**：`app/api/webhooks/wayforpay-market/route.ts`
  - 行 168-211（widget_load_failed 恢复，43 行）
  - 行 226-266（expired 恢复,40 行）
- **背景**：两段代码结构几乎一致：
  ```
  decrement_stock RPC
  if (失败) → log error 保留原状态
  else
    casUpdate(fromStatus)
    if (CAS 失败) → restore_stock + log warn
    else → actualPreviousStatus = fromStatus + log info
  ```
  唯一差异：`fromStatus` 是 `'widget_load_failed'` 或 `'expired'`，及 log 文案中的状态名。
- **拆分方案**：在文件内部（**不外提**）抽 file-local async helper：
  ```ts
  async function attemptStockRecoveryAndCAS(
    fromStatus: 'widget_load_failed' | 'expired'
  ): Promise<boolean> {
    // 内部：decrement_stock + casUpdate(fromStatus) + restore_stock 回滚
    // 返回是否成功匹配 fromStatus
  }
  ```
  调用点 2 处共减约 60 行，新 helper 约 30 行——**净减约 30 行**。
- **验收**：
  - 错误日志文案 byte-equal（保留 `'Re-decrement stock failed for widget_load_failed recovery'` / `'Re-decrement stock failed for expired recovery'` 两条不同的字面量）
  - decrement_stock + restore_stock 调用顺序不变
  - actualPreviousStatus 赋值时机不变
  - sandbox 实测：触发一次 widget_load_failed → paid 恢复 + 一次 expired → paid 恢复，确认库存补偿正确
- **风险**：低（同一文件内的纯搬运，不跨文件，不改公开接口）
- **工作量**：1 h

---

### V4-A-2 · 把 `NETWORK_NAMES` 表从 `CryptoSelector` 移到 `lib/payment/network-names.ts`

- [x] **位置**：`components/donate-form/CryptoSelector.tsx:22-47`
- **背景**：21 个区块链网络的展示名表 + `getNetworkDisplayName()` helper 当前嵌在 client component 文件顶部。这是数据，不是 UI。
- **动作**：
  1. 新建 `lib/payment/network-names.ts`，搬运 `NETWORK_NAMES` 常量 + `getNetworkDisplayName()` 函数
  2. CryptoSelector 改 `import { getNetworkDisplayName } from '@/lib/payment/network-names'`
- **验收**：
  - CryptoSelector 减少约 22 行
  - 三个网络的展示名（如 `trx → Tron (TRC20)`）渲染不变
- **风险**：极低（纯数据移动）
- **工作量**：10 min

---

### V4-A-3 · `CryptoSelector` 拆出 `<CryptoOptionCard>` 子组件

- [x] **位置**：`components/donate-form/CryptoSelector.tsx:268-329`（约 60 行的单 button card 实现）
- **背景**：列表项是包含 logo + name + Stablecoin 徽章 + network 名 + 选中钩标的复合 button，独立性强、纯展示。
- **动作**：
  1. 新建 `components/donate-form/widgets/CryptoOptionCard.tsx`，props：`{ currency: CurrencyInfo, isSelected: boolean, isLoading: boolean, onClick: () => void }`
  2. CryptoSelector 行 268-329 整段搬运
- **验收**：
  - className 字面量 byte-equal（含 `'border-2 ... ring-2 ring-emerald-500 ring-offset-1'` 等所有选中状态 token）
  - 切换币种、点击禁用、hover 三态视觉不变
  - CryptoSelector 减少约 50 行
- **风险**：极低（搬运式拆分纯展示子组件）
- **工作量**：30 min
- **注意**：与 V4-A-2 合并到同一 PR

---

### V4-A-5 · webhook 邮件 payload 构造代码统一（**v1.1 新增 · 操作 A 补扫**）

- [x] **位置**：
  - `app/api/webhooks/wayforpay/route.ts:179-236`（构造 `donationItems` → 调 `sendPaymentSuccessEmail`，58 行）
  - `app/api/webhooks/wayforpay/route.ts:239-273`（构造 `refundAmount` → 调 `sendRefundSuccessEmail`，35 行）
  - `app/api/webhooks/nowpayments/route.ts:196-271`（同一个 try 内两个 if-else 分支，等价于上面两段加起来 ~75 行）
- **背景**：两个 webhook 文件内构造 `donationItems` 数组的代码 **byte-equal 复制粘贴**——
  ```ts
  const projectIds = [...new Set(updatedDonations.map((d) => d.project_id))]
  const { data: projects } = await supabase.from('projects').select('id, project_name_i18n, location_i18n, unit_name_i18n, aggregate_donations').in('id', projectIds)
  const projectMap = new Map(projects.map((p) => [p.id, p]))
  const donationItems = updatedDonations.map((donation) => {
    const project = projectMap.get(donation.project_id)
    return {
      donationPublicId: donation.donation_public_id,
      projectNameI18n: (project?.project_name_i18n || { en: '', zh: '', ua: '' }) as { en: string; zh: string; ua: string },
      locationI18n: (project?.location_i18n || { en: '', zh: '', ua: '' }) as { en: string; zh: string; ua: string },
      unitNameI18n: (project?.unit_name_i18n || { en: '', zh: '', ua: '' }) as { en: string; zh: string; ua: string },
      amount: Number(donation.amount),
      isAggregate: project?.aggregate_donations === true,
    }
  })
  ```
  refund 邮件构造也是同一套字段抽取（projectNameI18n + donationIds + refundAmount）。**前三轮 V2-F-3 关注的是 webhook 解析层的 cross-file 共享，没看 webhook 内"业务执行层"。**
- **拆分方案**：在 `lib/email/` 下新建 `lib/email/build-webhook-payload.ts`：
  ```ts
  export async function buildPaymentSuccessPayload(
    supabase: ServiceClient,
    updatedDonations: DonationRow[],
    currency: string,
  ): Promise<PaymentSuccessEmailParams | null>

  export async function buildRefundSuccessPayload(
    supabase: ServiceClient,
    updatedDonations: DonationRow[],
    currency: string,
    refundReason?: string,
  ): Promise<RefundSuccessEmailParams | null>
  ```
  内部封装：projectIds → projects 查询 → projectMap → donationItems map / refundAmount 计算 → 返回最终 email params。
- **不动**：
  - 邮件参数字段集合 byte-equal（包括 `(... || { en: '', zh: '', ua: '' }) as ...` 这种 i18n cast 模式 6 次重复——保留行为 byte-equal）
  - currency 来源差异（wayforpay 用 `body.currency`，nowpayments 硬编码 `'USD'`）继续由调用方传入
  - refundReason 仅 wayforpay 有 → 在 buildRefundSuccessPayload 中 optional
  - sendPaymentSuccessEmail / sendRefundSuccessEmail 调用面不变
- **验收**：
  - 两个 webhook 文件各减约 30-40 行
  - 抽出 helper ~70 行（净减约 30-50 行的实质重复）
  - 真实 webhook payload 重放测试（手动构造 sample paid + refund webhook 请求 → 跑两条流程 → 对比 sendXxxEmail 实际收到的参数 byte-equal）
  - 三种 locale × paid email + refund email = 6 组邮件实际发送对比（重构前/后 fixture）
- **风险**：**中**（涉及邮件 payload 字段集合，错一个字段会让用户收到错误内容；但 sender 函数签名严格类型，type-check 兜底）
- **工作量**：2 h
- **价值**：**这是 V4 真正的硬骨头**——前三轮三次扫描全部漏了。webhook 文件读起来很长，因为这两段重复代码占了 1/3 篇幅。

---

### V4-A-6 · `MIME_TO_EXT` 从 `admin/_helpers.ts` 下沉到 `lib/file-validation.ts`（**v1.1 新增 · 操作 B 补扫**）

- [x] **位置**：
  - `app/actions/admin/_helpers.ts:15-22`（V3-B-1 抽出，admin 内部用）
  - `app/actions/market-order-files.ts:11-18`（独立定义，与 _helpers 版本 byte-equal）
- **背景**：V3-B-1 在 admin.ts 拆分时整合了 admin/* 内部 6 处 sharp + MIME 重复，但**没看到 `market-order-files.ts` 也有完全相同的 MIME 表**。这是"模块边界盲区"——拆分一个模块时只看模块内，没扫横向使用同一逻辑的 sibling。
- **动作**：
  1. 把 MIME_TO_EXT 表移到 `lib/file-validation.ts`（已有 IMAGE_TYPES / VIDEO_TYPES / MAX_MEDIA_FILE_SIZE 共享常量，是合理的下沉地点）
  2. `_helpers.ts` 改为 `export { MIME_TO_EXT } from '@/lib/file-validation'`（保留 admin 侧 import 兼容）
  3. `market-order-files.ts` 改为 `import { MIME_TO_EXT } from '@/lib/file-validation'`，删除本地定义
- **不做**：
  - **不动** `generateAndUploadThumbnail` —— 它带 sharp 依赖 + 上传到 `donation-results` bucket，是 admin-private 的，留在 `_helpers.ts`
  - **不动** market-order-files.ts 内的 `MAGIC_BYTES`（与 admin 端不重复，且包含安全语义）
- **验收**：
  - 全仓 `rg "MIME_TO_EXT"` 仅一处定义（`lib/file-validation.ts`），其余皆 import
  - admin 上传图片/视频 + market 订单上传图片/视频两条路径文件扩展名生成 byte-equal
- **风险**：极低（纯常量移动，引用方都通过 import）
- **工作量**：15 min

---

### V4-A-7 · `track-donation.ts` 内的 RPC verify helper（**v1.1 新增 · 操作 A 补扫**）

- [x] **位置**：`app/actions/track-donation.ts`
  - 行 44-58（`trackDonations()` 内）：`rpc('get_donations_by_email_verified', { p_email, p_donation_id })` + 错误处理 + 空数组处理 + `as DonationByContactRow[]` cast
  - 行 107-122（`requestRefund()` 内）：同一 RPC + 同一 cast 模板（差异：参数名 `donationId` vs `donationPublicId`、错误返回字符串）
- **背景**：File-internal cross-block 重复——同一文件内两个函数各自调同一 RPC + 同一 cast，前三轮做的是 cross-file 比对，没看 file-internal。
- **动作**：抽 file-local async helper（**不外提到 lib**——RPC 名称是 track-donation 模块的内部细节）：
  ```ts
  async function fetchVerifiedDonationsByEmail(
    email: string,
    donationId: string,
  ): Promise<{ ok: true; donations: DonationByContactRow[] } | { ok: false; reason: 'not_found' | 'rpc_error' }> {
    const supabase = getPublicClient()
    const { data, error } = await supabase.rpc('get_donations_by_email_verified', {
      p_email: email,
      p_donation_id: donationId,
    })
    if (error) return { ok: false, reason: 'rpc_error' }
    if (!data || data.length === 0) return { ok: false, reason: 'not_found' }
    return { ok: true, donations: data as DonationByContactRow[] }
  }
  ```
  两处调用面瘦身约 8 行 × 2 = 16 行；helper ~10 行；**净减约 6 行 + 类型/错误处理一致性**。
- **不做**：
  - **不动** 外层错误返回字符串（`'donationNotFound'` / `'serverError'`）—— 这是客户端 i18n key
  - **不动** `getPublicClient()` 用法（每个函数独立创建是合理的——webhook/server action 边界惯例）
- **验收**：
  - 两个函数主体行数减少
  - 错误返回结构 byte-equal
  - 触发"邮箱+订单号匹配"+"邮箱+订单号不匹配"+"RPC 错误"三种 case，行为不变
- **风险**：极低（同文件内的 helper，纯搬运）
- **工作量**：20 min

---

### V4-A-8 · 评估：`AMOUNT_OPTIONS / QUANTITY_OPTIONS / TIP_OPTIONS` 硬编码数组（**v1.1 新增 · 操作 B 补扫**）

- [ ] **位置**：
  - `components/donate-form/sections/AmountQuantitySection.tsx:8-9`（`AMOUNT_OPTIONS = [10, 50, 100, 500]` / `QUANTITY_OPTIONS = [1, 2, 5, 10]`）
  - `components/donate-form/sections/TipSection.tsx:19`（`TIP_OPTIONS = [5, 10, 20]`）
- **背景**：3 个产品配置数组住在 component 文件顶部。是数据，不是 UI。
- **决定**：**评估后不做**——
  - 这些数字是产品配置，不是技术常量。改一个数字（如 `[10, 50, 100, 500]` → `[20, 100, 500, 1000]`）会直接影响用户交互，需要产品侧确认。
  - 移到 `lib/donation-config.ts` 之类的位置只是位置变化，不会带来共享或共用收益（每个数组只在一处用）。
  - 如未来需要 admin 后台动态配置这些数字，再做下沉。
- **记录**：列入"已扫描但不做"。说明操作 B 不是"扫到的就一定要抽"——还要看是否带来共享/可配置收益。

---

### V4-A-4 · 合并 `WayForPayPaymentResult` 与 `NowPaymentsResult` 的失败分支类型

- [x] **位置**：`app/actions/donation.ts:22-77`
- **背景**：两个返回类型的 `success: false` 分支高度重叠：
  ```
  共同失败分支：
    'quantity_exceeded'  + remainingUnits + unitName + allProjectsStats
    'amount_limit_exceeded' + maxQuantity + unitName + allProjectsStats
    'project_not_found' / 'project_not_active' / 'server_error' + allProjectsStats?
  仅 NowPayments 多：'api_error' + message + allProjectsStats
  ```
- **动作**：
  1. 抽出公共 union 类型：
     ```ts
     type DonationFailure =
       | { success: false; error: 'quantity_exceeded'; remainingUnits: number; unitName: string; allProjectsStats: ProjectStats[] }
       | { success: false; error: 'amount_limit_exceeded'; maxQuantity: number; unitName: string; allProjectsStats: ProjectStats[] }
       | { success: false; error: 'project_not_found' | 'project_not_active' | 'server_error'; allProjectsStats?: ProjectStats[] }
     ```
  2. `WayForPayPaymentResult = SuccessShape | DonationFailure`
  3. `NowPaymentsResult = NowSuccessShape | DonationFailure | { success: false; error: 'api_error'; message: string; allProjectsStats: ProjectStats[] }`
- **不动**：错误代码字符串字面量（`'quantity_exceeded'` 等被客户端 switch case 用）；`asActionError<T>` 实现保留。
- **验收**：
  - type-check 通过（客户端调用方的 narrowing 不被破坏）
  - 错误返回字段集合 byte-equal
  - donation.ts 类型声明段从 ~55 行 → ~30 行
- **风险**：低（仅类型定义重组，无运行时代码变化）
- **工作量**：30 min

---

## V4-B · 完成支付排除区的 deprecated 迁移

V1-P1-10 / V2-B-1 / V3-D-2 都做了 deprecated i18n API 与 `SupportedLocale` 的迁移，但每轮都把支付排除区文件留下来不动。V4 不再设排除区，本节一次清完。

### V4-B-1 · 迁移残余 `getProjectName / getLocation / getUnitName` 调用

- [x] **剩余 6 处**（V3-D-2 审计结果）：
  - `components/donate-form/DonationFormCard.tsx:9, 64, 67, 70`（4 处 import + 调用）
  - `app/actions/donation/_shared.ts:1, 136, 217`（2 处调用）
- **动作**：批量替换为 `getTranslatedText(field_i18n, fallbackText, locale)`，三函数实现就是 `getTranslatedText` 的薄壳，输出 byte-equal。
- **验收**：
  - `rg "getProjectName\(|getLocation\(|getUnitName\(" -g '!lib/i18n-utils.ts'` 0 命中
  - 三种语言下展示与重构前一致
  - 5 个项目 × 3 locale 的捐赠表单渲染、支付参数生成均 byte-equal
- **风险**：极低（三函数均为单行 wrapper，调用语义完全相同）
- **工作量**：15 min

---

### V4-B-2 · 迁移残余 `SupportedLocale` 类型引用到 `AppLocale`

- [x] **剩余 7 处**（V3-D-2 审计结果，实际执行时发现 14 处——DonationFormCard 内额外 4 处 `locale as SupportedLocale` 调用 v1.1 文档漏列）：
  - `app/api/webhooks/wayforpay/route.ts:10, 222, 258`
  - `app/api/webhooks/nowpayments/route.ts:9, 242, 264`
  - `components/donate-form/DonationFormCard.tsx:9, 64, 67, 70`（与 V4-B-1 同位置）
- **动作**：`import type { SupportedLocale } from '@/lib/i18n-utils'` → `import type { AppLocale } from '@/types'`；调用点 `as SupportedLocale` → `as AppLocale`。
- **验收**：
  - 全仓 `rg "SupportedLocale"` 仅命中 `lib/i18n-utils.ts` 自身的 `@deprecated` 类型别名定义（V4-B-3 会清理）
  - type-check 通过
- **风险**：极低（`SupportedLocale` 当前定义就是 `export type SupportedLocale = AppLocale`）
- **工作量**：10 min

---

### V4-B-3 · 删除 `lib/i18n-utils.ts` 中的 deprecated 三个 wrapper + `SupportedLocale` 别名

- [x] **位置**：`lib/i18n-utils.ts:9-12`（`SupportedLocale` 别名）+ `:32-51`（三个 wrapper）
- **前置依赖**：V4-B-1 + V4-B-2 全部完成
- **动作**：
  1. 删除 `export type SupportedLocale = AppLocale`（3 行）
  2. 删除 `getProjectName` / `getLocation` / `getUnitName` 三个 wrapper（共 24 行）
- **验收**：
  - `lib/i18n-utils.ts` 从 91 行 → ~64 行
  - 全仓 type-check 通过 / lint 全绿 / build 成功
- **风险**：极低（前置任务完成后无引用方）
- **工作量**：5 min

---

## V4-C · 工程链短板（评估为主，是否实施留待决定）

### V4-C-1 · 评估引入 vitest 最小测试基建

- [x] **背景**：V2-F-4 / V2 V3 多次以"项目无测试框架"为由跳过纯函数 fixture 测试。本任务**仅做评估**，列出引入成本与覆盖目标，是否实施由用户决定。
- **当前状态**：`package.json` 无 jest / vitest / playwright / mocha / @testing-library 任何依赖；`tsc/lint/build/format` 是唯一行为护栏；支付签名 / 状态映射 / 库存补偿全部靠手动 sandbox smoke 验证。
- **如实施**，建议范围（不做端到端测试，仅 unit）：
  | 测试目标 | 文件 | 价值 |
  | --- | --- | --- |
  | `generateSignature` (HMAC-MD5 拼接 + hex) | `lib/payment/wayforpay/server.ts` | 任何签名拼接改动 → 立刻失败 |
  | `verifyWayForPaySignature` 反向验证 | 同上 | 防止 webhook 验签崩 |
  | `sortObjectKeys` (递归排序，IPN 验签前置) | `lib/payment/nowpayments/server.ts` | 防 IPN 漏验 |
  | `verifyNowPaymentsSignature` | 同上 | 同上 |
  | `getNextAllowedStatuses` / `isValidAdminTransition` | `lib/donation-status.ts` | 状态机改动护栏 |
  | `clampAmount` (DonationFormCard 内联) | 也可顺势抽到 `lib/utils.ts` | 表单边界值测试 |
  | `formatCountdown` | `lib/payment/format-countdown.ts` | 纯函数 |
- **不做事项**：
  - 不引入 Playwright / E2E
  - 不写 React component 测试（@testing-library 加了反而增加心智负担）
  - 不强制 100% 覆盖，仅覆盖**改一字节就崩**的纯逻辑
- **预估成本**：vitest 配置 ~30 min；7 个测试套件 fixture 准备 + 编写 ~3 h
- **决策依据**：未来某次签名 helper 抽取 / 状态机扩展时，没有 fixture 测试 → 必须每次都跑 sandbox 实测（每次至少 30 min）。引入测试后的边际成本 < 累积人工实测成本（按 ~5 次未来改动估算，回本约 3-4 h）。
- **建议**：**做**——但作为单独 PR，不混入 V4-A/B 的常规重构。
- **工作量**：30 min（评估）/ 3.5 h（实施，可选）

---

### V4-C-2 · 评估 husky + lint-staged

- [ ] **背景**：当前 commit 不跑任何检查；`tsc/lint/format:check/build` 都靠人手或 Vercel build 拦截。
- **如实施**：
  ```json
  // package.json
  "husky": "^x", "lint-staged": "^x",
  "lint-staged": {
    "*.{ts,tsx}": ["prettier --check", "eslint --max-warnings 0"]
  }
  ```
  + `.husky/pre-commit` 跑 `npx lint-staged` + `npm run type-check`（type-check 不能 staged，必须全量）。
- **不做事项**：
  - 不在 pre-push 跑 build（太慢，~ 60 s）
  - 不 block 没改动的文件
- **风险**：低（hook 装错可以 `git commit --no-verify` 紧急绕过）
- **工作量**：20 min（评估）/ 30 min（实施，可选）
- **建议**：**做**——但作为 V4-C-1 之后的下一个独立 PR。

---

## V4-D · 行为修正候选（不在 V4 重构范围）

### V4-D-1 · `NEXT_PUBLIC_APP_URL` fallback 默认值不一致（**v1.1 修正：8 → 10 处**）

- [x] **位置**（v1.1 用 `rg "process\.env\.NEXT_PUBLIC_APP_URL\s*\|\|"` 重扫 共 10 处，v1.0 漏了 BroadcastModal 2 处）：

  | 文件                                          | fallback 默认值                          |
  | --------------------------------------------- | ---------------------------------------- |
  | `app/[locale]/opengraph-image.tsx:18`         | `'https://waytofutureua.org.ua'`         |
  | `app/actions/donation.ts:119`                 | `'http://localhost:3000'`                |
  | `app/actions/donation.ts:245`                 | `'http://localhost:3000'`                |
  | `lib/payment/wayforpay/server.ts:15`          | `'http://localhost:3000'`                |
  | `lib/market/wayforpay.ts:13`                  | `'http://localhost:3000'`                |
  | `lib/email/broadcast.ts:39`                   | `'http://localhost:3000'`                |
  | `lib/email/utils.ts:41`                       | `'https://waytofutureua.org.ua'`         |
  | `lib/email/utils.ts:49`                       | `'https://waytofutureua.org.ua'`         |
  | **`components/admin/BroadcastModal.tsx:143`** | `'http://localhost:3000'`                |
  | **`components/admin/BroadcastModal.tsx:156`** | `'http://localhost:3000'`                |

- **背景**：7 处 fallback 是 `localhost:3000`，3 处是 `https://waytofutureua.org.ua`。任何环境下 `NEXT_PUBLIC_APP_URL` 没设置时，前者会把 webhook serviceUrl / 邮件链接 / 邮件预览 URL 生成成 `http://localhost:3000`——**Vercel CI 出错或 misconfig 时是潜在 bug**。
- **为什么不在 V4 范围**：统一 fallback 是**行为变化**（默认值变更）。V4 底线是"0 业务行为变化"，所以本项**不做**，仅记录。
- **建议下一步**：单独建一个非重构 PR，统一 fallback 为 `'https://waytofutureua.org.ua'`，并在 `.env.example` 写明本地开发需要显式覆盖为 `http://localhost:3000`。
- **风险评估（如做）**：低（生产环境正常情况下 `NEXT_PUBLIC_APP_URL` 已在 Vercel 环境变量配置；本地 `.env.local` 也总是设置；问题仅暴露在 CI / misconfig 边缘场景）
- **工作量（如做）**：30 min

---

## 已扫描但**仍不做**的项

V4 显式回头复审了 V2/V3 的"已扫描但不做"列表，下表仅列**判定有变化或在 V4 期重新评估的项**。

| 跳过项                                                          | V4 判定                                                                                                                                                                                                                                                                                                                                                                            |
| --------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **V2-E-2 反转重审**：`WayForPayWidget` vs `MarketPaymentWidget` 合并外壳 | **维持不做**。亲自对比两文件代码：DonateFlow 用 `space-y-6 p-6 / rounded-lg / border-2 / px-6 py-3 / SpinnerIcon h-12`；Market 用 `rounded-xl border bg-white shadow-sm / gradient header / border-[3px] 自定义 spinner / px-5 py-3 / 紧凑间距`。是两套**故意区分**的设计语言（Donate 更醒目，Market 更紧凑），强行合并会破坏视觉。`useWayForPayWidgetLifecycle` hook 已抽走纯逻辑，残余的差异本质是设计差异。 |
| **V2-E-3 反转重审**：NowPayments 内联 CopyButton 合并到全局 CopyButton  | **维持不做**。亲自对比：内联版 `bg-emerald-100 px-3 py-1.5 rounded-lg gap-1.5 + stroke check`；全局版 `bg-ukraine-blue-500 shadow-lg px-4 py-2.5 rounded-xl + fill check + transform active:scale-95`。圆角、padding、shadow、icon style 全部不同，是两个独立设计，要 0 视觉变化必须保留两份。让全局 CopyButton 加一个新 variant 来"合并"——本质是新加 variant 不是合并。                                |
| **V2-F-2 反转重审**：5 个 WayForPay 签名函数抽 hmacMd5Concat helper       | **维持不做**。重新 grep `crypto.createHmac('md5'`：仅在 `generateSignature` 一处出现，4 个验签函数都通过调 `generateSignature(values)` 复用——已经是单一 HMAC 实现源。再抽 helper 反而需要包装两层。判定不变。                                                                                                                                                                       |
| **V2-F-3 反转重审**：`parseAndVerifyWayForPayWebhook` 抽出共享前置        | **维持不做**。两个 webhook：donation 是"签名验证 → 状态映射 → DB update"线性流；market 多两道前置（namespace `MKT-` check + merchantAccount 校验），且后续是"CAS 三步尝试 + 库存补偿"恢复流。前置差异是协议要求（防止 donation 回调误入 market 端点），抽 helper 必须参数化"前置规则"反而更复杂。`respondWithAccept` 已通过 V2-F-3 部分实施抽取。判定不变。                       |
| `donation/_shared.ts` 与 `market-sale.ts` 管道融合              | **维持不做**。前置流程相似但执行路径异构：donation 走"检查 + 创建 N 条 quantity 记录"；market 走"`decrement_stock` RPC 原子操作 + 创建 1 条订单"。订单参考格式 `DONATE-${id}-${ts}-${random}` vs `MKT-${ts}-${randomBytes(8)}` 不同（webhook 端用 prefix 做 namespace check，必须保留差异）。判定不变。                                                                              |
| `DonationFormCard` 进一步抽 `useDonationForm` hook              | **维持不做**。V2-E-1 计划文档已明确判定："state 与 handler 高度耦合（`activeProjectIdRef` + `setProcessingState` 在异步回调内交错使用），抽 hook 反而复杂化"。V4 重新审视，validateForm 内 6 段校验都和 `showFieldError + ref` 耦合，抽出后变薄壳。判定不变。                                                                                                                       |

**新发现但不应做的（首次记录）**：

| 跳过项                                                          | 理由                                                                                                                                                                                                                            |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| webhook 文件顶部抽 `LOG_CATEGORY = 'WEBHOOK:WAYFORPAY-MARKET'` 常量 | wayforpay-market route 内 17 处 `logger.x('WEBHOOK:WAYFORPAY-MARKET', ...)`、wayforpay route 内 14 处 `logger.x('WEBHOOK:WAYFORPAY', ...)`。抽常量减约 30 处字符串重复。**评估后不做**：边际收益小，且常量不在公共 lib 又难以跨文件共享，反而变成噪音。 |
| donation/`_shared.ts` 中 `WAYFORPAY_LANG_MAP`（locale → UA/EN）vs market 中同名 map 合并 | donation 在 `donation.ts:112-116` 用 if-else 链，market 在 `lib/market/wayforpay.ts:15-19` 用 const 表。两份字段值相同（`{en: 'EN', zh: 'EN', ua: 'UA'}`）但调用面只有 2 处。抽出收益 ~5 行，但需要新建 `lib/payment/locale-map.ts`，比直接维护两份成本高。判定**不做**。 |
| `DonationFormCard` 内 `clampAmount` 抽到 `lib/utils.ts`            | 当前是 file-local 纯函数，仅在 DonationFormCard 一处使用。抽出后若有人在他处用相同 clamp 逻辑可复用，但当前无第二处需求。**仅在 V4-C-1 测试任务实施时一并外提（顺便做单元测试）**。判定**条件性**——不在 V4-A 范围。                                                  |
| `lib/email/templates/base/components.ts` 内 `createInfoBox / createSuccessBox / createActionBox / createErrorBox` 4 个 box 函数参数化合并（**v1.1 新增**） | 4 个函数结构相似（table > tr > td gradient bg），仅颜色 + 字号不同。**评估后不做**：邮件 box 是品牌视觉资产，每种颜色对应独立语义（gold=info, green=success, blue=action, warm=error）；强行参数化 5 个色值变成"配置比代码长"。每个函数只 ~12 行，维护成本不高。 |
| `track-donation.ts` 内 `(donations as DonationByContactRow[]).map(d => ({ ..., projects: { ... d 字段 ... }}))` 这种"flat row → nested projects 字段"重复（**v1.1 评估**） | 行 61-73 仅出现一次（trackDonations 内）；requestRefund 不构造 nested 结构。判定**不做**——只 1 处使用，抽 helper 反而多一层。 |
| messages/{en,zh,ua}.json key 完整性检查（**v1.1 验证**） | 用 Python 脚本递归对比 786 个 key 三 locale 完全对齐。**判定无问题**，记录验证结果。 |
| public/content/projects/*.json schema 一致性（**v1.1 验证**） | 同一 project 三 locale 字段完全一致；不同 project schema 不同（合理，每项目 unique）。**判定无问题**。 |

---

## 执行建议

### 推荐顺序（最低返工）

1. **先做支付路径的 deprecated 清理（极低风险）**
   - V4-B-1（getProjectName/Location/UnitName 迁移）
   - V4-B-2（SupportedLocale 类型迁移）
   - V4-B-3（删除 deprecated wrapper + 类型别名）
   - 这三条可以合到一个 PR，因为 V4-B-3 依赖前两条全部完成
2. **再做真重复收敛**
   - V4-A-1（webhook stock-recovery helper）—— 单独 PR，需 sandbox 测试 widget_load_failed → paid 与 expired → paid 两条恢复路径
   - V4-A-2 + V4-A-3（CryptoSelector 拆分）—— 合 PR
   - V4-A-4（类型 union 合并）—— 单独小 PR
3. **最后做工程链评估（决定后单独立项）**
   - V4-C-1（vitest 评估）+ V4-C-2（husky 评估）合 1 个评估 PR / 决策记录

### 每个 PR 的验证清单

- [ ] `npm run type-check` 通过
- [ ] `npm run lint` 全绿
- [ ] `npm run format:check` 通过
- [ ] `npm run build` 成功
- [ ] 手动 smoke：
  - 首页 / 捐赠流程（5 项目 × 3 locale 选 1-2 组合走到 widget 加载，不必真实付款）
  - 加密货币流（CryptoSelector 选 BTC / USDT-TRC20 / ETH 三个），看 logo / 选中态 / 最小额度提示
  - 义卖订单流走到 widget 加载
- [ ] **V4-A-1 专项**：sandbox 触发 widget_load_failed → 人工在 wayforpay 后台触发 paid 回调 → 确认库存重新扣减；人工触发 expired → paid 同样验证
- [ ] **V4-B 专项**：跑一遍邮件发送（sendPaymentSuccessEmail / sendRefundSuccessEmail / sendMarketOrderPaidEmail）确认三种 locale 文案展示与重构前一致
- [ ] 关键 className token 命中数（`rg "rounded-xl border-2 border-emerald"` 等）拆分前后一致

### PR 拆分

- **PR-1**："V4 deprecated i18n 完成迁移"：V4-B-1 + V4-B-2 + V4-B-3（共 30 min）
- **PR-2**："V4 MIME_TO_EXT 共享 + RPC verify helper"：V4-A-6 + V4-A-7（共 35 min · 极低风险）
- **PR-3**："V4 wayforpay-market webhook stock-recovery helper"：V4-A-1（1 h，**含 sandbox 验证**）
- **PR-4**："V4 webhook 邮件 payload 构造统一"：V4-A-5（2 h，**含 webhook payload 重放 + 6 组邮件 fixture 对比**）—— V4 最大风险项，单独 PR，单独部署观察
- **PR-5**："V4 CryptoSelector 拆分"：V4-A-2 + V4-A-3（40 min）
- **PR-6**："V4 donation result 类型 union 合并"：V4-A-4（30 min）
- **PR-7**（可选）："V4 测试基建评估文档" 或直接 "V4 引入 vitest 最小覆盖"：V4-C-1
- **PR-8**（可选）："V4 husky pre-commit hook"：V4-C-2

### v1.1 推荐执行顺序更新

按风险递增：
1. PR-1（deprecated 清理，极低风险，前置）
2. PR-2（共享常量 + RPC helper，极低风险）
3. PR-5 + PR-6（CryptoSelector 拆 + 类型 union，低风险）
4. PR-3（webhook stock-recovery，含 sandbox 实测）
5. PR-4（webhook 邮件 payload，**最高风险**——单独部署，观察 24h 邮件投递无误后再做下一步）
6. PR-7 / PR-8（工程链，独立项）

---

## 完成后的预期效果

- **代码量**：估算净减少 ~330 LOC（v1.1 修正：v1.0 估 200，v1.1 加 V4-A-5 ~ V4-A-7 后增至 330）
  - V4-A-1：webhook stock-recovery 模板 -30
  - V4-A-2：NETWORK_NAMES 移到 lib -22（CryptoSelector 主体）
  - V4-A-3：CryptoOptionCard 拆出 -50（CryptoSelector 主体）
  - V4-A-4：类型 union 合并 -25
  - **V4-A-5：webhook 邮件 payload 构造统一 -80**（v1.1 新增 · 最大单项收益）
  - **V4-A-6：MIME_TO_EXT 共享 -8**（v1.1 新增）
  - **V4-A-7：track-donation RPC verify helper -15**（v1.1 新增）
  - V4-B-1/2：调用面缩短 -20（去掉 `as SupportedLocale` 与 wrapper 调用）
  - V4-B-3：i18n-utils.ts -27（deprecated 三 wrapper + SupportedLocale 别名）
- **可维护性**：
  - 所有 `getProjectName / getLocation / getUnitName` 调用面消除（统一 `getTranslatedText`）
  - `SupportedLocale` 类型别名彻底删除（统一 `AppLocale`）
  - wayforpay-market webhook stock-recovery 模式从 2 副本 → 1 helper
  - **wayforpay/route.ts 与 nowpayments/route.ts 邮件 payload 构造从 2 副本 → 1 lib（V4 最大单项收益）**
  - CryptoSelector 数据层（NETWORK_NAMES）与 UI 层分离，列表项独立
  - **MIME_TO_EXT 表单点定义（admin + market 共享）**
  - **track-donation RPC + cast 模板单点定义**
  - donation.ts 类型声明更紧凑
- **0 用户感知**：视觉、交互、文案、URL、API 响应字段、签名字节、orderReference 格式、状态机映射、邮件 payload 字段集合均不变
- **必须的护栏**：
  - V4-A-1 必须含 sandbox 实测（widget_load_failed → paid 恢复 + expired → paid 恢复）
  - **V4-A-5 必须含 webhook payload 重放 + 6 组邮件 fixture 对比**（重构前 / 重构后两套 fixture 字段 byte-equal）
  - V4-B 全部完成后跑一遍三 locale 的邮件发送
- **遗留候选项**（不在 V4 范围）：
  - V4-D-1：`NEXT_PUBLIC_APP_URL` fallback 默认值统一（属行为修正，需单独 PR）
  - V4-C-1 / V4-C-2：测试基建 + pre-commit hook（评估完成后单独立项）

---

## 元层面：V5 还可能存在哪些盲区？

V4 v1.1 已覆盖："操作 A / B / C / D"（file-internal cross-block / 数据常量散布 / action 返回类型 union / 环境变量 fallback）。但 V5 可能还需要新的扫描操作：

- **操作 E**：**SQL migration 与代码使用面 cross-cut**——`supabase/migrations/` 中的 RLS policy / RPC 签名 / 触发器，是否在代码侧有遗漏调用或额外验证？V4 没扫这一层。
- **操作 F**：**死代码/孤儿 export 审计**——拆分了 4-5 轮后，是否产生了不再被引用的 export / type / file？需要 `ts-prune` 或类似工具。
- **操作 G**：**第三方依赖版本 + bundle 大小审视**——`package.json` 是否有可移除/可替换的重型依赖？V4 没碰。
- **操作 H**：**a11y / SEO 微层面**——所有 form 字段是否有 `aria-*`、所有图片是否有 `alt`、Open Graph 元数据是否齐全？V1-V3-V4 都没系统扫。
- **操作 I**：**Supabase RLS policy 与 server action 期望权限的一致性**——是否有 action 调用 service_role 但 RLS 已经允许该操作的情况？反向：是否有 action 用 anon client 但 RLS 实际禁止？

这一节的存在本身是反思的产物——V4 写完后才意识到上面这些维度从未被审视过。V5 启动前应先用这五个操作做一遍全仓扫描。

---

## 变更记录

| 日期       | 任务 ID | 执行人 | 备注                                                                                                                                                                                            |
| ---------- | ------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-05-01 | —       | Claude | V4 初版（v1.0）创建                                                                                                                                                                              |
| 2026-05-01 | —       | Claude | v1.0 → v1.1：自反思后总结 4 个具体扫描操作（A/B/C/D），用这些操作再扫一遍补缺；新增 V4-A-5（webhook 邮件 payload 构造统一）/ V4-A-6（MIME_TO_EXT 共享）/ V4-A-7（RPC verify helper）/ V4-A-8（OPTIONS 数组评估为不做）；修正 V4-D-1 计数（8 → 10 处）；新增"元层面 V5 盲区候选"章节（操作 E-I） |
| 2026-05-01 | V4-D-1  | Claude | 10 处 `NEXT_PUBLIC_APP_URL` fallback 全部统一为 `'https://waytofutureua.org.ua'`（原 7 处 localhost / 3 处生产域名）。`.env.example` 加注释提示本地开发需显式覆盖为 `http://localhost:3000`。type-check + lint 通过。 |
| 2026-05-01 | V4-B-1  | Claude | 5 处 `getProjectName/Location/UnitName` 调用全部替换为 `getTranslatedText`（_shared.ts 2 处 + DonationFormCard 3 处）。 |
| 2026-05-01 | V4-B-2  | Claude | 14 处 `SupportedLocale` 全部替换为 `AppLocale`（webhook 6 处 + DonationFormCard 8 处，比文档原估的 7 处多 7 处——DonationFormCard 内 4 处 `locale as SupportedLocale` 调用与 webhook 双 cast 文档低估）。 |
| 2026-05-01 | V4-B-3  | Claude | 删除 `lib/i18n-utils.ts` 中 `SupportedLocale` 别名 + 三个 deprecated wrapper。文件 91 → 65 行（-26 LOC）。type-check + lint + prettier + build 全绿。 |
| 2026-05-01 | V4-A-6  | Claude | `MIME_TO_EXT` 下沉到 `lib/file-validation.ts`（IMAGE_TYPES/VIDEO_TYPES/MAX_MEDIA_FILE_SIZE 同侧）。`admin/_helpers.ts` 删除该 export，`admin/donation-files.ts` + `market-order-files.ts` 直接 import 共享常量——比文档建议的 re-export 更干净。 |
| 2026-05-01 | V4-A-7  | Claude | `track-donation.ts` 内抽 file-local helper `fetchVerifiedDonationsByEmail`（discriminated union 区分 `not_found` / `rpc_error`），trackDonations + requestRefund 两处 RPC 调用模板收敛。type-check + lint + prettier + build 全绿。 |
| 2026-05-01 | V4-A-2  | Claude | `NETWORK_NAMES` 表 + `getNetworkDisplayName` 移到新文件 `lib/payment/network-names.ts`。CryptoSelector 删除 27 行数据 + helper。 |
| 2026-05-01 | V4-A-3  | Claude | 抽出 `components/donate-form/widgets/CryptoOptionCard.tsx`（props: currency / isSelected / isLoading / onClick），className byte-equal。CryptoSelector 列表段从 ~60 行 → 8 行。 |
| 2026-05-01 | V4-A-4  | Claude | 抽出公共类型 `DonationFailure`，`WayForPayPaymentResult` / `NowPaymentsResult` 共用失败分支。NowPayments 仍保留独有的 `api_error` 分支。type-check + lint + prettier + build 全绿。 |
| 2026-05-01 | V4-A-1  | Claude | wayforpay-market webhook 抽 file-local helper `attemptStockRecoveryAndCAS`（itemId/quantity 显式传参以保留 TS narrow），widget_load_failed → paid 与 expired → paid 两条恢复路径合一。日志文案使用模板字符串保持输出 byte-equal。**仍需 sandbox 实测**两条恢复路径。 |
| 2026-05-01 | V4-A-5  | Claude | 新建 `lib/email/build-webhook-payload.ts`：`buildPaymentSuccessPayload` + `buildRefundSuccessPayload` 收敛 wayforpay/route.ts 与 nowpayments/route.ts 内"projectIds → projects 查询 → projectMap → donationItems / refundAmount → email params"模板。两个 webhook 各减约 60 行。NowPayments 移除 `import type { AppLocale }`（已下沉到 helper）。**最高风险项，仍需 webhook payload 重放 + 6 组邮件 fixture 对比**。 |
