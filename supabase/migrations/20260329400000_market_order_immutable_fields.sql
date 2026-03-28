-- 防止 market_orders 财务关键字段被篡改
-- 对齐捐赠系统 prevent_donation_immutable_fields 触发器模式
-- 背景：widget_load_failed UPDATE RLS 策略的 WITH CHECK 仅校验 status 值，
-- 不限制其他列的修改。此触发器在数据库层锁定关键字段。

CREATE OR REPLACE FUNCTION prevent_market_order_immutable_fields()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
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

  RETURN NEW;
END;
$$;

CREATE TRIGGER prevent_market_order_immutable_fields_trigger
  BEFORE UPDATE ON market_orders
  FOR EACH ROW
  EXECUTE FUNCTION prevent_market_order_immutable_fields();

COMMENT ON FUNCTION prevent_market_order_immutable_fields() IS
  'Prevents modification of immutable market order fields (id, order_reference, buyer_id, buyer_email, item_id, quantity, unit_price, total_amount, created_at). Aligned with prevent_donation_immutable_fields pattern.';
