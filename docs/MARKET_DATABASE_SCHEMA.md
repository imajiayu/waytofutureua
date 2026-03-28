# 义卖市场模块 - 数据库架构文档

## 概述

本文档记录 NGO 平台**义卖市场模块**数据库的完整架构，基于以下迁移文件。

**最后更新**: 2026-03-28
**迁移文件**:
- `supabase/migrations/20260328000000_market_module.sql`（模块基线）
- `supabase/migrations/20260329000000_market_order_results.sql`
- `supabase/migrations/20260329100000_fix_is_admin_check.sql`（共享函数修复）
- `supabase/migrations/20260329200000_market_order_widget_failed_policy.sql`
- `supabase/migrations/20260329300000_market_buyer_permissions.sql`
- `supabase/migrations/20260329400000_market_order_immutable_fields.sql`
- `supabase/migrations/20260330000000_fix_market_bugs.sql`

> **注意**: 如需了解完整的 SQL 定义，请直接查看迁移文件。

---

## 数据库组件统计

| 类型 | 数量 | 说明 |
|------|------|------|
| 表 (Tables) | 3 | market_items, market_orders, market_order_status_history |
| 视图 (Views) | 1 | market_orders_public |
| 函数 (Functions) | 4 | 2个库存函数 + 1个触发器函数 + 1个不可变字段保护函数 |
| 触发器 (Triggers) | 4 | 详见触发器章节 |
| RLS 策略 | 8 | 3个公开/买家 + 5个管理员 |
| 存储桶 | 1 | market-order-results |
| 索引 | 7 | 详见索引章节 |

---

## 数据表

### 1. `market_items` - 商品表

商品内容（描述、图片）走 JSON 静态文件（`public/content/market/item-{id}-{locale}.json`），与 projects 模式一致。数据库只存元数据。

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | BIGSERIAL | PK | 主键 |
| title_i18n | JSONB | NOT NULL | 多语言标题 `{"en":"...", "zh":"...", "ua":"..."}` |
| fixed_price | NUMERIC | NOT NULL, >0 | 固定售价 |
| currency | TEXT | NOT NULL, DEFAULT 'USD' | 币种 |
| stock_quantity | INT | NOT NULL, >=0 | 库存数量 |
| status | TEXT | NOT NULL, DEFAULT 'draft' | draft/on_sale/off_shelf |
| created_at | TIMESTAMPTZ | DEFAULT now() | 创建时间 |
| updated_at | TIMESTAMPTZ | DEFAULT now() | 更新时间（触发器自动更新） |

**约束**:
- `market_items_fixed_price_check`: fixed_price > 0
- `market_items_stock_quantity_check`: stock_quantity >= 0
- `market_items_status_check`: status IN ('draft', 'on_sale', 'off_shelf')

---

### 2. `market_orders` - 订单表

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | BIGSERIAL | PK | 主键 **[不可修改]** |
| order_reference | TEXT | UNIQUE, NOT NULL | 订单号 **[不可修改]** |
| buyer_id | UUID | FK → auth.users(id), NOT NULL | 买家用户ID **[不可修改]** |
| buyer_email | TEXT | NOT NULL | 买家邮箱 **[不可修改]** |
| item_id | BIGINT | FK → market_items(id) ON DELETE RESTRICT, NOT NULL | 商品外键 **[不可修改]** |
| quantity | INT | NOT NULL, DEFAULT 1, >=1 | 购买数量 **[不可修改]** |
| unit_price | NUMERIC | NOT NULL, >0 | 单价 **[不可修改]** |
| total_amount | NUMERIC | NOT NULL, >0 | 总金额 **[不可修改]** |
| currency | TEXT | NOT NULL, DEFAULT 'USD' | 币种 |
| payment_method | TEXT | NOT NULL, DEFAULT 'wayforpay' | 支付方式 |
| shipping_name | TEXT | NOT NULL | 收件人姓名 |
| shipping_address_line1 | TEXT | NOT NULL | 地址行1 |
| shipping_address_line2 | TEXT | NULL | 地址行2 |
| shipping_city | TEXT | NOT NULL | 城市 |
| shipping_state | TEXT | NULL | 州/省 |
| shipping_postal_code | TEXT | NOT NULL | 邮编 |
| shipping_country | TEXT | NOT NULL | 国家 |
| tracking_number | TEXT | NULL | 快递单号 |
| tracking_carrier | TEXT | NULL | 快递公司 |
| status | TEXT | NOT NULL, DEFAULT 'pending' | 7个有效状态值 |
| locale | TEXT | NOT NULL, DEFAULT 'en' | 语言: en/zh/ua |
| created_at | TIMESTAMPTZ | DEFAULT now() | 创建时间 **[不可修改]** |
| updated_at | TIMESTAMPTZ | DEFAULT now() | 更新时间（触发器自动更新） |

**约束**:
- `market_orders_quantity_check`: quantity >= 1
- `market_orders_unit_price_check`: unit_price > 0
- `market_orders_total_amount_check`: total_amount > 0
- `market_orders_status_check`: status IN ('pending', 'widget_load_failed', 'paid', 'shipped', 'completed', 'expired', 'declined')
- `market_orders_locale_check`: locale IN ('en', 'zh', 'ua')

**不可修改字段**（由触发器保护）: id, order_reference, buyer_id, buyer_email, item_id, quantity, unit_price, total_amount, created_at

#### 订单状态（7个）

| 分类 | 状态 | 说明 | 公开可见 |
|------|------|------|----------|
| 支付前 | pending | 待支付 | ❌ |
| 支付前 | widget_load_failed | 支付窗口加载失败 | ❌ |
| **已支付** | **paid** | 已支付 | ✅ |
| **已支付** | **shipped** | 已发货 | ✅ |
| **已支付** | **completed** | 已完成 | ✅ |
| 失败 | expired | 支付超时 | ❌ |
| 失败 | declined | 支付被拒 | ❌ |

**管理员允许的状态转换**:
- paid → shipped（需快递单号 + 发货凭证）
- shipped → completed（需资金用途凭证）

**Service Role（Webhook）**: pending/widget_load_failed → paid/expired/declined

---

### 3. `market_order_status_history` - 订单状态历史表

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | BIGSERIAL | PK | 主键 |
| order_id | BIGINT | FK → market_orders(id) ON DELETE CASCADE | 订单外键 |
| from_status | TEXT | NULL | 旧状态（首次为NULL） |
| to_status | TEXT | NOT NULL | 新状态 |
| changed_at | TIMESTAMPTZ | DEFAULT now() | 变更时间 |

---

## 视图

### `market_orders_public` - 公开购买记录视图

公开页面展示已支付的购买记录，邮箱脱敏在 SQL 层完成。

**字段**: id, order_reference, item_id, quantity, total_amount, status, created_at, buyer_email_obfuscated, item_title_i18n, currency

**状态过滤**: 仅显示 `paid`, `shipped`, `completed`

**邮箱脱敏规则**（与捐赠模块 `order_donations_secure` 一致）:
- 用户名 ≤2字符: `j***@e***.com`
- 用户名 >2字符: `j***e@e***.com`
- 域名 ≤3字符: `e***`
- 域名 >3字符: `e***om`

---

## 函数

### 库存管理函数（2个）

| 函数 | 参数 | 返回 | 说明 |
|------|------|------|------|
| `decrement_stock` | p_item_id BIGINT, p_quantity INT | BOOLEAN | 原子扣减库存（防止 TOCTOU 竞态） |
| `restore_stock` | p_item_id BIGINT, p_quantity INT | VOID | 原子恢复库存 |

**安全特性**:
- 均为 `SECURITY DEFINER`
- **仅 service_role 可调用**（authenticated 权限已撤回）
- `decrement_stock` 额外检查 `stock_quantity >= p_quantity AND status = 'on_sale'`
- 两个函数都校验 `p_quantity > 0`

### 触发器函数（2个）

| 函数 | 说明 |
|------|------|
| `log_market_order_status_change` | 记录订单状态转换到 market_order_status_history |
| `prevent_market_order_immutable_fields` | 保护订单不可变字段（9个字段） |

---

## 触发器（4个）

| 触发器 | 表 | 时机 | 函数 |
|--------|-----|------|------|
| update_market_items_updated_at | market_items | BEFORE UPDATE | update_updated_at_column（复用） |
| update_market_orders_updated_at | market_orders | BEFORE UPDATE | update_updated_at_column（复用） |
| market_order_status_change_trigger | market_orders | AFTER UPDATE | log_market_order_status_change |
| prevent_market_order_immutable_fields_trigger | market_orders | BEFORE UPDATE | prevent_market_order_immutable_fields |

---

## RLS 策略（8个）

### market_items（2个）

| 策略 | 操作 | 条件 |
|------|------|------|
| Public can view non-draft items | SELECT | status != 'draft'（公开可读在售/下架商品） |
| Admin can manage items | ALL | is_admin() |

### market_orders（4个）

| 策略 | 操作 | 条件 |
|------|------|------|
| Buyers can view own orders | SELECT | buyer_id = auth.uid() OR is_admin() |
| Buyers can insert own pending orders | INSERT | buyer_id = auth.uid() AND status = 'pending' |
| Buyers can update own pending to widget_load_failed | UPDATE | buyer_id = auth.uid() AND status（pending → widget_load_failed） |
| Admin can manage orders | ALL | is_admin() |

### market_order_status_history（2个）

| 策略 | 操作 | 条件 |
|------|------|------|
| Order owners can view history | SELECT | 关联订单的 buyer_id = auth.uid() OR is_admin() |
| Admin can manage history | ALL | is_admin() |

---

## 存储桶

### `market-order-results`

| 属性 | 值 |
|------|-----|
| 访问权限 | Public（公开读取） |
| 文件大小限制 | 50MB |
| 允许的 MIME 类型 | `image/*`, `video/*` |
| 文件组织结构 | `{order_reference}/{shipping\|completion}/{timestamp}.{ext}` |
| 用途 | 发货凭证（shipping）和资金用途凭证（completion） |

---

## 索引（7个）

### market_items 表（2个）
- `idx_market_items_status` - 状态查询
- `idx_market_items_created_at` - 创建时间查询（DESC）

### market_orders 表（5个）
- `idx_market_orders_buyer` - 买家ID查询
- `idx_market_orders_item` - 商品关联
- `idx_market_orders_reference` - 订单号查询
- `idx_market_orders_status` - 状态查询
- `idx_market_orders_buyer_status` - 买家+状态复合索引

---

## 安全架构

```
买家（Email OTP 认证）
     ↓
Server Actions / API Routes
     ↓
Supabase 客户端
├── Authenticated (buyer) → RLS 策略检查（仅自己的订单）
├── Service Role → 绕过 RLS（Webhook、库存操作）
└── Authenticated (admin) → RLS 策略检查（is_admin()）
     ↓
数据库层（表、约束、触发器）
```

### 客户端使用场景

| 操作 | 客户端类型 | RLS 检查 |
|------|-----------|---------|
| 浏览商品 | Anonymous | ✅（仅非 draft） |
| 创建订单 | Authenticated (buyer) | ✅ |
| 更新 pending → widget_load_failed | Authenticated (buyer) | ✅ |
| 查看自己的订单 | Authenticated (buyer) | ✅ |
| WayForPay Webhook 更新状态 | Service Role | ❌ |
| 扣减/恢复库存 | Service Role | ❌ |
| 管理员管理商品/订单 | Authenticated (admin) | ✅ |

### 与捐赠模块的关键差异

| 维度 | 捐赠模块 | 义卖市场 |
|------|---------|---------|
| 创建记录 | Anonymous（匿名） | Authenticated（Email OTP） |
| 库存管理 | 触发器自动更新 | SECURITY DEFINER RPC 函数 |
| 状态数量 | 14 个（含退款流程） | 7 个（无退款流程） |
| 文件上传时机 | delivering → completed | paid → shipped 和 shipped → completed |
| 管理员身份 | is_admin()（邮箱白名单） | is_admin()（共享同一函数） |

---

**文档版本**: 1.0.0
**基于**: 7 个义卖市场迁移文件
