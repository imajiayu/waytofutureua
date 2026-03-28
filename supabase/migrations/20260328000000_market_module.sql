-- ============================================
-- Market Module — 义卖市场
-- ⚠️ 仅编写，不执行。待 PR 审核通过后手动执行。
-- ============================================

-- ============================================
-- 1. 表
-- ============================================

-- 1.1 market_items — 商品主表
-- 商品内容（描述、图片、资金用途）走 JSON + 静态文件，与 projects 模式一致
-- 数据库只存元数据（标题、价格、库存、状态）
CREATE TABLE market_items (
  id BIGSERIAL PRIMARY KEY,
  title_i18n JSONB NOT NULL,
  fixed_price NUMERIC NOT NULL CHECK (fixed_price > 0),
  currency TEXT NOT NULL DEFAULT 'USD',
  stock_quantity INT NOT NULL CHECK (stock_quantity >= 0),
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'on_sale', 'off_shelf')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 1.2 market_orders — 订单表
-- INSERT 仅通过 service_role 执行（createSaleOrder Server Action），无匿名 INSERT 策略
CREATE TABLE market_orders (
  id BIGSERIAL PRIMARY KEY,
  order_reference TEXT UNIQUE NOT NULL,

  buyer_id UUID NOT NULL REFERENCES auth.users(id),
  buyer_email TEXT NOT NULL,

  item_id BIGINT NOT NULL REFERENCES market_items(id) ON DELETE RESTRICT,
  quantity INT NOT NULL DEFAULT 1 CHECK (quantity >= 1),
  unit_price NUMERIC NOT NULL CHECK (unit_price > 0),
  total_amount NUMERIC NOT NULL CHECK (total_amount > 0),

  payment_method TEXT NOT NULL DEFAULT 'wayforpay',

  shipping_name TEXT NOT NULL,
  shipping_address_line1 TEXT NOT NULL,
  shipping_address_line2 TEXT,
  shipping_city TEXT NOT NULL,
  shipping_state TEXT,
  shipping_postal_code TEXT NOT NULL,
  shipping_country TEXT NOT NULL,

  tracking_number TEXT,
  tracking_carrier TEXT,

  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN (
      'pending', 'widget_load_failed', 'paid', 'shipped', 'completed',
      'expired', 'declined'
    )),

  locale TEXT NOT NULL DEFAULT 'en' CHECK (locale IN ('en', 'zh', 'ua')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 1.3 market_order_status_history — 订单状态历史
CREATE TABLE market_order_status_history (
  id BIGSERIAL PRIMARY KEY,
  order_id BIGINT NOT NULL REFERENCES market_orders(id) ON DELETE CASCADE,
  from_status TEXT,
  to_status TEXT NOT NULL,
  changed_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 2. 索引
-- ============================================

CREATE INDEX idx_market_items_status ON market_items(status);
CREATE INDEX idx_market_items_created_at ON market_items(created_at DESC);
CREATE INDEX idx_market_orders_buyer ON market_orders(buyer_id);
CREATE INDEX idx_market_orders_item ON market_orders(item_id);
CREATE INDEX idx_market_orders_reference ON market_orders(order_reference);
CREATE INDEX idx_market_orders_status ON market_orders(status);
CREATE INDEX idx_market_orders_buyer_status ON market_orders(buyer_id, status);

-- ============================================
-- 3. 函数
-- ============================================

-- decrement_stock — 原子扣减库存（防止 TOCTOU 竞态）
CREATE OR REPLACE FUNCTION decrement_stock(
  p_item_id BIGINT,
  p_quantity INT
) RETURNS BOOLEAN AS $$
DECLARE
  rows_affected INT;
BEGIN
  IF p_quantity <= 0 THEN
    RAISE EXCEPTION 'decrement_stock: quantity must be positive, got %', p_quantity;
  END IF;

  UPDATE market_items
  SET stock_quantity = stock_quantity - p_quantity
  WHERE id = p_item_id
    AND stock_quantity >= p_quantity
    AND status = 'on_sale';

  GET DIAGNOSTICS rows_affected = ROW_COUNT;
  RETURN rows_affected > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

REVOKE EXECUTE ON FUNCTION decrement_stock FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION decrement_stock TO service_role;

-- restore_stock — 原子恢复库存
CREATE OR REPLACE FUNCTION restore_stock(
  p_item_id BIGINT,
  p_quantity INT
) RETURNS VOID AS $$
BEGIN
  IF p_quantity <= 0 THEN
    RAISE EXCEPTION 'restore_stock: quantity must be positive, got %', p_quantity;
  END IF;

  UPDATE market_items
  SET stock_quantity = stock_quantity + p_quantity
  WHERE id = p_item_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

REVOKE EXECUTE ON FUNCTION restore_stock FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION restore_stock TO service_role;

-- ============================================
-- 4. 触发器
-- ============================================

-- updated_at 自动更新（复用现有函数）
CREATE TRIGGER update_market_items_updated_at
  BEFORE UPDATE ON market_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_market_orders_updated_at
  BEFORE UPDATE ON market_orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 订单状态变更历史
CREATE OR REPLACE FUNCTION log_market_order_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO market_order_status_history (order_id, from_status, to_status)
    VALUES (NEW.id, OLD.status, NEW.status);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER market_order_status_change_trigger
  AFTER UPDATE ON market_orders
  FOR EACH ROW
  EXECUTE FUNCTION log_market_order_status_change();

-- ============================================
-- 5. RLS
-- ============================================

-- market_items: 公开可读非 draft
ALTER TABLE market_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can view non-draft items"
  ON market_items FOR SELECT
  USING (status != 'draft');
CREATE POLICY "Admin can manage items"
  ON market_items FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- market_orders: 仅本人或管理员
ALTER TABLE market_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Buyers can view own orders"
  ON market_orders FOR SELECT
  USING (buyer_id = auth.uid() OR is_admin());
CREATE POLICY "Admin can manage orders"
  ON market_orders FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- market_order_status_history: 关联订单本人或管理员
ALTER TABLE market_order_status_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Order owners can view history"
  ON market_order_status_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM market_orders
      WHERE market_orders.id = market_order_status_history.order_id
        AND (market_orders.buyer_id = auth.uid() OR is_admin())
    )
  );
CREATE POLICY "Admin can manage history"
  ON market_order_status_history FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());
