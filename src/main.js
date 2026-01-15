/**
 * ============================================================
 * 建設DXツール - メインエントリーポイント
 * ============================================================
 * Supabaseとの通信、UIインタラクションを管理
 * ============================================================
 */

import { BIMViewer } from './bim-viewer.js';
import { UIManager } from './ui-manager.js';
import {
    getIssues,
    createIssue,
    getCameraViews,
    isMockMode
} from './lib/supabase.js';

// グローバル状態
let viewer = null;
let uiManager = null;
let currentClickPosition = null;  // 3Dクリック位置
let issues = [];                  // Issue一覧

// Main entry point
document.addEventListener('DOMContentLoaded', async () => {
    console.log("🏗️ Construction Board 起動中...");

    if (isMockMode()) {
        console.log("📦 モックモードで動作中（Supabase未接続）");
    } else {
        console.log("☁️ Supabase接続モード");
    }

    // Initialize UI Manager
    uiManager = new UIManager();

    // Initialize BIM Viewer
    const canvasContainer = document.getElementById('three-canvas-container') || document.getElementById('bim-viewer');
    viewer = new BIMViewer(canvasContainer);
    viewer.init();

    // 3Dクリックイベントを設定
    viewer.onClickPosition = (result) => {
        // 結果に応じた処理
        if (result.type === 'pin') {
            // ピンをクリック -> 詳細ポップアップ
            console.log("📌 ピン選択:", result.data);
            uiManager.showIssuePopup(result.data, result.screenPosition);
        } else if (result.type === 'space') {
            // 何もないところをクリック -> 新規作成モーダル
            console.log("📍 空間クリック:", result.position);
            currentClickPosition = result.position;
            uiManager.closePopup(); // 他のポップアップを閉じる
            uiManager.openCreateModal(result.position);
        } else {
            // 互換性: typeがない場合は座標とみなす
            console.log("📍 座標取得:", result);
            currentClickPosition = result;
            uiManager.closePopup();
            uiManager.openCreateModal(result);
        }
    };

    // Setup UI Interactions
    setupInteractions(viewer, uiManager);

    // Issue一覧を読み込み
    await loadIssues();

    // 保存済み視点を読み込み
    await loadCameraViews();
});

/**
 * Issue一覧を読み込んで3D上にピンを表示
 */
async function loadIssues() {
    console.log("📋 Issue一覧を読み込み中...");
    const { data, error } = await getIssues();

    if (error) {
        console.error("Issue読み込みエラー:", error);
        return;
    }

    issues = data || [];
    console.log(`✅ ${issues.length}件のIssueを読み込みました`);

    // 3D上にピン表示
    issues.forEach(issue => {
        // ピン生成用データ作成
        const pinData = {
            id: issue.id,
            position: { x: issue.position_x, y: issue.position_y, z: issue.position_z },
            priority: issue.priority,
            title: issue.title,
            description: issue.description,
            status: issue.status,
            created_at: issue.created_at,
            image_url: null // 画像URLがあればここで設定
        };
        viewer.addPinFromData(pinData);
    });
}

/**
 * カメラビューを読み込み
 */
async function loadCameraViews() {
    const { data, error } = await getCameraViews();

    if (error) {
        console.error("カメラビュー読み込みエラー:", error);
        return;
    }

    const views = data || [];
    console.log(`📷 ${views.length}件の視点を読み込みました`);
    // TODO: ビューリストを表示するUI処理（将来実装）
}

function setupInteractions(viewer, uiManager) {
    // ツールボタン
    document.querySelectorAll('.tool-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            alert('🛠️ ツール機能は開発中です');
        });
    });

    // ビュー切り替えボタン
    const viewBtns = document.querySelectorAll('.view-btn');
    viewBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            viewBtns.forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            const viewName = e.target.textContent;

            if (viewName === '全体') {
                viewer.setCameraPosition({ x: 20, y: 20, z: 20 }, { x: 0, y: 0, z: 0 });
            } else if (viewName === '安全') {
                viewer.setCameraPosition({ x: 15, y: 5, z: -3 }, { x: 0, y: 5, z: 0 });
            } else if (viewName === '施工') {
                viewer.setCameraPosition({ x: -10, y: 15, z: 10 }, { x: 0, y: 5, z: 0 });
            }
        });
    });

    // 「画像を追加」ボタン
    const addBtn = document.getElementById('add-issue-btn');
    if (addBtn) {
        addBtn.addEventListener('click', () => {
            if (!currentClickPosition) {
                // 位置未定の場合はアラート
                alert("📷 追加したい場所を3Dモデル上でクリックしてから押してください。\n（またはモデル上の空間を直接クリックでもOKです！）");
            } else {
                uiManager.openCreateModal(currentClickPosition);
            }
        });
    }

    // クイックタグ (UIManagerで管理していないInput内部のイベント)
    const modal = document.getElementById('input-modal');
    modal.querySelectorAll('.tag').forEach(tag => {
        tag.addEventListener('click', () => {
            const textarea = modal.querySelector('textarea');
            textarea.value = tag.textContent + ' ' + textarea.value;
        });
    });

    // 保存ボタン (DB通信が必要なためMain.jsで処理)
    // UIManager側でもイベントリッスンしているが、それはUIエフェクトのみ
    const saveBtn = modal.querySelector('.save-btn');
    saveBtn.addEventListener('click', async () => {
        const text = modal.querySelector('textarea').value.trim();
        const priorityEl = modal.querySelector('input[name="priority"]:checked');
        const priority = priorityEl ? priorityEl.value : 'medium';

        if (!text) {
            alert('内容を入力してください');
            return;
        }

        // 3D位置
        // モーダルに保持されたdatasetから取得、なければグローバル変数
        let position = currentClickPosition;
        try {
            if (modal.dataset.position) {
                position = JSON.parse(modal.dataset.position);
            }
        } catch (e) { }

        if (!position) {
            // フォールバック: ランダム
            position = {
                x: (Math.random() - 0.5) * 10,
                y: 5 + Math.random() * 5,
                z: (Math.random() - 0.5) * 10
            };
        }

        // Issue作成データ
        const issueData = {
            title: text.substring(0, 100),
            description: text,
            priority: priority,
            status: 'open',
            position_x: position.x,
            position_y: position.y,
            position_z: position.z,
            camera_state: viewer.getCameraState()
        };

        console.log("💾 Issue保存中...", issueData);
        saveBtn.textContent = '保存中...';

        const { data, error } = await createIssue(issueData);

        if (error) {
            console.error("Issue保存エラー:", error);
            alert('保存に失敗しました: ' + error.message);
            saveBtn.textContent = '保存する！'; // リセット
            return;
        }

        // 成功時の処理

        // 1. ピンを追加
        const newPinData = {
            id: data.id,
            position: position,
            priority: issueData.priority,
            title: issueData.title,
            description: issueData.description,
            status: issueData.status,
            created_at: new Date().toISOString()
        };
        viewer.addPinFromData(newPinData);

        // 2. クリーンアップ
        currentClickPosition = null;
        saveBtn.textContent = '保存する！'; // エフェクト後に戻るはずだが念のため

        // UIマネージャーが閉じる処理を行う（少し遅延させて、エフェクトを見せる）
        setTimeout(() => {
            // ここで明示的に閉じなくてもUIManager側で閉じるならOKだが、確実性のため
            // uiManager.closeModal(); 
            // ※ UIManager側で saveBtn click -> 500ms後に close となっているので任せる

            showNotification('📌 保存しました！');
        }, 500);
    });
}



/**
 * 通知を表示
 */
function showNotification(message) {
    // 既存の通知を削除
    const existing = document.querySelector('.notification');
    if (existing) existing.remove();

    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        bottom: 2rem;
        left: 50%;
        transform: translateX(-50%);
        background: #4CAF50;
        color: white;
        padding: 1rem 2rem;
        border-radius: 8px;
        font-family: var(--font-hand);
        font-size: 1.2rem;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        z-index: 1000;
        animation: slideUp 0.3s ease;
    `;

    document.body.appendChild(notification);

    // 3秒後に消える
    setTimeout(() => {
        notification.style.animation = 'fadeOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

