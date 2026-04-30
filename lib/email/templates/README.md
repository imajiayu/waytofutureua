# 邮件模板系统

> 支持事务性邮件和群发邮件的统一邮件模板系统

---

## 目录结构

```
lib/email/templates/
├── transactional/              # 事务性邮件（自动触发，内容自动填充）
│   ├── payment-success/        # 支付成功确认邮件
│   │   ├── content.ts          # React Email 组件
│   │   └── index.ts            # 邮件发送函数
│   ├── donation-completed/     # 捐赠送达通知邮件
│   │   ├── content.ts
│   │   └── index.ts
│   └── refund-success/         # 退款成功确认邮件
│       ├── content.ts
│       └── index.ts
│
├── broadcast/                  # 群发邮件模板定义
│   └── new-project/
│       └── index.ts            # 模板定义（名称、主题）
│
├── content/                    # 群发邮件 HTML 内容（独立目录）
│   └── new-project/
│       ├── en.html             # 英文版
│       ├── zh.html             # 中文版
│       └── ua.html             # 乌克兰语版
│
├── base/                       # 共享组件和样式
│   ├── components.ts           # 可复用的邮件组件
│   ├── layout.ts               # 邮件布局模板
│   └── styles.ts               # 共享样式
│
├── index.ts                    # 模板加载器（核心 API）
└── test-templates.ts           # 测试脚本
```

---

## 邮件类型

### 1. 事务性邮件（Transactional Emails）

**特点**:

- 系统自动触发（支付、捐赠送达、退款）
- 内容根据数据自动填充
- 使用 React Email 组件（TypeScript）
- 强制发送（不受订阅状态影响）

**现有模板**:

| 模板                 | 触发时机               | 用途                       |
| -------------------- | ---------------------- | -------------------------- |
| `payment-success`    | WayForPay 支付成功回调 | 确认用户捐赠并提供订单信息 |
| `donation-completed` | 管理员标记配送完成     | 通知用户捐赠已送达受助者   |
| `refund-success`     | WayForPay 退款成功回调 | 确认退款已处理             |

**使用示例**:

```typescript
import { sendPaymentSuccessEmail } from '@/lib/email/templates/transactional/payment-success'

await sendPaymentSuccessEmail({
  donorEmail: 'user@example.com',
  donorName: 'John Doe',
  amount: 100,
  orderReference: 'ORDER123',
  locale: 'en',
})
```

---

### 2. 群发邮件（Broadcast Emails）

**特点**:

- 管理员手动触发
- 每个模板是一个独立的文件夹
- 支持模板变量替换（如 `{{donate_url}}`）
- 根据用户语言偏好发送
- 包含取消订阅链接

**模板结构**:

```
broadcast/
└── {template-name}/
    └── index.ts            # 模板定义

content/
└── {template-name}/
    ├── en.html             # 英文内容
    ├── zh.html             # 中文内容
    └── ua.html             # 乌克兰语内容
```

**模板定义示例** (`index.ts`):

```typescript
import { EmailTemplate } from '../../index'

const template: EmailTemplate = {
  name: 'New Project Announcement', // 显示名称
  fileName: 'new-project', // 文件夹名（唯一标识）
  subject: {
    // 邮件主题（多语言）
    en: 'New Project Available',
    zh: '新项目上线',
    ua: 'Новий проект доступний',
  },
}

export default template
```

**HTML 内容**:

- 支持完整的 HTML/CSS（内联样式）
- 使用 `{{variable_name}}` 语法插入变量
- 每个模板有 3 个语言版本

**可用变量**:

| 变量                  | 说明                 | 示例                                            |
| --------------------- | -------------------- | ----------------------------------------------- |
| `{{donate_url}}`      | 捐赠页面链接         | `https://example.com/en/donate`                 |
| `{{unsubscribe_url}}` | 取消订阅链接（唯一） | `https://example.com/api/unsubscribe?email=...` |
| `{{app_url}}`         | 应用主页链接         | `https://example.com`                           |

---

## 核心 API

### 模板加载器 (`index.ts`)

```typescript
import {
  getAvailableTemplates,
  getCompleteEmailTemplate,
  replaceTemplateVariables,
} from '@/lib/email/templates'

// 1. 获取所有可用的群发模板（自动扫描 broadcast/ 下的文件夹）
const templates = getAvailableTemplates()
// 返回: [{ name: "New Project", fileName: "new-project" }]

// 2. 加载完整模板（定义 + HTML 内容）
const template = getCompleteEmailTemplate('new-project')
// 返回: { template: {...}, content: { en: "...", zh: "...", ua: "..." } }

// 3. 替换模板变量
const html = replaceTemplateVariables(template.content.en, {
  donate_url: 'https://example.com/donate',
  unsubscribe_url: 'https://example.com/unsubscribe',
})
```

### 群发邮件 (`broadcast.ts`)

```typescript
import { sendBroadcastEmail } from '@/lib/email/broadcast'

const result = await sendBroadcastEmail({
  template: emailTemplate,
  locale: 'en',
  recipients: ['user1@example.com', 'user2@example.com'],
  variables: {
    // 自定义变量（可选）
    project_name: 'Winter Relief',
  },
})

console.log(`Success: ${result.successCount}, Failed: ${result.failureCount}`)
```

---

## 添加新模板

### 事务性邮件

1. 在 `transactional/` 创建新文件夹
2. 添加 `content.ts`（React Email 组件）
3. 添加 `index.ts`（邮件发送函数）
4. 在业务逻辑中调用

### 群发邮件

1. **创建模板定义文件夹**:

   ```bash
   mkdir lib/email/templates/broadcast/urgent-appeal
   ```

2. **创建模板定义** (`broadcast/urgent-appeal/index.ts`):

   ```typescript
   import { EmailTemplate } from '../../index'

   const template: EmailTemplate = {
     name: 'Urgent Appeal',
     fileName: 'urgent-appeal',
     subject: {
       en: 'Urgent: Help Needed Now',
       zh: '紧急：现在需要帮助',
       ua: 'Терміново: Потрібна допомога',
     },
     projectId: '0', // 可选：关联的项目 ID
   }

   export default template
   ```

3. **创建 HTML 内容文件夹和文件**:

   ```bash
   mkdir lib/email/templates/content/urgent-appeal
   # 然后创建:
   # - content/urgent-appeal/en.html
   # - content/urgent-appeal/zh.html
   # - content/urgent-appeal/ua.html
   ```

4. **在 `index.ts` 中注册模板** (重要！):

   由于 Vercel serverless 环境不支持文件系统扫描，必须手动注册模板：

   ```typescript
   // lib/email/templates/index.ts

   // 1. 导入模板定义
   import urgentAppeal from './broadcast/urgent-appeal'

   // 2. 导入 HTML 内容
   import urgentAppealEn from './content/urgent-appeal/en.html'
   import urgentAppealZh from './content/urgent-appeal/zh.html'
   import urgentAppealUa from './content/urgent-appeal/ua.html'

   // 3. 添加到 REGISTERED_TEMPLATES 数组
   const REGISTERED_TEMPLATES: EmailTemplate[] = [
     // ... 其他模板
     urgentAppeal,
   ]

   // 4. 添加到 TEMPLATE_CONTENTS 映射
   const TEMPLATE_CONTENTS: Record<string, TemplateContent> = {
     // ... 其他模板内容
     'urgent-appeal': {
       en: urgentAppealEn,
       zh: urgentAppealZh,
       ua: urgentAppealUa,
     },
   }
   ```

5. **在管理员页面使用**:

   注册后，模板会自动出现在管理员的模板选择下拉菜单中。

---

## 测试

### 测试模板加载

```bash
npx tsx lib/email/templates/test-templates.ts
```

### 发送测试邮件

```bash
# 创建测试脚本
npx tsx -e "
import { sendTestEmail } from '@/lib/email/broadcast'
await sendTestEmail('new-project', 'your-email@example.com', 'en')
"
```

---

## 最佳实践

### HTML 内容编写

1. **使用内联样式** - 邮件客户端不支持 `<style>` 标签
2. **保持简洁** - 避免复杂的 CSS 和 JavaScript
3. **响应式设计** - 使用媒体查询适配移动端
4. **测试多个客户端** - Gmail、Outlook、Apple Mail 等

### 模板变量

1. **使用清晰的变量名** - `{{donate_url}}` 而不是 `{{url1}}`
2. **提供默认值** - 在 broadcast.ts 中设置默认变量
3. **文档化变量** - 在模板注释中说明可用变量

### 安全性

1. **始终包含取消订阅链接** - 符合 CAN-SPAM 法规
2. **使用 HTTPS 链接** - 保护用户隐私
3. **验证邮箱地址** - 防止发送到无效地址
4. **批量发送限制** - 每批最多 50 个收件人（Resend 限制）

---

## 相关文档

- [Resend 官方文档](https://resend.com/docs)
- [React Email 文档](https://react.email/docs)
- [CAN-SPAM 法规](https://www.ftc.gov/business-guidance/resources/can-spam-act-compliance-guide-business)

---

**最后更新**: 2026-01-10
