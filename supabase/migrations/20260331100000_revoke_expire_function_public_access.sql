-- ============================================
-- 收紧 expire_stale_market_orders 执行权限
--
-- 问题：该 SECURITY DEFINER 函数未限制执行权限，
-- 任何匿名用户可通过 PostgREST 直接调用，
-- 强制过期所有超过 10 分钟的 pending 订单（DoS 攻击）。
--
-- 修复：仅允许 service_role 调用（pg_cron 使用 service_role 执行）。
-- ============================================

REVOKE EXECUTE ON FUNCTION expire_stale_market_orders() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION expire_stale_market_orders() FROM anon;
REVOKE EXECUTE ON FUNCTION expire_stale_market_orders() FROM authenticated;
GRANT EXECUTE ON FUNCTION expire_stale_market_orders() TO service_role;
