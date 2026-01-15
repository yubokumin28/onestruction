-- ============================================================
-- 建設DXツール - Row Level Security (RLS) ポリシー
-- ============================================================
-- セキュリティ: 認証必須＋作成者ベースのアクセス制御
-- ============================================================

-- ============================================================
-- RLS有効化
-- ============================================================
ALTER TABLE issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE issue_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE camera_views ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- issues テーブル ポリシー
-- ============================================================

-- 読み取り: 認証済みユーザーは全Issue閲覧可能（チーム共有前提）
CREATE POLICY "issues_select_authenticated" ON issues
  FOR SELECT
  TO authenticated
  USING (true);

-- 作成: 認証済みユーザーは新規Issue作成可能
CREATE POLICY "issues_insert_authenticated" ON issues
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

-- 更新: 作成者のみ更新可能（または管理者が必要な場合は別途設定）
CREATE POLICY "issues_update_owner" ON issues
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

-- 削除: 作成者のみ削除可能
CREATE POLICY "issues_delete_owner" ON issues
  FOR DELETE
  TO authenticated
  USING (auth.uid() = created_by);

-- ============================================================
-- issue_attachments テーブル ポリシー
-- ============================================================

-- 読み取り: 認証済みユーザーは全添付ファイル閲覧可能
CREATE POLICY "attachments_select_authenticated" ON issue_attachments
  FOR SELECT
  TO authenticated
  USING (true);

-- 作成: 認証済みユーザーは添付ファイル追加可能
-- ※親Issueの作成者チェックが必要な場合はサブクエリで制限可能
CREATE POLICY "attachments_insert_authenticated" ON issue_attachments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM issues 
      WHERE issues.id = issue_attachments.issue_id
    )
  );

-- 削除: 親Issueの作成者のみ削除可能
CREATE POLICY "attachments_delete_issue_owner" ON issue_attachments
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM issues 
      WHERE issues.id = issue_attachments.issue_id 
      AND issues.created_by = auth.uid()
    )
  );

-- ============================================================
-- camera_views テーブル ポリシー
-- ============================================================

-- 読み取り: 認証済みユーザーは全視点閲覧可能
CREATE POLICY "views_select_authenticated" ON camera_views
  FOR SELECT
  TO authenticated
  USING (true);

-- 作成: 認証済みユーザーは新規視点保存可能
CREATE POLICY "views_insert_authenticated" ON camera_views
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

-- 更新: 作成者のみ更新可能
CREATE POLICY "views_update_owner" ON camera_views
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

-- 削除: 作成者のみ削除可能
CREATE POLICY "views_delete_owner" ON camera_views
  FOR DELETE
  TO authenticated
  USING (auth.uid() = created_by);

-- ============================================================
-- 公開アクセス（未認証）が必要な場合のポリシー例
-- ============================================================
-- 注意: 本番環境では慎重に検討してください
-- 
-- -- 未認証でも読み取り可能にする場合
-- CREATE POLICY "issues_select_anon" ON issues
--   FOR SELECT
--   TO anon
--   USING (true);
