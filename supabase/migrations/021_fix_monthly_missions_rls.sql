-- monthly_missions テーブルへの書き込み権限を追加
-- 現状は参照のみ許可されているため、認証済みユーザーによる追加・更新・削除を許可します

-- INSERT (追加)
CREATE POLICY "Enable insert for authenticated users only" ON public.monthly_missions
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- UPDATE (更新)
CREATE POLICY "Enable update for authenticated users only" ON public.monthly_missions
    FOR UPDATE USING (auth.role() = 'authenticated');

-- DELETE (削除)
CREATE POLICY "Enable delete for authenticated users only" ON public.monthly_missions
    FOR DELETE USING (auth.role() = 'authenticated');
