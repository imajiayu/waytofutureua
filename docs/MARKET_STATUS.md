# 义卖市场状态系统技术文档

> 本文档详细描述义卖市场商品状态和订单状态的定义、流转规则、数据库约束和相关代码实现

**文档版本**: 1.0.0
**最后更新**: 2026-03-28

---

## 目录

1. [概述](#1-概述)
2. [商品状态定义](#2-商品状态定义)
3. [订单状态定义](#3-订单状态定义)
4. [状态流程图](#4-状态流程图)
5. [状态转换规则](#5-状态转换规则)
6. [WayForPay 状态映射](#6-wayforpay-状态映射)
7. [库存管理](#7-库存管理)
8. [数据库实现](#8-数据库实现)
9. [状态历史审计](#9-状态历史审计)
10. [应用层实现](#10-应用层实现)
11. [UI 组件](#11-ui-组件)
12. [文件上传与凭证](#12-文件上传与凭证)
13. [国际化](#13-国际化)
14. [约束分析与一致性检查](#14-约束分析与一致性检查)
15. [相关文件索引](#15-相关文件索引)

---

## 1. 概述

义卖市场使用**两套状态系统**：

- **商品状态**（3 种）：管理商品的上架生命周期
- **订单状态**（7 种）：追踪订单从创建到完成的全流程

与捐赠模块的关键区别：
- 没有退款流程（7 个状态 vs 捐赠的 14 个）
- 买家需要 Email OTP 认证（非匿名）
- 管理员状态转换需要文件上传凭证
- 库存通过 RPC 函数管理（非触发器）

### 1.1 订单状态速查表

```
┌─────────────────────┬────────────────────┬─────────┬──────────┐
│ 状态                 │ 变化来源            │ 公开可见 │ 需凭证    │
├─────────────────────┼────────────────────┼─────────┼──────────┤
│ pending             │ 用户下单            │ ❌       │ ❌        │
│ widget_load_failed  │ 客户端              │ ❌       │ ❌        │
│ paid                │ Webhook            │ ✅       │ ❌        │
│ shipped             │ Admin + 文件上传    │ ✅       │ ✅ 发货凭证│
│ completed           │ Admin + 文件上传    │ ✅       │ ✅ 用途凭证│
│ expired             │ Webhook            │ ❌       │ ❌        │
│ declined            │ Webhook            │ ❌       │ ❌        │
└─────────────────────┴────────────────────┴─────────┴──────────┘
```

### 1.2 商品状态速查表

```
┌─────────────────────┬────────────────────┬─────────┬──────────┐
│ 状态                 │ 变化来源            │ 公开可见 │ 可购买    │
├─────────────────────┼────────────────────┼─────────┼──────────┤
│ draft               │ Admin 创建          │ ❌       │ ❌        │
│ on_sale             │ Admin              │ ✅       │ ✅        │
│ off_shelf           │ Admin              │ ✅       │ ❌        │
└─────────────────────┴────────────────────┴─────────┴──────────┘
```

---

## 2. 商品状态定义

### 2.1 类型定义

**文件**: `types/market.ts`

```typescript
export const MARKET_ITEM_STATUSES = ['draft', 'on_sale', 'off_shelf'] as const
export type MarketItemStatus = typeof MARKET_ITEM_STATUSES[number]
```

### 2.2 状态说明

| 状态 | 说明 | 可删除 | 公开可见 | 可购买 |
|------|------|--------|---------|--------|
| `draft` | 草稿，准备中 | ✅ | ❌ | ❌ |
| `on_sale` | 在售 | ❌ | ✅ | ✅（需有库存） |
| `off_shelf` | 已下架 | ❌ | ✅ | ❌ |

### 2.3 状态转换

```typescript
export const ITEM_ADMIN_TRANSITIONS: Partial<Record<MarketItemStatus, MarketItemStatus[]>> = {
  draft:     ['on_sale'],
  on_sale:   ['off_shelf'],
  off_shelf: ['on_sale'],    // 可重新上架
}
```

- `draft → on_sale`：上架
- `on_sale → off_shelf`：下架
- `off_shelf → on_sale`：重新上架（双向）
- `draft` 状态的商品可以被删除

---

## 3. 订单状态定义

### 3.1 类型定义

**文件**: `types/market.ts`

```typescript
export const MARKET_ORDER_STATUSES = [
  'pending', 'widget_load_failed', 'paid', 'shipped', 'completed',
  'expired', 'declined',
] as const
export type MarketOrderStatus = typeof MARKET_ORDER_STATUSES[number]
```

### 3.2 状态分类表

| 分类 | 状态 | 说明 |
|------|------|------|
| **支付前** | `pending` | 订单已创建，待支付（库存已扣减） |
| | `widget_load_failed` | 支付窗口加载失败（库存已恢复） |
| **已支付** | `paid` | 支付成功，等待发货 |
| | `shipped` | 已发货，附带快递单号和发货凭证 |
| | `completed` | 已完成，附带资金用途凭证 |
| **失败** | `expired` | 支付超时（库存已恢复） |
| | `declined` | 银行拒绝支付（库存已恢复） |

### 3.3 状态分组

**文件**: `lib/market/market-status.ts`

```typescript
const FAILED_ORDER_STATUSES: MarketOrderStatus[] = ['expired', 'declined']
const SUCCESS_ORDER_STATUSES: MarketOrderStatus[] = ['paid', 'shipped', 'completed']

export function getOrderStatusGroup(status: MarketOrderStatus): OrderStatusGroup {
  if (FAILED_ORDER_STATUSES.includes(status)) return 'failed'
  if (SUCCESS_ORDER_STATUSES.includes(status)) return 'success'
  return 'processing'  // pending, widget_load_failed
}
```

### 3.4 公开可见性

| 可见范围 | 状态列表 |
|---------|---------|
| **公开购买记录可见** | `paid`, `shipped`, `completed` |
| **仅买家本人可见** | 全部 7 种状态 |

---

## 4. 状态流程图

### 4.1 商品状态流转

```
  ┌─────────┐    ┌─────────┐    ┌──────────┐
  │  draft  │───▶│ on_sale │◀──▶│ off_shelf│
  └─────────┘    └─────────┘    └──────────┘
       │
       ▼
   [可删除]
```

### 4.2 订单完整流转图

```
┌─────────────────────────────────────────────────────────────────┐
│                         支付流程                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌─────────┐              ┌──────┐    ┌─────────┐    ┌────────┐ │
│  │ pending │─── Webhook ──▶│ paid │───▶│ shipped │───▶│completed│ │
│  └────┬────┘              └──────┘    └─────────┘    └────────┘ │
│       │                      ▲         需快递单号     需用途凭证  │
│       ▼                      │         +发货凭证                  │
│  ┌────────────────┐          │                                    │
│  │widget_load_    │── Webhook┘                                    │
│  │   failed       │          │                                    │
│  └────────────────┘          │                                    │
│                              │                                    │
│  ┌────────────────┐          │                                    │
│  │   expired      │── Webhook┘  (Cron 清理后 Webhook 恢复)        │
│  └────────────────┘                                               │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                         失败流程                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  pending ─── Webhook ──▶ expired     (库存恢复)                   │
│          └── pg_cron 10m ▶ expired   (库存恢复)                   │
│                     └──▶ declined    (库存恢复)                   │
│                                                                   │
│  widget_load_failed ──▶ expired      (无需恢复，已恢复)            │
│                    └──▶ declined     (无需恢复，已恢复)            │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

> **注意**: 义卖市场没有退款流程。一旦支付成功，订单不可取消或退款。

---

## 5. 状态转换规则

### 5.1 约束层级说明

| 层级 | 约束类型 | 适用范围 | 强度 |
|------|----------|----------|------|
| **数据库层** | CHECK 约束 | 状态有效值（7种） | 强制 |
| **数据库层** | RLS 策略 | 买家仅可 pending → widget_load_failed | 强制 |
| **数据库层** | 不可变字段触发器 | 9 个财务关键字段 | 强制 |
| **应用层** | 状态机验证 | 管理员转换合法性 | Server Action |
| **应用层** | Webhook 过滤 | Webhook 源状态校验 | 软约束 |

### 5.2 管理员可执行的转换

| 来源状态 | 目标状态 | 操作说明 | 前提条件 |
|---------|---------|---------|---------|
| `paid` | `shipped` | 发货 | 快递单号（必填）+ 至少 1 张发货凭证图片 |
| `shipped` | `completed` | 完成 | 至少 1 张资金用途凭证图片 |

### 5.3 Webhook 可执行的转换（Service Role）

| 当前状态 | → paid | → expired | → declined |
|----------|--------|-----------|------------|
| pending | ✅ | ✅ (恢复库存) | ✅ (恢复库存) |
| widget_load_failed | ✅ (重新扣减库存) | ✅ (无需恢复) | ✅ (无需恢复) |
| expired | ✅ (重新扣减库存) | - | - |

> **expired → paid 恢复路径**: 当 Cron 将超时订单标记为 expired 后，若 WayForPay 延迟发来 `Approved` 回调，Webhook 会将订单从 expired 恢复为 paid 并重新扣减库存。

### 5.4 买家可执行的转换

| 当前状态 | → widget_load_failed |
|----------|----------------------|
| pending | ✅ (恢复库存) |

### 5.5 状态变化来源汇总

| 变化来源 | 说明 | 约束层级 |
|----------|------|----------|
| **买家下单** | 创建 `pending` 订单 | RLS INSERT 策略 |
| **客户端** | `pending` → `widget_load_failed` | RLS UPDATE 策略 |
| **WayForPay Webhook** | 支付结果状态 | 应用层过滤 + 乐观锁 |
| **管理员** | `paid→shipped→completed` | 应用层状态机验证 |

---

## 6. WayForPay 状态映射

### 6.1 状态映射表

**文件**: `app/api/webhooks/wayforpay-market/route.ts`

| WayForPay 状态 | 系统状态 | 说明 |
|---------------|---------|------|
| `Approved` | `paid` | 支付成功 |
| `WaitingAuthComplete` | `paid` | 3DS 验证完成 |
| `Expired` | `expired` | 支付超时 |
| `Declined` | `declined` | 银行拒绝 |

> **注意**: 与捐赠模块不同，义卖市场不处理 `inProcessing`、`Pending`（反欺诈）和退款类状态（`RefundInProcessing`、`Refunded`、`Voided`）。

### 6.2 金额校验

Webhook 收到支付回调时，验证实际支付金额与订单金额一致（1% 容差），防止金额篡改。

---

## 7. 库存管理

### 7.1 库存操作时机

库存操作与状态转换紧密绑定，以下是完整的库存变化矩阵：

| 事件 | 前状态 | 后状态 | 库存操作 |
|------|--------|--------|---------|
| 买家下单 | - | pending | `decrement_stock` |
| 支付窗口失败 | pending | widget_load_failed | `restore_stock` |
| Webhook: 支付成功 | pending | paid | 无（pending 时已扣减） |
| Webhook: 支付成功 | widget_load_failed | paid | `decrement_stock`（重新扣减） |
| Webhook: 支付超时 | pending | expired | `restore_stock` |
| Webhook: 支付被拒 | pending | declined | `restore_stock` |
| Webhook: 支付超时 | widget_load_failed | expired | 无（widget_load_failed 时已恢复） |
| Webhook: 支付被拒 | widget_load_failed | declined | 无（widget_load_failed 时已恢复） |
| pg_cron: 超时清理 | pending | expired | `restore_stock` |
| Webhook: 支付成功 | expired (pg_cron清理) | paid | `decrement_stock`（重新扣减） |

### 7.2 RPC 函数

```sql
-- 原子扣减库存（防止 TOCTOU 竞态）
-- 返回 false 表示库存不足或商品非 on_sale
CREATE FUNCTION decrement_stock(p_item_id BIGINT, p_quantity INT) RETURNS BOOLEAN

-- 原子恢复库存
CREATE FUNCTION restore_stock(p_item_id BIGINT, p_quantity INT) RETURNS VOID
```

**安全特性**:
- 均为 `SECURITY DEFINER`，仅 `service_role` 可调用
- `decrement_stock` 附加条件: `stock_quantity >= p_quantity AND status = 'on_sale'`
- 两个函数都校验 `p_quantity > 0`

### 7.3 并发安全

Webhook 使用乐观锁防止双重处理：

```typescript
// 先尝试从 pending 转换
const { count } = await supabase
  .from('market_orders')
  .update({ status: newStatus })
  .eq('order_reference', orderReference)
  .eq('status', 'pending')  // 乐观锁

// 若 count === 0，再尝试从 widget_load_failed 转换
```

---

## 8. 数据库实现

### 8.1 CHECK 约束

```sql
-- 订单状态
ALTER TABLE market_orders
ADD CONSTRAINT market_orders_status_check CHECK (
  status IN (
    'pending', 'widget_load_failed', 'paid', 'shipped', 'completed',
    'expired', 'declined'
  )
);

-- 商品状态
ALTER TABLE market_items
ADD CONSTRAINT market_items_status_check CHECK (
  status IN ('draft', 'on_sale', 'off_shelf')
);
```

### 8.2 状态索引

```sql
CREATE INDEX idx_market_items_status ON market_items(status);
CREATE INDEX idx_market_orders_status ON market_orders(status);
CREATE INDEX idx_market_orders_buyer_status ON market_orders(buyer_id, status);
```

### 8.3 不可变字段保护

```sql
CREATE FUNCTION prevent_market_order_immutable_fields() RETURNS trigger
-- 保护: id, order_reference, buyer_id, buyer_email,
--       item_id, quantity, unit_price, total_amount, created_at
```

> 与捐赠模块 `prevent_donation_immutable_fields` 模式一致。

### 8.4 RLS 策略

```sql
-- 买家只能创建 pending 状态的订单
CREATE POLICY "Buyers can insert own pending orders"
  ON market_orders FOR INSERT TO authenticated
  WITH CHECK (buyer_id = auth.uid() AND status = 'pending');

-- 买家只能将 pending 更新为 widget_load_failed
CREATE POLICY "Buyers can update own pending to widget_load_failed"
  ON market_orders FOR UPDATE TO authenticated
  USING (buyer_id = auth.uid() AND status = 'pending')
  WITH CHECK (status = 'widget_load_failed');
```

---

## 9. 状态历史审计

### 9.1 表结构

```sql
CREATE TABLE market_order_status_history (
  id BIGSERIAL PRIMARY KEY,
  order_id BIGINT NOT NULL REFERENCES market_orders(id) ON DELETE CASCADE,
  from_status TEXT,           -- 旧状态
  to_status TEXT NOT NULL,    -- 新状态
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 9.2 查询示例

```sql
-- 查询某订单的状态历史
SELECT from_status, to_status, changed_at
FROM market_order_status_history
WHERE order_id = 123
ORDER BY changed_at;

-- 查询今天所有发货记录
SELECT o.order_reference, h.from_status, h.to_status, h.changed_at
FROM market_order_status_history h
JOIN market_orders o ON o.id = h.order_id
WHERE h.to_status = 'shipped'
  AND h.changed_at >= CURRENT_DATE;
```

---

## 10. 应用层实现

### 10.1 状态工具库

**文件**: `lib/market/market-status.ts`

```typescript
// 状态判断辅助函数
export function canPurchase(status: MarketItemStatus): boolean
export function getNextOrderStatuses(status: MarketOrderStatus): MarketOrderStatus[]
export function isValidOrderTransition(from: MarketOrderStatus, to: MarketOrderStatus): boolean
export function getNextItemStatuses(status: MarketItemStatus): MarketItemStatus[]
export function isValidItemTransition(from: MarketItemStatus, to: MarketItemStatus): boolean
export function needsTrackingNumber(from: MarketOrderStatus, to: MarketOrderStatus): boolean
export function needsFileUpload(from: MarketOrderStatus, to: MarketOrderStatus): boolean
export function getFileCategory(from: MarketOrderStatus, to: MarketOrderStatus): MarketOrderFileCategory | null
export function canManageOrderFiles(status: MarketOrderStatus): boolean
export function getOrderStatusGroup(status: MarketOrderStatus): OrderStatusGroup

// UI 相关
export const ITEM_STATUS_COLORS: Record<MarketItemStatus, { bg: string; text: string }>
export const ORDER_STATUS_COLORS: Record<MarketOrderStatus, { bg: string; text: string }>
```

### 10.2 Server Actions

| Action | 文件 | 状态操作 |
|--------|------|---------|
| `createSaleOrder()` | `app/actions/market-sale.ts` | 创建 `pending` 订单 + 扣减库存 |
| `markMarketOrderWidgetFailed()` | `app/actions/market-sale.ts` | `pending` → `widget_load_failed` + 恢复库存 |
| `updateMarketOrderStatus()` | `app/actions/market-admin.ts` | 管理员状态转换（含凭证验证） |
| `updateMarketItem()` | `app/actions/market-admin.ts` | 商品状态转换（含状态机验证） |
| `deleteMarketItem()` | `app/actions/market-admin.ts` | 删除 `draft` 商品 |

### 10.3 Webhook 处理

**文件**: `app/api/webhooks/wayforpay-market/route.ts`

```typescript
// Webhook 可更新的源状态
export const MARKET_WEBHOOK_SOURCE_STATUSES: readonly MarketOrderStatus[] = [
  'pending', 'widget_load_failed'
]
```

处理流程：
1. 验证签名（HMAC-MD5）
2. 查询订单并验证金额（1% 容差）
3. 映射 WayForPay 状态 → 系统状态
4. 乐观锁更新（先 pending，后 widget_load_failed）
5. 根据前后状态执行库存操作
6. 返回签名确认响应

### 10.4 管理员状态更新流程

**文件**: `app/actions/market-admin.ts` → `updateMarketOrderStatus()`

1. 验证管理员身份
2. 验证状态转换合法性（`isValidOrderTransition`）
3. 检查前提条件：
   - `paid → shipped`：需要 tracking_number
   - 需要文件上传的转换：检查至少 1 张图片已上传
4. 乐观锁更新（`.eq('status', currentStatus)` 防并发）
5. 返回结果或并发冲突错误

---

## 11. UI 组件

### 11.1 订单状态颜色

| 状态 | 背景色 | 文字色 |
|------|--------|--------|
| `pending` | `bg-ukraine-gold-100` | `text-ukraine-gold-800` |
| `widget_load_failed` | `bg-warm-100` | `text-warm-800` |
| `paid` | `bg-life-100` | `text-life-800` |
| `shipped` | `bg-ukraine-blue-100` | `text-ukraine-blue-700` |
| `completed` | `bg-life-100` | `text-life-800` |
| `expired` | `bg-gray-100` | `text-gray-600` |
| `declined` | `bg-warm-100` | `text-warm-800` |

### 11.2 商品状态颜色

| 状态 | 背景色 | 文字色 |
|------|--------|--------|
| `draft` | `bg-gray-100` | `text-gray-600` |
| `on_sale` | `bg-life-100` | `text-life-800` |
| `off_shelf` | `bg-gray-100` | `text-gray-600` |

### 11.3 管理员组件

| 组件 | 文件 | 功能 |
|------|------|------|
| MarketItemsTable | `components/admin/MarketItemsTable.tsx` | 商品管理表格，含状态转换按钮和删除 |
| MarketOrdersTable | `components/admin/MarketOrdersTable.tsx` | 订单管理表格，含状态筛选和转换入口 |
| MarketOrderEditModal | `components/admin/MarketOrderEditModal.tsx` | 订单状态编辑弹窗，含文件上传 |

#### MarketOrderEditModal 功能

- 显示订单详情（买家、商品、金额、地址、物流）
- 状态转换按钮（根据状态机动态生成）
- 条件输入：
  - `paid → shipped`：快递单号（必填）+ 可选快递公司
  - 需要文件上传的转换：至少 1 张图片
- 文件管理：按分类（发货凭证/用途凭证）分组，支持预览和删除

### 11.4 买家组件

| 组件 | 文件 | 功能 |
|------|------|------|
| MarketItemCard | `components/market/MarketItemCard.tsx` | 商品卡片（图片、标题、价格、库存指示） |
| MarketItemDetail | `components/market/MarketItemDetail.tsx` | 商品详情页 |
| MarketOrderList | `components/market/MarketOrderList.tsx` | 公开购买记录（邮箱脱敏） |

### 11.5 UI 功能状态依赖

| 功能 | 条件 | 组件 |
|------|------|------|
| 购买按钮 | `canPurchase(status)` 且 `stock_quantity > 0` | MarketItemCard |
| 管理员状态推进 | `getNextOrderStatuses(status).length > 0` | MarketOrdersTable |
| 文件管理按钮 | `canManageOrderFiles(status)` | MarketOrdersTable |
| 管理员删除商品 | `status === 'draft'` | MarketItemsTable |
| 管理员上/下架 | `getNextItemStatuses(status).length > 0` | MarketItemsTable |

---

## 12. 文件上传与凭证

### 12.1 文件分类

| 分类 | 代码常量 | 触发时机 | 用途 |
|------|---------|---------|------|
| 发货凭证 | `shipping` | paid → shipped | 证明商品已发货 |
| 资金用途凭证 | `completion` | shipped → completed | 证明资金已用于公益用途 |

### 12.2 文件要求

- **格式**: JPEG, PNG, GIF, WebP（图片）; MP4, MOV（视频）
- **大小限制**: 50MB/文件
- **最低要求**: 至少 1 张图片（仅视频不够）
- **存储路径**: `market-order-results/{order_reference}/{category}/{timestamp}.{ext}`

### 12.3 Server Actions

| Action | 文件 | 说明 |
|--------|------|------|
| `uploadMarketOrderFile()` | `app/actions/market-order-files.ts` | FormData 图片上传 |
| `createMarketOrderSignedUploadUrl()` | `app/actions/market-order-files.ts` | 视频直传签名 URL |
| `getMarketOrderFiles()` | `app/actions/market-order-files.ts` | 获取文件列表（可按分类） |
| `deleteMarketOrderFile()` | `app/actions/market-order-files.ts` | 删除文件（含路径校验） |
| `getOrderProofFiles()` | `app/actions/market-order-files.ts` | 买家查看凭证（RLS 保护） |

---

## 13. 国际化

### 13.1 翻译键

**路径**: `market.orderStatus.*` / `market.itemStatus.*`

| 状态 | 英文 | 中文 | 乌克兰语 |
|------|------|------|---------|
| `pending` | Pending Payment | 等待支付 | Очікує оплати |
| `paid` | Paid | 已支付 | Оплачено |
| `shipped` | Shipped | 已发货 | Відправлено |
| `completed` | Completed | 已完成 | Завершено |
| `expired` | Expired | 已过期 | Термін дії минув |
| `declined` | Declined | 已拒绝 | Відхилено |

---

## 14. 约束分析与一致性检查

### 14.1 约束强度分析

| 约束类型 | 数据库强制 | 应用层验证 | 绕过风险 |
|----------|------------|------------|----------|
| 管理员订单状态转换 | ❌ 无约束 | ✅ market-admin.ts | 中（依赖应用层） |
| Webhook 状态转换 | ❌ 无约束 | ✅ 乐观锁 + 软过滤 | 中 |
| 买家创建 pending | ✅ RLS | ✅ market-sale.ts | 低 |
| 买家 → widget_load_failed | ✅ RLS | ✅ market-sale.ts | 低 |
| 不可变字段保护 | ✅ 触发器 | - | 低 |
| 库存操作权限 | ✅ REVOKE/GRANT | ✅ service client | 低 |

> **与捐赠模块的差异**: 捐赠模块的管理员状态转换由数据库触发器 `prevent_donation_immutable_fields` 强制。义卖模块的管理员状态转换**仅在应用层验证**，数据库不强制。

### 14.2 一致性确认

| 检查项 | 状态 |
|--------|------|
| 类型定义 vs 数据库 CHECK 约束 | ✅ 一致（订单 7 种，商品 3 种） |
| 翻译文件覆盖 | ✅ 完整（3 语言 × 7+3 状态） |
| UI 组件颜色覆盖 | ✅ 完整（ORDER_STATUS_COLORS + ITEM_STATUS_COLORS） |
| 库存操作一致性 | ✅ 所有路径均正确恢复/扣减 |
| Webhook 幂等性 | ✅ 乐观锁保证（.eq('status', X)） |

### 14.3 设计注意事项

1. **管理员转换无数据库强制**
   - 设计: 状态转换在应用层（`isValidOrderTransition`）验证
   - 影响: Service Role 可绕过应用层执行任意转换
   - 缓解: Webhook 是唯一使用 Service Role 的路径，且有应用层过滤

2. **无退款流程**
   - 设计: 义卖商品一旦支付成功，不支持自助退款
   - 原因: 实物商品退款涉及退货物流，复杂度高
   - 影响: 如需退款，需手动在 WayForPay 后台操作

3. **widget_load_failed 的库存恢复**
   - 设计: 支付窗口失败时立即恢复库存
   - 风险: Webhook 延迟到达时需重新扣减（`widget_load_failed → paid` 路径）
   - 缓解: Webhook 处理中判断前状态，仅 widget_load_failed → paid 时重新扣减

4. **pg_cron 定时清理 pending 订单**
   - 设计: Supabase pg_cron 每 5 分钟运行 `expire_stale_market_orders()`，将超过 10 分钟的 pending 订单标记为 expired 并恢复库存
   - 目的: 防止用户关闭支付窗口后库存长时间被占用（WayForPay 无关闭回调）
   - 风险: Cron 清理后 Webhook 延迟到达（用户实际完成了支付）
   - 缓解: Webhook 增加 `expired → paid` 恢复路径，重新扣减库存
   - 并发安全: `FOR UPDATE SKIP LOCKED` 跳过被 Webhook 锁定的行
   - 迁移文件: `supabase/migrations/20260330500000_market_expire_pending_cron.sql`

---

## 15. 相关文件索引

### 15.1 核心文件

| 文件路径 | 作用 |
|---------|------|
| `types/market.ts` | 类型定义（状态枚举、接口） |
| `lib/market/market-status.ts` | 状态工具库（转换规则、判断函数、颜色） |
| `lib/market/market-validations.ts` | Zod 验证 schemas |
| `lib/market/market-utils.ts` | 工具函数（价格格式化等） |
| `lib/market/wayforpay.ts` | WayForPay 支付参数生成 |
| `app/api/webhooks/wayforpay-market/route.ts` | Webhook 处理和状态映射 |
| `app/actions/market-sale.ts` | 买家下单和支付窗口失败处理 |
| `app/actions/market-admin.ts` | 管理员商品/订单操作 |
| `app/actions/market-items.ts` | 公开数据查询 |
| `app/actions/market-order.ts` | 买家订单查询 |
| `app/actions/market-order-files.ts` | 凭证文件管理 |
| `supabase/migrations/20260330500000_market_expire_pending_cron.sql` | pg_cron: 清理超时 pending 订单 |

### 15.2 UI 组件

| 文件路径 | 作用 |
|---------|------|
| `components/admin/MarketItemsTable.tsx` | 管理员商品表格 |
| `components/admin/MarketOrdersTable.tsx` | 管理员订单表格 |
| `components/admin/MarketOrderEditModal.tsx` | 订单编辑弹窗（含文件上传） |
| `components/market/MarketItemCard.tsx` | 商品卡片 |
| `components/market/MarketItemDetail.tsx` | 商品详情页 |
| `components/market/MarketOrderList.tsx` | 公开购买记录 |

### 15.3 数据库相关

| 内容 | 位置 |
|------|------|
| 模块基线 | `supabase/migrations/20260328000000_market_module.sql` |
| 增量迁移 | `supabase/migrations/20260329*.sql` + `20260330*.sql` |
| 架构文档 | `docs/MARKET_DATABASE_SCHEMA.md` |

---

**文档版本**: 1.1.0
**维护��**: NGO Platform Team
**最后更新**: 2026-03-29
