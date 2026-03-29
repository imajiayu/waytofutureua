-- ============================================
-- 修复 market_order_status_history RLS 策略
-- 对齐 donation_status_history 模型：仅管理员可查看，任何人不可直接修改
-- 历史记录由触发器写入（绕过 RLS），无需 INSERT/UPDATE/DELETE 策略
-- ============================================

-- 删除现有策略
DROP POLICY IF EXISTS "Admin can manage history" ON market_order_status_history;
DROP POLICY IF EXISTS "Order owners can view history" ON market_order_status_history;

-- 新增：仅管理员可查看
CREATE POLICY "Admins can view all order status history"
  ON market_order_status_history FOR SELECT TO authenticated
  USING (is_admin());
