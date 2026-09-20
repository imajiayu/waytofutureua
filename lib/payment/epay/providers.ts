// ============================================
// 易支付（EPay）实例注册表
// ============================================
//
// 「易支付」是一套被多家服务商各自部署的免签约支付协议（微信/支付宝）。
// 各家实例的 API 路径、参数名、签名算法（SHA256WithRSA）完全一致，区别只有
// 域名和商户密钥——所以支付逻辑写成通用的，用这里的配置切换服务商。
//
// 这么做的直接原因：2026-09 QmmPay 整站停运（nginx 只回「该站点已经被管理员
// 停止运行」的静态页，POST 一律 405），线上微信/支付宝捐赠全部失败。把服务商
// 名字焊死在代码里意味着每次换家都要改一轮代码；焊在配置里则只需改环境变量。

/**
 * 所有用过的易支付实例。
 *
 * 停运的实例必须保留在这里：历史 `donations.payment_method` 里存着它们的名字，
 * 退款路由要靠这个列表识别「这笔是易支付系的，但不是当前这家」。
 */
export const EPAY_PROVIDERS = ['Ezfp', 'QmmPay'] as const

export type EPayProvider = (typeof EPAY_PROVIDERS)[number]

/**
 * 任意值是否为已注册的易支付实例名。
 *
 * 写成类型谓词，而不是让调用方各自 `.includes()`：`readonly string[]` 上的
 * `includes` 不做类型收窄，调用方只能补一个 `as EPayProvider` 断言。收敛到这里
 * 之后，判 env 配置值和判 `donations.payment_method` 的两个调用方都不必再断言。
 */
export function isKnownEPayProvider(value: unknown): value is EPayProvider {
  return typeof value === 'string' && (EPAY_PROVIDERS as readonly string[]).includes(value)
}

/**
 * 实例 → API 根地址。
 *
 * 域名是公开信息，硬编码在代码里而非环境变量，避免 `EPAY_PROVIDER` 与
 * `EPAY_API_BASE` 各配一处、互相对不上的配置漂移。换服务商时在这里加一行，
 * 再把 `EPAY_PROVIDER` 指过去即可。
 */
const PROVIDER_API_BASE: Record<EPayProvider, string> = {
  Ezfp: 'https://ezfp.cn/api/pay',
  QmmPay: 'https://yzf.qmmpay.com/api/pay', // 2026-09 整站停运，仅供历史记录溯源
}

function resolveActiveProvider(): EPayProvider {
  const configured = process.env.EPAY_PROVIDER
  if (isKnownEPayProvider(configured)) return configured
  return 'Ezfp'
}

/**
 * 当前启用的实例。
 *
 * 新捐赠的 `payment_method` 写这个值；也只有这家能在线退款——商户密钥
 * （`EPAY_MERCHANT_PRIVATE_KEY`）只有当前这一套，历史实例既没有密钥、
 * 站点往往也已经关停。
 */
export const ACTIVE_EPAY_PROVIDER: EPayProvider = resolveActiveProvider()

/** 当前启用实例的 API 根地址 */
export const EPAY_API_BASE: string = PROVIDER_API_BASE[ACTIVE_EPAY_PROVIDER]

/**
 * 已停止运营的实例：站点关停或商户终止，退款通道永久消失。
 *
 * 这是**客观事实而非配置**，所以是静态常量——客户端组件也能安全判断
 * （`ACTIVE_EPAY_PROVIDER` 读的是非 NEXT_PUBLIC_ 环境变量，在浏览器里
 * 只会拿到兜底值，不可用于 UI 判断）。
 */
export const DISCONTINUED_EPAY_PROVIDERS: readonly EPayProvider[] = ['QmmPay']

/** 该实例是否已停止运营（静态事实，客户端可用） */
export function isDiscontinuedEPayProvider(provider: EPayProvider): boolean {
  return DISCONTINUED_EPAY_PROVIDERS.includes(provider)
}

/**
 * 该笔捐赠能否走在线退款。**仅服务端可用**。
 *
 * 两道判断：已停运的实例直接出局；非当前实例也一律不可退——不是策略选择，
 * 而是客观事实：商户密钥只有当前这一套。调用方据此提前返回，避免让用户
 * 点下退款后空等一个必然失败的请求，也避免把记录污染成需要人工捞的
 * `refunding`（那会让订单掉出 SUCCESS_STATUSES 并回滚 total_raised）。
 */
export function isRefundableByEPay(provider: EPayProvider): boolean {
  return !isDiscontinuedEPayProvider(provider) && provider === ACTIVE_EPAY_PROVIDER
}
