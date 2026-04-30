# 定期捐赠（Subscription Donation）集成方案

> 基于 WayForPay Regular Payment API，为 Way to Future UA 平台添加定期自动扣款捐赠功能

---

## 目录

1. [功能概述](#1-功能概述)
2. [WayForPay Regular Payment API 技术摘要](#2-wayforpay-regular-payment-api-技术摘要)
3. [数据库设计](#3-数据库设计)
4. [后端实现](#4-后端实现)
5. [前端实现](#5-前端实现)
6. [Webhook 扩展](#6-webhook-扩展)
7. [管理员后台](#7-管理员后台)
8. [邮件通知](#8-邮件通知)
9. [国际化](#9-国际化)
10. [安全与合规](#10-安全与合规)
11. [实施路线图](#11-实施路线图)
12. [风险与待决策项](#12-风险与待决策项)

---

## 1. 功能概述

### 1.1 用户故事

**捐赠者**：

- 我希望设置每月/每季度自动捐赠，无需重复操作
- 我希望随时查看自己的订阅状态和扣款历史
- 我希望随时取消或暂停定期捐赠
- 我希望每次扣款成功后收到邮件确认

**管理员**：

- 我希望查看所有活跃的定期捐赠订阅
- 我希望查看每个订阅的扣款历史
- 我希望必要时暂停/恢复/取消用户的订阅
- 我希望从订阅维度统计定期捐赠的收入

### 1.2 核心功能

| 功能         | 说明                                               |
| ------------ | -------------------------------------------------- |
| 创建定期捐赠 | 在现有捐赠表单上增加「定期捐赠」选项               |
| 自动扣款     | WayForPay 自动按周期从用户卡中扣款                 |
| 订阅管理     | 捐赠者查看/暂停/取消自己的订阅                     |
| 扣款记录     | 每次扣款产生独立的 donation 记录，复用现有捐赠流程 |
| 管理员管理   | 管理员查看/暂停/恢复/取消订阅                      |
| 邮件通知     | 创建、扣款成功、扣款失败、取消等关键事件发送邮件   |

### 1.3 与现有系统的关系

```
                     ┌──────────────────────────────┐
                     │    现有一次性捐赠流程        │
                     │  DonationFormCard → Widget    │
                     │  → Webhook → donation 记录   │
                     └──────────┬───────────────────┘
                                │ 复用
     ┌──────────────────────────┼──────────────────────────┐
     │                 定期捐赠新增部分                     │
     │                                                      │
     │  ┌─────────────┐    ┌──────────────────┐            │
     │  │ 订阅表单扩展 │───→│ recurring_donations│           │
     │  │ (regularMode │    │ 新表: 订阅元数据  │           │
     │  │  参数)       │    └────────┬─────────┘           │
     │  └─────────────┘             │                      │
     │                              │ 每次扣款              │
     │                    ┌─────────▼─────────┐            │
     │                    │  donations 表     │  ← 复用    │
     │                    │  (独立 donation    │            │
     │                    │   记录 + 关联订阅) │            │
     │                    └───────────────────┘            │
     └─────────────────────────────────────────────────────┘
```

**设计原则**：每次定期扣款产生的记录复用现有 `donations` 表，通过 `recurring_donation_id` 外键关联到订阅元数据。这样现有的状态管理、项目进度统计、管理员操作流程全部自动适用。

---

## 2. WayForPay Regular Payment API 技术摘要

### 2.1 创建定期支付

在标准 Purchase 请求中添加额外参数即可开启定期扣款。**签名计算不变**（定期参数不参与签名）。

#### 定期支付专用参数

| 参数              | 类型    | 必填 | 说明                                                 |
| ----------------- | ------- | ---- | ---------------------------------------------------- |
| `regularMode`     | string  | 是   | 扣款频率: `monthly`, `quarterly`, `yearly` 等        |
| `regularAmount`   | decimal | 否   | 每期扣款金额（不传则使用 `amount`）                  |
| `regularOn`       | integer | 否   | `1` = 支付页面默认勾选「定期支付」，锁定金额不可编辑 |
| `regularBehavior` | string  | 否   | `"preset"` = 用户不可修改定期参数                    |
| `dateNext`        | string  | 否   | 首次定期扣款日期 (DD.MM.YYYY)，须晚于当天            |
| `dateEnd`         | string  | 否   | 结束日期（与 `regularCount` 二选一）                 |
| `regularCount`    | integer | 否   | 总扣款次数（与 `dateEnd` 二选一）                    |

#### regularMode 可选值

| 值          | 说明     | 本项目使用                 |
| ----------- | -------- | -------------------------- |
| `monthly`   | 每月     | ✅ 主推                    |
| `quarterly` | 每季度   | ✅                         |
| `yearly`    | 每年     | ✅                         |
| `weekly`    | 每周     | ❌ 不提供                  |
| `daily`     | 每天     | ❌ 不提供                  |
| `client`    | 用户自选 | ❌ 不使用（我们自己做 UI） |

### 2.2 管理 API

所有管理操作通过 POST 到 `https://api.wayforpay.com/regularApi`。

> **重要**：管理 API 使用 `merchantPassword`（商户密码），与签名用的 `secretKey` 是不同的凭证。需要新增环境变量 `WAYFORPAY_MERCHANT_PASSWORD`。

| 操作     | requestType | 说明                 |
| -------- | ----------- | -------------------- |
| 查询状态 | `STATUS`    | 查询订阅当前状态     |
| 暂停     | `SUSPEND`   | 暂停定期扣款         |
| 恢复     | `RESUME`    | 恢复已暂停的扣款     |
| 取消     | `REMOVE`    | 永久取消（不可恢复） |
| 修改     | `CHANGE`    | 修改金额/频率/日期   |

#### 请求格式示例（STATUS）

```json
{
  "requestType": "STATUS",
  "merchantAccount": "merchant_name",
  "merchantPassword": "merchant_password",
  "orderReference": "DONATE-3-1711900000-abc123"
}
```

#### 订阅状态值

| 状态        | 说明                             |
| ----------- | -------------------------------- |
| `Active`    | 活跃，正在按计划扣款             |
| `Suspended` | 已暂停                           |
| `Created`   | 已创建，尚未激活                 |
| `Removed`   | 已取消                           |
| `Completed` | 已完成（达到结束日期或次数上限） |

### 2.3 Webhook 通知

每次定期扣款执行后，WayForPay 向创建时指定的 `serviceUrl` 发送 POST 通知。**通知格式与一次性支付回调完全相同**，签名验证逻辑不变。

关键点：

- 扣款成功：`transactionStatus: "Approved"`
- 扣款失败：`transactionStatus: "Declined"`（余额不足等），次日自动重试
- WayForPay 自动发送扣款前通知邮件给用户
- 商户必须返回 accept 响应，否则 WayForPay 重试 4 天

### 2.4 与现有代码的兼容性

| 组件                                 | 是否需要修改 | 说明                                 |
| ------------------------------------ | ------------ | ------------------------------------ |
| `generateSignature()`                | ❌ 不需要    | 定期参数不参与签名                   |
| `verifyWayForPaySignature()`         | ❌ 不需要    | 定期扣款通知签名格式相同             |
| `generateWebhookResponseSignature()` | ❌ 不需要    | 响应格式相同                         |
| `WayForPayPaymentParams` 接口        | ✅ 扩展      | 添加可选的定期支付字段               |
| `createWayForPayPayment()`           | ✅ 扩展      | 传入定期参数                         |
| Webhook handler                      | ✅ 扩展      | 区分首次支付和定期扣款，关联订阅记录 |

---

## 3. 数据库设计

### 3.1 新增表：`recurring_donations`

```sql
CREATE TABLE recurring_donations (
  id                BIGSERIAL PRIMARY KEY,

  -- 关联
  project_id        BIGINT NOT NULL REFERENCES projects(id),
  initial_order_reference VARCHAR(255) NOT NULL UNIQUE,  -- 首次支付的 orderReference

  -- 捐赠者信息（冗余存储，因为 donations 表按单笔记录）
  donor_name        VARCHAR(255) NOT NULL,
  donor_email       VARCHAR(255) NOT NULL,
  donor_message     TEXT,
  contact_telegram  VARCHAR(255),
  contact_whatsapp  VARCHAR(255),
  locale            VARCHAR(5) NOT NULL DEFAULT 'en',

  -- 定期扣款参数
  regular_mode      VARCHAR(20) NOT NULL,           -- monthly, quarterly, yearly
  amount            NUMERIC(10,2) NOT NULL,          -- 每次扣款金额
  currency          VARCHAR(10) NOT NULL DEFAULT 'UAH',
  quantity          INTEGER NOT NULL DEFAULT 1,      -- 每次扣款对应的单位数（非聚合项目）

  -- 状态
  status            VARCHAR(20) NOT NULL DEFAULT 'pending',
  -- pending: 首次支付未完成
  -- active: 正在定期扣款
  -- suspended: 已暂停
  -- cancelled: 已取消（不可恢复）
  -- completed: 已达到结束条件
  -- failed: 连续扣款失败
  wayforpay_status  VARCHAR(20),                     -- WayForPay 侧的状态 (Active/Suspended/Removed/Completed)

  -- 计划
  total_charges     INTEGER,                          -- 总扣款次数（NULL = 无限期）
  completed_charges INTEGER NOT NULL DEFAULT 0,       -- 已成功扣款次数
  failed_charges    INTEGER NOT NULL DEFAULT 0,       -- 连续失败次数
  total_donated     NUMERIC(10,2) NOT NULL DEFAULT 0, -- 累计成功金额
  date_next         DATE,                              -- 下次扣款日期
  date_end          DATE,                              -- 结束日期

  -- 时间戳
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  cancelled_at      TIMESTAMPTZ,                      -- 取消时间
  last_charge_at    TIMESTAMPTZ                        -- 上次扣款时间
);

-- 索引
CREATE INDEX idx_recurring_donations_donor_email ON recurring_donations(donor_email);
CREATE INDEX idx_recurring_donations_project_id ON recurring_donations(project_id);
CREATE INDEX idx_recurring_donations_status ON recurring_donations(status);
CREATE INDEX idx_recurring_donations_initial_order ON recurring_donations(initial_order_reference);
```

### 3.2 扩展 `donations` 表

```sql
-- 新增列：关联到定期捐赠订阅
ALTER TABLE donations
  ADD COLUMN recurring_donation_id BIGINT REFERENCES recurring_donations(id);

-- 新增列：标记是否为定期扣款产生的记录（vs 首次支付）
ALTER TABLE donations
  ADD COLUMN is_recurring_charge BOOLEAN NOT NULL DEFAULT FALSE;

-- 索引
CREATE INDEX idx_donations_recurring_id ON donations(recurring_donation_id);
```

### 3.3 新增表：`recurring_donation_status_history`

```sql
CREATE TABLE recurring_donation_status_history (
  id                    BIGSERIAL PRIMARY KEY,
  recurring_donation_id BIGINT NOT NULL REFERENCES recurring_donations(id),
  from_status           TEXT,
  to_status             TEXT NOT NULL,
  changed_by            TEXT,              -- 'system', 'admin', 'donor'
  reason                TEXT,              -- 状态变更原因
  changed_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_recurring_status_history_rid
  ON recurring_donation_status_history(recurring_donation_id);
```

### 3.4 触发器

```sql
-- 1. 自动更新 updated_at
CREATE TRIGGER update_recurring_donations_updated_at
  BEFORE UPDATE ON recurring_donations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 2. 记录状态变更历史
CREATE OR REPLACE FUNCTION log_recurring_donation_status_change()
  RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO recurring_donation_status_history
      (recurring_donation_id, from_status, to_status)
    VALUES
      (NEW.id, OLD.status, NEW.status);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_log_recurring_status_change
  AFTER UPDATE ON recurring_donations
  FOR EACH ROW
  EXECUTE FUNCTION log_recurring_donation_status_change();

-- 3. 保护不可变字段
CREATE OR REPLACE FUNCTION prevent_recurring_donation_immutable_fields()
  RETURNS TRIGGER AS $$
BEGIN
  IF NEW.id != OLD.id THEN
    RAISE EXCEPTION 'Cannot modify id';
  END IF;
  IF NEW.initial_order_reference != OLD.initial_order_reference THEN
    RAISE EXCEPTION 'Cannot modify initial_order_reference';
  END IF;
  IF NEW.project_id != OLD.project_id THEN
    RAISE EXCEPTION 'Cannot modify project_id';
  END IF;
  IF NEW.donor_email != OLD.donor_email THEN
    RAISE EXCEPTION 'Cannot modify donor_email';
  END IF;
  IF NEW.created_at != OLD.created_at THEN
    RAISE EXCEPTION 'Cannot modify created_at';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_prevent_recurring_immutable
  BEFORE UPDATE ON recurring_donations
  FOR EACH ROW
  EXECUTE FUNCTION prevent_recurring_donation_immutable_fields();
```

### 3.5 RLS 策略

```sql
ALTER TABLE recurring_donations ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurring_donation_status_history ENABLE ROW LEVEL SECURITY;

-- 管理员完全访问
CREATE POLICY admin_recurring_full ON recurring_donations
  FOR ALL USING (is_admin());

CREATE POLICY admin_recurring_history_full ON recurring_donation_status_history
  FOR ALL USING (is_admin());

-- 匿名用户：仅能 INSERT pending 状态
CREATE POLICY anon_create_recurring ON recurring_donations
  FOR INSERT WITH CHECK (status = 'pending');

-- 匿名用户：不可直接读取（通过 Server Action 验证后查询）

-- Service Role：仅用于 Webhook 回调更新支付状态、SECURITY DEFINER 函数调用（不绕过 RLS 做状态转换）
```

### 3.6 视图

```sql
-- 公开订阅统计（用于项目页展示「N 位月捐者」）
CREATE OR REPLACE VIEW recurring_donation_stats AS
SELECT
  project_id,
  COUNT(*) FILTER (WHERE status = 'active') AS active_subscribers,
  COALESCE(SUM(total_donated) FILTER (WHERE status IN ('active','completed','cancelled')), 0)
    AS total_recurring_donated,
  COUNT(*) AS total_subscriptions
FROM recurring_donations
GROUP BY project_id;
```

### 3.7 ER 关系图

```
projects (1) ──────────── (N) recurring_donations
                                    │
                                    │ (1) ──── (N) donations
                                    │               (is_recurring_charge = true)
                                    │
                                    │ (1) ──── (N) recurring_donation_status_history
```

---

## 4. 后端实现

### 4.1 新增环境变量

```bash
# WayForPay Regular API（商户密码，不同于 SecretKey）
WAYFORPAY_MERCHANT_PASSWORD=
```

### 4.2 扩展 WayForPay 支付参数

**文件**: `lib/payment/wayforpay/server.ts`

```typescript
// 新增：定期支付参数接口
export interface WayForPayRegularParams {
  regularMode: 'monthly' | 'quarterly' | 'yearly'
  regularAmount?: number // 不传则使用 amount
  regularOn?: 1 // 锁定定期支付选项
  regularBehavior?: 'preset' // 用户不可修改
  dateNext?: string // DD.MM.YYYY 格式
  dateEnd?: string // DD.MM.YYYY（与 regularCount 二选一）
  regularCount?: number // 总次数（与 dateEnd 二选一）
}

// 扩展现有接口
export interface WayForPayPaymentParams {
  // ... 现有字段 ...
  // 新增可选定期支付字段
  regularMode?: string
  regularAmount?: number
  regularOn?: number
  regularBehavior?: string
  dateNext?: string
  dateEnd?: string
  regularCount?: number
}

// 扩展 createWayForPayPayment 函数，接受可选的 regular 参数
export function createWayForPayPayment({
  // ... 现有参数 ...
  regular, // 新增
}: {
  // ... 现有类型 ...
  regular?: WayForPayRegularParams
}): WayForPayPaymentParams {
  // 签名计算不变（定期参数不参与签名）
  const params = {
    /* 现有逻辑 */
  }

  // 合入定期支付参数
  if (regular) {
    params.regularMode = regular.regularMode
    params.regularOn = 1
    params.regularBehavior = 'preset'
    if (regular.regularAmount) params.regularAmount = regular.regularAmount
    if (regular.dateNext) params.dateNext = regular.dateNext
    if (regular.dateEnd) params.dateEnd = regular.dateEnd
    if (regular.regularCount) params.regularCount = regular.regularCount
  }

  return params
}
```

### 4.3 新增 Regular API 管理客户端

**新建文件**: `lib/payment/wayforpay/regular-api.ts`

```typescript
import { logger } from '@/lib/logger'

const REGULAR_API_URL = 'https://api.wayforpay.com/regularApi'
const MERCHANT_ACCOUNT = process.env.WAYFORPAY_MERCHANT_ACCOUNT!
const MERCHANT_PASSWORD = process.env.WAYFORPAY_MERCHANT_PASSWORD!

export type RegularApiRequestType = 'STATUS' | 'SUSPEND' | 'RESUME' | 'REMOVE' | 'CHANGE'

export interface RegularStatusResponse {
  reasonCode: number
  reason: string
  orderReference: string
  mode: string
  status: 'Active' | 'Suspended' | 'Created' | 'Removed' | 'Completed'
  amount: number
  currency: string
  email: string
  dateBegin: number
  dateEnd: number | null
  lastPayedDate: number | null
  lastPayedStatus: string | null
  nextPaymentDate: number | null
}

/** 查询定期支付状态 */
export async function getRegularStatus(orderReference: string): Promise<RegularStatusResponse> {
  return callRegularApi('STATUS', { orderReference })
}

/** 暂停定期支付 */
export async function suspendRegular(
  orderReference: string
): Promise<{ reasonCode: number; reason: string }> {
  return callRegularApi('SUSPEND', { orderReference })
}

/** 恢复定期支付 */
export async function resumeRegular(
  orderReference: string
): Promise<{ reasonCode: number; reason: string }> {
  return callRegularApi('RESUME', { orderReference })
}

/** 取消定期支付（不可恢复） */
export async function removeRegular(
  orderReference: string
): Promise<{ reasonCode: number; reason: string }> {
  return callRegularApi('REMOVE', { orderReference })
}

async function callRegularApi(
  requestType: RegularApiRequestType,
  params: Record<string, any>
): Promise<any> {
  const body = {
    requestType,
    merchantAccount: MERCHANT_ACCOUNT,
    merchantPassword: MERCHANT_PASSWORD,
    ...params,
  }

  logger.info('PAYMENT:WAYFORPAY:REGULAR', `${requestType} request`, {
    orderReference: params.orderReference,
  })

  const response = await fetch(REGULAR_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    throw new Error(`Regular API error: ${response.status}`)
  }

  const data = await response.json()

  if (data.reasonCode !== 4100) {
    logger.error('PAYMENT:WAYFORPAY:REGULAR', `${requestType} failed`, data)
    throw new Error(`Regular API failed: ${data.reason}`)
  }

  return data
}
```

### 4.4 新增 Server Actions

**新建文件**: `app/actions/recurring-donation.ts`

#### 核心 Actions

| Action                          | 说明                       |
| ------------------------------- | -------------------------- |
| `createRecurringDonation()`     | 创建定期捐赠（含首次支付） |
| `getMyRecurringDonations()`     | 捐赠者查看自己的订阅列表   |
| `cancelRecurringDonation()`     | 捐赠者取消订阅             |
| `pauseRecurringDonation()`      | 捐赠者暂停订阅             |
| `resumeRecurringDonation()`     | 捐赠者恢复订阅             |
| `getRecurringDonationCharges()` | 查看某订阅的扣款历史       |

#### 创建流程伪代码

```typescript
export async function createRecurringDonation(formData: RecurringDonationInput) {
  // 1. 验证表单数据
  const validated = recurringDonationSchema.parse(formData)

  // 2. 获取项目信息，计算金额
  const project = await getProject(validated.projectId)
  const amount = calculateAmount(project, validated)

  // 3. 生成 orderReference
  const orderReference = `RDONATE-${project.id}-${timestamp}-${random}`

  // 4. 创建 recurring_donations 记录（status = 'pending'）
  const recurring = await supabase.from('recurring_donations').insert({
    project_id: project.id,
    initial_order_reference: orderReference,
    donor_name: validated.donorName,
    donor_email: validated.donorEmail,
    regular_mode: validated.regularMode,
    amount,
    currency: validated.currency,
    quantity: validated.quantity,
    status: 'pending',
  })

  // 5. 创建首次 donation 记录（复用现有逻辑）
  //    - 关联 recurring_donation_id
  //    - is_recurring_charge = false（首次支付）
  const donation = await createDonationRecords({
    ...validated,
    orderReference,
    recurringDonationId: recurring.id,
    isRecurringCharge: false,
  })

  // 6. 计算下次扣款日期
  const dateNext = calculateNextDate(validated.regularMode)

  // 7. 生成 WayForPay 支付参数（附带 regular 参数）
  const paymentParams = createWayForPayPayment({
    orderReference,
    amount,
    // ... 其他标准参数 ...
    regular: {
      regularMode: validated.regularMode,
      regularAmount: amount,
      regularOn: 1,
      regularBehavior: 'preset',
      dateNext: formatDateForWayForPay(dateNext),
      regularCount: validated.totalCharges, // 可选
    },
  })

  return { paymentParams, recurringDonationId: recurring.id }
}
```

#### 捐赠者管理伪代码

```typescript
export async function getMyRecurringDonations(email: string, verificationId: string) {
  // 1. 验证邮箱所有权（复用现有 OTP 或 donation tracking 验证逻辑）
  const verified = await verifyEmailOwnership(email, verificationId)
  if (!verified) throw new Error('Verification failed')

  // 2. 查询该邮箱的所有订阅
  const { data } = await supabase
    .from('recurring_donations')
    .select('*, projects(*)')
    .eq('donor_email', email)
    .order('created_at', { ascending: false })

  return data
}

export async function cancelRecurringDonation(
  recurringId: number,
  email: string,
  verificationId: string
) {
  // 1. 验证身份
  // 2. 验证订阅属于该邮箱
  // 3. 调用 WayForPay REMOVE API
  await removeRegular(subscription.initial_order_reference)
  // 4. 更新数据库状态
  await supabase
    .from('recurring_donations')
    .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
    .eq('id', recurringId)
}
```

### 4.5 新增管理员 Actions

**文件**: `app/actions/admin.ts`（扩展）或新建 `app/actions/admin-recurring.ts`

| Action                         | 说明                      |
| ------------------------------ | ------------------------- |
| `getAdminRecurringDonations()` | 管理员获取所有订阅列表    |
| `adminSuspendRecurring()`      | 管理员暂停订阅            |
| `adminResumeRecurring()`       | 管理员恢复订阅            |
| `adminCancelRecurring()`       | 管理员取消订阅            |
| `syncRecurringStatus()`        | 从 WayForPay 同步订阅状态 |

### 4.6 定期捐赠状态工具

**新建文件**: `lib/recurring-donation-status.ts`

```typescript
export const RECURRING_STATUSES = [
  'pending', // 首次支付未完成
  'active', // 正在定期扣款
  'suspended', // 已暂停
  'cancelled', // 已取消（不可恢复）
  'completed', // 达到结束条件
  'failed', // 连续失败
] as const

export type RecurringDonationStatus = (typeof RECURRING_STATUSES)[number]

// 状态转换规则
export const RECURRING_STATUS_TRANSITIONS: Record<
  RecurringDonationStatus,
  RecurringDonationStatus[]
> = {
  pending: ['active', 'cancelled'], // 首次支付成功 → active; 支付失败 → cancelled
  active: ['suspended', 'cancelled', 'completed', 'failed'],
  suspended: ['active', 'cancelled'], // 恢复 or 取消
  cancelled: [], // 终态
  completed: [], // 终态
  failed: ['active', 'cancelled'], // 重试成功 or 放弃
}

// WayForPay 状态映射
export const WAYFORPAY_TO_RECURRING_STATUS: Record<string, RecurringDonationStatus> = {
  Active: 'active',
  Suspended: 'suspended',
  Removed: 'cancelled',
  Completed: 'completed',
}

// 可暂停的状态
export function canSuspend(status: RecurringDonationStatus): boolean {
  return status === 'active'
}

// 可恢复的状态
export function canResume(status: RecurringDonationStatus): boolean {
  return status === 'suspended'
}

// 可取消的状态
export function canCancel(status: RecurringDonationStatus): boolean {
  return ['active', 'suspended', 'pending'].includes(status)
}

// 是否为终态
export function isTerminal(status: RecurringDonationStatus): boolean {
  return ['cancelled', 'completed'].includes(status)
}

// 状态颜色
export const RECURRING_STATUS_COLORS: Record<
  RecurringDonationStatus,
  { bg: string; text: string }
> = {
  pending: { bg: 'bg-ukraine-gold-100', text: 'text-ukraine-gold-800' },
  active: { bg: 'bg-life-200', text: 'text-life-800' },
  suspended: { bg: 'bg-amber-100', text: 'text-amber-700' },
  cancelled: { bg: 'bg-slate-100', text: 'text-slate-600' },
  completed: { bg: 'bg-emerald-100', text: 'text-emerald-700' },
  failed: { bg: 'bg-rose-100', text: 'text-rose-700' },
}
```

---

## 5. 前端实现

### 5.1 捐赠表单扩展

**文件**: `components/donate-form/DonationFormCard.tsx`

在现有表单中，支付方式选择之前添加「捐赠类型」切换：

```
┌──────────────────────────────────────┐
│  选择项目                            │
│  ┌──────┐ ┌──────┐ ┌──────┐         │
│  │ Proj │ │ Proj │ │ Proj │         │
│  └──────┘ └──────┘ └──────┘         │
│                                      │
│  捐赠金额 / 数量                     │
│  ┌──────────────────────────────┐   │
│  │ $50  ×  3 件                 │   │
│  └──────────────────────────────┘   │
│                                      │
│  捐赠类型     ←── 新增              │
│  ┌─────────────┬─────────────────┐  │
│  │ ☐ 一次性    │ ☐ 定期捐赠      │  │
│  └─────────────┴─────────────────┘  │
│                                      │
│  定期捐赠选项  ←── 新增（条件渲染） │
│  ┌──────────────────────────────┐   │
│  │ 频率: [每月 ▼]              │   │
│  │ 持续: [无限期 ▼] 或 [N次]   │   │
│  └──────────────────────────────┘   │
│                                      │
│  捐赠者信息                          │
│  ┌──────────────────────────────┐   │
│  │ 姓名 / 邮箱 / 留言           │   │
│  └──────────────────────────────┘   │
│                                      │
│  支付方式                            │
│  ┌──────────────────────────────┐   │
│  │ 💳 WayForPay                │   │
│  │ (加密货币不支持定期扣款)      │   │
│  └──────────────────────────────┘   │
└──────────────────────────────────────┘
```

#### 关键交互逻辑

1. **「定期捐赠」仅在 WayForPay 支付方式下可用**
   - 选择 NOWPayments 时，定期捐赠选项灰化不可选
   - 选择定期捐赠时，支付方式自动锁定为 WayForPay

2. **频率选择**
   - 下拉菜单：每月 / 每季度 / 每年
   - 默认选「每月」

3. **持续时间**
   - 选项一：无限期（直到手动取消）
   - 选项二：指定次数（如 12 次 = 一年的月捐）

4. **金额说明**
   - 定期捐赠时，显示说明文案：「首次扣款 $X，之后每月自动扣款 $X」

### 5.2 新增页面

#### 5.2.1 订阅管理页 `/[locale]/recurring-donations`

捐赠者通过邮箱 + OTP 验证后查看和管理自己的订阅。

```
┌──────────────────────────────────────────────────┐
│  我的定期捐赠                                    │
│                                                    │
│  验证邮箱以查看您的定期捐赠                        │
│  ┌─────────────────────┐ ┌────────┐              │
│  │ email@example.com   │ │ 发送OTP │              │
│  └─────────────────────┘ └────────┘              │
│                                                    │
│  ─── 验证后显示 ───                                │
│                                                    │
│  ┌────────────────────────────────────────────┐   │
│  │ 🟢 Project Name        每月 $50           │   │
│  │ 已捐赠 $350 (7 次)    下次: 2026-04-15     │   │
│  │ ┌────────┐ ┌────────┐                      │   │
│  │ │ 暂停   │ │ 取消   │                      │   │
│  │ └────────┘ └────────┘                      │   │
│  └────────────────────────────────────────────┘   │
│                                                    │
│  ┌────────────────────────────────────────────┐   │
│  │ ⏸️ Project Name        每季度 $200         │   │
│  │ 已暂停                                     │   │
│  │ ┌────────┐ ┌────────┐                      │   │
│  │ │ 恢复   │ │ 取消   │                      │   │
│  │ └────────┘ └────────┘                      │   │
│  └────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────┘
```

#### 5.2.2 捐赠追踪页面扩展 `/[locale]/track-donation`

在现有追踪页面中增加「定期捐赠」Tab 或入口，让用户可以从追踪页跳转到订阅管理页。

### 5.3 新增组件

| 组件                      | 路径                      | 说明                       |
| ------------------------- | ------------------------- | -------------------------- |
| `RecurringDonationToggle` | `components/donate-form/` | 一次性/定期切换            |
| `RecurringOptions`        | `components/donate-form/` | 频率、持续时间选择         |
| `RecurringDonationCard`   | `components/recurring/`   | 订阅卡片（状态、操作按钮） |
| `RecurringDonationList`   | `components/recurring/`   | 订阅列表                   |
| `RecurringStatusBadge`    | `components/recurring/`   | 订阅状态徽章               |
| `RecurringChargeHistory`  | `components/recurring/`   | 扣款历史列表               |

---

## 6. Webhook 扩展

### 6.1 现有 Webhook Handler 修改

**文件**: `app/api/webhooks/wayforpay/route.ts`

现有 handler 需要处理两种新场景：

1. **首次定期支付成功** — 需要激活订阅
2. **后续定期扣款通知** — 需要创建新的 donation 记录

#### 区分逻辑

```typescript
export async function POST(request: Request) {
  // 1. 验证签名（不变）
  // 2. 解析数据（不变）

  const orderReference = data.orderReference
  const transactionStatus = data.transactionStatus

  // 3. 检查是否为定期捐赠的首次支付
  const recurring = await supabase
    .from('recurring_donations')
    .select('*')
    .eq('initial_order_reference', orderReference)
    .single()

  if (recurring.data) {
    // ─── 定期捐赠场景 ───
    await handleRecurringWebhook(data, recurring.data)
  } else {
    // ─── 现有一次性捐赠场景（不变） ───
    await handleOneTimeWebhook(data)
  }

  // 4. 返回响应（不变）
}
```

### 6.2 定期捐赠 Webhook 处理

```typescript
async function handleRecurringWebhook(data: WayForPayWebhookData, recurring: RecurringDonation) {
  const isFirstPayment = recurring.status === 'pending'

  if (isFirstPayment) {
    // ─── 首次支付 ───
    if (data.transactionStatus === 'Approved') {
      // 1. 更新现有 donation 记录状态 → paid
      await updateDonationStatus(data.orderReference, 'paid')

      // 2. 激活订阅
      await supabase
        .from('recurring_donations')
        .update({
          status: 'active',
          wayforpay_status: 'Active',
          completed_charges: 1,
          total_donated: recurring.amount,
          last_charge_at: new Date().toISOString(),
        })
        .eq('id', recurring.id)

      // 3. 发送邮件（首次付款成功 + 订阅已创建）
      await sendRecurringDonationCreatedEmail(recurring)
    } else {
      // 首次支付失败 → 取消订阅
      await updateDonationStatus(data.orderReference, mapStatus(data))
      await supabase
        .from('recurring_donations')
        .update({ status: 'cancelled' })
        .eq('id', recurring.id)
    }
  } else {
    // ─── 后续定期扣款 ───
    if (data.transactionStatus === 'Approved') {
      // 1. 创建新的 donation 记录
      //    orderReference 与首次支付相同，但 donation_public_id 不同
      const newDonation = await createRecurringChargeDonation(recurring, data)

      // 2. 更新订阅统计
      await supabase
        .from('recurring_donations')
        .update({
          completed_charges: recurring.completed_charges + 1,
          failed_charges: 0, // 重置连续失败计数
          total_donated: recurring.total_donated + recurring.amount,
          last_charge_at: new Date().toISOString(),
        })
        .eq('id', recurring.id)

      // 3. 发送扣款成功邮件
      await sendRecurringChargeSuccessEmail(recurring, newDonation)
    } else if (data.transactionStatus === 'Declined') {
      // 扣款失败
      const newFailedCount = recurring.failed_charges + 1
      const updates: any = { failed_charges: newFailedCount }

      // 连续失败 3 次 → 标记为 failed
      if (newFailedCount >= 3) {
        updates.status = 'failed'
        await sendRecurringDonationFailedEmail(recurring)
      } else {
        await sendRecurringChargeFailedEmail(recurring, newFailedCount)
      }

      await supabase.from('recurring_donations').update(updates).eq('id', recurring.id)
    }
  }
}
```

### 6.3 后续扣款的 Donation 记录创建

```typescript
async function createRecurringChargeDonation(
  recurring: RecurringDonation,
  webhookData: WayForPayWebhookData
) {
  const project = await getProject(recurring.project_id)

  // 非聚合项目：每单位一条记录
  // 聚合项目：一条记录
  const records = buildDonationRecords({
    project,
    amount: recurring.amount,
    quantity: recurring.quantity,
    orderReference: `${recurring.initial_order_reference}-R${recurring.completed_charges + 1}`,
    donorName: recurring.donor_name,
    donorEmail: recurring.donor_email,
    donorMessage: recurring.donor_message,
    locale: recurring.locale,
    recurringDonationId: recurring.id,
    isRecurringCharge: true,
    status: 'paid', // 直接 paid（Webhook 已确认）
  })

  const { data } = await supabase.from('donations').insert(records).select()

  return data
}
```

> **注意**：后续扣款的 `orderReference` 使用 `{原始orderRef}-R{次数}` 格式，确保每次扣款有唯一标识，同时可通过前缀关联到原始订阅。

---

## 7. 管理员后台

### 7.1 新增管理页面

**路径**: `/admin/recurring`

| 功能      | 说明                                   |
| --------- | -------------------------------------- |
| 订阅列表  | 表格展示所有订阅，可筛选状态/项目/邮箱 |
| 订阅详情  | 查看订阅元数据 + 所有扣款记录          |
| 暂停/恢复 | 调用 WayForPay SUSPEND/RESUME API      |
| 取消      | 调用 WayForPay REMOVE API              |
| 状态同步  | 从 WayForPay 拉取最新状态并更新本地    |

### 7.2 管理员组件

| 组件                           | 路径                | 说明         |
| ------------------------------ | ------------------- | ------------ |
| `RecurringDonationsTable`      | `components/admin/` | 订阅表格     |
| `RecurringDonationDetailModal` | `components/admin/` | 订阅详情弹窗 |

### 7.3 管理导航扩展

**文件**: `components/admin/AdminNav.tsx`

新增导航项：`Recurring Donations`（或 `Subscriptions`）

### 7.4 现有捐赠表格扩展

在 `DonationsTable` 中，对于 `is_recurring_charge = true` 的记录，显示订阅图标和关联链接，点击可跳转到订阅详情。

---

## 8. 邮件通知

### 8.1 新增邮件模板

| 事件         | 模板                       | 发送时机                    |
| ------------ | -------------------------- | --------------------------- |
| 订阅创建成功 | `recurring-created`        | 首次支付成功，订阅激活      |
| 定期扣款成功 | `recurring-charge-success` | 每次自动扣款成功            |
| 定期扣款失败 | `recurring-charge-failed`  | 扣款失败（含重试提醒）      |
| 订阅连续失败 | `recurring-failed`         | 连续 3 次扣款失败，订阅停用 |
| 订阅暂停     | `recurring-suspended`      | 用户或管理员暂停            |
| 订阅恢复     | `recurring-resumed`        | 用户或管理员恢复            |
| 订阅取消     | `recurring-cancelled`      | 用户或管理员取消            |
| 订阅完成     | `recurring-completed`      | 达到预设次数/结束日期       |

### 8.2 邮件内容要点

**订阅创建成功**：

- 项目名称、捐赠金额、扣款频率
- 下次扣款日期
- 管理订阅的链接（跳转到 `/recurring-donations`）
- 取消订阅的说明

**定期扣款成功**：

- 本次扣款金额和日期
- 累计捐赠总额和次数
- 项目进度更新
- 管理订阅的链接

### 8.3 多语言支持

所有邮件模板支持 en/zh/ua 三种语言，根据订阅记录的 `locale` 字段发送。

---

## 9. 国际化

### 9.1 新增翻译键

**文件**: `messages/{en,zh,ua}.json`

```json
{
  "donate": {
    "donationType": "Donation Type",
    "oneTime": "One-time",
    "recurring": "Recurring",
    "recurringDescription": "Set up automatic recurring donations",
    "frequency": "Frequency",
    "frequencyMonthly": "Monthly",
    "frequencyQuarterly": "Quarterly",
    "frequencyYearly": "Yearly",
    "duration": "Duration",
    "durationIndefinite": "Until I cancel",
    "durationFixed": "Fixed number of payments",
    "chargeCount": "Number of payments",
    "recurringNote": "First charge of {amount} today, then {amount} automatically {frequency}",
    "recurringCryptoUnavailable": "Recurring donations are only available with card payment",
    "firstCharge": "First payment",
    "nextCharge": "Next payment"
  },
  "recurringDonations": {
    "title": "My Recurring Donations",
    "verifyEmail": "Verify your email to view recurring donations",
    "noSubscriptions": "You don't have any recurring donations",
    "activeSubscription": "Active",
    "pausedSubscription": "Paused",
    "cancelledSubscription": "Cancelled",
    "totalDonated": "Total donated",
    "chargesCompleted": "{count} payments completed",
    "nextCharge": "Next payment: {date}",
    "pause": "Pause",
    "resume": "Resume",
    "cancel": "Cancel Subscription",
    "cancelConfirm": "Are you sure you want to cancel this recurring donation? This cannot be undone.",
    "pauseConfirm": "Pause this recurring donation? You can resume it later.",
    "chargeHistory": "Payment History"
  }
}
```

---

## 10. 安全与合规

### 10.1 安全措施

| 措施                  | 说明                                                                             |
| --------------------- | -------------------------------------------------------------------------------- |
| 身份验证              | 捐赠者操作订阅需通过邮箱 OTP 验证（复用 `market-auth` 或 `track-donation` 机制） |
| RLS 策略              | 订阅表启用 RLS，匿名用户仅能创建 pending 记录                                    |
| 不可变字段保护        | 触发器保护 `id`, `initial_order_reference`, `project_id`, `donor_email`          |
| Webhook 签名验证      | 复用现有 HMAC-MD5 验证逻辑                                                       |
| merchantPassword 保密 | 仅存在服务端环境变量，不暴露给客户端                                             |
| 乐观锁                | 管理员操作使用 `.eq('status', currentStatus)` 防止并发冲突                       |
| 速率限制              | 取消/暂停/恢复操作添加速率限制，防止滥用                                         |

### 10.2 合规要求

| 要求         | 实现                                               |
| ------------ | -------------------------------------------------- |
| 用户知情同意 | 表单中明确说明「将自动按周期扣款」，需用户主动勾选 |
| 随时可取消   | 提供自助取消功能，不设取消障碍                     |
| 扣款通知     | WayForPay 自动发送扣款前通知 + 我方发送扣款后确认  |
| 隐私保护     | 邮箱在公开视图中混淆，复用现有脱敏逻辑             |
| 数据保留     | 取消后保留历史记录，仅标记状态为 cancelled         |

---

## 11. 实施路线图

### Phase 1：基础设施（预计 2-3 天）

- [ ] 数据库迁移（新表 + 扩展字段）
- [ ] `lib/payment/wayforpay/regular-api.ts`（Regular API 客户端）
- [ ] `lib/recurring-donation-status.ts`（状态工具库）
- [ ] 扩展 `WayForPayPaymentParams` 和 `createWayForPayPayment()`
- [ ] 新增环境变量 `WAYFORPAY_MERCHANT_PASSWORD`
- [ ] 更新 TypeScript 数据库类型 (`supabase gen types`)

### Phase 2：核心后端（预计 2-3 天）

- [ ] `app/actions/recurring-donation.ts`（创建、查询、取消、暂停、恢复）
- [ ] Webhook handler 扩展（首次支付 + 后续扣款）
- [ ] 管理员 Actions（列表、管理、状态同步）
- [ ] Zod 验证 schemas

### Phase 3：前端 - 捐赠表单（预计 2 天）

- [ ] `RecurringDonationToggle` 组件
- [ ] `RecurringOptions` 组件
- [ ] `DonationFormCard` 集成
- [ ] 表单验证和交互逻辑
- [ ] 国际化翻译

### Phase 4：前端 - 订阅管理（预计 2-3 天）

- [ ] `/[locale]/recurring-donations` 页面
- [ ] `RecurringDonationCard`、`RecurringDonationList` 组件
- [ ] `RecurringStatusBadge` 组件
- [ ] `RecurringChargeHistory` 组件
- [ ] 邮箱验证 + 管理操作 UI

### Phase 5：管理员后台（预计 1-2 天）

- [ ] `/admin/recurring` 页面
- [ ] `RecurringDonationsTable` 组件
- [ ] `RecurringDonationDetailModal` 组件
- [ ] AdminNav 扩展
- [ ] 现有 DonationsTable 中显示订阅关联标识

### Phase 6：邮件与收尾（预计 1-2 天）

- [ ] 邮件模板（8 种事件 × 3 种语言）
- [ ] 捐赠追踪页面集成
- [ ] 成功页面适配
- [ ] 文档更新（CLAUDE.md、数据库架构文档）

### 总计：10-15 天

---

## 12. 风险与待决策项

### 12.1 待决策

| 项目                 | 选项                                                | 建议                                      |
| -------------------- | --------------------------------------------------- | ----------------------------------------- |
| **长期项目限制**     | 定期捐赠是否仅限长期项目（`is_long_term = true`）？ | 建议 YES — 固定期限项目可能在订阅期间结束 |
| **项目满额处理**     | 非长期项目达到目标后，正在进行的订阅怎么办？        | 自动暂停 + 通知用户，或只允许长期项目     |
| **金额修改**         | 是否允许用户自行修改扣款金额/频率？                 | 初版不做，后续迭代                        |
| **NOWPayments**      | 加密货币是否支持定期扣款？                          | 不支持 — 加密货币无法自动扣款             |
| **捐赠者身份验证**   | 用邮箱 OTP（复用 market-auth）还是捐赠追踪验证？    | 复用 market-auth 的 OTP 机制更安全        |
| **连续失败阈值**     | 多少次连续失败后停止订阅？                          | 建议 3 次                                 |
| **regularMode 选项** | 提供哪些频率选项？                                  | 初版：monthly / quarterly / yearly        |
| **merchantPassword** | 是否已有此凭证？需要向 WayForPay 申请？             | 需确认                                    |

### 12.2 风险

| 风险                                         | 影响                                                             | 缓解措施                                       |
| -------------------------------------------- | ---------------------------------------------------------------- | ---------------------------------------------- |
| `merchantPassword` 与 `secretKey` 是不同凭证 | 无法调用 Regular API                                             | 提前确认凭证获取方式                           |
| WayForPay 测试环境对 Regular API 的支持程度  | 无法充分测试                                                     | 使用小额真实支付测试                           |
| 后续扣款的 Webhook orderReference 格式       | 不确定 WayForPay 是复用原始 orderRef 还是生成新的                | 需要实测确认，handler 需兼容两种情况           |
| 时区问题                                     | `dateNext` 使用 DD.MM.YYYY，WayForPay 服务器在乌克兰（EET/EEST） | 日期计算时考虑时区偏移                         |
| 用户取消与 WayForPay 状态不同步              | 本地取消了但 WayForPay 继续扣款                                  | 始终先调用 WayForPay API，成功后才更新本地状态 |

### 12.3 后续迭代方向

- 支持用户修改扣款金额和频率（`CHANGE` API）
- 订阅统计仪表板（月度/季度定期收入趋势）
- 项目页面展示「N 位月捐者」标识
- 定期捐赠者专属感谢页面/徽章
- 管理员批量操作（批量暂停/恢复）
- 扣款日历视图

---

## 附录 A：文件变更清单

### 新建文件

| 文件                                                   | 说明               |
| ------------------------------------------------------ | ------------------ |
| `supabase/migrations/2026XXXX_recurring_donations.sql` | 数据库迁移         |
| `lib/payment/wayforpay/regular-api.ts`                 | Regular API 客户端 |
| `lib/recurring-donation-status.ts`                     | 订阅状态工具库     |
| `app/actions/recurring-donation.ts`                    | 捐赠者订阅 Actions |
| `app/actions/admin-recurring.ts`                       | 管理员订阅 Actions |
| `app/[locale]/recurring-donations/page.tsx`            | 订阅管理页         |
| `app/admin/recurring/page.tsx`                         | 管理员订阅页       |
| `components/donate-form/RecurringDonationToggle.tsx`   | 切换组件           |
| `components/donate-form/RecurringOptions.tsx`          | 选项组件           |
| `components/recurring/RecurringDonationCard.tsx`       | 订阅卡片           |
| `components/recurring/RecurringDonationList.tsx`       | 订阅列表           |
| `components/recurring/RecurringStatusBadge.tsx`        | 状态徽章           |
| `components/recurring/RecurringChargeHistory.tsx`      | 扣款历史           |
| `components/admin/RecurringDonationsTable.tsx`         | 管理表格           |
| `components/admin/RecurringDonationDetailModal.tsx`    | 管理详情           |
| `lib/email/templates/recurring-*.tsx`                  | 8 种邮件模板       |

### 修改文件

| 文件                                          | 修改内容                         |
| --------------------------------------------- | -------------------------------- |
| `lib/payment/wayforpay/server.ts`             | 扩展支付参数接口和创建函数       |
| `app/api/webhooks/wayforpay/route.ts`         | 添加定期捐赠 Webhook 处理        |
| `components/donate-form/DonationFormCard.tsx` | 集成定期捐赠选项                 |
| `components/admin/AdminNav.tsx`               | 新增导航项                       |
| `components/admin/DonationsTable.tsx`         | 显示订阅关联标识                 |
| `lib/validations.ts`                          | 新增验证 schemas                 |
| `types/index.ts`                              | 新增类型导出                     |
| `messages/en.json`                            | 新增翻译键                       |
| `messages/zh.json`                            | 新增翻译键                       |
| `messages/ua.json`                            | 新增翻译键                       |
| `.env.example`                                | 新增 WAYFORPAY_MERCHANT_PASSWORD |
| `CLAUDE.md`                                   | 更新项目文档                     |
| `docs/DONATION_DATABASE_SCHEMA.md`            | 更新数据库文档                   |
| `docs/DONATION_STATUS.md`                     | 更新状态文档                     |

---

## 附录 B：WayForPay Regular API 参考链接

- [Regular payments 概述](https://wiki.wayforpay.com/en/view/852496)
- [Accept payment (含 regularMode 参数)](https://wiki.wayforpay.com/en/view/852102)
- [查询定期支付状态](https://wiki.wayforpay.com/en/view/852526)
- [暂停定期支付](https://wiki.wayforpay.com/en/view/852506)
- [恢复定期支付](https://wiki.wayforpay.com/en/view/852513)
- [取消定期支付](https://wiki.wayforpay.com/en/view/852521)
- [修改定期支付](https://wiki.wayforpay.com/en/view/13271051)

---

**文档版本**: 1.0.0
**创建日期**: 2026-03-31
**作者**: Claude (AI Assistant)
