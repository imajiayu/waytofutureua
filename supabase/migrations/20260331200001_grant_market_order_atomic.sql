-- 限制 create_market_order_atomic 仅 service_role 可调用
DO $$
BEGIN
  EXECUTE 'REVOKE EXECUTE ON FUNCTION create_market_order_atomic FROM PUBLIC';
  EXECUTE 'REVOKE EXECUTE ON FUNCTION create_market_order_atomic FROM anon';
  EXECUTE 'REVOKE EXECUTE ON FUNCTION create_market_order_atomic FROM authenticated';
  EXECUTE 'GRANT EXECUTE ON FUNCTION create_market_order_atomic TO service_role';
END;
$$;
