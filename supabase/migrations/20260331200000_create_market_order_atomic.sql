-- ============================================
-- 原子化义卖订单创建函数
--
-- 问题：之前 decrement_stock + INSERT market_orders 是两个独立操作，
-- 进程崩溃时可能导致库存被扣但订单未创建（幽灵库存丢失）。
--
-- 修复：封装为单个 PL/pgSQL 函数，利用 PostgreSQL 事务保证原子性。
-- 失败时自动回滚（库存不变、订单不创建）。
-- ============================================

CREATE OR REPLACE FUNCTION create_market_order_atomic(
  p_order_reference TEXT,
  p_buyer_id UUID,
  p_buyer_email TEXT,
  p_item_id BIGINT,
  p_quantity INT,
  p_unit_price NUMERIC,
  p_total_amount NUMERIC,
  p_currency TEXT,
  p_payment_method TEXT,
  p_shipping_name TEXT,
  p_shipping_phone TEXT,
  p_shipping_address_line1 TEXT,
  p_shipping_address_line2 TEXT,
  p_shipping_city TEXT,
  p_shipping_state TEXT,
  p_shipping_postal_code TEXT,
  p_shipping_country TEXT,
  p_locale TEXT
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order_id UUID;
  v_rows INT;
BEGIN
  -- 1. 原子扣减库存（与 decrement_stock 逻辑一致）
  IF p_quantity <= 0 THEN
    RAISE EXCEPTION 'quantity must be positive, got %', p_quantity;
  END IF;

  UPDATE market_items
  SET stock_quantity = stock_quantity - p_quantity
  WHERE id = p_item_id
    AND stock_quantity >= p_quantity
    AND status = 'on_sale';

  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows = 0 THEN
    RAISE EXCEPTION 'INSUFFICIENT_STOCK';
  END IF;

  -- 2. 创建订单（同一事务，失败会自动回滚步骤 1）
  INSERT INTO market_orders (
    order_reference, buyer_id, buyer_email,
    item_id, quantity, unit_price, total_amount,
    currency, payment_method, status,
    shipping_name, shipping_phone,
    shipping_address_line1, shipping_address_line2,
    shipping_city, shipping_state,
    shipping_postal_code, shipping_country,
    locale
  ) VALUES (
    p_order_reference, p_buyer_id, p_buyer_email,
    p_item_id, p_quantity, p_unit_price, p_total_amount,
    p_currency, p_payment_method, 'pending',
    p_shipping_name, p_shipping_phone,
    p_shipping_address_line1, p_shipping_address_line2,
    p_shipping_city, p_shipping_state,
    p_shipping_postal_code, p_shipping_country,
    p_locale
  ) RETURNING id INTO v_order_id;

  RETURN v_order_id;
END;
$$;

