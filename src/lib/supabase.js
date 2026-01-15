/**
 * ============================================================
 * 建設DXツール - Supabase クライアント
 * ============================================================
 * Supabase接続とCRUD操作を提供
 * ============================================================
 */

import { createClient } from '@supabase/supabase-js';

// ============================================================
// 環境設定
// ============================================================

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const useMockData = import.meta.env.VITE_USE_MOCK_DATA === 'true';
const debugMode = import.meta.env.VITE_DEBUG_MODE === 'true';

// デバッグログ出力
const log = (message, data = null) => {
    if (debugMode) {
        console.log(`[Supabase] ${message}`, data || '');
    }
};

const logError = (message, error) => {
    console.error(`[Supabase Error] ${message}`, error);
};

// ============================================================
// Supabase クライアント初期化
// ============================================================

let supabase = null;

if (!useMockData && supabaseUrl && supabaseAnonKey) {
    supabase = createClient(supabaseUrl, supabaseAnonKey);
    log('Supabase クライアント初期化完了');
} else {
    log('モックモードで動作中（Supabase未接続）');
}

/**
 * Supabaseクライアントを取得
 * @returns {SupabaseClient|null}
 */
export const getSupabase = () => supabase;

/**
 * モックモードかどうかを判定
 * @returns {boolean}
 */
export const isMockMode = () => useMockData || !supabase;

// ============================================================
// Issues CRUD 操作
// ============================================================

/**
 * Issue一覧を取得
 * @param {Object} options - フィルタオプション
 * @param {string} [options.status] - ステータスフィルタ
 * @param {string} [options.priority] - 優先度フィルタ
 * @returns {Promise<{data: Array, error: Error|null}>}
 */
export const getIssues = async (options = {}) => {
    if (isMockMode()) {
        log('モックデータ: Issues取得');
        return { data: getMockIssues(options), error: null };
    }

    try {
        let query = supabase
            .from('issues')
            .select('*, issue_attachments(*)')
            .order('created_at', { ascending: false });

        if (options.status) {
            query = query.eq('status', options.status);
        }
        if (options.priority) {
            query = query.eq('priority', options.priority);
        }

        const { data, error } = await query;

        if (error) throw error;
        log('Issues取得成功', { count: data?.length });
        return { data, error: null };

    } catch (error) {
        logError('Issues取得失敗', error);
        return { data: null, error };
    }
};

/**
 * 新規Issueを作成
 * @param {Object} issueData - Issue データ
 * @param {string} issueData.title - タイトル
 * @param {string} [issueData.description] - 説明
 * @param {number} issueData.position_x - X座標
 * @param {number} issueData.position_y - Y座標
 * @param {number} issueData.position_z - Z座標
 * @param {string} [issueData.priority] - 優先度 (high/medium/low)
 * @param {Object} [issueData.camera_state] - カメラ状態
 * @returns {Promise<{data: Object, error: Error|null}>}
 */
export const createIssue = async (issueData) => {
    if (isMockMode()) {
        log('モックデータ: Issue作成', issueData);
        return { data: { id: crypto.randomUUID(), ...issueData }, error: null };
    }

    try {
        const { data, error } = await supabase
            .from('issues')
            .insert([issueData])
            .select()
            .single();

        if (error) throw error;
        log('Issue作成成功', data);
        return { data, error: null };

    } catch (error) {
        logError('Issue作成失敗', error);
        return { data: null, error };
    }
};

/**
 * Issueを更新
 * @param {string} id - Issue ID
 * @param {Object} updates - 更新データ
 * @returns {Promise<{data: Object, error: Error|null}>}
 */
export const updateIssue = async (id, updates) => {
    if (isMockMode()) {
        log('モックデータ: Issue更新', { id, updates });
        return { data: { id, ...updates }, error: null };
    }

    try {
        const { data, error } = await supabase
            .from('issues')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        log('Issue更新成功', data);
        return { data, error: null };

    } catch (error) {
        logError('Issue更新失敗', error);
        return { data: null, error };
    }
};

/**
 * Issueを削除
 * @param {string} id - Issue ID
 * @returns {Promise<{error: Error|null}>}
 */
export const deleteIssue = async (id) => {
    if (isMockMode()) {
        log('モックデータ: Issue削除', { id });
        return { error: null };
    }

    try {
        const { error } = await supabase
            .from('issues')
            .delete()
            .eq('id', id);

        if (error) throw error;
        log('Issue削除成功', { id });
        return { error: null };

    } catch (error) {
        logError('Issue削除失敗', error);
        return { error };
    }
};

// ============================================================
// 添付ファイル操作
// ============================================================

/**
 * 画像をアップロードしてIssueに添付
 * @param {string} issueId - Issue ID
 * @param {File} file - アップロードするファイル
 * @returns {Promise<{data: Object, error: Error|null}>}
 */
export const uploadAttachment = async (issueId, file) => {
    if (isMockMode()) {
        log('モックデータ: 添付アップロード', { issueId, fileName: file.name });
        return {
            data: {
                id: crypto.randomUUID(),
                file_path: `mock/${issueId}/${file.name}`,
                file_name: file.name
            },
            error: null
        };
    }

    try {
        // 1. Storageにアップロード
        const filePath = `${issueId}/${Date.now()}_${file.name}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
            .from('issue-attachments')
            .upload(filePath, file);

        if (uploadError) throw uploadError;

        // 2. issue_attachmentsテーブルにレコード追加
        const { data, error } = await supabase
            .from('issue_attachments')
            .insert([{
                issue_id: issueId,
                file_path: uploadData.path,
                file_name: file.name,
                file_type: file.type,
                file_size: file.size
            }])
            .select()
            .single();

        if (error) throw error;
        log('添付アップロード成功', data);
        return { data, error: null };

    } catch (error) {
        logError('添付アップロード失敗', error);
        return { data: null, error };
    }
};

/**
 * 添付ファイルのURLを取得
 * @param {string} filePath - Storage内のパス
 * @returns {string} 公開URL
 */
export const getAttachmentUrl = (filePath) => {
    if (isMockMode()) {
        return `/mock-images/${filePath}`;
    }

    const { data } = supabase.storage
        .from('issue-attachments')
        .getPublicUrl(filePath);

    return data?.publicUrl || '';
};

// ============================================================
// カメラビュー操作
// ============================================================

/**
 * 保存済みカメラビュー一覧を取得
 * @returns {Promise<{data: Array, error: Error|null}>}
 */
export const getCameraViews = async () => {
    if (isMockMode()) {
        log('モックデータ: カメラビュー取得');
        return { data: getMockCameraViews(), error: null };
    }

    try {
        const { data, error } = await supabase
            .from('camera_views')
            .select('*')
            .order('sort_order', { ascending: true });

        if (error) throw error;
        log('カメラビュー取得成功', { count: data?.length });
        return { data, error: null };

    } catch (error) {
        logError('カメラビュー取得失敗', error);
        return { data: null, error };
    }
};

/**
 * カメラビューを保存
 * @param {Object} viewData - ビューデータ
 * @returns {Promise<{data: Object, error: Error|null}>}
 */
export const saveCameraView = async (viewData) => {
    if (isMockMode()) {
        log('モックデータ: カメラビュー保存', viewData);
        return { data: { id: crypto.randomUUID(), ...viewData }, error: null };
    }

    try {
        const { data, error } = await supabase
            .from('camera_views')
            .insert([viewData])
            .select()
            .single();

        if (error) throw error;
        log('カメラビュー保存成功', data);
        return { data, error: null };

    } catch (error) {
        logError('カメラビュー保存失敗', error);
        return { data: null, error };
    }
};

// ============================================================
// モックデータ（開発・テスト用）
// ============================================================

const getMockIssues = (options = {}) => {
    const issues = [
        {
            id: 'mock-issue-1',
            title: '2階通路 手すり未設置',
            description: '安全通路の手すりが未設置です。早急に対応が必要。',
            status: 'open',
            priority: 'high',
            position_x: 10.5,
            position_y: 3.2,
            position_z: -5.0,
            camera_state: {
                position: { x: 15, y: 5, z: -3 },
                target: { x: 10.5, y: 3.2, z: -5 }
            },
            created_at: new Date().toISOString(),
            issue_attachments: []
        },
        {
            id: 'mock-issue-2',
            title: '1階資材置き場 整理必要',
            description: '資材が散乱しています。次回朝礼で周知。',
            status: 'in_progress',
            priority: 'medium',
            position_x: -2.0,
            position_y: 0.5,
            position_z: 8.0,
            camera_state: null,
            created_at: new Date().toISOString(),
            issue_attachments: []
        }
    ];

    return issues.filter(issue => {
        if (options.status && issue.status !== options.status) return false;
        if (options.priority && issue.priority !== options.priority) return false;
        return true;
    });
};

const getMockCameraViews = () => [
    {
        id: 'mock-view-1',
        name: '全景（北東から）',
        position_x: 50, position_y: 30, position_z: 50,
        target_x: 0, target_y: 0, target_z: 0,
        projection: 'perspective'
    },
    {
        id: 'mock-view-2',
        name: '2階 安全通路確認',
        position_x: 15, position_y: 5, position_z: -3,
        target_x: 10.5, target_y: 3.2, target_z: -5,
        projection: 'perspective'
    }
];

// デフォルトエクスポート
export default {
    getSupabase,
    isMockMode,
    getIssues,
    createIssue,
    updateIssue,
    deleteIssue,
    uploadAttachment,
    getAttachmentUrl,
    getCameraViews,
    saveCameraView
};
