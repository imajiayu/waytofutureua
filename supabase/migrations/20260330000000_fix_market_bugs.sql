-- ============================================
-- Fix market module bugs
-- 1. Revoke decrement_stock from authenticated (security: prevent direct stock manipulation)
-- 2. Add currency to market_orders (data integrity: stop hardcoding USD)
-- 3. Update market_orders_public view to include currency
-- ============================================

-- ── 1. 安全修复：撤回 authenticated 对 decrement_stock 的调用权限 ──
-- 背景：decrement_stock 是 SECURITY DEFINER 函数，GRANT 给 authenticated 后
-- 任何 OTP 认证的买家可直接 RPC 调用清空库存而不创建订单。
-- 改为仅 service_role 可调用（createSaleOrder 中改用 service client）。
REVOKE EXECUTE ON FUNCTION decrement_stock FROM authenticated;

-- ── 2. 数据完整性：market_orders 增加 currency 字段 ──
-- 背景：原设计未在订单表存储币种，后续页面全部硬编码 'USD'。
-- 若商品使用非 USD 币种，展示金额单位错误。
-- DEFAULT 'USD' 兼容已有订单数据。
ALTER TABLE market_orders
  ADD COLUMN currency TEXT NOT NULL DEFAULT 'USD';

-- ── 3. 更新公开视图：增加 currency 列 ──
-- CREATE OR REPLACE VIEW 可在末尾追加列，保留已有 GRANT。
CREATE OR REPLACE VIEW public.market_orders_public AS
SELECT
    o.id,
    o.order_reference,
    o.item_id,
    o.quantity,
    o.total_amount,
    o.status,
    o.created_at,
    CASE
        WHEN POSITION('@' IN o.buyer_email) > 0 THEN
            CASE
                WHEN LENGTH(SPLIT_PART(o.buyer_email, '@', 1)) <= 2 THEN
                    SUBSTRING(SPLIT_PART(o.buyer_email, '@', 1), 1, 1) || '***@' ||
                    CASE
                        WHEN LENGTH(SPLIT_PART(o.buyer_email, '@', 2)) <= 3 THEN
                            SUBSTRING(SPLIT_PART(o.buyer_email, '@', 2), 1, 1) || '***'
                        ELSE
                            SUBSTRING(SPLIT_PART(o.buyer_email, '@', 2), 1, 1) || '***' ||
                            SUBSTRING(SPLIT_PART(o.buyer_email, '@', 2), LENGTH(SPLIT_PART(o.buyer_email, '@', 2)) - 1, 2)
                    END
                ELSE
                    SUBSTRING(SPLIT_PART(o.buyer_email, '@', 1), 1, 1) || '***' ||
                    SUBSTRING(SPLIT_PART(o.buyer_email, '@', 1), LENGTH(SPLIT_PART(o.buyer_email, '@', 1)), 1) || '@' ||
                    CASE
                        WHEN LENGTH(SPLIT_PART(o.buyer_email, '@', 2)) <= 3 THEN
                            SUBSTRING(SPLIT_PART(o.buyer_email, '@', 2), 1, 1) || '***'
                        ELSE
                            SUBSTRING(SPLIT_PART(o.buyer_email, '@', 2), 1, 1) || '***' ||
                            SUBSTRING(SPLIT_PART(o.buyer_email, '@', 2), LENGTH(SPLIT_PART(o.buyer_email, '@', 2)) - 1, 2)
                    END
            END
        ELSE '***'
    END AS buyer_email_obfuscated,
    i.title_i18n AS item_title_i18n,
    o.currency
FROM market_orders o
JOIN market_items i ON o.item_id = i.id
WHERE o.status IN ('paid', 'shipped', 'completed');
