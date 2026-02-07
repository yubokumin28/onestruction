// タスク管理関数を追加

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
        { name: 'carpenter', label: '大工', color: 'var(--lane-carpenter)' },
        { name: 'rebar', label: '鉄筋', color: 'var(--lane-rebar)' },
        { name: 'concrete', label: '生コン', color: 'var(--lane-concrete)' },
        { name: 'electrical', label: '電気', color: 'var(--lane-electrical)' }
    ];

    const palette = document.createElement('div');
    palette.className = 'task-color-palette';
    palette.style.cssText = `
        position: absolute;
        top: -50px;
        left: 50%;
        transform: translateX(-50%);
        background: white;
        border: 2px solid var(--gray-300);
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
