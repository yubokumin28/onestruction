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
// event-handlers.jsを一時的に無効化（main.jsとの競合を解決）
// import './event-handlers.js';

// グローバル状態
let viewer = null;
let uiManager = null;
let currentClickPosition = null;  // 3Dクリック位置
let issues = [];                  // Issue一覧

// Main entry point - モジュールスクリプトのタイミング問題を解決
const initApp = async () => {
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
    viewer.init(); // BIMViewerの初期化を実行
    // 3Dクリックイベントを設定
    viewer.onClickPosition = (result) => {
        if (result.type === 'pin') {
            uiManager.showIssuePopup(result.data, result.screenPosition);
        } else if (result.type === 'space') {
            currentClickPosition = result.position;
            uiManager.closePopup();
            uiManager.openCreateModal(result.position);
        } else {
            currentClickPosition = result;
            uiManager.closePopup();
            uiManager.openCreateModal(result);
        }
    };

    // Setup UI Interactions
    setupInteractions(viewer, uiManager);

    // Initialize Features (Merged from duplicate listener)
    initScheduleApp();

    // Issue一覧を読み込み
    await loadIssues();

    // 保存済み視点を読み込み
    await loadCameraViews();
};

// モジュールスクリプトは遅延実行されるため、DOMが既にloadingでない可能性がある
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    // DOMが既に読み込まれている場合は即座に実行
    initApp();
}

// ... (functions) ...

/**
 * 通知を表示 (Global公開)
 */
window.showNotification = function (message) {
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
        font-family: 'Yomogi', cursive;
        font-size: 1.2rem;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        z-index: 2000;
        animation: slideUp 0.3s ease;
    `;
    document.body.appendChild(notification);
    setTimeout(() => {
        notification.style.animation = 'fadeOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
};

// 重複していたDOMContentLoadedリスナー(L1084以降)は削除しました。

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
    // ツールボタン (design_spec v3.1 §3.1対応)
    const toolBtns = document.querySelectorAll('.tool-btn');
    let activeTool = null;

    toolBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tool = btn.dataset.tool;

            // アクティブ状態の切り替え
            toolBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            activeTool = tool;

            // ツール別の処理
            switch (tool) {
                case 'sticky':
                    // 付箋作成: ツールバーから直接追加 (v3.3)
                    createNewStickyNote();
                    break;
                case 'load':
                    // ファイル選択ダイアログを開く
                    const fileInput = document.getElementById('file-input');
                    if (fileInput) fileInput.click();
                    break;
                case 'photo':
                    // 入力モーダルを開く（画像追加機能）
                    uiManager.openCreateModal(currentClickPosition || { x: 0, y: 5, z: 0 });
                    break;
                case 'settings':
                    // 設定パネルを開く
                    document.getElementById('settings-panel').classList.remove('hidden');
                    break;
                case 'measure':
                    // 測定モードを開始
                    if (viewer && viewer.startMeasurementMode) {
                        viewer.startMeasurementMode();
                        showNotification('📏 測定モード: 2点をクリックしてください');
                    } else {
                        showNotification('⚠️ 測定機能はビューアー初期化後に使用できます');
                    }
                    break;
            }
        });
    });

    // ファイル入力処理 (v3.3)
    const fileInput = document.getElementById('file-input');

    if (fileInput) {
        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                const file = e.target.files[0];
                const fileName = file.name;
                const fileExt = fileName.split('.').pop().toLowerCase();

                console.log('📂 ファイル選択:', fileName);

                // .rvt ファイルの場合は警告モーダルを表示
                if (fileExt === 'rvt') {
                    const rvtModal = document.getElementById('rvt-warning-modal');
                    if (rvtModal) {
                        rvtModal.classList.remove('hidden');

                        // OKボタンのイベントリスナー (一度だけ登録)
                        const okBtn = document.getElementById('rvt-ok-btn');
                        if (okBtn) {
                            okBtn.onclick = () => {
                                rvtModal.classList.add('hidden');
                                loadModelWithOverlay(fileName, viewer);
                            };
                        }
                    }
                } else {
                    // IFCなど他のファイルは直接ロード
                    loadModelWithOverlay(fileName, viewer);
                }
            }
        });
    }

    // ファイルロード処理を関数化
    function loadModelWithOverlay(fileName, viewer) {
        const loadingOverlay = document.getElementById('loading-overlay');

        // ロード画面表示
        if (loadingOverlay) loadingOverlay.classList.remove('hidden');

        // 擬似ロード処理
        setTimeout(() => {
            if (loadingOverlay) loadingOverlay.classList.add('hidden');
            // サンプルモデル読み込み実行
            if (viewer) viewer.loadSampleModel(fileName);
            showNotification(`📄 ${fileName} を読み込みました`);
        }, 1500);
    }

    const canvasContainer = document.querySelector('.paper-canvas-container');
    const loadingOverlay = document.getElementById('loading-overlay');

    if (canvasContainer && loadingOverlay) {
        // ドラッグ中
        canvasContainer.addEventListener('dragover', (e) => {
            e.preventDefault();
            loadingOverlay.classList.remove('hidden');
        });

        // ドラッグ離脱
        canvasContainer.addEventListener('dragleave', (e) => {
            // 子要素への移動でも発火するため、ターゲット確認が必要だが簡略化
            if (e.relatedTarget && !canvasContainer.contains(e.relatedTarget)) {
                loadingOverlay.classList.add('hidden');
            }
        });

        // ドロップ
        canvasContainer.addEventListener('drop', (e) => {
            e.preventDefault();
            // オーバーレイは表示したまま処理開始

            let fileName = "DropFile.rvt";
            if (e.dataTransfer.files.length > 0) {
                fileName = e.dataTransfer.files[0].name;
            }

            setTimeout(() => {
                loadingOverlay.classList.add('hidden');
                // サンプルモデル読み込み実行
                if (viewer) viewer.loadSampleModel(fileName);
                showNotification(`📄 ${fileName} を読み込みました`);
            }, 1500);
        });
    }

    // ビュー切り替えボタン (setupViewControls関数に移行済み)

    // スタンプセレクター (design_spec v3.1 §2.2対応)
    let selectedStamp = 'stamp_memo';
    const stampBtns = document.querySelectorAll('.stamp-btn');
    stampBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            stampBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            selectedStamp = btn.dataset.stamp;
            console.log('📝 スタンプ選択:', selectedStamp);
        });
    });

    // 設定パネル
    const settingsPanel = document.getElementById('settings-panel');
    if (settingsPanel) {
        settingsPanel.querySelector('.close-btn').addEventListener('click', () => {
            settingsPanel.classList.add('hidden');
        });
    }

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
        const stampEl = modal.querySelector('.stamp-btn.active');
        const markupType = stampEl ? stampEl.dataset.stamp : 'stamp_memo'; // スタンプ種類取得

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
            markup_type: markupType, // スタンプ種類保存
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
            markup_type: issueData.markup_type, // スタンプ種類反映
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

// (旧バージョンの付箋機能コードを削除済み)



// =================================================================
// v5.0 スケジュール管理機能
// =================================================================

// 簡易永続化 (P1)
function saveData() {
    try {
        localStorage.setItem('onestruction_schedule', JSON.stringify(scheduleData));
        // console.log('💾 保存完了');
    } catch (e) { console.error(e); }
}

function loadData() {
    try {
        const s = localStorage.getItem('onestruction_schedule');
        if (s) scheduleData = JSON.parse(s);
    } catch (e) { console.error(e); }
}

// 工区ごとの独立したデータ管理
let scheduleData = {
    'A': {
        lanes: ['大工', '鉄筋屋', '生コン', '電気工'],
        tasks: [
            { laneIndex: 0, top: 0, height: 320, text: '作業中' },
            { laneIndex: 1, top: 0, height: 480, text: '作業中' },
            { laneIndex: 2, top: 0, height: 480, text: '作業中' },
            { laneIndex: 3, top: 0, height: 480, text: '作業中' }
        ]
    },
    'B': {
        lanes: [],
        tasks: []
    },
    'C': {
        lanes: ['検査'],
        tasks: []
    }
};

// -----------------------------------------------------------------
// グローバルドラッグ管理 (v7.0: 列間移動機能追加)
// -----------------------------------------------------------------
let dragTarget = null; // 'task' | 'note' | null
let dragItem = null;   // DOM Element
let dragStartPos = { x: 0, y: 0 };
let dragItemStart = { top: 0, left: 0 };
let hasDragged = false;
const DRAG_THRESHOLD = 5;
let dragOverLaneIndex = null; // ドラッグ中にホバーしている列番号
let dragOriginalLaneIndex = null; // ドラッグ開始時の列番号

document.addEventListener('mousemove', (e) => {
    if (!dragTarget || !dragItem) return;

    const deltaX = e.clientX - dragStartPos.x;
    const deltaY = e.clientY - dragStartPos.y;

    if (!hasDragged && (Math.abs(deltaX) > DRAG_THRESHOLD || Math.abs(deltaY) > DRAG_THRESHOLD)) {
        hasDragged = true;
        // ドラッグ開始時の処理
        if (dragTarget === 'note') {
            dragItem.classList.add('dragging');
            // テキストエリアのフォーカスを外す（編集終了）
            const textarea = dragItem.querySelector('textarea');
            if (textarea) textarea.blur();
        } else if (dragTarget === 'task') {
            dragItem.style.cursor = 'grabbing';
            dragItem.style.zIndex = 100;
            dragItem.classList.add('dragging-horizontal');
            // 元の列番号を保存
            if (dragItem._taskData) {
                dragOriginalLaneIndex = dragItem._taskData.laneIndex;
            }
        }
    }

    if (hasDragged) {
        e.preventDefault(); // テキスト選択などを防止
        if (dragTarget === 'note') {
            // 付箋: 全方向移動
            // 親座標系への変換は簡易計算
            dragItem.style.top = (dragItemStart.top + deltaY) + 'px';
            dragItem.style.left = (dragItemStart.left + deltaX) + 'px';
            dragItem.style.right = 'auto'; // right無効化
        } else if (dragTarget === 'task') {
            // タスクバー: 縦方向(Y)のみ、40pxグリッドにスナップ
            let newTop = dragItemStart.top + deltaY;

            // 40pxグリッドにスナップ(15分単位)
            newTop = Math.round(newTop / 40) * 40;

            // 範囲制限(0～2320px = 17:00まで)
            if (newTop < 0) newTop = 0;
            if (newTop > 2160) newTop = 2160; // 最大17:00

            dragItem.style.top = newTop + 'px';

            // 横方向: ドロップ先の列を検出してハイライト
            const laneIndex = detectLaneFromX(e.clientX);
            if (laneIndex !== null && laneIndex !== dragOverLaneIndex) {
                clearLaneHighlights();
                highlightLane(laneIndex);
                dragOverLaneIndex = laneIndex;
            }
        }
    }
});

document.addEventListener('mouseup', (e) => {
    if (!dragTarget) return;

    if (hasDragged) {
        // ドラッグ完了処理
        if (dragTarget === 'note') {
            dragItem.classList.remove('dragging');
            dragItem.style.zIndex = ''; // リセット
            saveStickyData(); // 保存
        } else if (dragTarget === 'task') {
            dragItem.style.cursor = '';
            dragItem.style.zIndex = '';
            dragItem.classList.remove('dragging-horizontal');

            // タスクバーの位置をデータに反映
            const newTop = parseInt(dragItem.style.top);
            const taskData = dragItem._taskData;

            if (taskData) {
                taskData.top = newTop;

                // 列移動の処理
                const dropLaneIndex = detectLaneFromX(e.clientX);
                if (dropLaneIndex !== null && dropLaneIndex !== dragOriginalLaneIndex) {
                    // 列を移動
                    moveTaskToLane(dragItem, taskData, dropLaneIndex);
                    const laneName = scheduleData[currentZone].lanes[dropLaneIndex];
                    window.showNotification(`📋 タスクを「${laneName}」列に移動しました`);
                } else {
                    // 時刻のみ変更
                    const newTime = topToTime(newTop);
                    window.showNotification(`📅 タスク時刻を ${newTime} に変更しました`);
                }

                saveData(); // データ保存
            }

            // ハイライトをクリア
            clearLaneHighlights();
        }
    } else {
        // ドラッグしなかった場合（クリックのみ）
        if (dragTarget === 'task') {
            // インプレース編集
            const currentText = dragItem.innerText;
            // promptはblockingなのでtimeoutで逃がす
            setTimeout(() => {
                const newText = prompt('タスク内容を編集:', currentText);
                if (newText !== null && newText !== currentText) {
                    dragItem.innerText = newText;
                    if (dragItem._taskData) {
                        dragItem._taskData.text = newText;
                        saveData();
                    }
                    showNotification('タスクを更新しました');
                }
            }, 10);
        }
    }

    // クリーンアップ
    dragTarget = null;
    dragItem = null;
    dragStartPos = { x: 0, y: 0 };
    dragItemStart = { top: 0, left: 0 };
    hasDragged = false;
    dragOverLaneIndex = null;
    dragOriginalLaneIndex = null;
});

/**
 * top位置を時刻に変換 (40px = 15分)
 */
function topToTime(top) {
    const minutes = (top / 40) * 15 + 8 * 60; // 8:00基準
    const hours = Math.floor(minutes / 60);
    const mins = Math.floor(minutes % 60);
    return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

/**
 * マウスのX座標から列番号を検出
 * @param {number} clientX - マウスのX座標
 * @returns {number|null} - 列番号、または検出できない場合はnull
 */
function detectLaneFromX(clientX) {
    const scheduleBody = document.getElementById('schedule-body');
    if (!scheduleBody) return null;

    const lanes = scheduleBody.querySelectorAll('.lane');
    if (lanes.length === 0) return null;

    for (let i = 0; i < lanes.length; i++) {
        const rect = lanes[i].getBoundingClientRect();
        if (clientX >= rect.left && clientX <= rect.right) {
            return i;
        }
    }

    return null;
}

/**
 * 指定した列をハイライト
 * @param {number} laneIndex - 列番号
 */
function highlightLane(laneIndex) {
    const scheduleBody = document.getElementById('schedule-body');
    if (!scheduleBody) return;

    const lanes = scheduleBody.querySelectorAll('.lane');
    if (lanes[laneIndex]) {
        lanes[laneIndex].classList.add('drop-target');
    }
}

/**
 * すべての列のハイライトをクリア
 */
function clearLaneHighlights() {
    const scheduleBody = document.getElementById('schedule-body');
    if (!scheduleBody) return;

    const lanes = scheduleBody.querySelectorAll('.lane');
    lanes.forEach(lane => lane.classList.remove('drop-target'));
}

/**
 * タスクを別の列に移動
 * @param {HTMLElement} taskElement - タスクバーのDOM要素
 * @param {Object} taskData - タスクデータ
 * @param {number} newLaneIndex - 移動先の列番号
 */
function moveTaskToLane(taskElement, taskData, newLaneIndex) {
    // データを更新
    taskData.laneIndex = newLaneIndex;

    // DOM要素を移動
    const scheduleBody = document.getElementById('schedule-body');
    if (!scheduleBody) return;

    const lanes = scheduleBody.querySelectorAll('.lane');
    if (lanes[newLaneIndex]) {
        // 古い列から削除
        taskElement.remove();

        // 新しい列に追加
        lanes[newLaneIndex].appendChild(taskElement);

        // アニメーション効果
        taskElement.classList.add('moving');
        setTimeout(() => {
            taskElement.classList.remove('moving');
        }, 300);
    }
}

let currentZone = 'A';

/**
 * スケジュールアプリ初期化
 */
function initScheduleApp() {
    // 1. タブ切り替えリスナー
    const tabs = document.querySelectorAll('.zone-tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            // データ切り替え
            currentZone = tab.dataset.zone;
            console.log(`📍 工区切り替え: ${currentZone}工区`);
            renderSchedule();
        });

        // タブ名編集
        tab.addEventListener('blur', () => console.log(`✏️ 工区名変更: ${tab.innerText}`));
        tab.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') { e.preventDefault(); tab.blur(); }
        });
    });

    // 2. 列追加ボタン
    const addBtn = document.getElementById('add-lane-btn');
    if (addBtn) {
        addBtn.addEventListener('click', () => {
            const laneName = prompt('新しい列名（職種）を入力:', '新規職種');
            if (laneName) {
                scheduleData[currentZone].lanes.push(laneName);
                saveData(); // 保存
                renderSchedule();
                showNotification(`➕ 列「${laneName}」を追加しました`);
            }
        });
    }

    // 3. 初回レンダリング
    loadData(); // データを復元
    renderSchedule();

    // 4. ビュー切り替えの初期化 (P0修正)
    setupViewControls();
}

/**
 * ビュー切り替え機能 (独立関数化)
 */
function setupViewControls() {
    const viewBtns = document.querySelectorAll('.view-btn');
    if (viewBtns.length === 0) return;

    viewBtns.forEach(btn => {
        // 既存リスナー重複防止は行わないが、DOM再生成されない限りOK
        btn.addEventListener('click', (e) => {
            viewBtns.forEach(b => b.classList.remove('active'));
            // e.targetがiタグかもしれないので、btnそのものを操作
            btn.classList.add('active');

            const viewType = btn.dataset.view;
            if (!viewer) return;

            console.log(`📷 View change: ${viewType}`);
            switch (viewType) {
                case 'overview':
                    viewer.setCameraPosition({ x: 20, y: 20, z: 20 }, { x: 0, y: 0, z: 0 });
                    break;
                case 'plan':
                    viewer.setCameraPosition({ x: 0, y: 50, z: 0 }, { x: 0, y: 0, z: 0 });
                    break;
                case 'section':
                    viewer.setCameraPosition({ x: 50, y: 5, z: 0 }, { x: 0, y: 5, z: 0 });
                    break;
            }
        });
    });
}

/**
 * スケジュール描画
 */
function renderSchedule() {
    const data = scheduleData[currentZone];
    if (!data) return;

    const header = document.getElementById('schedule-header');
    const body = document.getElementById('schedule-body');

    // --- ヘッダー更新 ---
    // .lane-header を一度削除して再生成
    header.querySelectorAll('.lane-header').forEach(el => el.remove());
    const addBtn = document.getElementById('add-lane-btn');

    data.lanes.forEach((name, index) => {
        const div = document.createElement('div');
        div.className = 'lane-header';
        div.contentEditable = 'true'; // 編集可能に
        div.textContent = name;
        div.dataset.laneIndex = index;

        // 編集完了時にデータを保存
        div.addEventListener('blur', (e) => {
            const newName = div.textContent.trim();
            if (newName && newName !== name) {
                data.lanes[index] = newName;
                saveData();
                window.showNotification(`✏️ レーン名を「${newName}」に変更しました`);
            } else if (!newName) {
                // 空の場合は元に戻す
                div.textContent = name;
            }
        });

        // Enterキーで編集完了
        div.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                div.blur();
            }
        });

        header.insertBefore(div, addBtn);
    });

    // --- ボディ更新 ---
    // .lane を削除
    body.querySelectorAll('.lane').forEach(el => el.remove());

    // グリッドレイアウト適用
    // 60px (時刻) + 1fr...
    const gridStyle = `60px ${'1fr '.repeat(data.lanes.length).trim()}`;
    body.style.gridTemplateColumns = gridStyle;
    header.style.gridTemplateColumns = gridStyle;
    header.style.display = 'grid'; // CSSで未定義の場合の保険

    // レーン生成
    data.lanes.forEach((name, index) => {
        const lane = document.createElement('div');
        lane.className = `lane lane-${index}`;

        // レーンに「+」ボタンを追加
        const addTaskBtn = document.createElement('button');
        addTaskBtn.className = 'add-task-btn';
        addTaskBtn.textContent = '+';
        addTaskBtn.title = 'タスクを追加';
        addTaskBtn.addEventListener('click', () => {
            addTaskToLane(index);
        });
        lane.appendChild(addTaskBtn);

        // タスク生成
        const taskItems = data.tasks.filter(t => t.laneIndex === index);
        taskItems.forEach(task => {
            const bar = document.createElement('div');
            bar.className = `task-bar ${task.color ? 'task-' + task.color : ''}`;
            bar.style.top = task.top + 'px';
            bar.style.height = task.height + 'px';

            // テキスト + アイコンの構造化
            const taskText = document.createElement('span');
            taskText.className = 'task-text';
            taskText.textContent = task.text;

            const taskIcons = document.createElement('span');
            taskIcons.className = 'task-icons';
            taskIcons.innerHTML = `
                <button class="task-icon-btn color-icon" title="色変更">🎨</button>
                <button class="task-icon-btn edit-icon" title="編集">✏️</button>
                <button class="task-icon-btn delete-icon" title="削除">×</button>
            `;

            bar.appendChild(taskText);
            bar.appendChild(taskIcons);
            bar.title = `${name}: ${formatTime(task.top)}-${formatTime(task.top + task.height)}`;

            // データをDOM要素に紐付け
            bar._taskData = task;

            // アイコンのイベント設定
            const colorBtn = bar.querySelector('.color-icon');
            const editBtn = bar.querySelector('.edit-icon');
            const deleteBtn = bar.querySelector('.delete-icon');

            // 色選択
            if (colorBtn) {
                colorBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    showTaskColorPicker(task, bar);
                });
            }

            // 編集
            if (editBtn) {
                editBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    openTaskEditModal(task, bar);
                });
            }

            // 削除
            if (deleteBtn) {
                deleteBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (confirm('このタスクを削除しますか？')) {
                        deleteTask(task);
                    }
                });
            }

            lane.appendChild(bar);
            setupTaskBar(bar);
        });

        body.appendChild(lane);
    });
}

/**
 * 簡易時間フォーマット (例: 0 -> 8:00)
 * 15min = 40px, start = 8:00
 */
function formatTime(px) {
    const totalMinutes = (px / 40) * 15;
    const hours = 8 + Math.floor(totalMinutes / 60);
    const minutes = Math.round(totalMinutes % 60);
    return `${hours}:${minutes.toString().padStart(2, '0')}`;
}

/**
 * タスクバーの挙動設定 (ドラッグ＆ドロップ、インプレース編集)
 */
function setupTaskBar(bar) {
    // ドラッグ＆ドロップセットアップ (グローバルハンドラ利用)
    bar.addEventListener('mousedown', (e) => {
        // アイコンボタンのクリックは除外
        if (e.target.classList.contains('task-icon-btn')) {
            return;
        }

        dragTarget = 'task';
        dragItem = bar;
        dragStartPos = { x: e.clientX, y: e.clientY };
        dragItemStart = { top: parseInt(bar.style.top || 0), left: 0 }; // left未使用
        hasDragged = false;

        // CSS cursor
        bar.style.cursor = 'grabbing';
        bar.style.zIndex = 100;
        e.stopPropagation(); // 親への伝播防止
    });

    // CSSでcursor: grabを指定することを推奨
    bar.style.cursor = 'grab';
}

/**
 * タスク詳細モーダルを開く
 */
function openTaskDetailModal(task) {
    // 簡易実装: アラートで詳細を表示
    alert(`📒 タスク詳細\n\n名前: ${task.text}\n位置: ${task.top}px\n高さ: ${task.height}px\nレーン: ${task.laneIndex}`);
}

// v3.3追加: スケジュールバーのDnD機能 (initScheduleAppから分離)
function initDraggableSchedule() {
    // renderScheduleがタスクバーを生成し、setupTaskBarを呼び出すため、
    // ここでは特に何もしない。
    // もし動的にタスクバーを追加する機能がある場合は、その都度setupTaskBarを呼び出す。
}

// v3.4追加: 工区タブ切り替え機能 (initScheduleAppから分離)
function initZoneTabs() {
    const tabs = document.querySelectorAll('.zone-tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            const zone = tab.dataset.zone;
            currentZone = zone; // currentZoneを更新
            console.log(`📍 工区切り替え: ${zone}工区`);
            renderSchedule(); // タブ切り替え時にスケジュールを再描画
        });

        tab.addEventListener('blur', () => {
            console.log(`✏️ 工区名変更: ${tab.innerText}`);
        });

        tab.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                tab.blur();
            }
        });
    });
}

// ==========================================================================
// 付箋機能 (v3.6更新: エリア分離版)
// ==========================================================================

// ==========================================================================
// 付箋データ永続化 (LocalStorage)
// ==========================================================================

const STICKY_STORAGE_KEY = 'onestruction_sticky_notes';

/**
 * 付箋データをLocalStorageに保存
 */
function saveStickyData() {
    const container = document.getElementById('sticky-container');
    if (!container) return;

    const stickyData = [];
    container.querySelectorAll('.sticky-note').forEach(note => {
        const textarea = note.querySelector('.note-textarea');
        const data = {
            id: note.dataset.id,
            text: textarea ? textarea.value : '',
            color: [...note.classList].find(c => ['yellow', 'pink', 'blue', 'green'].includes(c)) || 'yellow',
            top: note.style.top,
            left: note.style.left,
            right: note.style.right
        };
        stickyData.push(data);
    });

    localStorage.setItem(STICKY_STORAGE_KEY, JSON.stringify(stickyData));
    console.log('📌 付箋データ保存:', stickyData.length, '枚');
}

/**
 * LocalStorageから付箋データを復元
 */
function loadStickyData() {
    const container = document.getElementById('sticky-container');
    if (!container) return;

    const savedData = localStorage.getItem(STICKY_STORAGE_KEY);
    if (!savedData) {
        console.log('📌 保存された付箋データがありません（初回起動）');
        return;
    }

    try {
        const stickyData = JSON.parse(savedData);
        console.log('📌 付箋データ復元:', stickyData.length, '枚');

        // 既存のHTMLの付箋を全削除（復元データで上書き）
        container.innerHTML = '';

        // 保存データから復元
        stickyData.forEach(data => {
            const note = document.createElement('div');
            note.className = `sticky-note draggable ${data.color}`;
            note.dataset.id = data.id;
            note.style.top = data.top;
            if (data.left) note.style.left = data.left;
            if (data.right) note.style.right = data.right;

            note.innerHTML = `
                <div class="drag-handle" style="height: 20px; background: rgba(0,0,0,0.1); cursor: grab; border-radius: 2px 2px 0 0;"></div>
                <div class="note-content">
                  <textarea class="note-textarea handwritten">${data.text}</textarea>
                </div>
                <div class="settings-area">
                  <button class="settings-handle" title="設定">⚙️</button>
                  <div class="color-options collapsed">
                    <span class="color-dot yellow" data-color="yellow"></span>
                    <span class="color-dot pink" data-color="pink"></span>
                    <span class="color-dot blue" data-color="blue"></span>
                    <span class="color-dot green" data-color="green"></span>
                  </div>
                  <button class="delete-btn" title="削除">×</button>
                </div>
            `;

            container.appendChild(note);
            setupStickyNote(note);
        });
    } catch (e) {
        console.error('❌ 付箋データ復元エラー:', e);
    }
}

/**
 * 付箋機能の初期化
 */
function initStickyNotes() {
    const container = document.getElementById('sticky-container');
    if (!container) return;

    // LocalStorageから付箋データを復元
    loadStickyData();

    // 既存の付箋にイベントを設定（復元後）
    container.querySelectorAll('.sticky-note').forEach(note => {
        setupStickyNote(note);
    });

    // 付箋作成モーダル（簡易互換）
    const stickyModal = document.getElementById('sticky-modal');
    if (stickyModal) {
        stickyModal.querySelector('.close-btn').addEventListener('click', () => {
            stickyModal.classList.add('hidden');
        });

        const colorOptions = stickyModal.querySelectorAll('.color-option');
        colorOptions.forEach(opt => {
            opt.addEventListener('click', () => {
                colorOptions.forEach(o => o.classList.remove('active'));
                opt.classList.add('active');
            });
        });

        document.getElementById('create-sticky-btn').addEventListener('click', () => {
            const text = document.getElementById('new-sticky-text').value.trim();
            const selectedColor = stickyModal.querySelector('.color-option.active')?.dataset.color || 'yellow';
            if (!text) { alert('メモを入力してください'); return; }
            createNewSticky(text, selectedColor);
            saveStickyData(); // 保存
            document.getElementById('new-sticky-text').value = '';
            stickyModal.classList.add('hidden');
            showNotification('📌 付箋を追加しました！');
        });
    }
}

/**
 * 付箋を新規作成 (v3.6 New Structure)
 */
function createNewSticky(text, color = 'yellow') {
    const container = document.getElementById('sticky-container');
    const id = 'note-' + Date.now();

    const note = document.createElement('div');
    note.className = `sticky-note draggable ${color}`;
    note.dataset.id = id;
    note.style.top = (100 + Math.random() * 200) + 'px';
    note.style.right = (350 + Math.random() * 100) + 'px';

    // エリア分離構造 (ドラッグハンドル追加)
    note.innerHTML = `
        <div class="drag-handle" style="height: 20px; background: rgba(0,0,0,0.1); cursor: grab; border-radius: 2px 2px 0 0;"></div>
        <div class="note-content">
          <textarea class="note-textarea handwritten">${text}</textarea>
        </div>
        <div class="settings-area">
          <button class="settings-handle" title="設定">⚙️</button>
          <div class="color-options collapsed">
            <span class="color-dot yellow" data-color="yellow"></span>
            <span class="color-dot pink" data-color="pink"></span>
            <span class="color-dot blue" data-color="blue"></span>
            <span class="color-dot green" data-color="green"></span>
          </div>
          <button class="delete-btn" title="削除">×</button>
        </div>
    `;

    container.appendChild(note);
    setupStickyNote(note);
}

/**
 * 付箋にイベントリスナーを設定 (v3.6)
 */
function setupStickyNote(note) {
    // 削除ボタン
    const deleteBtn = note.querySelector('.delete-btn');
    if (deleteBtn) {
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // 重要
            if (confirm('この付箋を削除しますか？')) {
                note.remove();
                saveStickyData(); // 削除時に保存
                window.showNotification('付箋を削除しました');
            }
        });
    }

    // ... (設定トグル等は変更なし) ...

    // ドラッグ＆ドロップセットアップ
    note.addEventListener('mousedown', (e) => {
        // 禁止ターゲット（ボタン、入力欄）を除外
        const target = e.target;
        // ドラッグハンドル、または note-content(余白) ならドラッグ可
        // TEXTAREA自体はドラッグ不可（テキスト選択のため）
        if (target.tagName === 'BUTTON' ||
            target.classList.contains('color-dot') ||
            target.tagName === 'TEXTAREA') {
            return;
        }

        // ドラッグ開始
        dragTarget = 'note';
        dragItem = note;
        dragStartPos = { x: e.clientX, y: e.clientY };

        const parentRect = note.parentElement.getBoundingClientRect();
        const noteRect = note.getBoundingClientRect();

        dragItemStart = {
            top: noteRect.top - parentRect.top,
            left: noteRect.left - parentRect.left
        };

        hasDragged = false;
        note.style.zIndex = 2000;

        // ハンドルを掴んでいる場合のみpreventDefaultしても良いが、
        // 汎用的にnote全体(裏側)でのドラッグも許容
        e.preventDefault();
    });
}

// ==========================================================================
// アプリケーション初期化（DOMContentLoaded）
// ==========================================================================

document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 アプリケーション起動');

    // 1. BIMViewer初期化
    const container = document.getElementById('three-canvas-container'); // 修正: bim-canvas → three-canvas-container
    if (!container) {
        console.error('❌ 3Dビューアコンテナが見つかりません');
        return;
    }
    const viewer = new BIMViewer(container);
    await viewer.init();
    window.viewer = viewer; // グローバル変数として保存（デバッグ用）

    // 2. UIManager初期化
    const uiManager = new UIManager();
    window.uiManager = uiManager;

    // 3. インタラクション設定（ツールバー、ビュー切り替え等）
    setupInteractions(viewer, uiManager);

    // 4. 付箋機能初期化
    initStickyNotes();

    // 5. スケジュール機能初期化（工区タブ、レンダリング、ビュー切り替え）
    initScheduleApp();

    console.log('✅ 初期化完了');
});

/**
 * 通知を表示 (Global公開)
 */
window.showNotification = function (message) {
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
        font-family: 'Yomogi', cursive;
        font-size: 1.2rem;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        z-index: 2000;
        animation: slideUp 0.3s ease;
    `;

    document.body.appendChild(notification);

    // 3秒後に消える
    setTimeout(() => {
        notification.style.animation = 'fadeOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
};

// =================================================================
// タスク管理関数
// =================================================================

/**
 * タスク削除
 */
function deleteTask(task) {
    const data = scheduleData[currentZone];
    const index = data.tasks.indexOf(task);
    if (index !== -1) {
        data.tasks.splice(index, 1);
        saveData();
        renderSchedule();
        window.showNotification('🗑️ タスクを削除しました');
    }
}

/**
 * タスクバー色選択パレット表示
 */
function showTaskColorPicker(task, taskBar) {
    // 既存のパレットを削除
    document.querySelectorAll('.task-color-palette').forEach(p => p.remove());

    const colors = [
        { name: 'carpenter', label: '大工', color: '#E57373' },
        { name: 'rebar', label: '鉄筋', color: '#64B5F6' },
        { name: 'concrete', label: '生コン', color: '#81C784' },
        { name: 'electrical', label: '電気', color: '#FFD54F' }
    ];

    const palette = document.createElement('div');
    palette.className = 'task-color-palette';
    palette.style.cssText = `
        position: absolute;
        top: -50px;
        left: 50%;
        transform: translateX(-50%);
        background: white;
        border: 2px solid #ddd;
        border-radius: 8px;
        padding: 8px;
        display: flex;
        gap: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 1000;
    `;

    colors.forEach(c => {
        const dot = document.createElement('div');
        dot.style.cssText = `
            width: 32px;
            height: 32px;
            background: ${c.color};
            border-radius: 50%;
            cursor: pointer;
            border: 2px solid transparent;
            transition: all 0.2s;
        `;
        dot.title = c.label;

        // ホバーエフェクト
        dot.addEventListener('mouseenter', () => {
            dot.style.border = '2px solid #333';
            dot.style.transform = 'scale(1.1)';
        });
        dot.addEventListener('mouseleave', () => {
            dot.style.border = '2px solid transparent';
            dot.style.transform = 'scale(1)';
        });

        dot.addEventListener('click', () => {
            task.color = c.name;
            taskBar.className = `task-bar task-${c.name}`;
            saveData();
            palette.remove();
            window.showNotification(`🎨 タスク色を「${c.label}」に変更しました`);
        });

        palette.appendChild(dot);
    });

    taskBar.appendChild(palette);

    // 外側クリックで閉じる
    setTimeout(() => {
        const closeHandler = (e) => {
            if (!palette.contains(e.target)) {
                palette.remove();
                document.removeEventListener('click', closeHandler);
            }
        };
        document.addEventListener('click', closeHandler);
    }, 10);
}

/**
 * 新しいタスクを追加
 */
function addTaskToLane(laneIndex) {
    const data = scheduleData[currentZone];
    const newTask = {
        laneIndex: laneIndex,
        top: 320, // デフォルト 10:00
        height: 160, // デフォルト 1時間
        text: '新しいタスク',
        color: 'carpenter' // デフォルト色
    };

    data.tasks.push(newTask);
    saveData();
    renderSchedule();

    window.showNotification('➕ 新しいタスクを追加しました');
}

// 重複していた showNotification 関数定義を削除し、上記 window.showNotification を使用
// (以前の function showNotification(message) { ... } はここで置換/削除される)
/**
 * タスク編集モーダルの簡易版
 */
function openTaskEditModal(task, taskBar) {
    const newText = prompt('タスク内容を編集', task.text);
    if (newText !== null && newText.trim() !== '' && newText !== task.text) {
        task.text = newText.trim();

        // タスクバーのテキストを更新
        const taskText = taskBar.querySelector('.task-text');
        if (taskText) {
            taskText.textContent = task.text;
        }

        saveData();
        window.showNotification(`✏️ タスク「${task.text}」を更新しました`);
    }
}

// ============================================================
// グリッド線スクロール同期機能 (infra_setup_guide.md 未完了タスク2)
// ============================================================
function initGridScrollSync() {
    const scheduleBody = document.querySelector('.schedule-body');
    if (!scheduleBody) return;

    scheduleBody.addEventListener('scroll', (e) => {
        const scrollTop = e.target.scrollTop;
        // グリッド背景のoffsetを調整してスクロール位置に同期
        e.target.style.backgroundPosition = `0 ${-scrollTop % 40}px`;
    });
}

// ============================================================
// リサイズバードラッグ機能 (infra_setup_guide.md 未完了タスク3)
// design_spec.md セクション4.4の仕様に従う
// ============================================================
function initResizeBar() {
    const resizeBar = document.getElementById('resize-bar');
    const mainContent = document.querySelector('.main-content');
    const paperCanvas = document.querySelector('.paper-canvas-container');
    const sidebar = document.querySelector('.notebook-sidebar');

    if (!resizeBar || !mainContent || !paperCanvas || !sidebar) {
        console.warn('⚠️ リサイズバー要素が見つかりません');
        return;
    }

    let isResizing = false;
    let startX = 0;
    let startCanvasWidth = 0;
    let startSidebarWidth = 0;

    resizeBar.addEventListener('mousedown', (e) => {
        isResizing = true;
        startX = e.clientX;
        startCanvasWidth = paperCanvas.offsetWidth;
        startSidebarWidth = sidebar.offsetWidth;

        resizeBar.classList.add('resizing');
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';

        e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
        if (!isResizing) return;

        const deltaX = e.clientX - startX;
        const newCanvasWidth = startCanvasWidth + deltaX;
        const newSidebarWidth = startSidebarWidth - deltaX;

        // 最小幅を設定（200px以上を維持）
        if (newCanvasWidth >= 200 && newSidebarWidth >= 200) {
            const totalWidth = mainContent.offsetWidth - 5; // リサイズバーの幅を引く
            const canvasFlexRatio = newCanvasWidth / totalWidth;
            const sidebarFlexRatio = newSidebarWidth / totalWidth;

            paperCanvas.style.flex = `${canvasFlexRatio}`;
            sidebar.style.flex = `${sidebarFlexRatio}`;
        }
    });

    document.addEventListener('mouseup', () => {
        if (isResizing) {
            isResizing = false;
            resizeBar.classList.remove('resizing');
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        }
    });
}

// ============================================================
// 初期化処理
// ============================================================
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        initGridScrollSync();
        initResizeBar();
    });
} else {
    // DOMContentLoadedが既に発火している場合
    initGridScrollSync();
    initResizeBar();
}
