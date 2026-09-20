# EPay 易支付（微信/支付宝）集成文档

> 在 WayForPay（法币银行卡）和 NOWPayments（加密货币）之外，为中国大陆及海外华人捐赠者提供人民币（CNY）通道。

**文档版本**: 2.0
**最后更新**: 2026-09-20
**当前服务商**: Ezfp（`https://ezfp.cn`）

---

## 为什么叫 EPay 而不是服务商名

「易支付」是一套被多家服务商各自部署的免签约支付协议。各家实例的 **API 路径、参数名、签名算法完全一致**，区别只有域名和商户密钥。

代码因此按协议（`EPay`）组织而非按服务商组织：`lib/payment/epay/`。换服务商是改配置，不是改代码。

这不是提前抽象，是被现实推着做的 —— 见下方变更历史。

### 服务商变更历史

| 时间 | 事件 |
|---|---|
| 2026-06-03 | 接入 QmmPay（`yzf.qmmpay.com`），首个易支付实例 |
| 2026-09-20 | **QmmPay 整站停运**，切换至 Ezfp（`ezfp.cn`） |

QmmPay 停运的现场特征（供日后识别同类故障）：

- 站点返回静态页 `抱歉！该站点已经被管理员停止运行`（`Last-Modified: 2018-01-27`，虚拟主机面板默认停用模板）
- nginx 层拒绝所有 POST → `405 Method Not Allowed`，**包括不存在的路径**；GET 任意路径均 200
- 请求未到达应用层，返回的是 nginx HTML 而非业务 JSON，故与签名、参数、密钥均无关
- 用户侧表现：捐赠表单报 `EPay HTTP error: 405 Method Not Allowed`

**判断要点**：业务错误会返回 `{"code":-N,"msg":"..."}`；拿到 HTML 或 4xx/5xx 说明是平台或网络层问题，不要往签名方向排查。

---

## 架构与数据流

```
用户点击提交
  → DonationFormCard.handleSubmit()
  → PaymentMethodSelector（三选一）→ 'wechatAlipay'
  → WechatAlipaySelector（选微信 / 支付宝）
  → createEPayDonation()                    app/actions/donation.ts
      → prepareDonationContext()            复用
      → createEPayPayment()                 lib/payment/epay/server.ts
      → insertPendingDonations(ctx, ACTIVE_EPAY_PROVIDER)
  → window.location.href = payInfo（跳转平台收银台）
  → 用户完成支付
  → 平台 GET 回调 notify_url
  → /api/webhooks/epay/route.ts
      → verifyEPaySignature()（RSA SHA256）
      → 更新 donation 状态为 paid
      → after() 非阻塞发送成功邮件
      → 返回纯文本 "success"
  → 平台跳转 return_url → /{locale}/donate/success
```

### 与另外两家支付的协议差异

| 维度 | WayForPay | NOWPayments | **EPay** |
|---|---|---|---|
| 签名算法 | HMAC-MD5 | HMAC-SHA512 | **RSA SHA256WithRSA** |
| Webhook 方式 | POST JSON | POST JSON | **GET Query String** |
| Webhook 响应 | 签名 JSON | `{status:'ok'}` | **纯文本 `success`** |
| 退款 | 异步回调 | 无（手动） | **同步返回结果，无 webhook** |
| 支付 UI | JS Widget 嵌入 | 显示地址+二维码 | **页面跳转（jump）** |
| 货币 | UAH/USD | 多币种 | **CNY（人民币）** |

---

## 协议细节

### API 端点

路径对所有易支付实例一致，根地址由 `lib/payment/epay/providers.ts` 的 `EPAY_API_BASE` 决定：

| 功能 | 路径 | 方式 |
|---|---|---|
| 创建订单 | `{base}/create` | POST |
| 页面跳转支付 | `{base}/submit` | POST/GET |
| 订单查询 | `{base}/query` | POST |
| 退款 | `{base}/refund` | POST |
| 退款查询 | `{base}/refundquery` | POST |
| 支付结果通知 | 由请求中的 `notify_url` 指定 | GET（平台发过来） |

请求格式 `application/x-www-form-urlencoded`，响应 JSON，编码 UTF-8。`code === 0` 为成功。

### 签名规则（`lib/payment/epay/crypto.ts`）

1. 过滤掉空值字段，以及 `sign`、`sign_type` 本身
2. 键按 ASCII 升序排序
3. 拼成 `key=value&key=value`
4. 商户私钥 `SHA256WithRSA` 签名，Base64 编码
5. 附加 `sign` 与 `sign_type: 'RSA'`

回调验签同理，用平台公钥 `createVerify('SHA256')`。

密钥支持**裸 Base64**（服务商后台直接给的格式）和**完整 PEM** 两种写法，`getPem()` 会自动补 PEM 头并按 64 字符折行。私钥按 PKCS#8（`PRIVATE KEY`），公钥按 SPKI（`PUBLIC KEY`）。

### 创建订单关键参数

| 参数 | 说明 |
|---|---|
| `pid` | 商户 ID（整数） |
| `method` | 固定 `jump` —— 平台收银台自适应微信内置浏览器 / 手机 H5 / PC 扫码，无需自己判断环境。用 `web` 会默认 PC 二维码，手机和微信内用户扫不了 |
| `type` | `alipay` / `wxpay` |
| `out_trade_no` | 商户订单号 = `order_reference` |
| `money` | CNY 金额字符串，两位小数，由 `usdToCny()` 按 `NEXT_PUBLIC_EPAY_USD_CNY_RATE` 换算 |
| `name` | 商品名，API 在 127 字符处截断 |
| `notify_url` | `{APP_URL}/api/webhooks/epay` |
| `return_url` | `{APP_URL}/{locale}/donate/success?order={ref}` |
| `clientip` | 付款人 IP |
| `timestamp` | 秒级时间戳（v2 新增校验） |

### Webhook（`app/api/webhooks/epay/route.ts`）

- **GET** 请求，参数在 query string
- 必须返回**纯文本** `success`（非 JSON），否则平台会重试
- 只有 `trade_status === 'TRADE_SUCCESS'` 触发状态更新；平台不发失败/超时通知
- **所有分支都返回 `success`**（包括验签失败），避免无限重试；数据库仅在验签通过且状态为成功时才更新
- 邮件发送走 `after()` 非阻塞，避免网关等待超时重试（见 commit 848a5e3）

### 退款

同步 API，**没有退款 webhook**。流程见 `processEPayRefund()`：

1. 先 `queryEPayOrder()` 拿平台侧权威的 CNY 金额（`money`）与已退金额（`refundmoney`）
2. 按 `refundRatio`（本次可退部分占全单的比例）计算退款额，上限为平台剩余可退金额
3. **CNY 金额取自订单查询而非用 USD 重算** —— 汇率可能已漂移，重算会对不上，且逐行 USD 求和有舍入误差
4. `code === 0` 直接写 `refunded`；API 拒绝或网络失败写 `refunding` 作为人工介入标记

---

## 环境变量

```bash
EPAY_PROVIDER=Ezfp           # 当前启用实例，可选值见 providers.ts 的 EPAY_PROVIDERS
EPAY_PID=                    # 商户 ID（整数）
EPAY_MERCHANT_PRIVATE_KEY=   # 商户私钥（裸 Base64 或 PEM），用于签名请求
EPAY_PLATFORM_PUBLIC_KEY=    # 平台公钥（裸 Base64 或 PEM），用于验证回调签名
NEXT_PUBLIC_EPAY_USD_CNY_RATE=  # USD → CNY 换算汇率
```

密钥在服务商后台「个人信息 → API 设置」自助生成：商户私钥自己留存，平台公钥从后台抄。

---

## 换服务商操作指南

当前服务商停运或需要更换时，按以下步骤操作。**正常情况下不需要改动业务代码。**

### 1. 确认是平台问题而非自身问题

```bash
curl -s -X POST -H 'Content-Type: application/x-www-form-urlencoded' \
  -d '' https://<服务商域名>/api/pay/create
```

- 返回 `{"code":-4,"msg":"未传入任何参数"}` → 平台正常，问题在别处
- 返回 HTML 或 405 → 平台已停运或封禁

### 2. 注册新服务商并取得凭证

拿到 `pid`、商户私钥、平台公钥。

### 3. 在 registry 注册新实例

`lib/payment/epay/providers.ts`：

```ts
export const EPAY_PROVIDERS = ['Ezfp', 'QmmPay', '新实例名'] as const

const PROVIDER_API_BASE: Record<EPayProvider, string> = {
  // …
  新实例名: 'https://新域名/api/pay',
}
```

若旧实例是**停运**（而非主动更换），把它加进 `DISCONTINUED_EPAY_PROVIDERS`，这样历史订单在追踪页会隐藏退款按钮并提示联系客服，而不是让捐赠人点下一个必然失败的请求。

### 4. 更新环境变量

`EPAY_PROVIDER` 指向新实例，替换三项凭证。生产在 Vercel 改，会触发 redeploy。

### 5. 验证

用真实密钥查一个不存在的订单号 —— 无副作用、不涉及金钱，但能一次性验证私钥格式、签名算法、pid 是否都被平台接受：

```bash
npm run test:epay
```

期望输出 `{"code":-1,"msg":"订单号不存在"}`。若返回签名相关错误，说明密钥或签名有问题；若返回 HTML，说明域名配错了。

### 6. 端到端跑一笔小额真实捐赠

确认收银台能打开、支付后 webhook 回调把状态推到 `paid`、邮件送达。

---

## payment_method 取值与退款路由

`donations.payment_method` 记的是**具体服务商实例名**（`Ezfp`、`QmmPay`），不是笼统的 `EPay`。

理由：退款要靠这个值判断钱在哪家平台、该用哪套密钥。若历史记录都写 `EPay`，将来换了服务商就再也分不清了。

| 取值 | 含义 |
|---|---|
| `WayForPay` | 银行卡 |
| `NOWPayments` | 加密货币 |
| `Ezfp` | 易支付实例，当前启用 |
| `QmmPay` | 易支付实例，已停运（历史 5 条） |
| `Offline` | admin 线下录入 |

数据库侧 `payment_method` 是无 CHECK 约束的 `varchar(50)`，新增取值不需要迁移。

### 退款可达性

`isRefundableByEPay()` 两道判断：已停运的实例出局；非当前实例也一律不可退（商户密钥只有当前这一套）。

不可退的记录在 `requestRefund()` 中**提前返回** `providerDiscontinued`，与线下捐赠的 `offlineNotRefundable` 同一位置、同一理由：若放任它落到下面的 EPay 分支，会拿当前密钥去退一个别家平台的订单号，必然失败并把整单翻成 `refunding` —— 那会让订单掉出 `SUCCESS_STATUSES` 并回滚 `total_raised` / `current_units`。

客户端组件（`OrderGroupCard`）用的是 `isDiscontinuedEPayProvider()` 这个**静态判断**，不是 `ACTIVE_EPAY_PROVIDER` —— 后者读的是非 `NEXT_PUBLIC_` 环境变量，在浏览器里只会拿到兜底值。

---

## 测试清单

### 功能

- [ ] 微信支付跳转收银台 → 支付 → 状态变 `paid` → 收到邮件
- [ ] 支付宝同上
- [ ] 微信内置浏览器打开（`method='jump'` 的主要适配场景）
- [ ] 金额换算正确（USD → CNY 两位小数）
- [ ] 全额退款 → 状态变 `refunded` → 收到退款邮件
- [ ] 部分退款（多行订单退其中一笔）→ 按比例退 CNY
- [ ] 历史 `QmmPay` 订单在追踪页看不到退款按钮

### 安全

- [ ] 伪造签名的回调 → 不更新数据库，仍返回 `success`
- [ ] 篡改金额的回调 → 验签失败
- [ ] 重复回调 → 幂等，不重复发邮件（靠 `PAYMENT_WEBHOOK_SOURCE_STATUSES` 过滤）

### 边界

- [ ] 平台返回 `code !== 0` → 前端显示错误信息而非白屏
- [ ] 平台域名不可达 → 报错可读，不写脏数据

---

## 文件清单

```
lib/payment/epay/
├── providers.ts   # 实例注册表：有哪些实例、当前用哪个、哪些已停运
├── crypto.ts      # RSA 签名 / 验签（协议通用，换服务商不动）
├── types.ts       # API 类型定义
└── server.ts      # create / query / refund 客户端

app/api/webhooks/epay/route.ts     # GET 回调处理
app/actions/donation.ts            # createEPayDonation()
app/actions/track-donation.ts      # 退款路由 + 停运实例拦截
lib/payment-method.ts              # payment_method 取值单一数据源
components/donate-form/
├── DonationFormCard.tsx           # handleWalletSelect()
└── WechatAlipaySelector.tsx       # 微信/支付宝二选一 + 汇率展示
scripts/test-epay.ts               # 凭证与签名连通性验证
```

---

## 相关文档

- [捐赠状态系统](DONATION_STATUS.md)
- [捐赠模块数据库架构](DONATION_DATABASE_SCHEMA.md)
