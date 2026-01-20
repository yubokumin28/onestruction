-- ============================================================
-- 建設DXツール - Supabase データベーススキーマ
-- ============================================================
-- 作成者: インフラ・データベース担当
-- バージョン: 2.0 (2周目修正フェーズ対応)
-- 対応: design_spec.md v3.1
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
  
  -- マークアップタイプ（カスタムピン種別）v2.0追加
  markup_type TEXT CHECK (markup_type IN (
    'stamp_check',      -- ✅ 完了/確認済
    'stamp_question',   -- ❓ 疑問/要確認
    'stamp_alert',      -- ⚠️ 危険/注意
    'stamp_chat',       -- 💬 相談/協議
    'stamp_star',       -- ⭐ 重要
    'stamp_memo'        -- 📝 メモ
  )) DEFAULT 'stamp_memo',
  
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
CREATE INDEX idx_issues_markup_type ON issues(markup_type);
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
-- 4. schedules テーブル（タイムスケジュール）v2.0追加
-- ============================================================
-- 日々の工程スケジュールを管理（design_spec.md v3.1対応）

CREATE TABLE IF NOT EXISTS schedules (
  -- 主キー
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- プロジェクト紐付け（将来のマルチプロジェクト対応用）
  project_id UUID,
  
  -- 工程情報
  worker_type TEXT NOT NULL CHECK (worker_type IN (
    'carpenter',    -- 大工
    'rebar',        -- 鉄筋屋
    'concrete',     -- 生コン屋
    'electrical',   -- 電気工
    'plumbing',     -- 配管工
    'other'         -- その他
  )),
  
  -- 時間
  start_time TIME NOT NULL,               -- 開始時刻
  end_time TIME NOT NULL,                 -- 終了時刻
  date DATE NOT NULL,                     -- 日付
  
  -- 備考
  notes TEXT,                             -- 作業内容等
  
  -- メタデータ
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- updated_at トリガー
CREATE TRIGGER schedules_updated_at
  BEFORE UPDATE ON schedules
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- インデックス
CREATE INDEX idx_schedules_date ON schedules(date);
CREATE INDEX idx_schedules_worker_type ON schedules(worker_type);

-- ============================================================
-- コメント（ドキュメント用）
-- ============================================================
COMMENT ON TABLE issues IS '3Dモデル上の指摘事項・記録を管理';
COMMENT ON TABLE issue_attachments IS '指摘事項に添付された画像ファイル';
COMMENT ON TABLE camera_views IS '保存されたカメラアングル（視点）';
COMMENT ON TABLE schedules IS '日々の工程スケジュール（タイムスケジュール）';

COMMENT ON COLUMN issues.position_x IS '3D座標X（Three.jsワールド座標系）';
COMMENT ON COLUMN issues.position_y IS '3D座標Y（Three.jsワールド座標系）';
COMMENT ON COLUMN issues.position_z IS '3D座標Z（Three.jsワールド座標系）';
COMMENT ON COLUMN issues.camera_state IS 'Issue作成時のカメラ状態（JSON形式）';
COMMENT ON COLUMN issues.markup_type IS 'カスタムピンの種別（stamp_check等）';
COMMENT ON COLUMN schedules.worker_type IS '職種（carpenter=大工, rebar=鉄筋屋等）';

