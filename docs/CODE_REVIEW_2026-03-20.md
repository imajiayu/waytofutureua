# 全项目代码审查报告

> **日期**: 2026-03-20
> **范围**: 192 个源文件全覆盖
> **审查维度**: 代码重用、代码质量、运行效率

---

## 修复计划总览

| # | 问题 | 优先级 | 复杂度 | 影响范围 |
|---|------|--------|--------|----------|
| 1 | `useBodyScrollLock` 未统一使用 | 🔴 高 | 低 | 3 个文件 |
| 2 | `donation.ts` 双重 `getProjectStats` 串行调用 | 🔴 高 | 低 | 1 个文件 |
| 3 | `admin.ts` 查询可并行 | 🟡 中 | 低 | 1 个文件 |
| 4 | `locale as 'en' \| 'zh' \| 'ua'` 散布多处 | 🟡 中 | 低 | 6 个文件 13 处 |
| 5 | Admin Modal 基础结构重复 | 🟡 中 | 高 | 5 个文件 |
| 6 | 项目详情页内容加载/Lightbox 模式重复 | 🟡 中 | 高 | 4 个文件 |
| 7 | Section Header 渐变条模式重复 | 🟢 低 | 中 | 9+ 处 |
| 8 | 管理员日期格式化不一致 | 🟢 低 | 低 | 3 个文件 |

---

## 1. `useBodyScrollLock` 未统一使用

**问题**: `lib/hooks/useBodyScrollLock.ts` 已封装了完整的滚动锁定逻辑，但 3 个组件手动重新实现了相同的代码。

**已正确使用的文件** (参考):
- `components/admin/ProjectEditModal.tsx` (行 22)
- `components/admin/DonationEditModal.tsx` (行 67)
- `components/admin/BatchDonationEditModal.tsx` (行 25)

### 1a. ProjectCreateModal

**文件**: `components/admin/ProjectCreateModal.tsx`
**行号**: 30-50

**当前代码** (手动实现):
```typescript
useEffect(() => {
  const scrollY = window.scrollY
  document.body.style.overflow = 'hidden'
  document.body.style.position = 'fixed'
  document.body.style.top = `-${scrollY}px`
  document.body.style.width = '100%'
  return () => {
    document.body.style.overflow = ''
    document.body.style.position = ''
    document.body.style.top = ''
    document.body.style.width = ''
    window.scrollTo(0, scrollY)
  }
}, [])
```

**修复**:
1. 添加 import: `import { useBodyScrollLock } from '@/lib/hooks/useBodyScrollLock'`
2. 替换整个 useEffect 为: `useBodyScrollLock()`
3. 移除不再需要的 `useEffect` import（如果无其他使用）

---

### 1b. DonationResultViewer

**文件**: `components/donation-display/DonationResultViewer.tsx`
**行号**: 136-156

**同样的手动实现**，修复方式同 1a。

---

### 1c. GlobalLoadingSpinner

**文件**: `components/layout/GlobalLoadingSpinner.tsx`
**行号**: 31-53

**注意**: 此处有一个特殊行为 — 恢复时 `window.scrollTo(0, 0)` 滚动到顶部（而非恢复原始位置），因为这是页面导航加载器。

**修复选项**:
- 方案 A: 为 `useBodyScrollLock` 添加 `scrollToTopOnUnlock` 选项
- 方案 B: 保持现状（行为不同，不适合统一）

**建议**: 方案 B — 保持现状。滚动到顶部是导航加载器的刻意行为，与 Modal 的恢复位置逻辑不同。

---

## 2. `donation.ts` 双重 `getProjectStats` 串行调用

**文件**: `app/actions/donation.ts`
**行号**: 85-88

**当前代码** (两个串行 await):
```typescript
const project = await getProjectStats(validated.project_id) as any
const allProjectsStats = await getProjectStats() as any[]
```

**问题**: 每次创建捐赠时串行执行两次数据库查询。第二次查询获取所有项目统计，已包含第一次查询的结果。

**修复**:
```typescript
const allProjectsStats = await getProjectStats() as any[]
const project = allProjectsStats.find(p => p.id === validated.project_id)
```

**影响**: 此模式在文件中出现两次 — `createWayForPayDonation()` 和 `createNowPaymentsDonation()` 函数中。需要检查第二个函数是否有相同问题。

---

## 3. `admin.ts` 顺序查询可并行

**文件**: `app/actions/admin.ts`
**行号**: 116-134

**当前代码**:
```typescript
// 获取所有捐赠
const { data, error } = await supabase
  .from('donations')
  .select(`*, projects (project_name, project_name_i18n)`)

if (error) throw error

// 获取所有状态历史
const { data: history, error: historyError } = await supabase
  .from('donation_status_history')
  .select('*')
  .order('changed_at', { ascending: true })
```

**修复** (使用 Promise.all):
```typescript
const [donationsResult, historyResult] = await Promise.all([
  supabase
    .from('donations')
    .select(`*, projects (project_name, project_name_i18n)`),
  supabase
    .from('donation_status_history')
    .select('*')
    .order('changed_at', { ascending: true })
])

if (donationsResult.error) throw donationsResult.error
if (historyResult.error) throw historyResult.error
```

---

## 4. `locale as 'en' | 'zh' | 'ua'` 类型断言散布

**问题**: `SupportedLocale` 类型已定义在 `lib/i18n-utils.ts:9`，但很多地方仍用 `as 'en' | 'zh' | 'ua'` 而非 `as SupportedLocale`。

**需要修改的文件**:

| 文件 | 行号 | 修复 |
|------|------|------|
| `app/api/webhooks/nowpayments/route.ts` | 240, 262 | `import { type SupportedLocale }` + 替换 |
| `app/api/webhooks/wayforpay/route.ts` | 223, 259 | 同上 |
| `app/actions/admin.ts` | 275 | 同上 |
| `app/actions/track-donation.ts` | 332 | 同上 |
| `components/donate-form/DonationFormCard.tsx` | 391, 446, 487, 537 | 已有 import，只需替换类型 |
| `components/projects/detail-pages/Project5/sections/EventsSection.tsx` | 38 | `import { type SupportedLocale }` + 替换 |

**修复方式** (每处):
```diff
- locale: firstDonation.locale as 'en' | 'zh' | 'ua'
+ locale: firstDonation.locale as SupportedLocale
```

---

## 5. Admin Modal 基础结构重复

**问题**: 5 个 Admin Modal 组件共享 80%+ 相同的 UI 结构（背景遮罩、滚动容器、头部+关闭按钮、错误提示、提交按钮），但各自独立实现。

**文件**:
- `components/admin/ProjectCreateModal.tsx`
- `components/admin/ProjectEditModal.tsx`
- `components/admin/DonationEditModal.tsx`
- `components/admin/BatchDonationEditModal.tsx`
- `components/admin/BroadcastModal.tsx`

**重复的公共结构**:
```tsx
<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
  <div className="bg-white rounded-lg max-w-{size} w-full max-h-[90vh] overflow-y-auto">
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h2>{title}</h2>
        <button onClick={onClose}>✕</button>
      </div>
      {error && <div className="error">...</div>}
      {/* content */}
    </div>
  </div>
</div>
```

**建议修复**:
1. 创建 `components/admin/BaseModal.tsx`:
```tsx
interface BaseModalProps {
  title: string
  onClose: () => void
  maxWidth?: string  // 默认 'max-w-2xl'
  children: React.ReactNode
  error?: string
}
```
2. 逐个迁移 Modal 使用 BaseModal 包装

**复杂度**: 高 — 每个 Modal 需要仔细调整，但长期收益大。

---

## 6. 项目详情页内容加载/Lightbox 模式重复

**问题**: Project0/3/4/5 的 `index.tsx` 都实现了几乎相同的:
- JSON 内容加载 (`useState` + `useEffect` + `fetch`)
- Loading/Error 骨架屏
- Lightbox 状态管理

**文件**:
- `components/projects/detail-pages/Project0/index.tsx` (302 行, 8 对 lightbox 状态)
- `components/projects/detail-pages/Project3/index.tsx` (264 行, 4 对 lightbox 状态)
- `components/projects/detail-pages/Project4/index.tsx` (332 行, 10 对 lightbox 状态)
- `components/projects/detail-pages/Project5/index.tsx` (118 行, 统一 lightbox)

**建议修复**:
1. 创建 `useProjectContent<T>(projectId: number, locale: string)` hook 封装加载逻辑
2. 创建 `useLightbox()` hook 封装灯箱状态管理（参考 Project5 的统一模式）

**示例**:
```typescript
// lib/hooks/useProjectContent.ts
export function useProjectContent<T>(projectId: number, locale: string) {
  const [content, setContent] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/content/projects/project-${projectId}-${locale}.json`)
      .then(res => res.ok ? res.json() : null)
      .then(setContent)
      .catch(err => clientLogger.error(...))
      .finally(() => setLoading(false))
  }, [projectId, locale])

  return { content, loading }
}
```

**复杂度**: 中-高 — 各项目的加载逻辑有细微差异（Project3/4 加载多个 JSON 文件）。

---

## 7. Section Header 渐变条模式重复

**问题**: 9+ 个 section 组件中重复相同的 header 模式:
```tsx
<div className="flex items-center gap-2 mb-3">
  <div className="w-1 h-6 bg-gradient-to-b from-{color} to-{color} rounded-full" />
  <h2 className="font-display text-lg md:text-xl font-bold text-gray-900">{title}</h2>
</div>
```

**出现位置**:
- `Project0/index.tsx` (行 195)
- `Project0/sections/SuccessStoriesSection.tsx` (行 17)
- `Project0/sections/FinancialSection.tsx` (行 22)
- `Project3/sections/StatisticsSection.tsx` (行 18)
- `Project4/sections/StorySection.tsx` (行 19)
- `Project4/sections/LivingConditionsSection.tsx` (行 26)
- `Project4/sections/FamilySection.tsx` (行 13)
- `Project5/sections/BackgroundSection.tsx` (行 12)
- `Project5/sections/EventsSection.tsx` (行 23)

**建议修复**:
创建 `components/projects/shared/SectionHeader.tsx`

**注意**: Tailwind 的动态类名 (`from-${color}`) 不能被 JIT 编译器检测。需要传入完整的 className 字符串或使用 `style` prop。

**复杂度**: 中 — 需要确保 Tailwind purge 不删除动态生成的颜色类。

---

## 8. 管理员日期格式化不一致

**问题**: 管理员组件中日期格式化使用 `new Date().toLocaleString()` 而非项目已有的 `formatDate()` 工具函数。

**文件**:
- `components/admin/ProjectEditModal.tsx` (行 45): `new Date(date).toLocaleString()`
- `components/admin/DonationEditModal.tsx` (行 244, 643): 手动格式化
- `components/admin/SubscriptionsTable.tsx` (行 202): `new Date().toLocaleDateString('en-US'...)`

**注意**: 管理员界面不需要多语言，所以 `formatDate()` 的 locale 参数可固定为 `'en'`。这是一个一致性问题而非功能缺陷。

**复杂度**: 低

---

## 附录: 已跳过的发现

以下发现被评估后跳过:

| 发现 | 跳过原因 |
|------|----------|
| DonationFormCard 1177 行 | 需要大规模架构重构 |
| WayForPay 脚本预加载 | 过度优化，当前行为可接受 |
| Loop 中的 RPC 调用 | 需要新数据库函数 |
| `useTranslations` 组件的 `'use client'` | 父组件本身是 client，删除无实际影响 |
| CryptoSelector 串行 effect | 第二个依赖第一个结果，无法完全并行 |
| BroadcastModal 状态机简化 | 过度工程化 |
| Hero Section 相似性 | 各项目设计差异大，无法共享 |
| 图像网格组件提取 | 各项目网格布局差异大 |
| ProjectCard useCallback 问题 | 误报，实现正确 |
