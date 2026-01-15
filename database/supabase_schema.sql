-- ============================================================
-- 建設DXツール - Supabase データベーススキーマ
-- ============================================================
-- 作成者: インフラ・データベース担当
-- バージョン: 1.0
-- 対応: research.md v1.0
-- ============================================================

-- ============================================================
-- 1. issues テーブル（指摘事項・記録管理）
-- ============================================================
-- 3Dモデル上の指摘事項を管理するメインテーブル
-- position_x/y/z は Three.js/IFC.js のワールド座標系に対応（float8型）

CREATE TABLE IF NOT EXISTS issues (
  -- 主キー
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- 指摘内容
  title TEXT NOT NULL,                    -- 指摘タイトル（必須）
  description TEXT,                       -- 詳細説明（任意）
  
  -- ステータス管理
  status TEXT CHECK (status IN ('open', 'closed', 'in_progress')) DEFAULT 'open',
  priority TEXT CHECK (priority IN ('high', 'medium', 'low')) DEFAULT 'medium',
  
  -- 3D座標 (Three.js ワールド座標、float8 = double precision)
  position_x FLOAT8 NOT NULL,             -- X座標
  position_y FLOAT8 NOT NULL,             -- Y座標
  position_z FLOAT8 NOT NULL,             -- Z座標
  
  -- カメラ状態（ビュー復元用）
  -- 形式: {"position": {"x": 0, "y": 0, "z": 0}, "target": {"x": 0, "y": 0, "z": 0}}
  camera_state JSONB,
  
  -- メタデータ
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- updated_at 自動更新トリガー
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER issues_updated_at
  BEFORE UPDATE ON issues
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- インデックス（検索パフォーマンス向上）
CREATE INDEX idx_issues_status ON issues(status);
CREATE INDEX idx_issues_priority ON issues(priority);
CREATE INDEX idx_issues_created_at ON issues(created_at DESC);

-- ============================================================
-- 2. issue_attachments テーブル（添付ファイル）
-- ============================================================
-- 現場写真やKY記録画像をStorageと紐付けて管理

CREATE TABLE IF NOT EXISTS issue_attachments (
  -- 主キー
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Issue紐付け（親Issue削除時に連動削除）
  issue_id UUID NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
  
  -- ファイル情報
  file_path TEXT NOT NULL,                -- Storage内パス (例: issue-attachments/issue-id/filename.jpg)
  file_name TEXT,                         -- 元ファイル名（表示用）
  file_type TEXT,                         -- MIMEタイプ (image/jpeg, image/png等)
  file_size INTEGER,                      -- ファイルサイズ（バイト）
  
  -- メタデータ
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックス
CREATE INDEX idx_attachments_issue_id ON issue_attachments(issue_id);

-- ============================================================
-- 3. camera_views テーブル（視点データ）
-- ============================================================
-- 「安全管理視点」「施工検討視点」などの定点アングルを保存

CREATE TABLE IF NOT EXISTS camera_views (
  -- 主キー
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- 視点名
  name TEXT NOT NULL,                     -- 例: "2階 安全通路確認"
  description TEXT,                       -- 視点の説明（任意）
  
  -- カメラ位置 (Three.js camera.position)
  position_x FLOAT8 NOT NULL,
  position_y FLOAT8 NOT NULL,
  position_z FLOAT8 NOT NULL,
  
  -- カメラ注視点 (OrbitControls.target)
  target_x FLOAT8 NOT NULL,
  target_y FLOAT8 NOT NULL,
  target_z FLOAT8 NOT NULL,
  
  -- 投影方式
  projection TEXT CHECK (projection IN ('perspective', 'orthographic')) DEFAULT 'perspective',
  
  -- 表示順序（ソート用）
  sort_order INTEGER DEFAULT 0,
  
  -- メタデータ
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- インデックス
CREATE INDEX idx_camera_views_sort ON camera_views(sort_order);

-- ============================================================
-- コメント（ドキュメント用）
-- ============================================================
COMMENT ON TABLE issues IS '3Dモデル上の指摘事項・記録を管理';
COMMENT ON TABLE issue_attachments IS '指摘事項に添付された画像ファイル';
COMMENT ON TABLE camera_views IS '保存されたカメラアングル（視点）';

COMMENT ON COLUMN issues.position_x IS '3D座標X（Three.jsワールド座標系）';
COMMENT ON COLUMN issues.position_y IS '3D座標Y（Three.jsワールド座標系）';
COMMENT ON COLUMN issues.position_z IS '3D座標Z（Three.jsワールド座標系）';
COMMENT ON COLUMN issues.camera_state IS 'Issue作成時のカメラ状態（JSON形式）';
