/**
 * ============================================================
 * データベースアクセス層 (Database Access Layer)
 * ============================================================
 * Supabaseとの全てのデータのやり取りを管理
 * LocalStorageモードとSupabaseモードの両方をサポート
 * ============================================================
 */

import { supabase, isSupabaseEnabled, debugLog } from './supabase.js';

// ============================================================
// Issues (指摘事項) 関連API
// ============================================================

/**
 * Issue一覧を取得
 * @returns {Promise<{data: Array, error: Error|null}>}
 */
export async function getIssues() {
    if (!isSupabaseEnabled()) {
        debugLog('getIssues: モックモードのためスキップ');
        return { data: [], error: null };
    }

    try {
        const { data, error } = await supabase
            .from('issues')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        debugLog('getIssues: 成功', data?.length);
        return { data, error: null };
    } catch (error) {
        console.error('getIssues エラー:', error);
        return { data: null, error };
    }
}

/**
 * 新しいIssueを作成
 * @param {Object} issueData - Issue作成データ
 * @returns {Promise<{data: Object, error: Error|null}>}
 */
export async function createIssue(issueData) {
    if (!isSupabaseEnabled()) {
        debugLog('createIssue: モックモードのためスキップ');
        // モックモードでは仮のIDを返す
        return {
            data: { id: 'mock-' + Date.now(), ...issueData },
            error: null
        };
    }

    try {
        const { data, error } = await supabase
            .from('issues')
            .insert([issueData])
            .select()
            .single();

        if (error) throw error;
        debugLog('createIssue: 成功', data);
        return { data, error: null };
    } catch (error) {
        console.error('createIssue エラー:', error);
        return { data: null, error };
    }
}

/**
 * Issueを更新
 * @param {string} id - IssueのID
 * @param {Object} updates - 更新データ
 * @returns {Promise<{data: Object, error: Error|null}>}
 */
export async function updateIssue(id, updates) {
    if (!isSupabaseEnabled()) {
        debugLog('updateIssue: モックモードのためスキップ');
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
        debugLog('updateIssue: 成功', data);
        return { data, error: null };
    } catch (error) {
        console.error('updateIssue エラー:', error);
        return { data: null, error };
    }
}

/**
 * Issueを削除
 * @param {string} id - IssueのID
 * @returns {Promise<{error: Error|null}>}
 */
export async function deleteIssue(id) {
    if (!isSupabaseEnabled()) {
        debugLog('deleteIssue: モックモードのためスキップ');
        return { error: null };
    }

    try {
        const { error } = await supabase
            .from('issues')
            .delete()
            .eq('id', id);

        if (error) throw error;
        debugLog('deleteIssue: 成功', id);
        return { error: null };
    } catch (error) {
        console.error('deleteIssue エラー:', error);
        return { error };
    }
}

// ============================================================
// Camera Views (視点) 関連API
// ============================================================

/**
 * カメラビュー一覧を取得
 * @returns {Promise<{data: Array, error: Error|null}>}
 */
export async function getCameraViews() {
    if (!isSupabaseEnabled()) {
        debugLog('getCameraViews: モックモードのためスキップ');
        return { data: [], error: null };
    }

    try {
        const { data, error } = await supabase
            .from('camera_views')
            .select('*')
            .order('sort_order', { ascending: true });

        if (error) throw error;
        debugLog('getCameraViews: 成功', data?.length);
        return { data, error: null };
    } catch (error) {
        console.error('getCameraViews エラー:', error);
        return { data: null, error };
    }
}

/**
 * カメラビューを保存
 * @param {Object} viewData - カメラビューデータ
 * @returns {Promise<{data: Object, error: Error|null}>}
 */
export async function saveCameraView(viewData) {
    if (!isSupabaseEnabled()) {
        debugLog('saveCameraView: モックモードのためスキップ');
        return { data: { id: 'mock-' + Date.now(), ...viewData }, error: null };
    }

    try {
        const { data, error } = await supabase
            .from('camera_views')
            .insert([viewData])
            .select()
            .single();

        if (error) throw error;
        debugLog('saveCameraView: 成功', data);
        return { data, error: null };
    } catch (error) {
        console.error('saveCameraView エラー:', error);
        return { data: null, error };
    }
}

// ============================================================
// Annotations (アノテーション) 関連API
// ============================================================

/**
 * アノテーション一覧を取得
 * @param {string} projectId - プロジェクトID (optional)
 * @returns {Promise<{data: Array, error: Error|null}>}
 */
export async function getAnnotations(projectId = null) {
    if (!isSupabaseEnabled()) {
        debugLog('getAnnotations: モックモードのためスキップ');
        return { data: [], error: null };
    }

    try {
        let query = supabase
            .from('annotations')
            .select('*')
            .order('created_at', { ascending: false });

        if (projectId) {
            query = query.eq('project_id', projectId);
        }

        const { data, error } = await query;

        if (error) throw error;
        debugLog('getAnnotations: 成功', data?.length);
        return { data, error: null };
    } catch (error) {
        console.error('getAnnotations エラー:', error);
        return { data: null, error };
    }
}

/**
 * アノテーションを作成
 * @param {Object} annotationData - アノテーションデータ (JSONB形式)
 * @param {string} projectId - プロジェクトID (optional)
 * @returns {Promise<{data: Object, error: Error|null}>}
 */
export async function createAnnotation(annotationData, projectId = null) {
    if (!isSupabaseEnabled()) {
        debugLog('createAnnotation: モックモードのためスキップ');
        return { data: { id: 'mock-' + Date.now(), data: annotationData }, error: null };
    }

    try {
        const record = {
            data: annotationData,
            project_id: projectId
        };

        const { data, error } = await supabase
            .from('annotations')
            .insert([record])
            .select()
            .single();

        if (error) throw error;
        debugLog('createAnnotation: 成功', data);
        return { data, error: null };
    } catch (error) {
        console.error('createAnnotation エラー:', error);
        return { data: null, error };
    }
}

// ============================================================
// Schedules (スケジュール) 関連API
// ============================================================

/**
 * スケジュール一覧を取得
 * @param {string} zoneId - 工区ID (例: 'A', 'B', 'C')
 * @param {string} date - 日付 (YYYY-MM-DD形式) (optional)
 * @returns {Promise<{data: Array, error: Error|null}>}
 */
export async function getSchedules(zoneId, date = null) {
    if (!isSupabaseEnabled()) {
        debugLog('getSchedules: モックモードのためスキップ');
        return { data: [], error: null };
    }

    try {
        let query = supabase
            .from('schedules')
            .select('*')
            .eq('zone_id', zoneId)
            .order('start_time', { ascending: true });

        if (date) {
            query = query.eq('date', date);
        }

        const { data, error } = await query;

        if (error) throw error;
        debugLog('getSchedules: 成功', data?.length);
        return { data, error: null };
    } catch (error) {
        console.error('getSchedules エラー:', error);
        return { data: null, error };
    }
}

/**
 * スケジュールを作成
 * @param {Object} scheduleData - スケジュールデータ
 * @returns {Promise<{data: Object, error: Error|null}>}
 */
export async function createSchedule(scheduleData) {
    if (!isSupabaseEnabled()) {
        debugLog('createSchedule: モックモードのためスキップ');
        return { data: { id: 'mock-' + Date.now(), ...scheduleData }, error: null };
    }

    try {
        const { data, error } = await supabase
            .from('schedules')
            .insert([scheduleData])
            .select()
            .single();

        if (error) throw error;
        debugLog('createSchedule: 成功', data);
        return { data, error: null };
    } catch (error) {
        console.error('createSchedule エラー:', error);
        return { data: null, error };
    }
}

// ============================================================
// Project Settings (プロジェクト設定) 関連API
// ============================================================

/**
 * プロジェクト設定を取得
 * @param {string} projectId - プロジェクトID
 * @param {string} key - 設定キー (例: 'schedule_tabs')
 * @returns {Promise<{data: Object, error: Error|null}>}
 */
export async function getProjectSetting(projectId, key) {
    if (!isSupabaseEnabled()) {
        debugLog('getProjectSetting: モックモードのためスキップ');
        return { data: null, error: null };
    }

    try {
        const { data, error } = await supabase
            .from('project_settings')
            .select('*')
            .eq('project_id', projectId)
            .eq('key', key)
            .single();

        if (error && error.code !== 'PGRST116') throw error; // PGRST116 = レコードが見つからない
        debugLog('getProjectSetting: 成功', data);
        return { data, error: null };
    } catch (error) {
        console.error('getProjectSetting エラー:', error);
        return { data: null, error };
    }
}

/**
 * プロジェクト設定を保存（upsert: 存在すれば更新、なければ作成）
 * @param {string} projectId - プロジェクトID
 * @param {string} key - 設定キー
 * @param {Object} value - 設定値 (JSON形式)
 * @returns {Promise<{data: Object, error: Error|null}>}
 */
export async function saveProjectSetting(projectId, key, value) {
    if (!isSupabaseEnabled()) {
        debugLog('saveProjectSetting: モックモードのためスキップ');
        return { data: { project_id: projectId, key, value }, error: null };
    }

    try {
        const { data, error } = await supabase
            .from('project_settings')
            .upsert([{ project_id: projectId, key, value }])
            .select()
            .single();

        if (error) throw error;
        debugLog('saveProjectSetting: 成功', data);
        return { data, error: null };
    } catch (error) {
        console.error('saveProjectSetting エラー:', error);
        return { data: null, error };
    }
}
