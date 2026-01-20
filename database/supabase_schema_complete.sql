-- ============================================================
-- 建設DXツール - 完全なSupabaseスキーマ (v5.0)
-- ============================================================
-- 作成者: インフラ・データベース担当
-- 対応: research.md v5.1, design_spec.md v6.1
-- ============================================================
-- 実行手順:
-- 1. Supabase Dashboard > SQL Editor を開く
-- 2. このファイルの内容を全てコピー＆ペースト
-- 3. 「Run」ボタンをクリックして実行
-- ============================================================

-- ============================================================
-- 1. issues テーブル（指摘事項・記録管理）
-- ============================================================

CREATE TABLE IF NOT EXISTS issues (
  -- 主キー
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- 指摘内容
  title TEXT NOT NULL,
  description TEXT,
  
  -- ステータス管理
  status TEXT CHECK (status IN ('open', 'closed', 'in_progress')) DEFAULT 'open',
  priority TEXT CHECK (priority IN ('high', 'medium', 'low')) DEFAULT 'medium',
  
  -- マークアップタイプ（カスタムピン種別）
  markup_type TEXT CHECK (markup_type IN (
    'stamp_check',      -- ✅ 完了/確認済
    'stamp_question',   -- ❓ 疑問/要確認
    'stamp_alert',      -- ⚠️ 危険/注意
    'stamp_chat',       -- 💬 相談/協議
    'stamp_star',       -- ⭐ 重要
    'stamp_memo'        -- 📝 メモ
  )) DEFAULT 'stamp_memo',
  
  -- 3D座標 (Three.js ワールド座標)
  position_x FLOAT8 NOT NULL,
  position_y FLOAT8 NOT NULL,
  position_z FLOAT8 NOT NULL,
  
  -- カメラ状態（ビュー復元用）
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

-- インデックス
CREATE INDEX IF NOT EXISTS idx_issues_status ON issues(status);
CREATE INDEX IF NOT EXISTS idx_issues_priority ON issues(priority);
CREATE INDEX IF NOT EXISTS idx_issues_markup_type ON issues(markup_type);
CREATE INDEX IF NOT EXISTS idx_issues_created_at ON issues(created_at DESC);

-- ============================================================
-- 2. issue_attachments テーブル（添付ファイル）
-- ============================================================

CREATE TABLE IF NOT EXISTS issue_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id UUID NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
  
  file_path TEXT NOT NULL,
  file_name TEXT,
  file_type TEXT,
  file_size INTEGER,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_attachments_issue_id ON issue_attachments(issue_id);

-- ============================================================
-- 3. camera_views テーブル（視点データ）
-- ============================================================

CREATE TABLE IF NOT EXISTS camera_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  name TEXT NOT NULL,
  description TEXT,
  
  -- カメラ位置
  position_x FLOAT8 NOT NULL,
  position_y FLOAT8 NOT NULL,
  position_z FLOAT8 NOT NULL,
  
  -- カメラ注視点
  target_x FLOAT8 NOT NULL,
  target_y FLOAT8 NOT NULL,
  target_z FLOAT8 NOT NULL,
  
  projection TEXT CHECK (projection IN ('perspective', 'orthographic')) DEFAULT 'perspective',
  sort_order INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_camera_views_sort ON camera_views(sort_order);

-- ============================================================
-- 4. schedules テーブル（タイムスケジュール）
-- ============================================================

CREATE TABLE IF NOT EXISTS schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- 工区ID (research.md v5.1 §4.1準拠)
  zone_id TEXT NOT NULL,
  
  -- プロジェクト紐付け
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
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  date DATE NOT NULL,
  
  -- 備考
  notes TEXT,
  
  -- メタデータ
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE TRIGGER schedules_updated_at
  BEFORE UPDATE ON schedules
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_schedules_date ON schedules(date);
CREATE INDEX IF NOT EXISTS idx_schedules_worker_type ON schedules(worker_type);
CREATE INDEX IF NOT EXISTS idx_schedules_zone_id ON schedules(zone_id);

-- ============================================================
-- 5. annotations テーブル（3Dアノテーション）research.md v5.1 §3新規追加
-- ============================================================

CREATE TABLE IF NOT EXISTS annotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- プロジェクト紐付け
  project_id UUID,
  
  -- アノテーションデータ (JSONB形式、research.md §3.2準拠)
  -- 形式: {"type": "point_marker", "icon": "stamp_alert", "position": {...}, ...}
  data JSONB NOT NULL,
  
  -- メタデータ
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE TRIGGER annotations_updated_at
  BEFORE UPDATE ON annotations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_annotations_project ON annotations(project_id);
CREATE INDEX IF NOT EXISTS idx_annotations_created_at ON annotations(created_at DESC);

-- ============================================================
-- 6. project_settings テーブル（プロジェクト設定）research.md v5.1 §4.1新規追加
-- ============================================================

CREATE TABLE IF NOT EXISTS project_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- プロジェクトID
  project_id UUID NOT NULL,
  
  -- 設定キー
  key TEXT NOT NULL,
  
  -- 設定値 (JSONB形式)
  -- 例: key='schedule_tabs', value='[{"id": "zone_a", "label": "A工区"}, ...]'
  value JSONB NOT NULL,
  
  -- メタデータ
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- プロジェクトIDとキーの組み合わせで一意
  UNIQUE(project_id, key)
);

CREATE TRIGGER project_settings_updated_at
  BEFORE UPDATE ON project_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_project_settings_project ON project_settings(project_id);
CREATE INDEX IF NOT EXISTS idx_project_settings_key ON project_settings(key);

-- ============================================================
-- コメント（ドキュメント用）
-- ============================================================

COMMENT ON TABLE issues IS '3Dモデル上の指摘事項・記録を管理';
COMMENT ON TABLE issue_attachments IS '指摘事項に添付された画像ファイル';
COMMENT ON TABLE camera_views IS '保存されたカメラアングル（視点）';
COMMENT ON TABLE schedules IS '工区別の工程スケジュール';
COMMENT ON TABLE annotations IS '3D空間上のアノテーション（ピン・コメント）';
COMMENT ON TABLE project_settings IS 'プロジェクトごとの設定（工区タブ設定等）';

COMMENT ON COLUMN schedules.zone_id IS '工区ID (例: "A", "B", "C")';
COMMENT ON COLUMN annotations.data IS 'アノテーションデータ（JSON形式、research.md §3.2準拠）';
COMMENT ON COLUMN project_settings.key IS '設定キー (例: "schedule_tabs")';
COMMENT ON COLUMN project_settings.value IS '設定値（JSON形式）';
