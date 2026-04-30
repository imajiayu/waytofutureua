# 义卖市场模块安全与质量审查报告

> **审查日期**: 2026-03-30
> **审查范围**: 义卖市场模块全部代码（Server Actions、Webhook、前端组件、数据库迁移/RLS）
> **审查方法**: 四路并行代码审计（安全 + 支付 + UX + 数据库）

---

## 修复进度总览

| 优先级        | 总数 | 已完成 | 状态               |
| ------------- | ---- | ------ | ------------------ |
| P0 - 立即修复 | 3    | 3      | :white_check_mark: |
| P1 - 尽快修复 | 5    | 5      | :white_check_mark: |
| P2 - 近期修复 | 13   | 13     | :white_check_mark: |
| P3 - 酌情处理 | 10   | 10     | :white_check_mark: |

---

## P0 - 立即修复（本周内）

### P0-1. Webhook 金额校验可被绕过

- **状态**: :white_check_mark: 已完成（2026-03-30）
- **分类**: 安全漏洞
- **文件**: `app/api/webhooks/wayforpay-market/route.ts:49`

**问题描述**:

```typescript
if (body.amount !== undefined && order.total_amount !== undefined) {
```

当攻击者构造不含 `amount` 字段的 Webhook 请求时，金额校验被完全跳过，订单直接标记为 `paid`。虽然 HMAC 签名提供了一层保护，但签名中 `amount` 缺失时会用空字符串代替，签名仍可能有效。

**修复方案**:

1. 将 `amount` 视为必需字段 — 缺失时拒绝处理
2. 金额校验改为精确匹配（去掉 1% 容差，改用绝对值 0.01）
3. 同时校验 `currency` 字段

```typescript
// 修复后
const callbackAmount = parseFloat(String(body.amount))
if (isNaN(callbackAmount)) {
  logger.error('Missing or invalid amount in callback', { orderReference })
  return NextResponse.json({ error: 'Invalid amount' }, { status: 400 })
}

if (Math.abs(callbackAmount - order.total_amount) > 0.01) {
  logger.error('Amount mismatch', { callbackAmount, expected: order.total_amount })
  return NextResponse.json({ error: 'Amount mismatch' }, { status: 400 })
}
```

**验证方式**: 手动测试 — 构造不含 amount 的 POST 请求，确认返回 400

---

### P0-2. `expire_stale_market_orders` 可被匿名用户直接调用

- **状态**: :white_check_mark: 已完成（2026-03-30）
- **分类**: 安全漏洞
- **文件**: `supabase/migrations/20260330500000_market_expire_pending_cron.sql`

**问题描述**:

`expire_stale_market_orders()` 是 `SECURITY DEFINER` 函数，但没有 `REVOKE/GRANT` 限制执行权限。任何匿名用户可通过 PostgREST 调用此函数，强制过期所有超过 10 分钟的 pending 订单，构成 DoS 攻击。

**修复方案**:

新建迁移文件 `supabase/migrations/YYYYMMDD_revoke_expire_function.sql`：

```sql
-- 收紧 expire_stale_market_orders 的执行权限，仅 service_role 可调用
REVOKE EXECUTE ON FUNCTION expire_stale_market_orders() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION expire_stale_market_orders() FROM anon;
REVOKE EXECUTE ON FUNCTION expire_stale_market_orders() FROM authenticated;
GRANT EXECUTE ON FUNCTION expire_stale_market_orders() TO service_role;
```

**验证方式**: 用 anon key 调用 `SELECT expire_stale_market_orders()`，确认返回 permission denied

---

### P0-3. 前端错误处理大面积缺失 — 网络错误导致 UI 永久卡死

- **状态**: :white_check_mark: 已完成（2026-03-30）
- **分类**: Bug / UX
- **文件**:
  - `app/[locale]/market/orders/page.tsx:44-52`
  - `components/market/MarketOrderList.tsx:36-39`
  - `components/market/OrderProofSection.tsx:23-29`

**问题描述**:

三处 Server Action 调用均使用 `.then()` 但无 `.catch()`。任何网络错误都导致 Promise rejection 被吞掉，`isLoading` / `loading` 永远不变为 `false`，页面永久卡在加载状态。同时 `getMyOrders` 返回的 `error` 字段也被完全忽略。

**修复方案**:

每处增加 `.catch()` 处理和 error 状态展示。示例：

```typescript
// orders/page.tsx 修复
const [error, setError] = useState<string | null>(null)

useEffect(() => {
  if (!isAuthenticated) return
  setIsLoading(true)
  setError(null)
  getMyOrders()
    .then(({ orders: data, error: err }) => {
      if (err) setError(err)
      else setOrders(data)
    })
    .catch(() => setError('network_error'))
    .finally(() => setIsLoading(false))
}, [isAuthenticated])
```

对 `MarketOrderList` 和 `OrderProofSection` 做类似修复。

**验证方式**: 在浏览器 DevTools 中 throttle 网络为 Offline，确认出现错误提示而非无限 loading

---

## P1 - 尽快修复（两周内）

### P1-1. 库存扣减与订单创建不在同一事务中

- **状态**: :white_check_mark: 已完成（2026-03-30）
- **分类**: 数据一致性
- **文件**: `app/actions/market-sale.ts:62-109`

**问题描述**:

`decrement_stock` RPC（行 63）和 `INSERT market_orders`（行 79）是两个独立操作。如果进程在中间崩溃（OOM、Vercel 超时），库存被扣减但没有对应订单，且补偿逻辑 `restore_stock` 不会执行。

**修复方案**:

创建一个新的 PL/pgSQL 函数 `create_market_order_atomic()`，在单个数据库事务中完成扣库存 + 创建订单：

```sql
CREATE OR REPLACE FUNCTION create_market_order_atomic(
  p_item_id INT,
  p_quantity INT,
  p_buyer_id UUID,
  p_buyer_email TEXT,
  p_order_reference TEXT,
  p_unit_price NUMERIC,
  p_total_amount NUMERIC,
  p_currency TEXT,
  p_locale TEXT,
  p_shipping_address JSONB
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_order_id UUID;
  v_stock_ok BOOLEAN;
BEGIN
  SELECT decrement_stock(p_item_id, p_quantity) INTO v_stock_ok;
  IF NOT v_stock_ok THEN
    RAISE EXCEPTION 'Insufficient stock';
  END IF;

  INSERT INTO market_orders (
    item_id, quantity, buyer_id, buyer_email,
    order_reference, unit_price, total_amount,
    currency, status, locale, shipping_address
  ) VALUES (
    p_item_id, p_quantity, p_buyer_id, p_buyer_email,
    p_order_reference, p_unit_price, p_total_amount,
    p_currency, 'pending', p_locale, p_shipping_address
  ) RETURNING id INTO v_order_id;

  RETURN v_order_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION create_market_order_atomic FROM PUBLIC;
GRANT EXECUTE ON FUNCTION create_market_order_atomic TO service_role;
```

然后在 `market-sale.ts` 中用单次 RPC 调用替代现有的两步操作。

**验证方式**: 单元测试 — 模拟库存不足时确认无孤儿扣减；集成测试 — 正常下单流程

---

### P1-2. 义卖订单缺少数据库级状态转换验证

- **状态**: :white_check_mark: 已完成（2026-03-30）
- **分类**: 安全 / 纵深防御
- **文件**: `supabase/migrations/20260329400000_market_order_immutable_fields.sql`

**问题描述**:

捐赠模块的 `prevent_donation_immutable_fields` 触发器包含数据库级状态转换白名单。义卖模块的对应触发器完全没有此逻辑，仅靠应用层 `isValidOrderTransition()` 防护。

**修复方案**:

在 `prevent_market_order_immutable_fields` 触发器中添加状态转换白名单（参考捐赠模块 `20260325000000_donation_baseline.sql` 行 246-258）：

```sql
-- 在触发器函数中添加状态转换验证
-- Service role (webhook) 的转换由应用层控制，此处仅约束管理员操作
IF auth.uid() IS NOT NULL THEN
  IF NOT (
    (OLD.status = 'paid' AND NEW.status = 'shipped') OR
    (OLD.status = 'shipped' AND NEW.status = 'completed')
  ) THEN
    RAISE EXCEPTION 'Invalid admin status transition: % -> %', OLD.status, NEW.status;
  END IF;
END IF;
```

**验证方式**: 使用 authenticated 角色尝试 `UPDATE market_orders SET status = 'completed' WHERE status = 'pending'`，确认被拒绝

---

### P1-3. Webhook 恢复路径中库存操作顺序错误

- **状态**: :white_check_mark: 已完成（2026-03-30）
- **分类**: 数据一致性
- **文件**: `app/api/webhooks/wayforpay-market/route.ts:196-210`

**问题描述**:

`expired → paid` 和 `widget_load_failed → paid` 恢复时，先更新状态为 `paid`，再尝试 `decrement_stock`。如果商品已下架或库存不足，扣库存失败但订单已是 `paid` — 导致超卖。

**修复方案**:

调换顺序 — 先尝试扣库存，成功后再更新状态。如果扣库存失败，记录日志但不更新为 `paid`（保持原状态，由管理员人工处理）。

```typescript
// 伪代码 — 先扣库存再改状态
if (needsStockReDecrement) {
  const stockOk = await decrementStock(order.item_id, order.quantity)
  if (!stockOk) {
    logger.error('Cannot re-decrement stock for recovered order', { orderReference })
    // 不更新状态，返回 accept 防止重试风暴
    return respondWithAccept(orderReference)
  }
}
// 库存扣减成功后再更新状态
await updateOrderStatus(orderReference, 'paid')
```

**验证方式**: 模拟已下架商品的 expired 订单收到 Approved 回调，确认不会变为 paid

---

### P1-4. OTP 缺少应用层速率限制

- **状态**: :white_check_mark: 已完成（2026-03-30）
- **分类**: 安全
- **文件**: `app/actions/market-auth.ts:11-89`

**问题描述**:

`sendOTP` 仅依赖 Supabase Auth 60 秒冷却期，无 IP/email 维度限制。攻击者可用不同邮箱大量消耗邮件配额。`verifyOTP` 无暴力破解保护（6 位数字 = 100 万种组合）。

**修复方案**:

方案 A（推荐 — 轻量级）: 使用内存级简单计数器（适合单实例 Vercel Functions）:

```typescript
// lib/rate-limit.ts
const attempts = new Map<string, { count: number; resetAt: number }>()

export function checkRateLimit(key: string, maxAttempts: number, windowMs: number): boolean {
  const now = Date.now()
  const entry = attempts.get(key)
  if (!entry || now > entry.resetAt) {
    attempts.set(key, { count: 1, resetAt: now + windowMs })
    return true
  }
  if (entry.count >= maxAttempts) return false
  entry.count++
  return true
}
```

在 `sendOTP` 中：每 email 每小时最多 10 次，全局每 IP 每小时最多 30 次。
在 `verifyOTP` 中：每 (email + IP) 连续失败 5 次后锁定 15 分钟。

方案 B（更可靠）: 使用 Upstash Redis + `@upstash/ratelimit`。

**验证方式**: 短时间内连续调用 sendOTP 超过限制，确认返回 rate limit 错误

---

### P1-5. 金额校验使用 1% 百分比容差

- **状态**: :white_check_mark: 已完成（随 P0-1 一并修复）
- **分类**: 安全
- **文件**: `app/api/webhooks/wayforpay-market/route.ts:52`

**问题描述**:

```typescript
if (Math.abs(callbackAmount - expectedAmount) > expectedAmount * 0.01) {
```

对 $1000 商品允许 $10 误差。WayForPay 返回的金额应与请求精确一致。

**修复方案**:

改为固定绝对值容差（与 P0-1 合并修复）：

```typescript
if (Math.abs(callbackAmount - expectedAmount) > 0.01) {
```

**验证方式**: 回调中金额差 0.02 时确认被拒绝

---

## P2 - 近期修复（一个月内）

### P2-1. `orderReference` 使用非密码学安全随机数

- **状态**: :white_check_mark: 已完成（随 P1-1 一并修复，使用 crypto.randomBytes）
- **分类**: 安全加固
- **文件**: `app/actions/market-sale.ts:72`

**问题**: `Math.random()` 非密码学安全，随机部分仅 6 字符（约 31bit 熵）。

**修复**:

```typescript
import { randomBytes } from 'crypto'
const orderReference = `MKT-${Date.now()}-${randomBytes(8).toString('hex').toUpperCase()}`
```

---

### P2-2. `updateMarketOrderStatus` 未使用 Zod schema 验证

- **状态**: :white_check_mark: 已完成（2026-03-30）
- **分类**: 输入验证
- **文件**: `app/actions/market-admin.ts:175-178`

**问题**: 已导入 `updateOrderStatusSchema` 但未使用。`meta.tracking_number` 等无长度验证。

**修复**: 在函数入口处添加 `updateOrderStatusSchema.parse({ orderId, newStatus, ...meta })`。

---

### P2-3. 错误信息直接返回客户端

- **状态**: :white_check_mark: 已完成（随 P1-1 一并修复，统一返回 'operation_failed'）
- **分类**: 信息泄露
- **文件**: `market-sale.ts:175,202` | `market-order.ts:58`

**问题**: `error.message` 可能包含表名、列名、约束名等数据库内部信息。

**修复**: 对非预期错误统一返回通用消息：

```typescript
return { success: false, error: 'operation_failed' }
// 原始错误仅记录日志
logger.error('Operation failed', { error: error.message, context })
```

---

### P2-4. 支付 Widget 超时回调闭包捕获陈旧 `error` 值

- **状态**: :white_check_mark: 已完成（2026-03-30）
- **分类**: Bug
- **文件**: `components/market/MarketPaymentWidget.tsx:221`

**问题**: `setTimeout` 回调中引用 `error` 状态变量，但捕获的是闭包创建时的值（始终为 `null`）。

**修复**: 使用 `useRef` 追踪 error 的最新值：

```typescript
const errorRef = useRef(error)
useEffect(() => {
  errorRef.current = error
}, [error])
// 在 setTimeout 中使用 errorRef.current 代替 error
```

---

### P2-5. Checkout 提交缺少 ref 级互斥锁

- **状态**: :white_check_mark: 已完成（2026-03-30）
- **分类**: 竞态条件
- **文件**: `components/market/SaleCheckoutPanel.tsx:81`

**问题**: `isSubmitting` 状态在 React 批处理间隙可能不够快，允许双次提交。

**修复**:

```typescript
const submittingRef = useRef(false)
const handleCheckout = async () => {
  if (submittingRef.current) return
  submittingRef.current = true
  setIsSubmitting(true)
  try {
    /* ... */
  } finally {
    submittingRef.current = false
    setIsSubmitting(false)
  }
}
```

---

### P2-6. "修改信息并重试" — cancel 静默失败可能导致重复支付

- **状态**: :white_check_mark: 已完成（2026-03-30）
- **分类**: UX / 数据一致性
- **文件**: `components/market/MarketPaymentWidget.tsx:339-365`

**问题**: 如果 Webhook 已将订单改为 `paid`，`cancelMarketOrder` 因 `.eq('status', 'pending')` 不匹配而静默返回 `success: true`，用户被导回 checkout 可能创建新订单重复支付。

**修复**: `cancelMarketOrder` 应返回实际影响行数或取消是否成功；前端收到"取消失败"时应提示用户刷新页面查看订单状态，而非回到 checkout。

---

### P2-7. 支付成功页无法区分 session 过期和订单处理中

- **状态**: :white_check_mark: 已完成（2026-03-30）
- **分类**: UX
- **文件**: `app/[locale]/market/success/page.tsx:33-46`

**问题**: session 过期时 `order` 为 null，页面显示 "订单已提交正在处理" 的误导消息。

**修复**: 区分三种状态 — (1) 已认证但订单不存在、(2) 未认证/session 过期、(3) 订单确实在处理中。对第 2 种情况显示重新登录提示。

---

### P2-8. Webhook 未验证 `merchantAccount` 和 `currency`

- **状态**: :white_check_mark: 已完成（随 P0-1 一并修复）
- **分类**: 安全加固
- **文件**: `app/api/webhooks/wayforpay-market/route.ts`

**问题**: 未检查回调中的 `merchantAccount` 是否为自己的商户号；未校验 `currency` 是否与订单一致。

**修复**: 添加两项校验：

```typescript
if (body.merchantAccount !== process.env.WAYFORPAY_MERCHANT_ACCOUNT) {
  return NextResponse.json({ error: 'Invalid merchant' }, { status: 400 })
}
if (body.currency && body.currency !== order.currency) {
  logger.error('Currency mismatch', { expected: order.currency, got: body.currency })
}
```

---

### P2-9. 两个 Webhook 端点未隔离 `orderReference` 命名空间

- **状态**: :white_check_mark: 已完成（随 P0-1 一并修复，添加 MKT- 前缀验证）
- **分类**: 安全加固
- **文件**: 捐赠 Webhook + 义卖 Webhook

**问题**: 共享同一签名密钥，义卖 Webhook 未验证 `orderReference` 以 `MKT-` 开头，配置错误时可能发生交叉回调。

**修复**:

- 义卖 Webhook 入口检查 `if (!orderReference?.startsWith('MKT-'))`
- 捐赠 Webhook 入口检查 `if (orderReference?.startsWith('MKT-'))`

---

### P2-10. `total_amount` 无数据库级一致性约束

- **状态**: :white_check_mark: 已完成（2026-03-30）
- **分类**: 数据完整性
- **文件**: `market_orders` 表定义

**修复**: 添加 CHECK 约束 `CHECK (total_amount = unit_price * quantity)`

---

### P2-11. `market_order_status_history` 缺少索引

- **状态**: :white_check_mark: 已完成（随 P1-2 迁移一并添加）
- **分类**: 性能
- **文件**: 迁移文件

**修复**: `CREATE INDEX idx_market_order_history_order ON market_order_status_history(order_id);`

---

### P2-12. `restore_stock` 返回 VOID，失败不可感知

- **状态**: :white_check_mark: 已完成（2026-03-30）
- **分类**: 可靠性
- **文件**: 函数定义

**修复**: 改为返回 `BOOLEAN`，参考 `decrement_stock` 的模式。调用方检查返回值。

---

### P2-13. `buyer_id` 外键缺少 `ON DELETE` 行为

- **状态**: :white_check_mark: 已完成（2026-03-30）
- **分类**: 运维
- **文件**: `market_orders` 表定义

**修复**: 根据业务需求选择 `ON DELETE RESTRICT`（禁止删除有订单的用户）或 `ON DELETE SET NULL`。

---

## P3 - 酌情处理

### P3-1. MIME 类型验证基于客户端声明而非 magic bytes

- **状态**: :white_check_mark: 已完成（2026-03-30）
- **文件**: `app/actions/market-order-files.ts:67-68`
- **建议**: 读取文件前几个字节校验 magic bytes

### P3-2. `locale` 参数未在应用层验证

- **状态**: :white_check_mark: 已完成（2026-03-30）
- **文件**: `app/actions/market-sale.ts:23`
- **建议**: 添加 `z.enum(['en', 'zh', 'ua'])` 验证

### P3-3. 每个 MarketItemCard 独立渲染 GlobalLoadingSpinner

- **状态**: :white_check_mark: 已完成（2026-03-30）
- **文件**: `components/market/MarketItemCard.tsx:40`
- **建议**: 提升到 MarketItemGrid 层级

### P3-4. BottomSheet 关闭后移动端无法重新打开

- **状态**: :white_check_mark: 已完成（2026-03-30）
- **文件**: `components/market/MarketItemDetail.tsx:40`
- **建议**: 添加浮动按钮重新打开

### P3-5. 数量选择器按钮缺少 disabled 视觉反馈

- **状态**: :white_check_mark: 已完成（2026-03-30）
- **文件**: `components/market/SaleCheckoutPanel.tsx:293-300`
- **建议**: 添加 `disabled:opacity-50 disabled:cursor-not-allowed`

### P3-6. `address_line2` 的 undefined vs '' 不一致

- **状态**: :white_check_mark: 已完成（2026-03-30）
- **文件**: `components/market/ShippingAddressForm.tsx:113`
- **建议**: 统一为空字符串而非 undefined

### P3-7. 触发器函数 search_path 不一致

- **状态**: :white_check_mark: 已完成（2026-03-30）
- **文件**: 多个迁移文件中的触发器函数
- **建议**: 统一添加 `SET search_path = public`

### P3-8. 凭证照片可能含收件人 PII（公开视图 + public bucket）

- **状态**: :white_check_mark: 已完成（2026-03-31，CLAUDE.md 补充管理员操作规范）
- **文件**: 存储桶策略 + `market_orders_public` 视图
- **建议**: 管理员上传前需模糊处理快递单上的收件人信息

### P3-9. a11y 缺失：数量按钮无 aria-label、div 模拟链接

- **状态**: :white_check_mark: 已完成（2026-03-30）
- **文件**: `SaleCheckoutPanel.tsx` / `MarketItemCard.tsx`
- **建议**: 添加 `aria-label`，改用 `<Link>` 替代 `div[role="link"]`

### P3-10. Webhook 处理失败返回 500 可能导致无限重试

- **状态**: :white_check_mark: 已完成（随 P0-1 一并修复，改为 respondWithAccept）
- **文件**: `app/api/webhooks/wayforpay-market/route.ts:123,160`
- **建议**: 对永久性错误返回 `respondWithAccept` 防止重试风暴

---

## 附录：已确认为安全的设计

以下方面经审查确认设计良好，无需修改：

1. **RLS 策略分层** — `market_items`、`market_orders` 的 RLS 策略完整，anon/authenticated/admin 权限划分正确
2. **不可变字段保护** — `prevent_market_order_immutable_fields` 触发器覆盖了所有关键字段
3. **SECURITY DEFINER 权限** — `decrement_stock` / `restore_stock` 仅 `service_role` 可调用
4. **乐观锁** — 所有状态更新使用 `.eq('status', currentStatus)` 防止并发冲突
5. **HMAC 时间安全比较** — Webhook 签名使用 `timingSafeEqual` 防止时序攻击
6. **邮箱脱敏** — `market_orders_public` 视图在 SQL 层混淆邮箱
7. **国际化覆盖** — 三种语言的 market 命名空间翻译键完全对齐，无硬编码文案
8. **SQL 注入防护** — 所有查询通过 Supabase 客户端参数化处理
9. **IDOR 防护** — 买家操作通过 RLS `buyer_id = auth.uid()` 隔离

---

## 使用说明

### 如何使用此文档

1. **按优先级分批修复**: P0 → P1 → P2 → P3
2. **每个条目独立执行**: 每个修复项包含完整的问题描述、修复方案和验证方式
3. **更新进度**: 完成后将对应条目的状态改为 :white_check_mark: 已完成
4. **提交粒度**: 每个 P0/P1 建议单独一个 commit；P2/P3 可合并相关项

### 修复命令参考

```bash
# 创建新的数据库迁移
touch supabase/migrations/$(date +%Y%m%d%H%M%S)_fix_description.sql

# 推送迁移到远程
supabase db push

# 重新生成类型
supabase gen types typescript --linked > types/database.ts
```
