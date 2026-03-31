-- ============================================
-- 义卖市场审计修复 (P2-10, P2-12, P2-13, P3-8)
-- ============================================

-- ──────────────────────────────────────────
-- P2-10: total_amount 数据库级一致性约束
-- 确保 total_amount = unit_price * quantity
-- ──────────────────────────────────────────
ALTER TABLE market_orders
  ADD CONSTRAINT market_orders_total_amount_check
  CHECK (total_amount = unit_price * quantity);

-- ──────────────────────────────────────────
-- P2-12: restore_stock 改为返回 BOOLEAN
-- 与 decrement_stock 保持一致，调用方可感知失败
-- ──────────────────────────────────────────
CREATE OR REPLACE FUNCTION restore_stock(
  p_item_id BIGINT,
  p_quantity INT
) RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_rows INT;
BEGIN
  IF p_quantity <= 0 THEN
    RAISE EXCEPTION 'restore_stock: quantity must be positive, got %', p_quantity;
  END IF;

  UPDATE market_items
  SET stock_quantity = stock_quantity + p_quantity
  WHERE id = p_item_id;

  GET DIAGNOSTICS v_rows = ROW_COUNT;
  RETURN v_rows > 0;
END;
$$;

-- 权限保持不变（仅 service_role）
REVOKE EXECUTE ON FUNCTION restore_stock FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION restore_stock TO service_role;

-- ──────────────────────────────────────────
-- P2-13: buyer_id 外键添加 ON DELETE RESTRICT
-- 禁止删除有订单的用户（保护订单数据完整性）
-- 需要先删除旧约束再添加新约束
-- ──────────────────────────────────────────
DO $$
DECLARE
  v_constraint_name TEXT;
BEGIN
  -- 查找 buyer_id 的外键约束名
  SELECT tc.constraint_name INTO v_constraint_name
  FROM information_schema.table_constraints tc
  JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
  WHERE tc.table_name = 'market_orders'
    AND tc.constraint_type = 'FOREIGN KEY'
    AND kcu.column_name = 'buyer_id';

  IF v_constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE market_orders DROP CONSTRAINT %I', v_constraint_name);
  END IF;
END;
$$;

ALTER TABLE market_orders
  ADD CONSTRAINT market_orders_buyer_id_fkey
  FOREIGN KEY (buyer_id) REFERENCES auth.users(id) ON DELETE RESTRICT;

-- ──────────────────────────────────────────
-- P3-8: 触发器函数统一添加 SET search_path
-- 修复 log_market_order_status_change 和
-- prevent_market_order_immutable_fields
-- （后者已在 20260331300000 中设置，此处仅修复前者）
-- ──────────────────────────────────────────

CREATE OR REPLACE FUNCTION log_market_order_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- INSERT: record initial status (from_status = NULL)
  IF TG_OP = 'INSERT' THEN
    INSERT INTO market_order_status_history (order_id, from_status, to_status)
    VALUES (NEW.id, NULL, NEW.status);
    RETURN NEW;
  END IF;

  -- UPDATE: record status transition
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO market_order_status_history (order_id, from_status, to_status)
    VALUES (NEW.id, OLD.status, NEW.status);
  END IF;
  RETURN NEW;
END;
$$;
