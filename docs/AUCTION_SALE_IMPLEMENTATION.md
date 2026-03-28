# 义卖市场功能 — 分步执行计划

> **分支**: `feat/auction-sale-module`
> **创建日期**: 2026-03-27
> **最后更新**: 2026-03-28

---

## 安全红线

> **⚠️ 本计划全程不做任何影响线上环境的操作：**
>
> - **不推送代码到 master**
> - **不执行数据库迁移**（迁移文件仅创建，不 `supabase db push`）
> - **不修改线上环境变量**
> - **不配置线上 Webhook 端点**
>
> 所有开发在 `feat/auction-sale-module` 分支进行。
> 数据库迁移文件放在最后一个 Phase 统一编写，待 PR 审核通过后再执行。

---

## 目录

- [Phase 0: 基础设施与类型定义](#phase-0-基础设施与类型定义)
- [Phase 1: 邮箱 OTP 认证模块](#phase-1-邮箱-otp-认证模块)
- [Phase 2: Market 列表页与商品详情](#phase-2-market-列表页与商品详情)
- [Phase 3: 义卖购买流程（WayForPay）](#phase-3-义卖购买流程wayforpay)
- [Phase 4: WayForPay Webhook 与支付确认](#phase-4-wayforpay-webhook-与支付确认)
- [Phase 5: 邮件通知](#phase-5-邮件通知)
- [Phase 6: 管理员后台](#phase-6-管理员后台)
- [Phase 7: 导航入口与订单查询](#phase-7-导航入口与订单查询)
- [Phase 8: 国际化](#phase-8-国际化)
- [Phase 9: 数据库迁移文件](#phase-9-数据库迁移文件)

---

## Phase 0: 基础设施与类型定义

> 目标：定义类型系统、创建目录骨架、状态机和验证

### 0.1 TypeScript 类型定义

- [ ] 创建 `types/market.ts`

需要定义的类型：

| 类型 | 说明 |
|------|------|
| `MarketItemStatus` | `'draft' \| 'on_sale' \| 'off_shelf'` |
| `MarketOrderStatus` | `'pending' \| 'widget_load_failed' \| 'paid' \| 'shipped' \| 'completed' \| 'expired' \| 'declined'` |
| `MarketItem` | 商品完整类型（对应 `market_items` 表） |
| `MarketOrder` | 订单（对应 `market_orders` 表） |
| `MarketOrderStatusHistory` | 订单状态历史 |
| `PublicMarketItem` | 公开商品视图类型 |
| `ShippingAddress` | 收货地址子类型 |

### 0.2 商品状态工具

- [ ] 创建 `lib/market/market-status.ts`
  - 义卖商品状态常量和判断函数（`canPurchase()`, `isSoldOut()` 等）
  - 订单状态转换验证（`getNextAllowedStatuses()`, `isValidTransition()`）

### 0.3 验证 Schema

- [ ] 创建 `lib/market/market-validations.ts`
  - 义卖购买表单 Zod schema
  - 收货地址 Zod schema
  - 管理员创建商品 Zod schema

### 0.4 WayForPay Market 支付工具

- [ ] 创建 `lib/market/wayforpay.ts`
  - 不创建新的支付实例，复用 `lib/payment/wayforpay/server.ts`
  - 封装 Market 专用方法：
    - `createMarketPayment()` — 义卖支付参数生成
    - `verifyMarketWebhookSignature()` — Market Webhook 签名验证

### 0.5 目录骨架

- [ ] 创建空目录结构（各 Phase 中逐步填充）：
  ```
  app/[locale]/market/
  app/actions/market-*.ts
  app/api/webhooks/wayforpay-market/
  components/market/
  lib/market/
  ```

**验收标准**: TypeScript 编译通过，无类型错误

---

## Phase 1: 邮箱 OTP 认证模块

> 目标：实现 Supabase Auth OTP 登录，供义卖模块复用
> 依赖：Phase 0

### 1.1 Server Action — OTP 发送与验证

- [ ] 创建 `app/actions/market-auth.ts`
  - `sendOTP(email)` — 调用 `supabase.auth.signInWithOtp({ email })`
  - `verifyOTP(email, token)` — 调用 `supabase.auth.verifyOtp()`
  - `getMarketSession()` — 获取当前认证会话
  - `signOutMarket()` — 登出
  - 错误处理：冷却期提示、验证码过期、无效验证码

### 1.2 OTP 验证组件

- [ ] 创建 `components/market/EmailOTPForm.tsx`
  - 邮箱输入 → 发送验证码 → 输入验证码 → 验证
  - 60s 倒计时重发
  - 加载状态、错误提示
  - 支持 `onSuccess(session)` 回调

### 1.3 认证状态 Hook

- [ ] 创建 `lib/hooks/useMarketAuth.ts`
  - 监听 Supabase Auth 状态变更
  - 暴露 `{ user, isAuthenticated, isLoading }`

**验收标准**: 能发送 OTP → 输入验证码 → 获得会话 → 读取 `auth.uid()`

---

## Phase 2: Market 列表页与商品详情

> 目标：创建 `/market` 列表页和商品详情页
> 依赖：Phase 0

### 2.1 数据获取

- [ ] 创建 `app/actions/market-items.ts`
  - `getPublicMarketItems(filters?)` — 获取公开商品列表（非 draft）
  - `getMarketItemById(id)` — 获取单个详情

### 2.2 共享组件

- [ ] 创建 `components/market/MarketItemCard.tsx`
  - 展示商品卡片：图片、标题、价格、库存状态
  - 状态标签（on_sale / off_shelf）；库存为 0 时显示"售罄"提示
- [ ] 创建 `components/market/MarketItemGrid.tsx`
  - 响应式网格布局
  - 空状态

### 2.3 列表页

- [ ] 创建 `app/[locale]/market/page.tsx`
  - Server Component，获取数据后渲染 `MarketItemGrid`
  - SEO metadata

### 2.4 详情页

- [ ] 创建 `app/[locale]/market/[itemId]/page.tsx`
  - 商品图片、描述、价格、库存
  - 渲染 `SaleCheckoutPanel`（Phase 3 实现）
- [ ] 创建 `components/market/MarketItemDetail.tsx`
  - 商品详情展示组件

### 2.5 商品详情静态内容体系

> **内容管理方式：静态文件 + 数据库混合**
>
> - **售前内容**（商品介绍、资金用途）→ **静态文件**
> - **售后证明**（物流证明、资金花费凭证）→ **数据库**

静态文件目录结构：
```
public/content/market/
├── item-1-en.json
├── item-1-zh.json
├── item-1-ua.json
└── ...

public/images/market/
├── item-1/
│   ├── hero.jpg
│   └── ...
└── ...
```

**验收标准**: `/market` 页面可渲染，商品卡片展示正常，详情页可访问

---

## Phase 3: 义卖购买流程（WayForPay）

> 目标：完成义卖购买全流程
> 依赖：Phase 0, 1, 2

### 3.1 收货地址表单

- [ ] 创建 `components/market/ShippingAddressForm.tsx`
  - 姓名、地址行1/2、城市、州/省、邮编、国家
  - Zod 验证

### 3.2 结账流程

- [ ] 创建 `app/actions/market-sale.ts`
  - `createSaleOrder(itemId, quantity, shippingAddress, locale)`
    1. 验证认证状态
    2. 原子扣减库存
    3. 创建 `market_orders` 记录（status: pending）
    4. 调用 `createMarketPayment()` 生成 WayForPay 支付参数
    5. 返回支付参数（给前端加载 Widget）
  - `rollbackSaleStock(orderReference)` — 库存回滚（过期/失败时）

### 3.3 支付 Widget

- [ ] 创建 `components/market/MarketPaymentWidget.tsx`
  - 复用现有 WayForPayWidget 的模式
  - 接收 `paymentParams` 加载 WayForPay Widget
  - 成功/失败/Pending 回调处理
  - 移动端重定向模式兼容

### 3.4 义卖结账面板

- [ ] 创建 `components/market/SaleCheckoutPanel.tsx`
  - 步骤流：浏览 → 认证 → 填写地址 → 支付
  - 集成 EmailOTPForm + ShippingAddressForm + MarketPaymentWidget

### 3.5 支付成功页

- [ ] 创建 `app/[locale]/market/success/page.tsx`
  - 读取 `order` 查询参数查询订单
  - 展示订单确认信息

**验收标准**: 用户可 选择商品 → 认证 → 填写地址 → WayForPay 支付 → 回到成功页

---

## Phase 4: WayForPay Webhook 与支付确认

> 目标：处理 WayForPay 支付回调
> 依赖：Phase 3

### 4.1 Webhook 端点

- [ ] 创建 `app/api/webhooks/wayforpay-market/route.ts`
  - 验证 WayForPay 签名（复用 `verifyWayForPaySignature()`）
  - 返回签名确认响应（复用 `generateWebhookResponseSignature()`）
  - 处理状态映射：

| WayForPay 状态 | 订单状态 | 操作 |
|----------------|----------|------|
| `Approved` | `paid` | 更新订单状态，触发邮件 |
| `WaitingAuthComplete` | `paid` | 预授权成功，视为已付 |
| `Expired` | `expired` | 回滚库存 |
| `Declined` | `declined` | 回滚库存 |
| `inProcessing` / `Pending` | 保持 `pending` | 仅记录日志 |

### 4.2 库存回滚

- [ ] 在 Webhook 中处理 `Expired` 和 `Declined` 时调用 `rollbackSaleStock()`
  - 原子恢复库存（SQL 函数 `stock_quantity = stock_quantity + N`）
  - 更新订单状态

**验收标准**: WayForPay 支付回调正确处理；过期/失败时库存正确回滚

---

## Phase 5: 邮件通知

> 目标：交易确认邮件
> 依赖：Phase 4

### 5.1 邮件发送器

- [ ] 创建 `lib/email/senders/market/index.ts`
  - `sendSaleOrderConfirmedEmail()` — 义卖支付成功确认
  - `sendOrderShippedEmail()` — 管理员发货通知
  - 所有模板支持三语（en/zh/ua）

### 5.2 集成到 Webhook 和管理员操作

- [ ] 在 Webhook `Approved` 事件中调用 `sendSaleOrderConfirmedEmail()`
- [ ] 在管理员发货操作中调用 `sendOrderShippedEmail()`

**验收标准**: 支付成功后发送确认邮件；管理员发货后发送通知邮件

---

## Phase 6: 管理员后台

> 目标：商品管理、订单管理
> 依赖：Phase 3, 4
> 注意：Admin 后台全英文，不使用 i18n

### 6.1 管理员 Server Actions

- [ ] 创建 `app/actions/market-admin.ts`
  - `getAdminMarketItems(filters?)` — 管理员视角的商品列表（含 draft）
  - `createMarketItem(data)` — 创建商品
  - `updateMarketItem(id, data)` — 编辑
  - `publishMarketItem(id)` — 发布（draft → on_sale）
  - `unpublishMarketItem(id)` — 下架（on_sale → off_shelf）
  - `getAdminMarketOrders(filters?)` — 订单列表
  - `updateMarketOrderStatus(orderId, status, meta?)` — 更新订单状态

### 6.2 商品管理页

- [ ] 创建 `app/admin/market/page.tsx`
  - 商品列表表格
  - 筛选：状态
  - 操作：编辑、发布、下架
- [ ] 创建 `components/admin/MarketItemsTable.tsx`

### 6.3 订单管理页

- [ ] 创建 `app/admin/market/orders/page.tsx`
  - 订单列表表格
  - 筛选：状态
- [ ] 创建 `components/admin/MarketOrdersTable.tsx`
  - 订单状态流程操作
  - 确认、发货（填写快递单号）、完成

### 6.4 管理员导航更新

- [ ] 在 `components/admin/AdminNav.tsx` 中新增：
  - "Market Items" 链接 → `/admin/market`
  - "Market Orders" 链接 → `/admin/market/orders`

**验收标准**: 管理员可创建/编辑/发布商品；可管理订单状态流转

---

## Phase 7: 导航入口与订单查询

> 目标：用户可见入口 + 订单查询
> 依赖：Phase 2

### 7.1 主导航栏

- [ ] 在 `components/layout/Navigation.tsx` 中新增 "Market" 导航项
  - 链接到 `/{locale}/market`
  - 移动端菜单同步添加

### 7.2 订单查询入口

- [ ] 创建 `app/[locale]/market/orders/page.tsx`
  - 邮箱 OTP 验证后展示个人订单列表
- [ ] 创建 `app/actions/market-order.ts`
  - `getMyOrders()` — 获取当前用户的所有订单
  - `getOrderDetail(orderId)` — 获取订单详情

**验收标准**: 导航栏出现 Market 入口；用户可查询自己的订单

---

## Phase 8: 国际化

> 目标：所有用户可见文案支持 en/zh/ua 三语
> 依赖：Phase 1-7 中各组件基本完成后

### 8.1 翻译文件

- [ ] 在 `messages/en.json` 中新增 `"market"` 顶级键
- [ ] 在 `messages/zh.json` 中新增 `"market"` 顶级键
- [ ] 在 `messages/ua.json` 中新增 `"market"` 顶级键

翻译范围：
```
market.title                    — 页面标题
market.sale.*                   — 义卖相关
market.order.*                  — 订单相关
market.auth.*                   — OTP 认证
market.checkout.*               — 结账流程
market.shipping.*               — 收货地址表单
market.status.*                 — 各状态标签
market.errors.*                 — 错误提示
navigation.market               — 导航栏标题
```

### 8.2 数据库 i18n 字段

- [ ] 商品标题使用 `title_i18n`（JSONB `{en, zh, ua}`），复用现有 `getTranslatedText()` 解析
- [ ] 商品描述、图片、资金用途等内容从静态文件 `public/content/market/item-N-{locale}.json` 读取，不存入数据库

### 8.3 邮件模板国际化

- [ ] 确认 Phase 5 中所有邮件模板已支持三语
- [ ] 根据订单 `locale` 字段发送对应语言邮件

**验收标准**: 切换语言后所有 Market 页面文案正确显示三种语言

---

## Phase 9: 数据库迁移文件

> 目标：编写完整的数据库迁移 SQL，**仅创建文件，不执行**
> 依赖：所有 Phase 完成后
>
> **⚠️ 此 Phase 仅编写迁移文件到 `supabase/migrations/` 目录。**
> **不执行 `supabase db push`，不影响线上数据库。**

### 9.1 迁移文件

- [ ] 创建 `supabase/migrations/YYYYMMDD000000_market_module.sql`

内容包括：

#### 表
1. `market_items` — 商品主表（`title_i18n`、价格、库存、状态；内容走静态文件）
2. `market_orders` — 订单表（`payment_method`；状态集：pending / widget_load_failed / paid / shipped / completed / expired / declined）
3. `market_order_status_history` — 订单状态历史（精简：无 `changed_by`、`note` 字段）

#### 索引
- `idx_market_orders_buyer` — 按买家查订单
- `idx_market_orders_item` — 按商品查订单
- `idx_market_items_status` — 按状态筛选商品

#### 视图
- `public_market_items` — 公开商品视图（排除 draft）

#### 函数
- `generate_market_order_reference()` — 生成订单编号
- `log_market_order_status_change()` — 触发器：记录状态历史
- `update_market_updated_at()` — 触发器：自动更新 updated_at
- `restore_stock()` — 原子恢复库存

#### 触发器
- `market_items` 和 `market_orders` 的 `updated_at` 自动更新
- `market_orders` 状态变更历史记录

#### RLS 策略
- `market_items`: 非 draft 公开可读；admin 可写
- `market_orders`: 仅本人（`buyer_id = auth.uid()`）或 admin 可见
- `market_order_status_history`: 仅关联订单本人或 admin 可见

### 9.2 更新数据库文档

- [ ] 更新 `docs/DATABASE_SCHEMA.md` 新增 Market 模块部分

**验收标准**: 迁移文件语法正确，可在测试环境手动执行验证

---

## 依赖关系图

```
Phase 0 (基础)
  ├──→ Phase 1 (OTP 认证)
  ├──→ Phase 2 (列表页 + 详情页)
  │     ├──→ Phase 3 (义卖购买) ──→ Phase 4 (Webhook)
  │     │                                    ──→ Phase 5 (邮件)
  │     └──→ Phase 7 (导航 + 订单查询)
  │
  Phase 3+4 ──→ Phase 6 (管理员后台)
  Phase 1-7 ──→ Phase 8 (国际化)
  Phase 0-8 ──→ Phase 9 (数据库迁移，仅编写不执行)
```

## 可并行的工作

| 并行组 | 说明 |
|--------|------|
| Phase 1 + Phase 2 | OTP 认证与列表页互不依赖 |
| Phase 5 + Phase 6 + Phase 7 | 邮件、管理员后台、导航互不依赖 |

---

## 里程碑检查点

| 检查点 | 完成标志 | 预期包含 Phase |
|--------|----------|----------------|
| M1: 能浏览商品 | 列表页渲染，卡片展示正常 | 0, 2 |
| M2: 义卖可购买 | 完整购买流程可走通（OTP → 地址 → 支付） | 1, 3, 4 |
| M3: 管理员可操作 | 创建商品/管理订单 | 6 |
| M4: 全流程闭环 | 邮件通知 + 三语 + 导航入口 | 5, 7, 8 |
| M5: 可合并 | 迁移文件就绪，PR 审核 | 9 |

---

## 进度追踪

| Phase | 状态 | 开始日期 | 完成日期 | 备注 |
|-------|------|----------|----------|------|
| 0 | 🔄 进行中 | 2026-03-27 | — | 类型定义、骨架、验证 |
| 1 | 🔄 进行中 | 2026-03-27 | — | OTP 认证模块 |
| 2 | 🔄 进行中 | 2026-03-27 | — | 列表页 + 详情页 |
| 3 | 🔄 进行中 | 2026-03-27 | — | 义卖购买流程（WayForPay） |
| 4 | 🔄 进行中 | 2026-03-28 | — | WayForPay Webhook |
| 5 | 🔄 进行中 | 2026-03-28 | — | 邮件通知 |
| 6 | 🔄 进行中 | 2026-03-28 | — | 管理员后台 |
| 7 | ✅ 基本保留 | 2026-03-28 | — | Navigation + orders |
| 8 | 🔄 进行中 | 2026-03-28 | — | 国际化 |
| 9 | 🔄 进行中 | 2026-03-28 | — | 数据库迁移文件 |

---

## 剩余工作（从 v1 骨架继承）

### 高优先级（功能完整性）

| # | 工作项 | 所属 Phase | 说明 |
|---|--------|-----------|------|
| R1 | 商品详情静态内容体系 | 2.5 | 创建 `public/content/market/` 目录 + 内容 JSON 模板 + 通用渲染组件 |
| R2 | 管理员创建/编辑商品 Modal | 6.2 | `MarketItemCreateModal` 和 `MarketItemEditModal` |
| R3 | 邮件 HTML 模板美化 | 5.1 | 当前邮件为骨架，需替换为品牌化 HTML 模板 |
| R4 | 更新 `DATABASE_SCHEMA.md` | 9.2 | 新增 Market 模块的表/函数/RLS 文档 |

### 中优先级（体验优化）

| # | 工作项 | 说明 |
|---|--------|------|
| R5 | 商品详情页自定义组件 | `components/market/detail-pages/ItemX/` 模式 |
| R6 | 订单状态流程图 | 订单查看器中的可视化状态流程 |
| R7 | 管理员订单编辑 Modal | 查看完整订单详情 + 状态操作 |
| R8 | 首页 Market 区块 | `MarketHighlightSection` 展示精选商品 |

### 低优先级（上线后迭代）

| # | 工作项 | 说明 |
|---|--------|------|
| R9 | 应用层限流 | OTP 请求按 IP 限流 |
| R10 | 商品 SEO | 结构化数据 (JSON-LD)、Open Graph |
