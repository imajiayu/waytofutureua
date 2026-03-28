-- 允许买家将自己的 pending 订单更新为 widget_load_failed
-- 与捐赠模块的 "Allow anonymous update pending to widget_load_failed" 策略对齐
-- 区别：义卖订单需要认证用户，且限定 buyer_id = auth.uid()
CREATE POLICY "Buyers can update own pending to widget_load_failed"
  ON market_orders FOR UPDATE TO authenticated
  USING (buyer_id = auth.uid() AND status = 'pending')
  WITH CHECK (status = 'widget_load_failed');
