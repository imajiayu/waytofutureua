-- 允许认证用户创建自己的 pending 订单
-- 配合 createSaleOrder 从 service_role 迁移到 authenticated 客户端
CREATE POLICY "Buyers can insert own pending orders"
  ON market_orders FOR INSERT TO authenticated
  WITH CHECK (buyer_id = auth.uid() AND status = 'pending');

-- 允许认证用户调用 decrement_stock（购买操作）
-- restore_stock 保持 service_role only（仅 Webhook/错误恢复路径使用）
GRANT EXECUTE ON FUNCTION decrement_stock TO authenticated;
