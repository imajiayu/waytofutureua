# NGO 平台 - 项目技术文档

> 一个现代化的非政府组织(NGO)捐赠平台，支持多语言、在线支付和捐赠追踪

---

## 重要提示：数据库相关事项

**在处理任何数据库相关任务前，请先阅读以下文件：**

1. **`docs/DATABASE_SCHEMA.md`** - 数据库架构概览文档
2. **`supabase/migrations/20260109000000_baseline.sql`** - 完整的数据库 schema 定义（包含所有表、函数、触发器、RLS 策略、索引、存储桶）

这两个文件包含了数据库的完整定义，是理解和修改数据库结构的权威来源。

---

## 项目概述

**当前版本**: 2.4.1
**最后提交**: 384be2c155f39ae6cf0caced7ba70b0f84621fe2
**开发状态**: 生产就绪

### 主要特性

- 多语言支持 (en/zh/ua)
- WayForPay 支付网关集成（法币）
- NOWPayments 加密货币支付集成
- Supabase 实时数据同步
- Resend 多语言邮件通知
- 捐赠追踪与订单分组
- 管理员后台（项目/捐赠/订阅管理）
- Cloudinary 图像处理 + 人脸隐私保护
- 物资捐赠（按单位拆分）和金额捐赠（聚合模式）
- 14 个捐赠状态，完整支付和退款流程
- 邮件订阅系统
- 邮件转发功能（入站邮件自动转发）
- 捐赠状态审计追踪

---

## 技术栈

| 类型 | 技术 |
|------|------|
| 前端 | Next.js 14 (App Router), TypeScript, Tailwind CSS, next-intl |
| 后端 | Supabase (PostgreSQL + Auth), WayForPay, NOWPayments, Resend, Cloudinary |
| 部署 | Vercel, Supabase Cloud |

---

## 数据库架构

> **完整定义**: `supabase/migrations/20260109000000_baseline.sql`
> **文档概览**: [docs/DATABASE_SCHEMA.md](docs/DATABASE_SCHEMA.md)

### 核心表

| 表 | 说明 |
|-----|------|
| `projects` | 项目信息和进度 |
| `donations` | 捐赠记录和支付详情 |
| `email_subscriptions` | 邮件订阅 |
| `donation_status_history` | 状态转换历史 |

### 捐赠状态 (14个)

| 分类 | 状态 |
|------|------|
| 支付前 | pending, widget_load_failed |
| 处理中 | processing, fraud_check |
| 已支付 | paid, confirmed, delivering, completed |
| 失败 | expired, declined, failed |
| 退款 | refunding, refund_processing, refunded |

**管理员可修改**: paid → confirmed → delivering → completed

### 项目类型 (2x2)

| 字段 | 值 | 含义 |
|------|-----|------|
| `is_long_term` | true | 长期项目，无结束日期，无目标上限 |
| `is_long_term` | false | 固定期限项目，有结束日期和目标 |
| `aggregate_donations` | true | 聚合项目，按金额捐赠（`target_units` = 目标金额） |
| `aggregate_donations` | false | 非聚合项目，按单位捐赠（`target_units` = 目标单位数） |

**关键字段语义**：
- `current_units`：触发器每条 donation 记录 +1
  - 非聚合项目：每单位创建一条记录 → `current_units` = 单位数
  - 聚合项目：每笔捐赠一条记录 → `current_units` = 订单数（不用于进度计算）
- `total_raised`：累计金额（视图计算 SUM(amount)）
- `target_units`：非聚合=目标单位数，聚合=目标金额

**进度计算**（`project_stats` 视图 + UI 组件）：
- 聚合项目：`total_raised / target_units`（金额/目标金额）
- 非聚合项目：`current_units / target_units`（单位数/目标单位数）

**UI 展示逻辑**（`ProjectCard`, `ProjectProgressSection`）：

| 项目类型 | 进度条数据源 | 结束日期 | 当前单位数 |
|----------|--------------|----------|------------|
| 固定期限 + 非聚合 | `current_units` | ✅ 显示 | ❌ |
| 固定期限 + 聚合 | `total_raised` | ✅ 显示 | ❌ |
| 长期 + 非聚合 | ❌ 无进度条 | ❌ | ✅ 显示 |
| 长期 + 聚合 | ❌ 无进度条 | ❌ | ❌ |

### 数据库函数

**业务函数 (5个)**

| 函数 | 说明 |
|------|------|
| `generate_donation_public_id()` | 生成唯一捐赠 ID |
| `get_donations_by_email_verified()` | 验证邮箱并查询捐赠 |
| `is_admin()` | 检查管理员权限 |
| `upsert_email_subscription()` | 订阅或更新邮件 |
| `unsubscribe_email()` | 取消订阅 |

**触发器函数 (7个)**

| 函数 | 说明 |
|------|------|
| `update_updated_at_column()` | 自动更新 updated_at |
| `update_project_units()` | 更新项目单位数 |
| `prevent_project_immutable_fields()` | 保护项目不可变字段 |
| `prevent_donation_immutable_fields()` | 保护捐赠不可变字段 + 状态验证 |
| `update_email_subscription_updated_at()` | 订阅表 updated_at |
| `prevent_subscription_immutable_fields()` | 保护订阅 id |
| `log_donation_status_change()` | 记录状态历史 |

---

## 目录结构

```
NGO_web/
├── app/
│   ├── [locale]/                 # 国际化路由
│   │   ├── page.tsx              # 主页
│   │   ├── donate/               # 捐赠流程
│   │   │   └── success/          # 支付成功页
│   │   ├── track-donation/       # 捐赠追踪
│   │   ├── unsubscribed/         # 取消订阅页
│   │   ├── privacy-policy/       # 隐私政策
│   │   └── public-agreement/     # 公开协议
│   ├── admin/                    # 管理员后台
│   │   ├── login/                # 登录
│   │   ├── projects/             # 项目管理
│   │   ├── donations/            # 捐赠管理
│   │   └── subscriptions/        # 订阅管理
│   ├── actions/                  # Server Actions
│   │   ├── admin.ts              # 管理员操作
│   │   ├── donation.ts           # 捐赠创建
│   │   ├── donation-result.ts    # 结果查询
│   │   ├── track-donation.ts     # 追踪和退款
│   │   ├── subscription.ts       # 订阅操作
│   │   └── email-broadcast.ts    # 群发邮件
│   └── api/
│       ├── webhooks/wayforpay/   # WayForPay 支付回调
│       ├── webhooks/nowpayments/ # NOWPayments 加密货币回调
│       ├── webhooks/resend-inbound/ # 入站邮件转发
│       ├── donations/            # 捐赠 API
│       ├── donate/success-redirect/ # 重定向
│       └── unsubscribe/          # 取消订阅
├── components/
│   ├── common/                   # 通用 UI 组件 (BottomSheet, CopyButton, ImageLightbox)
│   ├── layout/                   # 布局组件 (Navigation, Footer, GlobalLoadingSpinner)
│   ├── icons/                    # 内联 SVG 图标
│   ├── home/                     # 主页组件
│   ├── projects/                 # 项目组件
│   │   ├── detail-pages/         # 项目详情页
│   │   └── shared/               # 共享组件
│   ├── donate-form/              # 捐赠表单 (DonationFormCard, 支付组件)
│   ├── donation-display/         # 捐赠展示 (状态徽章、流程图、结果查看器)
│   └── admin/                    # 管理员组件
├── lib/
│   ├── supabase/                 # 数据库集成
│   ├── wayforpay/                # WayForPay 支付集成
│   ├── payment/nowpayments/      # NOWPayments 加密货币集成
│   ├── email/                    # 邮件服务
│   │   ├── templates/            # 邮件模板
│   │   └── senders/              # 发送器
│   ├── cloudinary.ts             # 图像处理
│   ├── validations.ts            # Zod 验证
│   ├── i18n-utils.ts             # 国际化工具
│   └── hooks/                    # 自定义 React Hooks
├── messages/                     # 翻译文件 (en/zh/ua)
├── public/
│   ├── content/projects/         # 项目内容 JSON (project-X-{locale}.json)
│   └── images/projects/          # 项目图片 (project-X/)
├── types/                        # TypeScript 类型
├── supabase/migrations/          # 1 个 baseline 迁移文件 (20260109000000_baseline.sql)
└── docs/DATABASE_SCHEMA.md       # 数据库架构文档
```

---

## 页面路由

### 公开页面

| 路径 | 功能 |
|------|------|
| `/[locale]/` | 主页 |
| `/[locale]/donate` | 捐赠页面 |
| `/[locale]/donate/success` | 支付成功 |
| `/[locale]/track-donation` | 捐赠追踪 |
| `/[locale]/unsubscribed` | 取消订阅确认 |
| `/[locale]/privacy-policy` | 隐私政策 |
| `/[locale]/public-agreement` | 公开协议 |

### API 端点

| 端点 | 方法 | 用途 |
|------|------|------|
| `/api/webhooks/wayforpay` | POST | WayForPay 支付回调 |
| `/api/webhooks/nowpayments` | POST | NOWPayments 加密货币回调 |
| `/api/webhooks/resend-inbound` | POST | 入站邮件转发 |
| `/api/donations/order/[orderReference]` | GET | 订单捐赠查询 |
| `/api/donations/project-public/[projectId]` | GET | 项目公开捐赠 |
| `/api/donate/success-redirect` | GET/POST | 重定向处理 |
| `/api/unsubscribe` | GET/POST | 取消订阅 |

### 管理员页面

| 路径 | 功能 |
|------|------|
| `/admin/login` | 登录 |
| `/admin/projects` | 项目管理 |
| `/admin/donations` | 捐赠管理 |
| `/admin/subscriptions` | 订阅管理 |

---

## 组件

### 布局组件 (`components/layout/`)

| 组件 | 说明 |
|------|------|
| Navigation | 导航栏 |
| Footer | 页脚 |
| GlobalLoadingSpinner | 全局加载 |

### 通用 UI 组件 (`components/common/`)

| 组件 | 说明 |
|------|------|
| BottomSheet | 底部弹出层（移动端） |
| ImageLightbox | 图片灯箱 |
| CopyButton | 复制按钮 |

### 主页组件 (`components/home/`)

MissionSection, ApproachSection, ImpactSection, DonationJourneySection, ComplianceSection, ProjectResultsSection

### 项目组件 (`components/projects/`)

| 组件 | 说明 |
|------|------|
| ProjectsGrid | 项目网格 |
| ProjectCard | 项目卡片 |
| ProjectsGallery | 项目选择 |
| ProjectResultsMarquee | 成果滚动 |
| ProjectStatusBadge | 状态徽章 |
| LongTermBadge | 长期项目标签 |

**共享组件** (`shared/`): ProjectProgressBar, ProjectProgressSection, ProjectResultsMasonry

**项目详情页** (`detail-pages/`):

每个项目由三部分组成：

| 项目 | 组件目录 | 内容 JSON | 图片目录 |
|------|----------|-----------|----------|
| Project0 | `detail-pages/Project0/` | `public/content/projects/project-0-{en,zh,ua}.json` | `public/images/projects/project-0/` |
| Project3 | `detail-pages/Project3/` | `public/content/projects/project-3-{en,zh,ua}.json` | `public/images/projects/project-3/` |
| Project4 | `detail-pages/Project4/` | `public/content/projects/project-4-{en,zh,ua}.json` | `public/images/projects/project-4/` |

组件目录结构：
- `index.tsx` - 主组件入口
- `types.ts` - 类型定义
- `sections/` - 区块组件

### 捐赠表单组件 (`components/donate-form/`)

| 组件 | 说明 |
|------|------|
| DonationFormCard | 捐赠表单卡片 |
| PaymentMethodSelector | 支付方式选择 |
| CryptoSelector | 加密货币选择 |
| widgets/WayForPayWidget | WayForPay 支付组件 |
| widgets/NowPaymentsWidget | NOWPayments 加密货币组件 |

### 捐赠展示组件 (`components/donation-display/`)

| 组件 | 说明 |
|------|------|
| DonationStatusBadge | 状态徽章 |
| DonationStatusFlow | 状态流程图 |
| DonationResultViewer | 捐赠结果查看器 |
| ProjectDonationList | 项目捐赠列表 |

### 管理员组件 (`components/admin/`)

| 组件 | 说明 |
|------|------|
| AdminNav | 导航栏 |
| ProjectsTable | 项目表格 |
| ProjectCreateModal | 创建项目 |
| ProjectEditModal | 编辑项目 |
| DonationsTable | 捐赠表格 |
| DonationEditModal | 编辑捐赠 |
| BatchDonationEditModal | 批量编辑 |
| DonationStatusProgress | 状态进度 |
| SubscriptionsTable | 订阅表格 |
| BroadcastModal | 群发邮件 |

### 图标组件 (`components/icons/`)

内联 SVG 图标，替代 lucide-react 以减少 bundle 大小

---

## 可复用工具

> **重要**: 在实现新功能前，先检查这里是否有现成的工具可用，避免重复造轮子。

### React Hooks (`lib/hooks/`)

| Hook | 说明 | 使用场景 |
|------|------|----------|
| `useBodyScrollLock(isLocked)` | 锁定页面滚动（移动端安全） | Modal, Lightbox, BottomSheet, 全屏弹层 |

### 工具函数 (`lib/`)

| 文件 | 主要导出 | 说明 |
|------|----------|------|
| `utils.ts` | `cn()`, `formatCurrency()` | 类名合并 (clsx+twMerge)、货币格式化 |
| `i18n-utils.ts` | `getTranslatedText()`, `getProjectName()`, `getLocation()`, `getUnitName()`, `formatDate()` | 数据库 i18n 字段解析、日期格式化 |
| `donation-status.ts` | 状态常量、状态判断函数 | 捐赠状态相关的所有逻辑 |
| `validations.ts` | Zod schemas | 表单和 API 验证 |
| `cloudinary.ts` | `processImageWithCloudinary()` | 图片处理和人脸模糊 |
| `logger.ts` / `logger-client.ts` | `logger`, `clientLogger` | 服务端/客户端日志 |

### Supabase 客户端 (`lib/supabase/`)

| 函数 | 说明 | 使用场景 |
|------|------|----------|
| `createClient()` | 浏览器端客户端 | Client Components |
| `createServerClient()` | 服务端客户端（带 cookies） | Server Components, Server Actions |
| `createServiceClient()` | Service Role 客户端 | Webhooks, 管理员操作 |
| `getAdminClient()` | 已验证管理员客户端 | Admin Server Actions |

### 捐赠状态工具 (`lib/donation-status.ts`)

```typescript
// 状态判断
isPrePaymentStatus(status)    // 是否支付前状态
isFailedStatus(status)        // 是否失败状态
isRefundStatus(status)        // 是否退款相关状态
canRequestRefund(status)      // 是否可申请退款
canViewResult(status)         // 是否可查看捐赠结果

// 状态转换
getNextAllowedStatuses(status)           // 获取允许的下一状态
isValidAdminTransition(from, to)         // 验证管理员状态转换
needsFileUpload(from, to)                // 转换是否需要上传文件
```

---

## Server Actions

| Action | 说明 |
|--------|------|
| `createWayForPayDonation()` | 创建捐赠 |
| `getDonationResultUrl()` | 获取结果图片 |
| `trackDonations()` | 追踪捐赠 |
| `requestRefund()` | 申请退款 |
| `adminLogin/Logout()` | 管理员认证 |
| `getAdminProjects/Donations()` | 获取数据 |
| `createProject/updateProject()` | 项目操作 |
| `updateDonationStatus()` | 更新状态 |
| `createEmailSubscription()` | 创建订阅 |
| `getSubscriptions()` | 获取订阅 |
| `sendEmailBroadcast()` | 群发邮件 |

---

## 业务流程

### 捐赠流程

```
1. 选择项目 → 2. 填写表单 → 3. createWayForPayDonation()
→ 4. 创建 pending 记录 → 5. 加载支付小部件
→ 6. 用户支付 → 7. Webhook 更新状态 → 8. 发送邮件
→ 9. 重定向成功页 → 10. 展示捐赠详情
```

### 管理员流程

```
paid → confirmed (确认收款)
→ delivering (开始配送)
→ completed (上传照片完成)
```

---

## 开发配置

### 环境变量

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# WayForPay
WAYFORPAY_MERCHANT_ACCOUNT=
WAYFORPAY_SECRET_KEY=

# Resend
RESEND_API_KEY=
RESEND_FROM_EMAIL=

# NOWPayments (加密货币)
NOWPAYMENTS_API_KEY=
NOWPAYMENTS_IPN_SECRET=

# Cloudinary (可选)
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# App
NEXT_PUBLIC_APP_URL=
```

### 本地开发

```bash
npm install
npm run dev
```

### 数据库迁移

```bash
supabase login
supabase link --project-ref <ref>
supabase db push
```

### 生成类型

```bash
supabase gen types typescript --linked > types/database.ts
```

---

## 安全机制

- RLS 策略保护所有表 (10个策略)
- Service Role 用于 Webhook 和管理员操作
- 触发器保护不可变字段
- 状态转换数据库级验证
- 邮箱混淆保护隐私
- 双重验证防枚举攻击

---

## 国际化

支持 3 种语言: `en` (英文), `zh` (中文), `ua` (乌克兰语)

### 开发规范

**禁止在代码中硬编码用户可见文案。** 所有 UI 文本必须使用翻译键：

```typescript
// ❌ 错误 - 硬编码文案
<button>Submit</button>
<p>Please enter your email</p>

// ✅ 正确 - 使用翻译键
<button>{t('common.submit')}</button>
<p>{t('form.emailPlaceholder')}</p>
```

翻译文件位于 `messages/` 目录：
- `messages/en.json` - 英文
- `messages/zh.json` - 中文
- `messages/ua.json` - 乌克兰语

**例外情况：**
- 品牌名称可以硬编码，无需翻译（如 "Way to Health"）
- **Admin 后台**（`app/admin/`、`components/admin/`）全英文，不使用 i18n，UI 文本直接硬编码英文即可

### 使用方式

```typescript
// Server Component
const t = await getTranslations('namespace')

// Client Component
const t = useTranslations('namespace')

// 数据库 i18n 字段
getTranslatedText(project.project_name_i18n, locale, fallback)
```

---

## 部署

1. 推送到 GitHub
2. Vercel 导入项目
3. 配置环境变量
4. 部署

### 部署后配置

- WayForPay Webhook: `https://domain.com/api/webhooks/wayforpay`
- NOWPayments IPN: `https://domain.com/api/webhooks/nowpayments`
- Resend 域名验证 (SPF, DKIM, DMARC)
- Resend Inbound Webhook: `https://domain.com/api/webhooks/resend-inbound`
- Cloudinary 配置 (可选)

---

## 相关文档

- [数据库架构](docs/DATABASE_SCHEMA.md)
- [Supabase 文档](https://supabase.com/docs)
- [Next.js 14 文档](https://nextjs.org/docs)
- [next-intl 文档](https://next-intl-docs.vercel.app/)

---

**文档版本**: 2.4.2
**最后更新**: 2026-01-21
