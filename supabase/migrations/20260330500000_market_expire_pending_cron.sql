-- ============================================
-- 义卖订单 pending 超时自动清理（pg_cron）
--
-- 目的：防止用户关闭支付窗口后库存长时间被占用
-- （WayForPay SDK 不提供关闭回调，前端无法检测）
--
-- 机制：每 5 分钟扫描超过 10 分钟仍为 pending 的义卖订单，
-- 将其标记为 expired 并恢复库存。
--
-- 安全：若 Webhook 延迟到达（用户实际已支付），Webhook 中
-- expired → paid 恢复路径会重新扣减库存。
-- ============================================

-- 1. 启用 pg_cron 扩展（幂等）
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 2. 创建清理函数
CREATE OR REPLACE FUNCTION expire_stale_market_orders()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order RECORD;
  v_expired_count INTEGER := 0;
BEGIN
  -- 查询超过 10 分钟仍为 pending 的义卖订单
  FOR v_order IN
    SELECT id, order_reference, item_id, quantity
    FROM market_orders
    WHERE status = 'pending'
      AND created_at < NOW() - INTERVAL '10 minutes'
    FOR UPDATE SKIP LOCKED  -- 跳过被其他事务锁定的行（防止和 Webhook 冲突）
  LOOP
    -- 更新状态为 expired
    UPDATE market_orders
    SET status = 'expired'
    WHERE id = v_order.id
      AND status = 'pending';  -- 二次确认，防止 TOCTOU

    IF FOUND THEN
      -- 恢复库存
      PERFORM restore_stock(v_order.item_id, v_order.quantity);
      v_expired_count := v_expired_count + 1;

      RAISE LOG '[MARKET:CRON] Expired stale order: %, restored % units for item %',
        v_order.order_reference, v_order.quantity, v_order.item_id;
    END IF;
  END LOOP;

  IF v_expired_count > 0 THEN
    RAISE LOG '[MARKET:CRON] Completed: expired % order(s)', v_expired_count;
  END IF;

  RETURN v_expired_count;
END;
$$;

-- 3. 注册 cron 调度（每 5 分钟）
SELECT cron.schedule(
  'expire-pending-market-orders',
  '*/5 * * * *',
  'SELECT expire_stale_market_orders()'
);
