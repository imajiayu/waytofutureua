/**
 * 验证 EPay（易支付）凭证与签名是否被平台接受
 * 运行: npm run test:epay
 *
 * 查一个必然不存在的订单号——无副作用、不涉及金钱，但足以一次性验证
 * 私钥格式、签名拼接规则、pid 是否都被当前服务商接受。
 *
 * 期望输出 `{"code":-1,"msg":"订单号不存在"}`：
 *   - 返回签名/验签相关错误 → 密钥配错，或服务商用的不是 v2 RSA
 *   - 返回 HTML 或 4xx/5xx  → 域名配错，或服务商站点已停运
 */

import { config } from 'dotenv'
config({ path: '.env.local' })

import { attachSignature } from '../lib/payment/epay/crypto'
import { ACTIVE_EPAY_PROVIDER, EPAY_API_BASE } from '../lib/payment/epay/providers'

async function testEPayCredentials() {
  console.log('🔑 Testing EPay credentials...\n')
  console.log(`  服务商:   ${ACTIVE_EPAY_PROVIDER}`)
  console.log(`  API base: ${EPAY_API_BASE}`)

  const pid = parseInt(process.env.EPAY_PID || '0', 10)
  if (!pid) {
    console.error('\n❌ EPAY_PID 未配置')
    process.exit(1)
  }
  console.log(`  pid:      ${pid}\n`)

  const params = {
    pid,
    out_trade_no: `VERIFY-NONEXISTENT-${Date.now()}`,
    timestamp: String(Math.floor(Date.now() / 1000)),
  }

  let signed: Record<string, string | number>
  try {
    signed = attachSignature(params)
    console.log('✅ 私钥加载 + 签名成功')
  } catch (error) {
    console.error('\n❌ 签名失败:', error instanceof Error ? error.message : String(error))
    console.error('   检查 EPAY_MERCHANT_PRIVATE_KEY 是否为有效的 PKCS#8 私钥')
    process.exit(1)
  }

  const body = new URLSearchParams(
    Object.entries(signed).map(([k, v]) => [k, String(v)])
  )

  const res = await fetch(`${EPAY_API_BASE}/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  })

  const text = await res.text()
  console.log(`\n平台响应 (HTTP ${res.status}): ${text}`)

  if (!res.ok || text.trimStart().startsWith('<')) {
    console.error('\n❌ 平台返回的不是业务 JSON——域名配错，或服务商站点已停运')
    process.exit(1)
  }

  const result = JSON.parse(text) as { code: number; msg?: string }

  if (result.code === -1) {
    console.log('\n✅ 通过：平台接受了我们的签名（订单不存在是预期结果）')
    return
  }

  if (/sign|签名/i.test(result.msg || '')) {
    console.error('\n❌ 签名被拒绝：检查 EPAY_MERCHANT_PRIVATE_KEY 与 EPAY_PID 是否匹配')
    process.exit(1)
  }

  console.warn(`\n⚠️  非预期响应 code=${result.code} msg=${result.msg}`)
}

testEPayCredentials().catch((error) => {
  console.error('\n❌ 请求失败:', error instanceof Error ? error.message : String(error))
  process.exit(1)
})
