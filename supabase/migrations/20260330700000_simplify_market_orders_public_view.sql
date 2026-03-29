-- ============================================
-- Simplify market_orders_public view
-- 1. Remove o.id (internal PK, unused by frontend)
-- 2. Remove item_title_i18n + JOIN (caller already has item context)
-- 3. Add updated_at (last status change timestamp for trust)
-- 4. Add shipping_country (coarse geo for credibility, no PII)
-- ============================================

-- DROP required: CREATE OR REPLACE cannot remove columns
DROP VIEW IF EXISTS public.market_orders_public;

CREATE VIEW public.market_orders_public AS
SELECT
    o.order_reference,
    o.item_id,
    o.quantity,
    o.total_amount,
    o.currency,
    o.status,
    o.shipping_country,
    o.created_at,
    o.updated_at,
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
    END AS buyer_email_obfuscated
FROM market_orders o
WHERE o.status IN ('paid', 'shipped', 'completed');

COMMENT ON VIEW public.market_orders_public IS
  'Public purchase records with obfuscated email, country, and timestamps. No JOIN, no PII.';

-- Re-grant after DROP
GRANT SELECT ON TABLE public.market_orders_public TO anon;
GRANT SELECT ON TABLE public.market_orders_public TO authenticated;
GRANT SELECT ON TABLE public.market_orders_public TO service_role;
