# 捐赠状态系统技术文档

> 本文档详细描述捐赠状态的定义、流转规则、数据库约束和相关代码实现

**文档版本**: 3.0.0
**最后更新**: 2026-03-28

---

## 目录

1. [概述](#1-概述)
2. [状态定义](#2-状态定义)
3. [状态分组与计数](#3-状态分组与计数)
4. [状态流程图](#4-状态流程图)
5. [状态转换规则](#5-状态转换规则)
6. [WayForPay 状态映射](#6-wayforpay-状态映射)
7. [数据库实现](#7-数据库实现)
8. [状态历史审计](#8-状态历史审计)
9. [应用层实现](#9-应用层实现)
10. [UI 组件](#10-ui-组件)
11. [国际化](#11-国际化)
12. [约束分析与一致性检查](#12-约束分析与一致性检查)
13. [相关文件索引](#13-相关文件索引)
14. [附录](#14-附录)

---

## 1. 概述

本系统使用 **14 种捐赠状态** 来追踪捐赠的完整生命周期，从创建到完成或退款。状态系统涵盖：

- 支付前状态（用户创建订单但未完成支付）
- 处理中状态（支付网关处理中）
- 已支付状态（支付成功后的履约流程）
- 失败状态（支付失败的各种情况）
- 退款状态（退款请求和处理）

### 1.1 状态代码速查表

```
┌─────────────────────┬────────────────────┬─────────┬─────────┬──────────┐
│ 状态                 │ 变化来源            │ 计入进度 │ 公开可见 │ 可退款    │
├─────────────────────┼────────────────────┼─────────┼─────────┼──────────┤
│ pending             │ 用户创建            │ ❌       │ ❌       │ ❌        │
│ widget_load_failed  │ 客户端              │ ❌       │ ❌       │ ❌        │
│ processing          │ Webhook            │ ❌       │ ❌       │ ❌        │
│ fraud_check         │ Webhook            │ ❌       │ ❌       │ ❌        │
│ paid                │ Webhook            │ ✅       │ ✅       │ ✅        │
│ confirmed           │ Admin              │ ✅       │ ✅       │ ✅        │
│ delivering          │ Admin              │ ✅       │ ✅       │ ✅        │
│ completed           │ Admin + 文件上传    │ ✅       │ ✅       │ ❌        │
│ expired             │ Webhook            │ ❌       │ ❌       │ ❌        │
│ declined            │ Webhook            │ ❌       │ ❌       │ ❌        │
│ failed              │ Webhook            │ ❌       │ ❌       │ ❌        │
│ refunding           │ 用户请求 / API      │ ❌       │ ❌       │ ❌        │
│ refund_processing   │ Webhook / API      │ ❌       │ ❌       │ ❌        │
│ refunded            │ Webhook / API      │ ❌       │ ❌       │ ❌        │
└─────────────────────┴────────────────────┴─────────┴─────────┴──────────┘
```

---

## 2. 状态定义

### 2.1 类型定义

**文件**: `lib/donation-status.ts`

```typescript
export const DONATION_STATUSES = [
  'pending', 'widget_load_failed',
  'processing', 'fraud_check',
  'paid', 'confirmed', 'delivering', 'completed',
  'expired', 'declined', 'failed',
  'refunding', 'refund_processing', 'refunded',
] as const

export type DonationStatus = typeof DONATION_STATUSES[number]
```

### 2.2 状态分类表

| 分类 | 状态 | 说明 | 用户可见 |
|------|------|------|---------|
| **支付前** | `pending` | 订单已创建，待支付 | ✓ |
| | `widget_load_failed` | 支付窗口加载失败（网络问题） | ✓ |
| **处理中** | `processing` | 支付网关处理中 | ✓ |
| | `fraud_check` | 反欺诈审核中 | ✓ |
| **已支付** | `paid` | 已支付，资金已到账 | ✓ |
| | `confirmed` | NGO 已确认捐赠 | ✓ |
| | `delivering` | 物资配送中 | ✓ |
| | `completed` | 配送完成 | ✓ |
| **支付失败** | `expired` | 支付超时 | ✓ |
| | `declined` | 银行拒绝支付 | ✓ |
| | `failed` | 其他支付失败 | ✓ |
| **退款** | `refunding` | 退款申请中 | ✓ |
| | `refund_processing` | 退款处理中 | ✓ |
| | `refunded` | 已退款 | ✓ |

---

## 3. 状态分组与计数

### 3.1 按业务功能分组

**文件**: `lib/donation-status.ts`

```typescript
/** 支付前状态 */
export const PRE_PAYMENT_STATUSES = ['pending', 'widget_load_failed'] as const

/** 处理中状态 */
export const PROCESSING_STATUSES = ['processing', 'fraud_check'] as const

/** 支付成功状态（计入项目进度） */
export const SUCCESS_STATUSES = ['paid', 'confirmed', 'delivering', 'completed'] as const

/** 支付失败状态 */
export const FAILED_STATUSES = ['expired', 'declined', 'failed'] as const

/** 退款相关状态 */
export const REFUND_STATUSES = ['refunding', 'refund_processing', 'refunded'] as const
```

### 3.2 项目进度计数

项目进度统计只计算以下状态的捐赠：

| 类型 | 状态列表 |
|------|---------|
| **被计数** | `paid`, `confirmed`, `delivering`, `completed` |
| **未计数** | 其他 10 种状态 |

### 3.3 公开可见性

| 可见范围 | 状态列表 |
|---------|---------|
| **公开捐赠列表可见** | `paid`, `confirmed`, `delivering`, `completed` |
| **仅当事人可见（追踪功能）** | 全部 14 种状态 |

---

## 4. 状态流程图

### 4.1 完整状态流转图

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              支付流程                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────┐    ┌────────────┐    ┌──────┐    ┌───────────┐    ┌─────────┐ │
│  │ pending │───▶│ processing │───▶│ paid │───▶│ confirmed │───▶│delivering│ │
│  └────┬────┘    └─────┬──────┘    └──┬───┘    └───────────┘    └────┬────┘ │
│       │               │              │                               │      │
│       │               ▼              │                               ▼      │
│       │        ┌─────────────┐       │                        ┌──────────┐  │
│       │        │ fraud_check │───────┘                        │completed │  │
│       │        └─────────────┘                                └──────────┘  │
│       │                                                                     │
│       ▼                                                                     │
│  ┌───────────────────┐                                                      │
│  │ widget_load_failed│                                                      │
│  └───────────────────┘                                                      │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                              失败流程                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  pending ────────▶ expired                                                  │
│                                                                             │
│  processing ─────▶ declined                                                 │
│              └───▶ failed                                                   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                              退款流程                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  paid ──────────┐                                                           │
│  confirmed ─────┼───▶ refunding ───▶ refund_processing ───▶ refunded       │
│  delivering ────┤                                                           │
│  completed ─────┘                                                           │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 5. 状态转换规则

### 5.1 约束层级说明

⚠️ **重要**: 状态转换约束分为两个层级：

| 层级 | 约束类型 | 适用范围 | 强度 |
|------|----------|----------|------|
| **数据库层** | 硬约束 | 仅对管理员 (`auth.uid() IS NOT NULL`) | 强制 |
| **应用层** | 软约束 | Webhook 过滤逻辑 | 可绕过 |

**数据库对 Service Role (`auth.uid() IS NULL`) 允许任意状态转换！**

### 5.2 管理员可执行的转换（数据库强制）

| 来源状态 | 目标状态 | 操作说明 |
|---------|---------|---------|
| `paid` | `confirmed` | 确认收到捐赠 |
| `confirmed` | `delivering` | 开始配送物资 |
| `delivering` | `completed` | 配送完成（需上传照片） |

### 5.3 Webhook 可执行的转换（Service Role）

**支付类 Webhook**:

| 当前状态 | → paid | → processing | → fraud_check | → expired | → declined | → failed |
|----------|--------|--------------|---------------|-----------|------------|----------|
| pending | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| processing | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| fraud_check | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| widget_load_failed | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

**退款类 Webhook**:

| 当前状态 | → refund_processing | → refunded |
|----------|---------------------|------------|
| paid | ✅ | ✅ |
| confirmed | ✅ | ✅ |
| delivering | ✅ | ✅ |
| refunding | ✅ | ✅ |
| refund_processing | ✅ | ✅ |

### 5.4 用户/客户端可执行的转换

| 当前状态 | → widget_load_failed | → refunding |
|----------|----------------------|-------------|
| pending | ✅ (客户端) | ❌ |
| paid | ❌ | ✅ (退款请求) |
| confirmed | ❌ | ✅ (退款请求) |
| delivering | ❌ | ✅ (退款请求) |

### 5.5 状态变化来源汇总

| 变化来源 | 说明 | 约束层级 |
|----------|------|----------|
| **用户创建** | 只能创建 `pending` | RLS INSERT 策略 |
| **客户端** | `pending` → `widget_load_failed` | RLS UPDATE 策略 |
| **WayForPay Webhook** | 支付/退款状态 | 应用层软过滤 |
| **用户退款请求** | `paid/confirmed/delivering` → `refunding` | 应用层验证 |
| **管理员** | `paid→confirmed→delivering→completed` | 数据库触发器强制 |

---

## 6. WayForPay 状态映射

### 6.1 WayForPay 状态常量

**文件**: `lib/payment/wayforpay/server.ts`

```typescript
export const WAYFORPAY_STATUS = {
  APPROVED: 'Approved',
  IN_PROCESSING: 'inProcessing',
  WAITING_AUTH_COMPLETE: 'WaitingAuthComplete',
  PENDING: 'Pending',
  DECLINED: 'Declined',
  EXPIRED: 'Expired',
  REFUND_IN_PROCESSING: 'RefundInProcessing',
  REFUNDED: 'Refunded',
  VOIDED: 'Voided',
} as const
```

### 6.2 状态映射表

| WayForPay 状态 | 系统状态 | 说明 |
|---------------|---------|------|
| `Approved` | `paid` | 支付成功 |
| `WaitingAuthComplete` | `paid` | 3DS 验证完成 |
| `inProcessing` | `processing` | 支付处理中 |
| `Pending` | `fraud_check` | 反欺诈审核 |
| `Declined` | `declined` | 银行拒绝 |
| `Expired` | `expired` | 支付超时 |
| `RefundInProcessing` | `refund_processing` | 退款处理中 |
| `Refunded` | `refunded` | 退款成功 |
| `Voided` | `refunded` | 交易作废（视为退款） |

---

## 7. 数据库实现

### 7.1 CHECK 约束

```sql
ALTER TABLE public.donations
ADD CONSTRAINT donations_status_check CHECK (
  donation_status IN (
    'pending', 'widget_load_failed',
    'processing', 'fraud_check',
    'paid', 'confirmed', 'delivering', 'completed',
    'expired', 'declined', 'failed',
    'refunding', 'refund_processing', 'refunded'
  )
);
```

### 7.2 状态索引

```sql
-- 基础状态索引
CREATE INDEX idx_donations_status ON public.donations(donation_status);

-- 订单+状态复合索引
CREATE INDEX idx_donations_order_ref_status
    ON public.donations(order_reference, donation_status)
    WHERE order_reference IS NOT NULL;

-- 退款状态索引
CREATE INDEX idx_donations_refund_status
    ON public.donations(donation_status)
    WHERE donation_status IN ('refunding', 'refunded');
```

### 7.3 数据库视图

#### order_donations_secure

**用途**: 按订单查询捐赠（支付成功页使用）

```sql
CREATE VIEW public.order_donations_secure AS
SELECT
  d.id, d.donation_public_id, d.amount, d.donation_status, d.order_reference,
  -- 邮箱混淆
  CASE WHEN position('@' in d.donor_email) > 0 THEN
    substring(split_part(d.donor_email, '@', 1), 1, 1) || '***' || ... || '@' || ...
  ELSE '***' END AS donor_email_obfuscated,
  p.id AS project_id, p.project_name, p.project_name_i18n, p.aggregate_donations
FROM public.donations d
INNER JOIN public.projects p ON d.project_id = p.id
WHERE d.order_reference IS NOT NULL AND d.order_reference != '';
```

**特点**: 接受所有 14 种状态（无状态过滤）

#### project_stats

**用途**: 项目统计信息

**状态过滤**: 只统计 `paid`, `confirmed`, `delivering`, `completed` 状态

#### public_project_donations

**用途**: 项目详情页的捐赠列表

**状态过滤**: 只显示 `paid`, `confirmed`, `delivering`, `completed` 状态

### 7.4 数据库函数

#### get_donations_by_email_verified()

**用途**: 捐赠追踪功能 - 验证邮箱后返回该邮箱的所有捐赠

**安全特性**:
- `SECURITY DEFINER`: 使用函数所有者权限执行
- 双重验证：必须同时知道邮箱和有效的捐赠 ID
- 防止邮箱枚举攻击

#### is_admin()

**用途**: 检查当前用户是否为管理员

**实现**: 通过 `auth.jwt() ->> 'email'` 检查邮箱白名单（非简单的 `auth.uid() IS NOT NULL`）

> **安全说明**: 义卖市场引入 Email OTP 认证后，`is_admin()` 从 `auth.uid() IS NOT NULL` 改为邮箱白名单，防止普通买家被当作管理员。

### 7.5 触发器

| 触发器名称 | 绑定表 | 功能 |
|-----------|-------|------|
| `update_project_units_trigger` | `donations` | 自动更新项目单位数 |
| `prevent_donation_immutable_fields_trigger` | `donations` | 保护不可变字段 + 状态转换验证 |
| `donation_status_change_trigger` | `donations` | 记录状态变更历史 |
| `update_donations_updated_at` | `donations` | 自动更新 updated_at |

#### update_project_units()

当捐赠状态变化时，自动更新项目的 `current_units` 字段：
- 状态从 non-counted → counted: `current_units + units`
- 状态从 counted → non-counted: `current_units - units`

#### prevent_donation_immutable_fields()

保护捐赠记录的不可变字段，并限制管理员的状态转换权限：
- Service Role 可以修改任何字段（用于 Webhooks）
- 管理员只能执行 `paid→confirmed→delivering→completed` 转换

### 7.6 RLS 策略

```sql
-- 管理员可以更新捐赠（状态转换由触发器验证）
CREATE POLICY "Admins can update donations"
ON donations FOR UPDATE TO authenticated
USING (is_admin()) WITH CHECK (is_admin());

-- 允许匿名用户将 pending 更新为 widget_load_failed
CREATE POLICY "Allow anonymous update pending to widget_load_failed"
ON public.donations FOR UPDATE TO anon, authenticated
USING (donation_status = 'pending')
WITH CHECK (donation_status = 'widget_load_failed');

-- 仅管理员可查看状态历史
CREATE POLICY "Admins can view all status history"
ON donation_status_history FOR SELECT TO authenticated
USING (is_admin());
```

---

## 8. 状态历史审计

### 8.1 表结构

**表名**: `donation_status_history`

```sql
CREATE TABLE donation_status_history (
  id BIGSERIAL PRIMARY KEY,
  donation_id BIGINT NOT NULL REFERENCES donations(id) ON DELETE CASCADE,
  from_status TEXT,           -- 旧状态（首次创建时为 NULL）
  to_status TEXT NOT NULL,    -- 新状态
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 8.2 索引

```sql
CREATE INDEX idx_donation_status_history_donation_id ON donation_status_history(donation_id);
CREATE INDEX idx_donation_status_history_changed_at ON donation_status_history(changed_at DESC);
CREATE INDEX idx_donation_status_history_to_status ON donation_status_history(to_status);
```

### 8.3 查询示例

```sql
-- 查询某笔捐赠的状态历史
SELECT from_status, to_status, changed_at
FROM donation_status_history
WHERE donation_id = 123
ORDER BY changed_at;

-- 查询今天所有退款状态变更
SELECT d.donation_public_id, h.from_status, h.to_status, h.changed_at
FROM donation_status_history h
JOIN donations d ON d.id = h.donation_id
WHERE h.to_status IN ('refunding', 'refund_processing', 'refunded')
  AND h.changed_at >= CURRENT_DATE;
```

---

## 9. 应用层实现

### 9.1 状态工具库

**文件**: `lib/donation-status.ts`

提供统一的状态常量、分组和辅助函数：

```typescript
// 状态判断辅助函数
export function isSuccessStatus(status: DonationStatus): boolean
export function isFailedStatus(status: DonationStatus): boolean
export function isRefundStatus(status: DonationStatus): boolean
export function canRequestRefund(status: DonationStatus): boolean
export function canViewResult(status: DonationStatus): boolean
export function getNextAllowedStatuses(status: DonationStatus): DonationStatus[]
export function isValidAdminTransition(from: DonationStatus, to: DonationStatus): boolean
export function needsFileUpload(from: DonationStatus, to: DonationStatus): boolean
export function getStatusGroup(status: DonationStatus): StatusGroup

// UI 相关
export const STATUS_COLORS: Record<DonationStatus, { bg: string; text: string }>
export const MAIN_FLOW_STATUSES: readonly DonationStatus[]
```

### 9.2 Server Actions

| Action | 文件 | 状态操作 |
|--------|------|---------|
| `createWayForPayDonation()` | `app/actions/donation.ts` | 创建 `pending` 状态记录 |
| `requestRefund()` | `app/actions/track-donation.ts` | 更新为 `refunding` |
| `updateDonationStatus()` | `app/actions/admin.ts` | 管理员状态转换 |
| `getAdminDonations()` | `app/actions/admin.ts` | 获取捐赠及状态历史 |

### 9.3 Webhook 处理

**文件**: `app/api/webhooks/wayforpay/route.ts`

```typescript
// 支付 Webhook 可更新的状态
const PAYMENT_WEBHOOK_ALLOWED_FROM = ['pending', 'processing', 'fraud_check', 'widget_load_failed']

// 退款 Webhook 可更新的状态
const REFUND_WEBHOOK_ALLOWED_FROM = ['paid', 'confirmed', 'delivering', 'refunding', 'refund_processing']

// 状态映射
function mapWayForPayStatus(transactionStatus: string): DonationStatus {
  switch (transactionStatus) {
    case 'Approved':
    case 'WaitingAuthComplete':
      return 'paid'
    case 'inProcessing':
      return 'processing'
    // ...
  }
}
```

---

## 10. UI 组件

### 10.1 状态徽章

**文件**: `components/donation-display/DonationStatusBadge.tsx`

使用 `STATUS_COLORS` 从工具库获取颜色配置。

| 状态 | 背景色 | 文字色 |
|------|--------|--------|
| `pending` | `bg-yellow-100` | `text-yellow-800` |
| `paid`, `confirmed`, `completed` | `bg-green-100` | `text-green-800` |
| `delivering` | `bg-blue-100` | `text-blue-700` |
| `declined`, `failed` | `bg-red-100` | `text-red-800` |
| `refunding`, `refund_processing` | `bg-orange-100` | `text-orange-800` |
| `refunded`, `expired` | `bg-gray-100` | `text-gray-700` |

### 10.2 状态流程图组件

**文件**: `components/donation-display/DonationStatusFlow.tsx`

显示两条流程：
- **主流程**: `paid → confirmed → delivering → completed`
- **退款流程**: `refunding → refunded`

### 10.3 管理员状态进度组件

**文件**: `components/admin/DonationStatusProgress.tsx`

### 10.4 UI 功能状态依赖

| 功能 | 条件 | 组件 |
|------|------|------|
| "查看结果"按钮 | `status === 'completed'` | ProjectDonationList, TrackDonationForm |
| 退款按钮 | `canRequestRefund(status)` | TrackDonationForm |
| 管理员状态编辑 | `getNextAllowedStatuses(status).length > 0` | DonationEditModal |
| 批量编辑 | `canBatchEdit(status)` | DonationsTable |

---

## 11. 国际化

### 11.1 翻译键

**路径**: `trackDonation.status.*`

| 状态 | 英文 | 中文 | 乌克兰语 |
|------|------|------|---------|
| `pending` | Payment Pending | 等待支付 | Очікує оплати |
| `paid` | Payment Received | 已收到款项 | Оплату отримано |
| `confirmed` | Confirmed | 已确认 | Підтверджено |
| `delivering` | In Progress | 配送中 | В процесі |
| `completed` | Completed | 已完成 | Завершено |
| `refunding` | Refund In Progress | 退款处理中 | Повернення в процесі |
| `refunded` | Refunded | 已退款 | Повернуто |

> 注: `refunding` 和 `refund_processing` 使用相同的翻译，对用户而言都表示"退款处理中"

---

## 12. 约束分析与一致性检查

### 12.1 约束强度分析

| 约束类型 | 数据库强制 | 应用层验证 | 绕过风险 |
|----------|------------|------------|----------|
| 管理员状态转换 | ✅ 触发器 | ✅ admin.ts | 低 |
| Webhook状态转换 | ❌ 无约束 | ✅ 软过滤 | 中 |
| 用户创建pending | ✅ RLS | ✅ donation.ts | 低 |
| 用户退款请求 | ❌ 无约束 | ✅ track-donation.ts | 中 |

### 12.2 一致性确认

| 检查项 | 状态 |
|--------|------|
| 类型定义 vs 数据库约束 | ✅ 一致 (14种) |
| 翻译文件覆盖 | ✅ 完整 (3语言×14状态) |
| 触发器状态列表 | ✅ 完整 (14种) |
| UI组件switch覆盖 | ✅ 完整 (含default) |
| 项目计数逻辑 | ✅ 正确 (4种计入) |
| 公开可见性 | ✅ 正确 (4种公开) |

### 12.3 设计注意事项

1. **Service Role 无状态转换约束**
   - 设计: 数据库触发器只对管理员强制状态转换规则
   - 影响: Webhook 可执行任意状态转换（仅受应用层软过滤）
   - 缓解: 应用层 `transitionableStatuses` 过滤器提供额外保护

2. **Declined 状态的双重含义**
   - 需要区分: 支付被拒 vs 退款被拒
   - 当前实现: 根据当前状态判断

3. **批量编辑 delivering 状态的限制**
   - 设计: `delivering→completed` 需要上传文件，不支持批量

---

## 13. 相关文件索引

### 13.1 核心文件

| 文件路径 | 作用 |
|---------|------|
| `lib/donation-status.ts` | 状态工具库（常量、分组、辅助函数） |
| `types/index.ts` | 重新导出类型定义 |
| `lib/payment/wayforpay/server.ts` | WayForPay 状态常量 |
| `app/api/webhooks/wayforpay/route.ts` | Webhook 处理和状态映射 |
| `app/actions/donation.ts` | 创建捐赠（pending 状态） |
| `app/actions/track-donation.ts` | 追踪捐赠和退款请求 |
| `app/actions/admin.ts` | 管理员状态更新 |

### 13.2 UI 组件

| 文件路径 | 作用 |
|---------|------|
| `components/donation-display/DonationStatusBadge.tsx` | 状态徽章 |
| `components/donation-display/DonationStatusFlow.tsx` | 状态流程图 |
| `components/admin/DonationStatusProgress.tsx` | 管理员进度指示器 |
| `components/admin/DonationsTable.tsx` | 捐赠表格（含状态筛选） |
| `components/admin/DonationEditModal.tsx` | 捐赠编辑弹窗 |
| `components/admin/BatchDonationEditModal.tsx` | 批量编辑弹窗 |

### 13.3 数据库相关

| 内容 | 位置 |
|------|------|
| 完整 Schema | `supabase/migrations/20260109000000_baseline.sql` + 增量迁移 |
| 架构文档 | `docs/DONATION_DATABASE_SCHEMA.md` |

---

## 14. 附录

### 14.1 已移除的状态

| 状态 | 移除日期 | 原因 |
|------|---------|------|
| `user_cancelled` | 2025-12-24 | 客户端检测不可靠，无法准确判断用户主动取消 |

### 14.2 常见问题

**Q: 为什么 `refunding` 和 `refund_processing` 显示相同的翻译？**

A: 对用户而言，这两个状态都表示"退款处理中"，区分仅在于内部流程追踪。

**Q: 管理员能否跳过状态？**

A: 不能。管理员只能按照 `paid → confirmed → delivering → completed` 的顺序逐步推进。这由数据库触发器强制执行。

**Q: Service Role 有什么特殊权限？**

A: Service Role（用于 Webhooks）可以执行任意状态转换，不受管理员转换限制。这是因为支付网关回调需要根据实际支付结果设置状态。

### 14.3 历史重构记录

**2026-01-09: 状态逻辑集中化重构**

将分散在 15+ 个文件中的状态判断逻辑集中到 `lib/donation-status.ts`：
- 创建统一的状态常量和分组
- 提供类型安全的辅助函数
- 减少代码重复约 60%
- 实现单一数据源原则

---

**文档版本**: 3.0.0
**维护者**: NGO Platform Team
**最后更新**: 2026-03-28
