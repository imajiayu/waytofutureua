-- 允许买家将自己的 pending 订单标记为 expired（用户主动取消/重试场景）
-- 与 widget_load_failed 策略平行：buyer_id = auth.uid() + 仅限 pending → expired
CREATE POLICY "Buyers can cancel own pending order"
  ON market_orders FOR UPDATE TO authenticated
  USING (buyer_id = auth.uid() AND status = 'pending')
  WITH CHECK (status = 'expired');
