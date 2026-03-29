-- =============================================
-- 修复 donations 表 PII 泄露漏洞
-- =============================================
-- 问题: "Allow anonymous read donations" USING(true) 允许任何人用公开 anon key 读取所有捐赠者 PII
--        (donor_name, donor_email, contact_telegram, contact_whatsapp, donor_message)
--
-- 修复:
--   1. 将依赖 donations 表的 3 个视图设为 security_invoker=false
--      视图以 owner(postgres) 身份执行内部查询，绕过 RLS
--      这些视图本身已做数据脱敏，安全
--   2. 删除过度开放的 SELECT 策略
--
-- 回滚:
--   CREATE POLICY "Allow anonymous read donations"
--     ON public.donations FOR SELECT TO authenticated, anon USING (true);
-- =============================================

-- 1. 将 3 个依赖视图设为 SECURITY DEFINER 模式（先改视图，再删策略，确保无中断窗口）
--    order_donations_secure: 混淆 donor_email，不返回 donor_name
--    project_stats: 聚合 total_raised/donation_count，不返回任何 PII
--    public_project_donations: 混淆 email，MD5 hash order_reference，不返回 donor_name
ALTER VIEW public.order_donations_secure SET (security_invoker = false);
ALTER VIEW public.project_stats SET (security_invoker = false);
ALTER VIEW public.public_project_donations SET (security_invoker = false);

-- 2. 删除过度开放的 SELECT 策略
DROP POLICY "Allow anonymous read donations" ON public.donations;

-- 3. 验证
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'donations' AND policyname = 'Allow anonymous read donations'
  ) THEN
    RAISE EXCEPTION 'Policy was not dropped!';
  END IF;

  RAISE NOTICE '✅ donations 表 PII 泄露漏洞已修复';
  RAISE NOTICE '  - 已删除 "Allow anonymous read donations" 策略';
  RAISE NOTICE '  - 3 个视图已设置 security_invoker=false';
END $$;
