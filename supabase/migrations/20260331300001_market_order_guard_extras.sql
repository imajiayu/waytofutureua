-- prevent_market_order_immutable_fields 函数注释 + 状态历史索引
DO $$
BEGIN
  EXECUTE $stmt$COMMENT ON FUNCTION prevent_market_order_immutable_fields() IS
    'Prevents modification of immutable market order fields and enforces status transition rules.
- Admins can only: paid->shipped, shipped->completed
- Buyers can only: pending->widget_load_failed, pending->expired
- Service role (webhooks/cron) can perform any status transition'$stmt$;
  EXECUTE 'CREATE INDEX IF NOT EXISTS idx_market_order_history_order ON market_order_status_history(order_id)';
END;
$$;
