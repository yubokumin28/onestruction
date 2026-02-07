// タスクバーリサイズ機能（I-V-6: P0）
// Phase 2: P0タスク - タスクバー両端ドラッグ調整

// グローバル変数
let resizeTarget = null; // 'top' | 'bottom' | null
let resizeItem = null;   // リサイズ中のタスクバー要素
let resizeStartY = 0;    // マウス開始Y座標
let resizeStartTop = 0;  // タスクバー元のtop値
let resizeStartHeight = 0; // タスクバー元のheight値

/**
 * タスクバーにリサイズハンドルを追加
 * @param {HTMLElement} taskBar - タスクバー要素
 */
export function addResizeHandles(taskBar) {
    // 上端ハンドル
    const topHandle = document.createElement('div');
    topHandle.className = 'task-resize-handle top';
    taskBar.appendChild(topHandle);

    // 下端ハンドル
    const bottomHandle = document.createElement('div');
    bottomHandle.className = 'task-resize-handle bottom';
    taskBar.appendChild(bottomHandle);

    // 上端ハンドルのイベント
    topHandle.addEventListener('mousedown', (e) => {
        e.stopPropagation(); // 親のドラッグを阻止
        resizeTarget = 'top';
        resizeItem = taskBar;
        resizeStartY = e.clientY;
        resizeStartTop = parseInt(taskBar.style.top) || 0;
        resizeStartHeight = parseInt(taskBar.style.height) || 40;
    });

    // 下端ハンドルのイベント
    bottomHandle.addEventListener('mousedown', (e) => {
        e.stopPropagation(); // 親のドラッグを阻止
        resizeTarget = 'bottom';
        resizeItem = taskBar;
        resizeStartY = e.clientY;
        resizeStartTop = parseInt(taskBar.style.top) || 0;
        resizeStartHeight = parseInt(taskBar.style.height) || 40;
    });
}

/**
 * リサイズ処理の初期化（グローバルイベントリスナー）
 */
export function initResizeHandlers() {
    // グローバル mousemove
    document.addEventListener('mousemove', (e) => {
        if (!resizeTarget) return;

        const deltaY = e.clientY - resizeStartY;

        if (resizeTarget === 'top') {
            // 上端リサイズ（開始時刻変更）
            let newTop = resizeStartTop + deltaY;
            // 40px単位にスナップ（15分単位）
            newTop = Math.round(newTop / 40) * 40;

            // 新しい高さを計算
            const newHeight = resizeStartHeight - (newTop - resizeStartTop);

            // 最小高さ40px（15分）を確保
            if (newHeight >= 40 && newTop >= 0) {
                resizeItem.style.top = newTop + 'px';
                resizeItem.style.height = newHeight + 'px';
            }
        } else if (resizeTarget === 'bottom') {
            // 下端リサイズ（終了時刻変更）
            let newHeight = resizeStartHeight + deltaY;
            // 40px単位にスナップ
            newHeight = Math.round(newHeight / 40) * 40;

            // 最小高さ40px（15分）を確保
            if (newHeight >= 40) {
                resizeItem.style.height = newHeight + 'px';
            }
        }
    });

    // グローバル mouseup
    document.addEventListener('mouseup', () => {
        if (resizeTarget && resizeItem) {
            // 変更後の時刻を計算して通知
            const newTop = parseInt(resizeItem.style.top) || 0;
            const newHeight = parseInt(resizeItem.style.height) || 40;

            // ピクセル → 時刻変換（8:00基準、40px = 15分）
            const startTime = 8 + (newTop / 40) * 0.25;
            const endTime = startTime + (newHeight / 40) * 0.25;

            // 通知表示
            showTimeChangeNotification(startTime, endTime);

            // データ保存（外部関数を呼び出し）
            if (typeof saveScheduleData === 'function') {
                saveScheduleData();
            }

            // リサイズモード終了
            resizeTarget = null;
            resizeItem = null;
        }
    });
}

/**
 * 時刻変更の通知を表示
 */
function showTimeChangeNotification(startTime, endTime) {
    const formatTime = (time) => {
        const hours = Math.floor(time);
        const minutes = Math.round((time - hours) * 60);
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    };

    const message = `📅 タスク時間を調整: ${formatTime(startTime)} ~ ${formatTime(endTime)}`;

    // showNotification関数が存在すればそれを使用
    if (typeof showNotification === 'function') {
        showNotification(message);
    } else {
        // フォールバック: コンソール出力
        console.log(message);
    }
}
