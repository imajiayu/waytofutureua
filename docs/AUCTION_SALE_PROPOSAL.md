# 义卖市场功能 — 调研方案文档

> **状态**: 实施中（Phase 1：义卖模块）
> **创建日期**: 2026-03-27
> **最后更新**: 2026-03-28
> **分支**: `feat/auction-sale-module`

---

## 目录

1. [项目概述](#1-项目概述)
2. [决策记录](#2-决策记录)
3. [模块架构](#3-模块架构)
4. [邮箱验证认证](#4-邮箱验证认证)
5. [义卖模块（固定价格销售）](#5-义卖模块固定价格销售)
6. [数据库设计](#6-数据库设计)
7. [WayForPay 集成](#7-wayforpay-集成)
8. [管理员后台](#8-管理员后台)
9. [国际化](#9-国际化)
10. [技术风险与约束](#10-技术风险与约束)
11. [与现有系统的边界](#11-与现有系统的边界)

---

## 1. 项目概述

### 背景

在现有匿名捐赠平台基础上，新增**义卖**（固定价格销售实物）功能。义卖模块完全独立于现有捐赠系统，拥有独立的表、模块、路由和查询入口。

### 核心原则

- **无注册感知**：用户只需输入邮箱 + 验证码，无需注册/设密码
- **完全独立**：新表、新模块、新路由，不侵入现有捐赠逻辑
- **实物交付**：所有商品均为实物，需要收货地址
- **多语言**：与现有系统一致，支持 en/zh/ua
- **沿用 WayForPay**：与现有捐赠系统保持一致的支付网关

### 功能范围

| 功能 | 状态 |
|------|------|
| 义卖（固定价格销售） | ✅ Phase 1 实现 |
| 邮箱 OTP 认证 | ✅ Phase 1 实现 |
| 代理竞价（Proxy Bidding） | ❌ 不做 |

---

## 2. 决策记录

| # | 决策 | 结论 | 理由 |
|---|------|------|------|
| D1 | 认证方案 | Supabase Auth OTP | 用户无感注册，内建冷却限流，自动 JWT 会话管理，零额外基础设施 |
| D2 | 支付网关 | WayForPay（沿用现有） | 与捐赠模块一致，复用现有集成代码和 Webhook 基础设施，无需引入新支付服务商 |
| D3 | 义卖支付模式 | WayForPay Widget | 与捐赠流程一致的嵌入式支付窗口，用户体验统一 |
| D4 | 库存管理 | 数据库原子操作 | `UPDATE ... WHERE stock_quantity >= $quantity` 防超卖 |
| D5 | 商品内容管理 | 静态 JSON 文件 | 描述、图片、资金用途等内容走 `public/content/market/item-N-{locale}.json` + `public/images/market/`，与 projects 模式一致；数据库只存 `title_i18n`、价格、库存等结构化字段 |
| D6 | `sold_out` 状态 | 移除，改用 `stock_quantity = 0` | 状态字段只表达人工控制的商品生命周期（draft / on_sale / off_shelf），库存耗尽是数量字段的自然结果，无需额外状态 |
| D7 | 订单状态简化 | 移除 `confirmed` 和 `cancelled`，增加 `widget_load_failed` | 与现有捐赠状态机对齐（`widget_load_failed`）；取消仅需下架商品/不操作订单；减少冗余状态降低状态机复杂度 |

---

## 3. 模块架构

### 与现有系统的关系

```
NGO 平台
├── 捐赠模块（现有，不变）
│   ├── 匿名捐赠（无认证）
│   ├── WayForPay Widget 支付
│   └── 邮箱 + 捐赠ID 追踪
│
└── 义卖市场模块（新增，完全独立）
    ├── Supabase Auth OTP 认证
    ├── WayForPay Widget 即时支付
    └── 邮箱 + 验证码查询订单
```

### 新增目录结构

```
app/
├── [locale]/
│   ├── market/                       # 义卖市场入口页（商品列表）
│   │   ├── page.tsx                  # 列表页
│   │   ├── [itemId]/                 # 商品详情
│   │   │   └── page.tsx
│   │   ├── orders/                   # 订单查询（邮箱 + 验证码）
│   │   │   └── page.tsx
│   │   └── success/                  # 支付成功页
│   │       └── page.tsx
├── actions/
│   ├── market-auth.ts                # OTP 发送 & 验证
│   ├── market-sale.ts                # 义卖购买
│   ├── market-order.ts               # 订单查询
│   └── market-admin.ts               # 管理员操作
├── api/
│   └── webhooks/
│       └── wayforpay-market/         # 义卖专用 WayForPay Webhook
│           └── route.ts
components/
├── market/                           # 义卖组件
│   ├── MarketItemCard.tsx            # 商品卡片
│   ├── MarketItemGrid.tsx            # 列表网格
│   ├── MarketItemDetail.tsx          # 商品详情
│   ├── SaleCheckoutPanel.tsx         # 义卖结账面板
│   ├── MarketPaymentWidget.tsx       # WayForPay 支付组件
│   ├── EmailOTPForm.tsx              # 邮箱验证组件
│   └── ShippingAddressForm.tsx       # 收货地址表单
lib/
├── market/                           # 义卖业务逻辑
│   ├── market-status.ts              # 商品/订单状态机
│   ├── market-validations.ts         # Zod 验证
│   └── wayforpay.ts                  # WayForPay Market 支付工具
types/
├── market.ts                         # 义卖类型定义
```

---

## 4. 邮箱验证认证

### 方案：Supabase Auth OTP

利用 Supabase Auth 内建的 Email OTP，用户输入邮箱收验证码，验证后获得 JWT 会话。

### 流程

```
用户输入邮箱
    ↓
调用 supabase.auth.signInWithOtp({ email })
    ↓
Supabase 发送 6 位验证码到邮箱（内建 60s 冷却）
    ↓
用户输入验证码
    ↓
调用 supabase.auth.verifyOtp({ email, token, type: 'email' })
    ↓
验证成功 → 返回 session（JWT）
    ↓
后续请求自动携带认证（Supabase client 自动管理）
```

### 认证触发时机

| 场景 | 何时触发认证 |
|------|-------------|
| 义卖购买 | 点击"购买"时，如未认证则弹出 OTP 验证 |
| 查询订单 | 进入订单页时 |

### 会话管理

- JWT 有效期使用 Supabase 默认配置（1 小时，自动刷新）
- 用户关闭浏览器后重新打开需重新验证
- 认证状态仅用于义卖模块，不影响现有匿名捐赠

### 与现有系统的隔离

现有捐赠使用 `createClient()`（anon client），不依赖 `auth.users`。新模块的 OTP 认证会创建 `auth.users` 记录，但两者通过不同的 RLS 策略隔离：

- 捐赠表的 RLS：基于 `anon` role，不检查 `auth.uid()`
- 新表的 RLS：基于 `authenticated` role，检查 `auth.uid()` 或邮箱匹配

---

## 5. 义卖模块（固定价格销售）

### 用户流程

```
浏览商品列表 → 选择商品 → 点击购买
    ↓
未认证？→ 邮箱 OTP 验证
    ↓
填写数量 + 收货地址
    ↓
Server Action 生成 WayForPay 支付参数
    ↓
前端加载 WayForPay Widget → 用户完成支付
    ↓
Webhook 确认 → 更新订单状态 → 发送确认邮件
    ↓
重定向成功页
```

### 核心逻辑

- **库存管理**：下单时扣减库存，支付超时/失败时回滚
- **库存扣减时机**：创建订单时扣减（预占），支付失败/过期时通过 Webhook 原子回滚
- **防超卖**：数据库层面 `CHECK (stock_quantity >= 0)` + 原子 UPDATE

```sql
-- 原子扣减库存，防止超卖
UPDATE market_items
SET stock_quantity = stock_quantity - $quantity
WHERE id = $item_id
  AND stock_quantity >= $quantity
  AND status = 'on_sale'
RETURNING id;
-- 返回空 = 库存不足
```

- **WayForPay 支付**：与现有捐赠相同的 Widget 模式（嵌入式支付窗口）
- **收货地址**：随订单存储，关联到 `market_orders` 表

### 义卖订单状态（7 个）

```
pending ──────────────────→ paid → shipped → completed
    ↓                  ↑
widget_load_failed     │
    ↓                  │
  expired          declined
```

| 状态 | 说明 | 触发 |
|------|------|------|
| `pending` | 已创建，等待支付 | 用户下单 |
| `widget_load_failed` | 支付 Widget 加载失败 | 前端错误回调 |
| `paid` | 已支付 | WayForPay Webhook (Approved) |
| `shipped` | 已发货 | 管理员操作（填写快递单号） |
| `completed` | 已完成 | 管理员操作 |
| `expired` | 支付超时 | WayForPay Webhook (Expired)，自动回滚库存 |
| `declined` | 支付被拒 | WayForPay Webhook (Declined)，自动回滚库存 |

---

## 6. 数据库设计

### 新增表

#### `market_items` — 商品主表

> 商品描述、图片、资金用途等内容走静态 JSON 文件（`public/content/market/item-N-{locale}.json`），与 projects 模式一致，不存入数据库。

```sql
CREATE TABLE market_items (
  id SERIAL PRIMARY KEY,

  -- 基本信息（标题用于后台展示和快照）
  title_i18n JSONB NOT NULL,                     -- {en, zh, ua}

  -- 义卖字段
  fixed_price NUMERIC,                           -- 固定价格
  currency TEXT NOT NULL DEFAULT 'USD',
  stock_quantity INT,                            -- 库存数量

  -- 状态（无 sold_out，库存耗尽由 stock_quantity = 0 表达）
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'on_sale', 'off_shelf')),

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

#### `market_orders` — 订单表

```sql
CREATE TABLE market_orders (
  id SERIAL PRIMARY KEY,
  order_reference TEXT UNIQUE NOT NULL,

  -- 买家信息
  buyer_id UUID NOT NULL,
  buyer_email TEXT NOT NULL,

  -- 商品信息
  item_id INT NOT NULL REFERENCES market_items(id),
  quantity INT NOT NULL DEFAULT 1,
  unit_price NUMERIC NOT NULL,
  total_amount NUMERIC NOT NULL,

  -- 支付信息
  payment_method TEXT NOT NULL DEFAULT 'wayforpay',

  -- 收货地址
  shipping_name TEXT NOT NULL,
  shipping_address_line1 TEXT NOT NULL,
  shipping_address_line2 TEXT,
  shipping_city TEXT NOT NULL,
  shipping_state TEXT,
  shipping_postal_code TEXT NOT NULL,
  shipping_country TEXT NOT NULL,

  -- 物流信息
  tracking_number TEXT,
  tracking_carrier TEXT,

  -- 状态
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN (
      'pending', 'widget_load_failed', 'paid', 'shipped', 'completed',
      'expired', 'declined'
    )),

  locale TEXT NOT NULL DEFAULT 'en',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

#### `market_order_status_history` — 订单状态历史

```sql
CREATE TABLE market_order_status_history (
  id SERIAL PRIMARY KEY,
  order_id INT NOT NULL REFERENCES market_orders(id),
  from_status TEXT,
  to_status TEXT NOT NULL,
  changed_at TIMESTAMPTZ DEFAULT now()
);
```

### 安全视图

```sql
-- 公开商品列表（排除 draft）
CREATE VIEW public_market_items AS
SELECT
  id, title_i18n,
  fixed_price, currency, stock_quantity,
  status, created_at
FROM market_items
WHERE status != 'draft';
```

### RLS 策略

```sql
-- market_items: 公开可读
ALTER TABLE market_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can view non-draft items"
  ON market_items FOR SELECT
  USING (status != 'draft');

-- market_orders: 仅本人或管理员可见
ALTER TABLE market_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Buyers can view own orders"
  ON market_orders FOR SELECT
  USING (buyer_id = auth.uid() OR is_admin());
```

---

## 7. WayForPay 集成

### 义卖支付：WayForPay Widget（与现有捐赠一致）

```typescript
// 复用现有 WayForPay 工具函数
import { createWayForPayPayment, generateSignature } from '@/lib/payment/wayforpay/server'

// Server Action: 生成支付参数
const paymentParams = createWayForPayPayment({
  orderReference: order.order_reference,
  amount: order.total_amount,
  currency: 'USD',
  productName: [itemTitle],
  productPrice: [order.unit_price],
  productCount: [order.quantity],
  clientFirstName: shipping.name.split(' ')[0] || shipping.name,
  clientLastName: shipping.name.split(' ').slice(1).join(' ') || '',
  clientEmail: userEmail,
  language: locale === 'ua' ? 'UA' : 'EN',
  returnUrl: `${APP_URL}/${locale}/market/success?order=${order.order_reference}`,
  serviceUrl: `${APP_URL}/api/webhooks/wayforpay-market`,
})

// 前端：加载 WayForPay Widget（复用 WayForPayWidget 组件模式）
```

### Webhook 端点

新增独立的 Webhook 端点 `/api/webhooks/wayforpay-market`，与现有捐赠 Webhook 隔离：

| WayForPay 状态 | 处理 |
|----------------|------|
| `Approved` | 订单 → `paid`，发确认邮件 |
| `Expired` | 订单 → `expired`，回滚库存 |
| `Declined` | 订单 → `declined`，回滚库存 |
| `Pending` / `inProcessing` | 保持 `pending`，记录日志 |

Webhook 响应必须包含签名确认，与现有捐赠 Webhook 格式一致。

---

## 8. 管理员后台

### 新增管理页面

| 路径 | 功能 |
|------|------|
| `/admin/market` | 商品管理列表 |
| `/admin/market/orders` | 订单管理 |

### 管理员操作

| 操作 | 说明 |
|------|------|
| 创建/编辑商品 | 设置标题、价格、库存（描述/图片走静态文件） |
| 发布 | draft → on_sale |
| 下架 | on_sale → off_shelf |
| 订单管理 | 发货（填快递单号）、完成 |

---

## 9. 国际化

遵循现有 i18n 规范（`next-intl`），新增翻译键：

```json
{
  "market": {
    "title": "Charity Market",
    "sale": {
      "buyNow": "Buy Now",
      "inStock": "In Stock",
      "soldOut": "Sold Out",
      "quantity": "Quantity",
      "price": "Price"
    },
    "order": {
      "trackOrder": "Track Order",
      "orderStatus": "Order Status",
      "shippingAddress": "Shipping Address",
      "trackingNumber": "Tracking Number"
    },
    "auth": {
      "enterEmail": "Enter your email",
      "sendCode": "Send Verification Code",
      "enterCode": "Enter verification code",
      "verify": "Verify",
      "codeSent": "Code sent to {email}",
      "resendIn": "Resend in {seconds}s"
    }
  }
}
```

数据库 i18n 字段使用与现有 `project_name_i18n` 相同的 JSONB 格式，通过 `getTranslatedText()` 解析。

---

## 10. 技术风险与约束

### 中风险

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| WayForPay Widget 加载失败 | 用户无法支付 | 复用现有 Widget 错误处理和重试机制（已验证可靠） |
| 库存超卖 | 卖出超过库存的商品 | 数据库 CHECK 约束 + 原子 UPDATE |
| 邮件 OTP 被滥用 | 邮件轰炸 | Supabase Auth 内建 60s 冷却 |

### 约束

| 约束 | 说明 |
|------|------|
| WayForPay Widget 弹窗可能被拦截 | 移动端使用 redirect 模式（已有解决方案） |

---

## 11. 与现有系统的边界

### 完全隔离的部分

| 维度 | 现有捐赠 | 义卖市场 |
|------|----------|----------|
| 数据表 | `donations`, `projects` | `market_items`, `market_orders` |
| 认证 | 无（匿名 anon client） | Supabase Auth OTP |
| 支付 | WayForPay Widget | WayForPay Widget（独立 Webhook） |
| 路由 | `/[locale]/donate` | `/[locale]/market` |
| 查询入口 | `/[locale]/track-donation`（邮箱+捐赠ID） | `/[locale]/market/orders`（邮箱+验证码） |
| Webhook | `/api/webhooks/wayforpay` | `/api/webhooks/wayforpay-market` |
| 管理页面 | `/admin/donations` | `/admin/market`, `/admin/market/orders` |

### 复用的部分

| 资源 | 说明 |
|------|------|
| Supabase 客户端 | `createServerClient()`, `createServiceClient()` 等 |
| WayForPay SDK | 复用 `lib/payment/wayforpay/server.ts` 工具函数 |
| Resend 邮件 | 复用发送基础设施，新增模板 |
| i18n 框架 | next-intl，新增翻译键 |
| UI 工具 | `cn()`, Tailwind, 通用组件 |
| Cloudinary | 商品图片处理 |
| Logger | 新增 `MARKET`, `MARKET:SALE` 等日志类别 |
| `i18n-utils.ts` | `getTranslatedText()` 等工具函数 |

---

## 附录：参考资料

- [WayForPay: Widget Integration](https://wiki.wayforpay.com/en/view/852091)
- [WayForPay: Webhook Notifications](https://wiki.wayforpay.com/en/view/852102)
- [Supabase: Email OTP](https://supabase.com/docs/guides/auth/auth-email-passwordless)
- [PostgreSQL: Explicit Locking](https://www.postgresql.org/docs/current/explicit-locking.html)
