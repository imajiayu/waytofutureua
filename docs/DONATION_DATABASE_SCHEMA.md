# 捐赠模块 - 数据库架构文档

## 概述

本文档记录 NGO 平台**捐赠模块**数据库的完整架构，基于 baseline 迁移及后续增量迁移文件。

**最后更新**: 2026-03-28
**迁移文件**:
- `supabase/migrations/20260109000000_baseline.sql`（基线）
- `supabase/migrations/20260121000000_drop_description_i18n.sql`
- `supabase/migrations/20260121100000_fix_aggregate_progress_calculation.sql`
- `supabase/migrations/20260328100000_drop_progress_percentage.sql`
- `supabase/migrations/20260329100000_fix_is_admin_check.sql`

> **注意**: 如需了解完整的 SQL 定义，请直接查看迁移文件。

---

## 数据库组件统计

| 类型 | 数量 | 说明 |
|------|------|------|
| 表 (Tables) | 4 | projects, donations, email_subscriptions, donation_status_history |
| 视图 (Views) | 3 | project_stats, public_project_donations, order_donations_secure |
| 函数 (Functions) | 12 | 5个业务函数 + 7个触发器函数 |
| 触发器 (Triggers) | 8 | 详见触发器章节 |
| RLS 策略 | 10 | 4个公开 + 6个管理员 |
| 存储桶 | 1 | donation-results |
| 索引 | 18 | 详见索引章节 |

---

## 数据表

### 1. `projects` - 项目表

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | BIGSERIAL | PK | 主键 |
| project_name | VARCHAR(255) | NOT NULL | 项目名称 |
| project_name_i18n | JSONB | DEFAULT '{}' | 多语言名称 `{"en":"...", "zh":"...", "ua":"..."}` |
| location | VARCHAR(255) | NOT NULL | 地点 |
| location_i18n | JSONB | DEFAULT '{}' | 多语言地点 |
| start_date | DATE | NOT NULL | 开始日期 |
| end_date | DATE | NULL | 结束日期 |
| is_long_term | BOOLEAN | DEFAULT false | 长期项目标志 **[不可修改]** |
| target_units | INTEGER | NULL | 目标单位数 |
| current_units | INTEGER | DEFAULT 0, NOT NULL | 当前单位数（触发器自动更新） |
| unit_price | NUMERIC(10,2) | NOT NULL, >0 | 单位价格 |
| unit_name | VARCHAR(50) | DEFAULT 'kit' | 单位名称 |
| unit_name_i18n | JSONB | DEFAULT '{}' | 多语言单位名称 |
| status | VARCHAR(20) | DEFAULT 'planned' | planned/active/completed/paused |
| aggregate_donations | BOOLEAN | DEFAULT false, NOT NULL | 捐赠聚合标志 **[不可修改]** |
| created_at | TIMESTAMPTZ | DEFAULT now() | 创建时间 **[不可修改]** |
| updated_at | TIMESTAMPTZ | DEFAULT now() | 更新时间（触发器自动更新） |

**约束**:
- `valid_dates`: end_date IS NULL OR end_date >= start_date
- `valid_status`: status IN ('planned', 'active', 'completed', 'paused')
- `valid_unit_price`: unit_price > 0
- `valid_units`: current_units >= 0 AND (target_units IS NULL OR target_units >= 0)

**不可修改字段**: id, created_at, aggregate_donations, is_long_term

---

### 2. `donations` - 捐赠表

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | BIGSERIAL | PK | 主键 **[不可修改]** |
| donation_public_id | VARCHAR(50) | UNIQUE, NOT NULL | 公开ID `{项目ID}-{6位码}` **[不可修改]** |
| project_id | BIGINT | FK → projects.id | 项目外键 **[不可修改]** |
| donor_name | VARCHAR(255) | NOT NULL | 捐赠者姓名 **[不可修改]** |
| donor_email | VARCHAR(255) | NOT NULL | 捐赠者邮箱 **[不可修改]** |
| donor_message | TEXT | NULL | 留言 |
| contact_telegram | VARCHAR(255) | NULL | Telegram |
| contact_whatsapp | VARCHAR(255) | NULL | WhatsApp |
| amount | NUMERIC(10,2) | NOT NULL, >0 | 金额 **[不可修改]** |
| currency | VARCHAR(10) | DEFAULT 'USD' | USD/UAH/EUR |
| payment_method | VARCHAR(50) | NULL | 支付方式 |
| order_reference | VARCHAR(255) | NULL | WayForPay订单号 **[不可修改]** |
| donation_status | VARCHAR(20) | DEFAULT 'paid' | 状态（14个有效值） |
| locale | VARCHAR(5) | DEFAULT 'en' | 语言: en/zh/ua |
| donated_at | TIMESTAMPTZ | DEFAULT now(), NOT NULL | 捐赠时间 |
| created_at | TIMESTAMPTZ | DEFAULT now() | 创建时间 **[不可修改]** |
| updated_at | TIMESTAMPTZ | DEFAULT now(), NOT NULL | 更新时间（触发器自动更新） |

**约束**:
- `donations_status_check`: 14个有效状态值
- `valid_amount`: amount > 0
- `valid_locale`: locale IN ('en', 'zh', 'ua')

**不可修改字段**: id, donation_public_id, project_id, donor_name, donor_email, amount, order_reference, created_at

#### 捐赠状态（14个）

| 分类 | 状态 | 说明 | 计入进度 |
|------|------|------|----------|
| 支付前 | pending | 待支付 | ❌ |
| 支付前 | widget_load_failed | 窗口加载失败 | ❌ |
| 处理中 | processing | 支付处理中 | ❌ |
| 处理中 | fraud_check | 反欺诈审核 | ❌ |
| **已支付** | **paid** | 已支付 | ✅ |
| **已支付** | **confirmed** | 已确认 | ✅ |
| **已支付** | **delivering** | 配送中 | ✅ |
| **已支付** | **completed** | 已完成 | ✅ |
| 失败 | expired | 超时 | ❌ |
| 失败 | declined | 被拒 | ❌ |
| 失败 | failed | 失败 | ❌ |
| 退款 | refunding | 退款申请中 | ❌ |
| 退款 | refund_processing | 退款处理中 | ❌ |
| 退款 | refunded | 已退款 | ❌ |

**管理员允许的状态转换**:
- paid → confirmed
- confirmed → delivering
- delivering → completed

**Service Role（Webhook）**: 允许任意状态转换

---

### 3. `email_subscriptions` - 邮件订阅表

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | BIGSERIAL | PK | 主键 **[不可修改]** |
| email | TEXT | UNIQUE, NOT NULL | 邮箱 |
| locale | TEXT | NOT NULL | 语言: en/zh/ua |
| is_subscribed | BOOLEAN | DEFAULT true, NOT NULL | 订阅状态 |
| updated_at | TIMESTAMPTZ | DEFAULT now(), NOT NULL | 更新时间（触发器自动更新） |

**约束**:
- `email_subscriptions_locale_check`: locale IN ('en', 'zh', 'ua')

---

### 4. `donation_status_history` - 状态历史表

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | BIGSERIAL | PK | 主键 |
| donation_id | BIGINT | FK → donations.id (CASCADE) | 捐赠外键 |
| from_status | TEXT | NULL | 旧状态（首次为NULL） |
| to_status | TEXT | NOT NULL | 新状态 |
| changed_at | TIMESTAMPTZ | DEFAULT now(), NOT NULL | 变更时间 |

---

## 视图

### 1. `project_stats` - 项目统计视图

提供项目聚合统计，包含所有 projects 字段加上：
- `total_raised`: 筹款总额（仅计算 paid/confirmed/delivering/completed）
- `donation_count`: 交易数（按 order_reference 去重）

> **注意**: 进度百分比由前端 `lib/project-utils.ts` 计算，不在视图中提供。
> - 聚合项目: `total_raised / target_units`（金额/目标金额）
> - 非聚合项目: `current_units / target_units`（单位数/目标单位数）

### 2. `public_project_donations` - 公开捐赠视图

展示已支付捐赠（paid/confirmed/delivering/completed），用于公开展示：
- `donor_email_obfuscated`: 混淆后的邮箱（j***e@e***.com）
- `order_id`: MD5(order_reference) 用于分组

### 3. `order_donations_secure` - 订单捐赠视图

根据 order_reference 查询捐赠，用于成功页面：
- 接受所有状态（无状态过滤）
- 包含 `aggregate_donations` 字段
- 包含混淆后的邮箱

---

## 函数

### 业务函数（5个）

| 函数 | 参数 | 返回 | 说明 |
|------|------|------|------|
| `generate_donation_public_id` | project_id BIGINT | TEXT | 生成唯一捐赠ID `{项目ID}-{6位码}` |
| `get_donations_by_email_verified` | email TEXT, donation_id TEXT | TABLE | 验证后返回该邮箱所有捐赠（含 aggregate_donations） |
| `is_admin` | - | BOOLEAN | 检查当前用户邮箱是否在管理员白名单中 |
| `upsert_email_subscription` | email TEXT, locale TEXT | BIGINT | 订阅或更新邮件订阅（幂等操作） |
| `unsubscribe_email` | email TEXT | BOOLEAN | 取消订阅 |

#### `is_admin()` 实现细节

```sql
-- 通过 auth.jwt() ->> 'email' 检查邮箱白名单
-- 初期使用硬编码邮箱列表，后续可改为配置表
RETURN coalesce(
  auth.jwt() ->> 'email' IN ('admin@example.com'),
  false
);
```

> **安全说明**: 义卖市场引入 Email OTP 认证后，`is_admin()` 从简单的 `auth.uid() IS NOT NULL` 改为邮箱白名单检查，防止普通买家被当作管理员。

### 触发器函数（7个）

| 函数 | 说明 |
|------|------|
| `update_updated_at_column` | 自动更新 updated_at 为 NOW()（被多个表复用） |
| `update_project_units` | 根据捐赠状态变化自动更新项目 current_units |
| `prevent_project_immutable_fields` | 保护项目不可变字段 (id, created_at, aggregate_donations, is_long_term) |
| `prevent_donation_immutable_fields` | 保护捐赠不可变字段 + 验证管理员状态转换 |
| `update_email_subscription_updated_at` | 订阅表 updated_at 更新 |
| `prevent_subscription_immutable_fields` | 保护订阅表 id 字段 |
| `log_donation_status_change` | 记录状态转换到 donation_status_history |

---

## 触发器（8个）

| 触发器 | 表 | 时机 | 函数 |
|--------|-----|------|------|
| update_projects_updated_at | projects | BEFORE UPDATE | update_updated_at_column |
| prevent_project_immutable_fields_trigger | projects | BEFORE UPDATE | prevent_project_immutable_fields |
| update_donations_updated_at | donations | BEFORE UPDATE | update_updated_at_column |
| prevent_donation_immutable_fields_trigger | donations | BEFORE UPDATE | prevent_donation_immutable_fields |
| update_project_units_trigger | donations | AFTER INSERT/UPDATE/DELETE | update_project_units |
| donation_status_change_trigger | donations | AFTER INSERT/UPDATE | log_donation_status_change |
| update_email_subscriptions_updated_at | email_subscriptions | BEFORE UPDATE | update_email_subscription_updated_at |
| prevent_subscription_immutable_fields_trigger | email_subscriptions | BEFORE UPDATE | prevent_subscription_immutable_fields |

---

## RLS 策略（10个）

### 公开策略（4个）

| 策略 | 表 | 操作 | 条件 |
|------|-----|------|------|
| Allow anonymous read projects | projects | SELECT | true（所有人可读） |
| Allow anonymous read donations | donations | SELECT | true（所有人可读） |
| Allow anonymous insert pending donations | donations | INSERT | 仅限 pending 状态，金额≤10000，验证邮箱格式等 |
| Allow anonymous update pending to widget_load_failed | donations | UPDATE | pending → widget_load_failed |

### 管理员策略（6个）

| 策略 | 表 | 操作 | 条件 |
|------|-----|------|------|
| Admins can insert projects | projects | INSERT | is_admin() |
| Admins can update projects | projects | UPDATE | is_admin() |
| Admins can view all donations | donations | SELECT | is_admin() |
| Admins can update donation status | donations | UPDATE | is_admin() |
| Admins can view all subscriptions | email_subscriptions | SELECT | is_admin() |
| Admins can view all status history | donation_status_history | SELECT | is_admin() |

---

## 存储桶

### `donation-results`

| 属性 | 值 |
|------|-----|
| 访问权限 | Public（公开读取） |
| 文件大小限制 | 50MB |
| 允许的 MIME 类型 | `image/*`, `video/*` |
| 用途 | 配送完成照片/视频 |

---

## 索引（18个）

### projects 表（4个）
- `idx_projects_status` - 状态查询
- `idx_projects_start_date` - 日期查询
- `idx_projects_aggregate_donations` - 聚合标志
- `idx_projects_name_i18n_en/zh/ua` - 多语言名称（3个）

### donations 表（8个）
- `idx_donations_project_id` - 项目关联
- `idx_donations_status` - 状态查询
- `idx_donations_public_id` - 公开ID查询
- `idx_donations_email` - 邮箱查询
- `idx_donations_locale` - 语言查询
- `idx_donations_order_reference` - 订单号（部分索引，NOT NULL）
- `idx_donations_order_ref_status` - 订单+状态复合索引
- `idx_donations_refund_status` - 退款状态（部分索引）

### email_subscriptions 表（3个）
- `idx_email_subscriptions_email` - 邮箱查询
- `idx_email_subscriptions_is_subscribed` - 订阅状态（部分索引，true）
- `idx_email_subscriptions_locale` - 语言查询

### donation_status_history 表（3个）
- `idx_donation_status_history_donation_id` - 捐赠关联
- `idx_donation_status_history_changed_at` - 时间查询（DESC）
- `idx_donation_status_history_to_status` - 目标状态查询

---

## 安全架构

```
前端/客户端
     ↓
Server Actions / API Routes
     ↓
Supabase 客户端
├── Anonymous (anon key) → RLS 策略检查
└── Service Role (service key) → 绕过 RLS
     ↓
数据库层（表、约束、触发器）
```

### 客户端使用场景

| 操作 | 客户端类型 | RLS 检查 |
|------|-----------|---------|
| 查询项目/捐赠 | Anonymous | ✅ |
| 创建待支付捐赠 | Anonymous | ✅ |
| 更新 pending → widget_load_failed | Anonymous | ✅ |
| WayForPay Webhook 更新状态 | Service Role | ❌ |
| 管理员操作 | Authenticated | ✅ |
| 管理员批量操作 | Service Role | ❌ |

---

## 扩展 (Extensions)

| 扩展 | Schema | 用途 |
|------|--------|------|
| pg_cron | pg_catalog | 定时任务 |
| pg_graphql | graphql | GraphQL 支持 |
| pg_stat_statements | extensions | 查询统计 |
| pgcrypto | extensions | 加密函数 |
| supabase_vault | vault | 密钥管理 |
| uuid-ossp | extensions | UUID 生成 |

---

**文档版本**: 4.0.0
**基于**: baseline + 4 个增量迁移
