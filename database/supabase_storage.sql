-- ============================================================
-- 建設DXツール - Supabase Storage 設定
-- ============================================================
-- バケット構成とアクセスポリシー
-- ============================================================

-- ============================================================
-- 1. バケット作成
-- ============================================================

-- issue-attachments: 指摘事項の添付画像（非公開・認証必須）
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'issue-attachments',
  'issue-attachments',
  false,                                  -- 非公開
  5242880,                                -- 5MB制限
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
) ON CONFLICT (id) DO NOTHING;

-- site-assets: 3Dモデル・共有アセット（公開）
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'site-assets',
  'site-assets',
  true,                                   -- 公開
  104857600,                              -- 100MB制限（大きな3Dモデル対応）
  ARRAY[
    'model/gltf+json', 
    'model/gltf-binary', 
    'application/octet-stream',           -- .frag, .ifc等
    'image/jpeg', 
    'image/png'
  ]
) ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 2. issue-attachments バケット ポリシー
-- ============================================================

-- アップロード: 認証済みユーザーのみ
CREATE POLICY "issue_attachments_insert" ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'issue-attachments');

-- 読み取り: 認証済みユーザーのみ
CREATE POLICY "issue_attachments_select" ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id = 'issue-attachments');

-- 更新: 認証済みユーザーのみ（自分がアップロードしたファイル）
CREATE POLICY "issue_attachments_update" ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'issue-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);

-- 削除: 認証済みユーザーのみ（自分がアップロードしたファイル）
CREATE POLICY "issue_attachments_delete" ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'issue-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);

-- ============================================================
-- 3. site-assets バケット ポリシー
-- ============================================================

-- 読み取り: 誰でも可能（公開バケット）
CREATE POLICY "site_assets_select_public" ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'site-assets');

-- アップロード: 認証済みユーザーのみ
CREATE POLICY "site_assets_insert" ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'site-assets');

-- 削除: 認証済みユーザーのみ
CREATE POLICY "site_assets_delete" ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'site-assets');

-- ============================================================
-- 推奨フォルダ構造
-- ============================================================
-- 
-- issue-attachments/
--   └── {user_id}/
--       └── {issue_id}/
--           ├── photo_001.jpg
--           └── ky_record.png
--
-- site-assets/
--   ├── models/
--   │   ├── building_a.frag      # Fragment形式（推奨）
--   │   └── building_b.ifc       # IFC形式
--   └── textures/
--       └── cork_board.jpg       # UIテクスチャ
