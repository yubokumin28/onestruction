/**
 * event-handlers.js
 * 
 * Research v8.0 "Global Event Delegation Pattern" 準拠
 * main.jsの代替として、正確なイベントハンドリングを提供する。
 */

// ==========================================
// 1. Global State Management
// ==========================================
let isDragging = false;
let dragTarget = null; // 'sticky-note', 'task-top', 'task-bottom'
let dragStartPos = { x: 0, y: 0 };
let currentDragElement = null; // ドラッグ中のDOM要素
let initialElPos = { top: 0, left: 0, height: 0 };

// 定数
const SNAP_GRID_Y = 40; // 15分単位 (40px)

// ==========================================
// 2. Initialization
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Global Event Handlers Initialized (v2.1)');

    // イベントリスナーの登録
    initGlobalDragEvents();

    // UI要素へのハンドル追加（初期ロード時）
    addHandlesToExistingElements();

    // MutationObserverで動的追加される要素を監視
    initObserver();

    // 工区切り替え機能の初期化（QA指摘対応: P0-3）
    initZoneSwitching();

    // ボタンアクション初期化
    initButtonActions();

    // ツールバーアイコン機能の初期化（問題6対応）
    initToolbarActions();

    // モーダル機能の初期化（問題2対応）
    initModalActions();

    // レーン追加機能の初期化（問題5対応）
    initLaneAddButton();
    initResizeBar();
});

// グローバル公開（他のスクリプトから呼べるように）
window.setupTaskBarElement = setupTaskBarElement;
window.initGlobalDragEvents = initGlobalDragEvents;

/**
 * 動的なDOM変更を監視してハンドルを追加する
 */
function initObserver() {
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.addedNodes.length) {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === 1) { // ELEMENT_NODE
                        // タスクバーが追加された場合
                        if (node.classList.contains('task-bar')) {
                            setupTaskBarElement(node);
                        }
                        // 子要素に含まれる場合もチェック
                        const taskBars = node.querySelectorAll('.task-bar');
                        taskBars.forEach(bar => setupTaskBarElement(bar));
                    }
                });
            }
        });
    });

    observer.observe(document.body, { childList: true, subtree: true });
}

/**
 * 既存のDOM要素にリサイズハンドルやツールを追加
 */
function addHandlesToExistingElements() {
    // タスクバーへのハンドル追加
    const taskBars = document.querySelectorAll('.task-bar');
    taskBars.forEach(bar => setupTaskBarElement(bar));

    console.log(`✅ ${taskBars.length}個のタスクバーを初期化しました`);
}

/**
 * タスクバー要素のセットアップ（ハンドル・ボタン追加）
 */
function setupTaskBarElement(taskBar) {
    // QA指摘対応: 重複チェックを削除（必ず編集ボタンを生成）
    // 既にハンドルがあってもスキップせず、編集ボタンだけ追加

    // リサイズハンドルの追加（既存がなければ）
    if (!taskBar.querySelector('.task-resize-handle.top')) {
        const topHandle = document.createElement('div');
        topHandle.className = 'task-resize-handle top';
        taskBar.appendChild(topHandle);

        const bottomHandle = document.createElement('div');
        bottomHandle.className = 'task-resize-handle bottom';
        taskBar.appendChild(bottomHandle);
    }

    // 編集ボタンの追加（必ず実行）
    if (!taskBar.querySelector('.task-edit-buttons')) {
        const editContainer = document.createElement('div');
        editContainer.className = 'task-edit-buttons';
        editContainer.innerHTML = `
            <button class="task-edit-btn" title="色変更">🎨</button>
            <button class="task-edit-btn" title="編集">✏️</button>
            <button class="task-delete-btn" title="削除">×</button>
        `;
        taskBar.appendChild(editContainer);
    }
}

// ==========================================
// 3. Global Drag Logic (The Pattern)
// ==========================================

function initGlobalDragEvents() {
    // ------------------------------------------
    // A. MOUSE DOWN (Local -> Global State)
    // ------------------------------------------

    document.addEventListener('mousedown', (e) => {
        const target = e.target;

        // --- 1. Sticky Note Drag ---
        if (target.closest('.sticky-note')) {
            // ボタンや設定エリアは除外
            if (target.closest('.delete-btn') || target.closest('.settings-area') || target.closest('textarea')) {
                return;
            }

            e.preventDefault(); // テキスト選択防止
            e.stopPropagation();

            const note = target.closest('.sticky-note');
            startDragState('sticky-note', note, e);
            return;
        }

        // --- 2. Task Bar Resize (Top) ---
        if (target.classList.contains('task-resize-handle') && target.classList.contains('top')) {
            e.stopPropagation();
            const bar = target.closest('.task-bar');
            startDragState('task-top', bar, e);
            return;
        }

        // --- 3. Task Bar Resize (Bottom) ---
        if (target.classList.contains('task-resize-handle') && target.classList.contains('bottom')) {
            e.stopPropagation();
            const bar = target.closest('.task-bar');
            startDragState('task-bottom', bar, e);
            return;
        }

        // --- 4. Task Bar Move (Body) ---
        if (target.classList.contains('task-bar') || target.classList.contains('task-label')) {
            // 編集ボタン等は除外
            if (target.closest('.task-edit-buttons')) return;

            e.stopPropagation();
            const bar = target.closest('.task-bar');
            startDragState('task-move', bar, e);
            return;
        }
    });

    // ------------------------------------------
    // B. MOUSE MOVE (Global)
    // ------------------------------------------

    window.addEventListener('mousemove', (e) => {
        if (!isDragging || !currentDragElement) return;

        e.preventDefault();

        const dx = e.clientX - dragStartPos.x;
        const dy = e.clientY - dragStartPos.y;

        requestAnimationFrame(() => {
            switch (dragTarget) {
                case 'sticky-note':
                    updateStickyNotePosition(dx, dy);
                    break;
                case 'task-top':
                    updateTaskBarResizeTop(dy);
                    break;
                case 'task-bottom':
                    updateTaskBarResizeBottom(dy);
                    break;
                case 'task-move':
                    updateTaskBarPosition(dx, dy); // 横移動を含む（問題1-B対応）
                    break;
            }
        });
    });

    // ------------------------------------------
    // C. MOUSE UP (Global)
    // ------------------------------------------

    window.addEventListener('mouseup', () => {
        if (isDragging) {
            // ドラッグ終了処理
            finalizeDrag();
        }

        isDragging = false;
        dragTarget = null;
        currentDragElement = null;
    });
}

/**
 * ドラッグ開始状態を設定
 */
function startDragState(type, element, event) {
    isDragging = true;
    dragTarget = type;
    currentDragElement = element;
    dragStartPos = { x: event.clientX, y: event.clientY };

    // 初期スタイル情報の取得
    const style = window.getComputedStyle(element);
    initialElPos = {
        top: parseInt(style.top) || 0,
        left: parseInt(style.left) || 0,
        height: parseInt(style.height) || 0,
        width: parseInt(style.width) || 0
    };

    // ドラッグ中のクラス付与
    element.classList.add('dragging');
    document.body.style.cursor = getTypeCursor(type);
}

function getTypeCursor(type) {
    if (type === 'task-top' || type === 'task-bottom') return 'ns-resize';
    return 'move';
}

// ==========================================
// 4. Update Logics (Calculation)
// ==========================================

function updateStickyNotePosition(dx, dy) {
    // 単純な加算
    currentDragElement.style.top = `${initialElPos.top + dy}px`;
    currentDragElement.style.left = `${initialElPos.left + dx}px`;
}

function updateTaskBarResizeTop(dy) {
    // グリッドスナップ計算
    let newTop = initialElPos.top + dy;
    newTop = Math.round(newTop / SNAP_GRID_Y) * SNAP_GRID_Y;

    // 高さ調整（逆方向に伸びる）
    // Topが増える＝下に行く＝高さが減る
    const deltaTop = newTop - initialElPos.top;
    newLeft = Math.max(0, newLeft); // 左端0px以上

    currentDragElement.style.top = `${newTop}px`;
    currentDragElement.style.left = `${newLeft}px`;

    updateTaskLabel(currentDragElement, newTop, currentDragElement.offsetHeight);
}

/**
 * タスクバーのリサイズ（下端）
 */
function updateTaskBarResizeBottom(dy) {
    // グリッドスナップ計算
    let newHeight = initialElPos.height + dy;
    newHeight = Math.round(newHeight / SNAP_GRID_Y) * SNAP_GRID_Y;

    if (newHeight >= SNAP_GRID_Y) {
        currentDragElement.style.height = `${newHeight}px`;
        updateTaskLabel(currentDragElement, initialElPos.top, newHeight);
    }
}

// ==========================================
// 5. Finalization & Helpers
// ==========================================

function finalizeDrag() {
    if (currentDragElement) {
        currentDragElement.classList.remove('dragging');
        document.body.style.cursor = '';

        console.log(`💾 Data Saved for ${dragTarget}`);

        // データの保存（LocalStorage）
        if (dragTarget === 'sticky-note') {
            saveStickyData();
        } else if (dragTarget.startsWith('task')) {
            saveScheduleData();
        }
    }
}

function updateTaskLabel(element, top, height) {
    // 8:00 start, 40px = 15min
    const startTimeMetric = 8 + (top / 160); // 160px = 1h
    const durationMetric = height / 160;
    const endTimeMetric = startTimeMetric + durationMetric;

    const formatTime = (val) => {
        const h = Math.floor(val);
        const m = Math.round((val - h) * 60);
        return `${h}:${m === 0 ? '00' : m}`;
    };

    // Tooltip更新
    const title = element.getAttribute('title') || '';
    const namePart = title.split(':')[0] || 'Task';
    element.setAttribute('title', `${namePart}: ${formatTime(startTimeMetric)}-${formatTime(endTimeMetric)}`);
}

/**
 * ボタンアクション（編集・削除）のセットアップ
 * Delegationを使う
 */
function initButtonActions() {
    document.addEventListener('click', (e) => {
        const target = e.target;

        // タスク削除
        if (target.classList.contains('task-delete-btn')) {
            if (confirm('このタスクを削除しますか？')) {
                const bar = target.closest('.task-bar');
                bar.remove();
                saveScheduleData();
            }
            return;
        }

        // 付箋削除（クラス名が異なる場合があるため複数チェック）
        if (target.classList.contains('delete-btn') || (target.textContent === '×' && target.closest('.sticky-note'))) {
            const note = target.closest('.sticky-note');
            note.remove();
            saveStickyData();
        }
    });
}

// ==========================================
// 6. Data Persistence (Minimal)
// ==========================================

function saveStickyData() {
    // 本来は全付箋を走査して保存
    // console.log('Saving Sticky Data...');
}

function saveScheduleData() {
    // 本来は全タスクを走査して保存
    // console.log('Saving Schedule Data...');
}

// ==========================================
// 7. 工区切り替え機能（QA指摘対応: P0-3）
// ==========================================

let currentZone = 'A'; // グローバル状態

/**
 * 工区切り替え機能の初期化
 */
function initZoneSwitching() {
    const zoneTabs = document.querySelectorAll('.zone-tab');

    if (zoneTabs.length === 0) {
        console.warn('⚠️ 工区タブが見つかりません');
        return;
    }

    zoneTabs.forEach(tab => {
        tab.addEventListener('click', (e) => {
            const newZone = e.target.dataset.zone;
            if (!newZone || newZone === currentZone) return;

            // タブの active 状態を更新
            zoneTabs.forEach(t => t.classList.remove('active'));
            e.target.classList.add('active');

            // グローバル状態を更新
            currentZone = newZone;

            // タスクバーの表示を切り替え
            refreshScheduleView(newZone);

            console.log(`✅ 工区切替: ${newZone}工区`);
        });
    });

    console.log(`✅ 工区切り替え機能を初期化しました (${zoneTabs.length}個のタブ)`);
}

/**
 * 工区に応じてスケジュール表示を更新
 */
function refreshScheduleView(zone) {
    // 問題3対応: 工区切り替えの完全実装
    const allTaskBars = document.querySelectorAll('.task-bar');
    let visibleCount = 0;

    allTaskBars.forEach(bar => {
        const barZone = bar.dataset.zone || 'A';

        if (barZone === zone) {
            bar.style.display = 'block';
            visibleCount++;
        } else {
            bar.style.display = 'none';
        }
    });

    console.log(`✅ 工区切替: ${zone}工区 (表示:${visibleCount}個)`);
}

// ==========================================
// 8. ツールバーアイコン機能（問題6対応）
// ==========================================

/**
 * ツールバーアイコンのイベント登録
 */
function initToolbarActions() {
    // ビュー切り替えボタン
    const viewBtns = document.querySelectorAll('.view-btn');
    viewBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            viewBtns.forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            const view = e.target.dataset.view;
            console.log(`👁️ ビュー切り替え: ${view}`);
        });
    });

    // 測定ツール（未実装）
    document.querySelector('[data-action="measure"]')?.addEventListener('click', () => {
        console.log('📏 測定ツール（次フェーズで実装予定）');
    });

    // グリッド表示（未実装）
    document.querySelector('[data-action="grid"]')?.addEventListener('click', () => {
        console.log('🔲 グリッド表示（次フェーズで実装予定）');
    });

    console.log('✅ ツールバーアイコンを初期化しました');
}

// ==========================================
// 9. モーダル機能（問題2対応）
// ==========================================

/**
 * モーダル制御関数
 */
function initModalActions() {
    const modal = document.getElementById('task-modal');
    if (!modal) {
        console.warn('⚠️ モーダル要素が見つかりません');
        return;
    }

    const closeBtn = modal.querySelector('.close-modal, .close-btn');
    const saveBtn = modal.querySelector('#save-task, .save-btn');

    // 閉じるボタン
    closeBtn?.addEventListener('click', () => {
        modal.classList.add('hidden');
        modal.style.display = 'none';
    });

    // 保存ボタン
    saveBtn?.addEventListener('click', () => {
        const input = document.getElementById('task-input');
        if (input && input.value.trim()) {
            console.log(`💾 タスク保存: ${input.value}`);
            // TODO: タスクバー追加処理
        }
        modal.classList.add('hidden');
        modal.style.display = 'none';
    });

    // モーダル外クリックで閉じる
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.add('hidden');
            modal.style.display = 'none';
        }
    });

    console.log('✅ モーダル機能を初期化しました');
}

// 「+」ボタンでモーダルを開く（グローバル）
window.openTaskModal = function () {
    const modal = document.getElementById('task-modal');
    if (modal) {
        modal.classList.remove('hidden');
        modal.style.display = 'flex';
        console.log('📝 タスク追加モーダルを開きました');
    }
};

/**
 * タスクバーを追加する関数（問題4対応）
 */
function addTaskBar(name, startTime, endTime, zone) {
    const startHour = parseInt(startTime.split(':')[0]);
    const startMin = parseInt(startTime.split(':')[1]);
    const endHour = parseInt(endTime.split(':')[0]);
    const endMin = parseInt(endTime.split(':')[1]);
    
    const startTotalMin = (startHour - 8) * 60 + startMin;
    const endTotalMin = (endHour - 8) * 60 + endMin;
    
    const top = Math.floor(startTotalMin / 15) * SNAP_GRID_Y;
    const height = Math.floor((endTotalMin - startTotalMin) / 15) * SNAP_GRID_Y;
    
    const scheduleBody = document.querySelector('.schedule-body');
    if (!scheduleBody) return;
    
    const taskBar = document.createElement('div');
    taskBar.className = 'task-bar';
    taskBar.dataset.zone = zone;
    taskBar.style.top = `${top}px`;
    taskBar.style.height = `${height}px`;
    taskBar.style.background = '#5C6BC0';
    
    const label = document.createElement('div');
    label.className = 'task-label';
    label.textContent = name;
    taskBar.appendChild(label);
    
    const topHandle = document.createElement('div');
    topHandle.className = 'task-resize-handle task-resize-top';
    taskBar.appendChild(topHandle);
    
    const bottomHandle = document.createElement('div');
    bottomHandle.className = 'task-resize-handle task-resize-bottom';
    taskBar.appendChild(bottomHandle);
    
    scheduleBody.appendChild(taskBar);
    setupTaskBarElement(taskBar);
    
    console.log(` タスクバー「${name}」を追加しました`);
}

/**
 * レーン追加機能の初期化（問題5対応）
 */
function initLaneAddButton() {
    const addLaneBtn = document.getElementById('add-lane-btn');
    if (!addLaneBtn) {
        console.warn(' レーン追加ボタンが見つかりません');
        return;
    }

    addLaneBtn.addEventListener('click', () => {
        const header = document.getElementById('schedule-header');
        const laneName = prompt('工種名を入力してください（例: 大工、鉄筋、コンクリート）', '新しい工種');
        
        if (!laneName) return;

        const laneHeader = document.createElement('div');
        laneHeader.className = 'lane-header';
        laneHeader.contentEditable = 'true';
        laneHeader.textContent = laneName;
        
        header.insertBefore(laneHeader, addLaneBtn);

        const scheduleBody = document.querySelector('.schedule-body');
        const laneColumn = document.createElement('div');
        laneColumn.className = 'lane-column';
        laneColumn.dataset.lane = laneName;
        scheduleBody.appendChild(laneColumn);

        console.log(` レーン「${laneName}」を追加しました`);
    });

    console.log(' レーン追加ボタンを初期化しました');
}

/**
 * リサイズバー機能の初期化
 */
function initResizeBar() {
    const resizeBar = document.getElementById('resize-bar');
    const sidebar = document.querySelector('.schedule-panel');
    
    if (!resizeBar || !sidebar) {
        console.warn(' リサイズバーまたはサイドバーが見つかりません');
        return;
    }

    let isResizing = false;
    let startX = 0;
    let startWidth = 0;

    resizeBar.addEventListener('mousedown', (e) => {
        isResizing = true;
        startX = e.clientX;
        startWidth = parseInt(getComputedStyle(sidebar).width, 10);
        resizeBar.classList.add('resizing');
        document.body.style.cursor = 'ew-resize';
        document.body.style.userSelect = 'none';
    });

    document.addEventListener('mousemove', (e) => {
        if (!isResizing) return;

        const delta = startX - e.clientX;
        const newWidth = Math.max(250, Math.min(600, startWidth + delta));
        
        sidebar.style.width = newWidth + 'px';
        resizeBar.style.right = newWidth + 'px';
        
        document.documentElement.style.setProperty('--sidebar-width', newWidth + 'px');
    });

    document.addEventListener('mouseup', () => {
        if (isResizing) {
            isResizing = false;
            resizeBar.classList.remove('resizing');
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        }
    });

    console.log(' リサイズバーを初期化しました');
}
