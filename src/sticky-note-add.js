/**
 * 付箋追加機能 - スタンドアロン版
 * ツールバーの🗒️ボタンから新規付箋を追加
 */

document.addEventListener('DOMContentLoaded', () => {
    const stickyNoteButton = document.querySelector('[data-tool="sticky-note"]');

    if (stickyNoteButton) {
        stickyNoteButton.addEventListener('click', () => {
            createNewStickyNote();
        });
        console.log('✅ 付箋追加ボタンのイベントリスナーを登録しました');
    }
});

function createNewStickyNote() {
    const container = document.getElementById('sticky-container');
    if (!container) {
        console.error('❌ sticky-containerが見つかりません');
        return;
    }

    // 新規付箋のID生成
    const noteId = 'note-' + Date.now();

    // ランダムな位置（画面中央付近）
    const randomX = Math.random() * 200 - 100; // -100 ~ 100
    const randomY = Math.random() * 200 - 100;
    const centerX = window.innerWidth / 2 + randomX;
    const centerY = window.innerHeight / 2 + randomY;

    // 付箋要素を作成
    const note = document.createElement('div');
    note.className = 'sticky-note draggable yellow';
    note.dataset.id = noteId;
    note.style.top = centerY + 'px';
    note.style.left = centerX + 'px';
    note.style.width = '200px';
    note.style.height = '150px';

    // 付箋の内容
    note.innerHTML = `
        <div class="note-content">
            <textarea class="note-textarea handwritten" placeholder="メモを入力...">${new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })} に追加</textarea>
        </div>
        <div class="settings-area">
            <button class="icon-btn gear-btn" title="設定">⚙️</button>
            <button class="icon-btn delete-btn" title="削除">🗑️</button>
        </div>
    `;

    container.appendChild(note);

    // ドラッグ機能を追加（既存の関数があれば使用）
    if (typeof setupStickyNote === 'function') {
        setupStickyNote(note);
    }

    // データ保存
    if (typeof saveStickyData === 'function') {
        saveStickyData();
    }

    // 通知
    console.log('📝 新しい付箋を追加しました:', noteId);
    if (typeof showNotification === 'function') {
        showNotification('📝 付箋を追加しました');
    }

    // テキストエリアにフォーカス
    const textarea = note.querySelector('textarea');
    if (textarea) {
        textarea.focus();
        textarea.select();
    }
}

// グローバルに公開
window.createNewStickyNote = createNewStickyNote;
