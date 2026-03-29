-- Fix market order status history: record initial status on INSERT
-- Aligns with donation system's log_donation_status_change pattern
-- (AFTER INSERT OR UPDATE, with TG_OP branching)

CREATE OR REPLACE FUNCTION log_market_order_status_change()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger to fire on both INSERT and UPDATE
DROP TRIGGER IF EXISTS market_order_status_change_trigger ON market_orders;

CREATE TRIGGER market_order_status_change_trigger
  AFTER INSERT OR UPDATE ON market_orders
  FOR EACH ROW
  EXECUTE FUNCTION log_market_order_status_change();
