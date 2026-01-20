/**
 * ============================================================
 * Supabase Mock Implementation
 * ============================================================
 * ブラウザ環境で直接動作するよう、Supabase機能をLocalStorageで
 * モック実装しています。将来的にSupabaseを使用する場合は、
 * このファイルを実際のSupabaseクライアントに置き換えてください。
 * ============================================================
 */

// モックモード（常にtrue）
export const isMockMode = () => true;

// LocalStorageキー
const ISSUES_KEY = 'onestruction_issues';
const CAMERA_VIEWS_KEY = 'onestruction_camera_views';

/**
 * Issue一覧を取得（LocalStorageから）
 */
export const getIssues = async () => {
  try {
    const data = localStorage.getItem(ISSUES_KEY);
    const issues = data ? JSON.parse(data) : [];
    return { data: issues, error: null };
  } catch (error) {
    console.error('getIssues error:', error);
    return { data: null, error };
  }
};

/**
 * Issue を作成（LocalStorageに保存）
 */
export const createIssue = async (issue) => {
  try {
    // 既存データを取得
    const { data: existingIssues } = await getIssues();

    // 新しいIssueにIDとタイムスタンプを追加
    const newIssue = {
      id: Date.now().toString(), // 簡易ID生成
      created_at: new Date().toISOString(),
      ...issue
    };

    // データを追加して保存
    const updatedIssues = [newIssue, ...existingIssues];
    localStorage.setItem(ISSUES_KEY, JSON.stringify(updatedIssues));

    return { data: newIssue, error: null };
  } catch (error) {
    console.error('createIssue error:', error);
    return { data: null, error };
  }
};

/**
 * カメラビューを取得（LocalStorageから）
 */
export const getCameraViews = async () => {
  try {
    const data = localStorage.getItem(CAMERA_VIEWS_KEY);
    const views = data ? JSON.parse(data) : [];
    return { data: views, error: null };
  } catch (error) {
    console.error('getCameraViews error:', error);
    return { data: null, error };
  }
};

/**
 * モックSupabaseクライアント（互換性のため）
 */
export const supabase = {
  from: () => ({
    select: () => ({
      order: () => Promise.resolve({ data: [], error: null })
    }),
    insert: () => ({
      select: () => Promise.resolve({ data: [], error: null })
    })
  })
};

console.log('📦 Supabase Mock Mode: LocalStorageベースで動作中');
