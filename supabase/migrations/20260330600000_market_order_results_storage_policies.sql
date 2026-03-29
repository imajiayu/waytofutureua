-- ============================================
-- market-order-results 存储桶 RLS 策略
-- 与 donation-results 保持一致
-- ============================================

-- 1. 管理员上传文件
CREATE POLICY "Admins can upload to market-order-results"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
    bucket_id = 'market-order-results'
    AND is_admin()
);

-- 2. 管理员删除文件
CREATE POLICY "Admins can delete from market-order-results"
ON storage.objects FOR DELETE TO authenticated
USING (
    bucket_id = 'market-order-results'
    AND is_admin()
);

-- 3. 管理员查看文件列表
CREATE POLICY "Admins can view market-order-results"
ON storage.objects FOR SELECT TO authenticated
USING (
    bucket_id = 'market-order-results'
    AND is_admin()
);

-- 4. 管理员更新文件元数据
CREATE POLICY "Admins can update market-order-results metadata"
ON storage.objects FOR UPDATE TO authenticated
USING (
    bucket_id = 'market-order-results'
    AND is_admin()
);

-- 5. 公开访问（bucket 已设 public=true，此策略确保 RLS 层面也放行 SELECT）
CREATE POLICY "Public access to market-order-results"
ON storage.objects FOR SELECT TO public
USING (
    bucket_id = 'market-order-results'
);
