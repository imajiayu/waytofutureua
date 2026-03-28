-- ============================================
-- Market Order Results — 订单证明文件 & 统计视图
-- ⚠️ 仅编写，不执行。待 PR 审核通过后手动执行。
-- ============================================

-- ============================================
-- 1. Storage Bucket
-- ============================================

-- 文件组织结构：{order_reference}/{shipping|completion}/{timestamp}.{ext}
-- public = true 允许通过 URL 访问，上传/删除由 service_role 在 Server Action 中控制
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'market-order-results',
    'market-order-results',
    true,
    52428800, -- 50MB
    ARRAY['image/*', 'video/*']
)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 2. 视图：market_orders_public
-- ============================================

-- 公开页面展示商品购买记录（邮箱脱敏）
-- 与 order_donations_secure 视图模式一致：邮箱脱敏在 SQL 层完成
-- 仅包含已付款的订单（paid / shipped / completed）
CREATE OR REPLACE VIEW public.market_orders_public AS
SELECT
    o.id,
    o.order_reference,
    o.item_id,
    o.quantity,
    o.total_amount,
    o.status,
    o.created_at,
    -- 邮箱脱敏逻辑（与 order_donations_secure 一致）
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
    -- 商品标题（join）
    i.title_i18n AS item_title_i18n
FROM market_orders o
JOIN market_items i ON o.item_id = i.id
WHERE o.status IN ('paid', 'shipped', 'completed');

COMMENT ON VIEW public.market_orders_public IS
  'Public view for market purchase records. Returns obfuscated buyer emails. Only includes paid/shipped/completed orders.';

-- 授权：只读视图，仅需 SELECT
GRANT SELECT ON TABLE public.market_orders_public TO anon;
GRANT SELECT ON TABLE public.market_orders_public TO authenticated;
GRANT SELECT ON TABLE public.market_orders_public TO service_role;
