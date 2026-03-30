-- ============================================
-- 义卖订单数据库级状态转换验证
--
-- 对齐捐赠模块 prevent_donation_immutable_fields 中的
-- 状态转换白名单，为义卖订单增加纵深防御。
--
-- 规则：
-- - 管理员（auth.uid() IS NOT NULL）只能：
--     paid → shipped, shipped → completed
-- - Service role（auth.uid() IS NULL，即 Webhook/cron）：
--     允许所有状态转换（由应用层控制）
-- - 买家（通过 RLS 策略已限制只能 pending → widget_load_failed / expired）
--     触发器不额外拦截，RLS 已覆盖
--
-- 同时为 market_order_status_history 添加索引。
-- ============================================

CREATE OR REPLACE FUNCTION prevent_market_order_immutable_fields()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  -- ── 不可变字段保护 ──
  IF OLD.id != NEW.id THEN
    RAISE EXCEPTION 'Cannot modify market order id';
  END IF;

  IF OLD.order_reference != NEW.order_reference THEN
    RAISE EXCEPTION 'Cannot modify order_reference';
  END IF;

  IF OLD.buyer_id != NEW.buyer_id THEN
    RAISE EXCEPTION 'Cannot modify buyer_id';
  END IF;

  IF OLD.buyer_email != NEW.buyer_email THEN
    RAISE EXCEPTION 'Cannot modify buyer_email';
  END IF;

  IF OLD.item_id != NEW.item_id THEN
    RAISE EXCEPTION 'Cannot modify item_id';
  END IF;

  IF OLD.quantity != NEW.quantity THEN
    RAISE EXCEPTION 'Cannot modify quantity';
  END IF;

  IF OLD.unit_price != NEW.unit_price THEN
    RAISE EXCEPTION 'Cannot modify unit_price';
  END IF;

  IF OLD.total_amount != NEW.total_amount THEN
    RAISE EXCEPTION 'Cannot modify total_amount';
  END IF;

  IF OLD.created_at != NEW.created_at THEN
    RAISE EXCEPTION 'Cannot modify created_at';
  END IF;

  -- ── 状态转换白名单（仅 authenticated 角色，即管理员/买家） ──
  IF OLD.status IS DISTINCT FROM NEW.status AND auth.uid() IS NOT NULL THEN
    IF NOT (
      -- 管理员推进
      (OLD.status = 'paid' AND NEW.status = 'shipped') OR
      (OLD.status = 'shipped' AND NEW.status = 'completed') OR
      -- 买家操作（RLS 已限制 buyer_id = auth.uid()）
      (OLD.status = 'pending' AND NEW.status = 'widget_load_failed') OR
      (OLD.status = 'pending' AND NEW.status = 'expired')
    ) THEN
      RAISE EXCEPTION 'Invalid market order status transition: % -> %. Allowed: paid->shipped, shipped->completed (admin); pending->widget_load_failed, pending->expired (buyer).',
        OLD.status, NEW.status;
    END IF;
  END IF;
  -- Service role (auth.uid() IS NULL): Webhook/cron 允许任意转换

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION prevent_market_order_immutable_fields() IS
  'Prevents modification of immutable market order fields and enforces status transition rules.
- Admins can only: paid->shipped, shipped->completed
- Buyers can only: pending->widget_load_failed, pending->expired
- Service role (webhooks/cron) can perform any status transition';

-- ── P2-11: 为状态历史表添加索引 ──
CREATE INDEX IF NOT EXISTS idx_market_order_history_order
  ON market_order_status_history(order_id);
