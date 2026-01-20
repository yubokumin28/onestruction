/**
 * TaskBarManager - スケジュール管理の統合クラス
 * Event Delegationを使用して動的要素にも対応
 */
export class TaskBarManager {
    constructor(scheduleBodySelector = '.schedule-body') {
        this.scheduleBody = document.querySelector(scheduleBodySelector);
        if (!this.scheduleBody) {
            console.error('❌ スケジュールコンテナが見つかりません:', scheduleBodySelector);
            return;
        }

        // リサイズ状態管理
        this.resizeState = {
            isResizing: false,
            target: null, // 'top' or 'bottom'
            taskBar: null,
            startY: 0,
            startTop: 0,
            startHeight: 0
        };

        // ドラッグ状態管理
        this.dragState = {
            isDragging: false,
            taskBar: null,
            startY: 0,
            startTop: 0
        };

        this.init();
    }

    init() {
        // Event Delegation: 親要素で全イベントをキャッチ
        this.scheduleBody.addEventListener('mousedown', this.handleMouseDown.bind(this));
        document.addEventListener('mousemove', this.handleMouseMove.bind(this));
        document.addEventListener('mouseup', this.handleMouseUp.bind(this));

        // 既存タスクバーにハンドルを追加
        this.addHandlesToExistingTaskBars();

        console.log('✅ TaskBarManager initialized');
    }

    /**
     * 既存のタスクバーにリサイズハンドルを追加
     */
    addHandlesToExistingTaskBars() {
        const taskBars = this.scheduleBody.querySelectorAll('.task-bar');
        taskBars.forEach(bar => {
            if (!bar.querySelector('.task-resize-handle')) {
                this.addResizeHandles(bar);
            }
        });
        console.log(`✅ リサイズハンドル追加: ${taskBars.length}個のタスクバー`);
    }

    /**
     * タスクバーにリサイズハンドルを追加
     */
    addResizeHandles(taskBar) {
        // 上端ハンドル
        const topHandle = document.createElement('div');
        topHandle.className = 'task-resize-handle top';
        topHandle.setAttribute('data-handle', 'top');
        taskBar.appendChild(topHandle);

        // 下端ハンドル
        const bottomHandle = document.createElement('div');
        bottomHandle.className = 'task-resize-handle bottom';
        bottomHandle.setAttribute('data-handle', 'bottom');
        taskBar.appendChild(bottomHandle);
    }

    /**
     * マウスダウン処理（リサイズ or ドラッグの判定）
     */
    handleMouseDown(e) {
        // リサイズハンドルかチェック
        const handle = e.target.closest('.task-resize-handle');
        if (handle) {
            e.stopPropagation();
            const taskBar = handle.closest('.task-bar');
            if (!taskBar) return;

            this.resizeState.isResizing = true;
            this.resizeState.target = handle.dataset.handle; // 'top' or 'bottom'
            this.resizeState.taskBar = taskBar;
            this.resizeState.startY = e.clientY;
            this.resizeState.startTop = parseInt(taskBar.style.top) || 0;
            this.resizeState.startHeight = parseInt(taskBar.style.height) || 40;
            return;
        }

        // タスクバー本体のドラッグ
        const taskBar = e.target.closest('.task-bar');
        if (taskBar) {
            this.dragState.isDragging = true;
            this.dragState.taskBar = taskBar;
            this.dragState.startY = e.clientY;
            this.dragState.startTop = parseInt(taskBar.style.top) || 0;
        }
    }

    /**
     * マウス移動処理
     */
    handleMouseMove(e) {
        // リサイズ処理
        if (this.resizeState.isResizing) {
            const deltaY = e.clientY - this.resizeState.startY;
            const taskBar = this.resizeState.taskBar;

            if (this.resizeState.target === 'top') {
                // 上端リサイズ（開始時刻変更）
                let newTop = this.resizeState.startTop + deltaY;
                newTop = Math.round(newTop / 40) * 40; // 40pxスナップ

                const newHeight = this.resizeState.startHeight - (newTop - this.resizeState.startTop);

                if (newHeight >= 40 && newTop >= 0) {
                    taskBar.style.top = newTop + 'px';
                    taskBar.style.height = newHeight + 'px';
                }
            } else if (this.resizeState.target === 'bottom') {
                // 下端リサイズ（終了時刻変更）
                let newHeight = this.resizeState.startHeight + deltaY;
                newHeight = Math.round(newHeight / 40) * 40; // 40pxスナップ

                if (newHeight >= 40) {
                    taskBar.style.height = newHeight + 'px';
                }
            }
            return;
        }

        // ドラッグ処理
        if (this.dragState.isDragging) {
            const deltaY = e.clientY - this.dragState.startY;
            let newTop = this.dragState.startTop + deltaY;
            newTop = Math.round(newTop / 40) * 40; // 40pxスナップ

            if (newTop >= 0) {
                this.dragState.taskBar.style.top = newTop + 'px';
            }
        }
    }

    /**
     * マウスアップ処理（確定）
     */
    handleMouseUp() {
        if (this.resizeState.isResizing) {
            const taskBar = this.resizeState.taskBar;
            const newTop = parseInt(taskBar.style.top) || 0;
            const newHeight = parseInt(taskBar.style.height) || 40;

            // 時刻計算
            const startTime = 8 + (newTop / 40) * 0.25;
            const endTime = startTime + (newHeight / 40) * 0.25;

            const formatTime = (time) => {
                const hours = Math.floor(time);
                const minutes = Math.round((time - hours) * 60);
                return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
            };

            console.log(`📅 タスク時間を調整: ${formatTime(startTime)} ~ ${formatTime(endTime)}`);

            // リセット
            this.resizeState = {
                isResizing: false,
                target: null,
                taskBar: null,
                startY: 0,
                startTop: 0,
                startHeight: 0
            };
        }

        if (this.dragState.isDragging) {
            console.log('📅 タスクバーを移動しました');
            this.dragState = {
                isDragging: false,
                taskBar: null,
                startY: 0,
                startTop: 0
            };
        }
    }

    /**
     * 新規タスクバーを追加する
     */
    addTaskBar(laneSelector, startTime, duration, label = '新規タスク') {
        const lane = this.scheduleBody.querySelector(laneSelector);
        if (!lane) {
            console.error('❌ レーンが見つかりません:', laneSelector);
            return;
        }

        // 時刻をpxに変換（8:00を0pxとする、15分=40px）
        const topPx = (startTime - 8) * 4 * 40;
        const heightPx = duration * 4 * 40;

        const taskBar = document.createElement('div');
        taskBar.className = 'task-bar';
        taskBar.style.top = topPx + 'px';
        taskBar.style.height = heightPx + 'px';
        taskBar.textContent = label;

        this.addResizeHandles(taskBar);
        lane.appendChild(taskBar);

        console.log(`✅ タスクバー追加: ${label} (${startTime}:00, ${duration}h)`);
    }
}
