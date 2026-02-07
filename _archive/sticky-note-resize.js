/**
 * 付箋リサイズ機能 - スタンドアロン版
 * Phase 4 (P2): I-V-11
 */

document.addEventListener('DOMContentLoaded', () => {
    // 既存の付箋にリサイズハンドルを追加
    const existingNotes = document.querySelectorAll('.sticky-note');
    existingNotes.forEach(note => {
        if (!note.querySelector('.resize-handle')) {
            addResizeHandle(note);
        }
    });

    // MutationObserverで新規付箋を監視
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            mutation.addedNodes.forEach((node) => {
                if (node.classList && node.classList.contains('sticky-note')) {
                    if (!node.querySelector('.resize-handle')) {
                        addResizeHandle(node);
                    }
                }
            });
        });
    });

    const container = document.getElementById('sticky-container');
    if (container) {
        observer.observe(container, { childList: true });
    }

    console.log('✅ 付箋リサイズ機能を初期化しました');
});

function addResizeHandle(note) {
    // リサイズハンドルを作成
    const handle = document.createElement('div');
    handle.className = 'resize-handle';
    note.appendChild(handle);

    let isResizing = false;
    let startX, startY, startWidth, startHeight;

    handle.addEventListener('mousedown', (e) => {
        e.stopPropagation(); // QA修正: ドラッグ競合解消 (P2)
        e.preventDefault();  // デフォルト動作も阻止

        isResizing = true;
        startX = e.clientX;
        startY = e.clientY;
        startWidth = parseInt(window.getComputedStyle(note).width, 10);
        startHeight = parseInt(window.getComputedStyle(note).height, 10);

        note.classList.add('resizing');
    });

    document.addEventListener('mousemove', (e) => {
        if (!isResizing) return;

        const deltaX = e.clientX - startX;
        const deltaY = e.clientY - startY;

        let newWidth = startWidth + deltaX;
        let newHeight = startHeight + deltaY;

        // 最小サイズ制限（design_spec.md準拠）
        const minWidth = 150;
        const minHeight = 100;

        newWidth = Math.max(newWidth, minWidth);
        newHeight = Math.max(newHeight, minHeight);

        note.style.width = newWidth + 'px';
        note.style.height = newHeight + 'px';
    });

    document.addEventListener('mouseup', () => {
        if (isResizing) {
            isResizing = false;
            note.classList.remove('resizing');

            // データ保存
            if (typeof saveStickyData === 'function') {
                saveStickyData();
            }

            console.log('📝 付箋サイズを変更:', note.dataset.id, {
                width: note.style.width,
                height: note.style.height
            });
        }
    });
}

// グローバルに公開
window.addResizeHandle = addResizeHandle;
