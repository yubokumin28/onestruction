/**
 * ============================================================
 * 建設DXツール - UIマネージャー
 * ============================================================
 * モーダル、ポップアップ、サイドバーなどのUI操作を管理
 * ============================================================
 */

export class UIManager {
    constructor() {
        this.modal = document.getElementById('input-modal');
        this.closeBtn = this.modal.querySelector('.close-btn');
        this.saveBtn = this.modal.querySelector('.save-btn');
        this.cameraBtn = this.modal.querySelector('.camera-btn');
        this.popupContainer = document.getElementById('popup-container'); // Need to add this to HTML

        this.setupEventListeners();
    }

    setupEventListeners() {
        // モーダル閉じるボタン
        this.closeBtn.addEventListener('click', () => {
            this.closeModal();
        });

        // モーダル外側クリックで閉じる
        window.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.closeModal();
            }
        });

        // 保存ボタン（仮実装）
        this.saveBtn.addEventListener('click', () => {
            console.log("Saving issue...");
            // 本来はMain.jsでハンドリングするが、エフェクトだけここで
            this.saveBtn.classList.add('stamped');
            setTimeout(() => {
                this.saveBtn.classList.remove('stamped');
                this.closeModal();
            }, 500);
        });
    }

    /**
     * 新規Issue作成モーダルを開く
     * @param {Object} position 3D座標
     */
    openCreateModal(position) {
        // フォームをリセット
        this.modal.querySelector('textarea').value = '';
        const radios = this.modal.querySelectorAll('input[name="priority"]');
        radios.forEach(r => r.checked = r.value === 'medium');

        this.modal.classList.remove('hidden');
        this.modal.dataset.position = JSON.stringify(position); // 座標を保持

        // タイトル設定
        const titleEl = this.modal.querySelector('h2');
        titleEl.textContent = '📝 新規指摘事項';
        this.saveBtn.textContent = '保存する！';
    }

    /**
     * 既存Issue詳細ポップアップを表示
     * @param {Object} issue Issueデータ
     * @param {Object} screenPosition 画面上の座標 {x, y}
     */
    showIssuePopup(issue, screenPosition) {
        // 既存のポップアップがあれば削除
        if (this.currentPopup) {
            this.currentPopup.remove();
        }

        const popup = document.createElement('div');
        popup.className = `sticky-note-popup ${this.getPriorityColorClass(issue.priority)}`;
        popup.style.left = `${screenPosition.x}px`;
        popup.style.top = `${screenPosition.y}px`;

        // 付箋アニメーション用のスタイル
        popup.style.transform = 'scale(0) rotate(-5deg)';
        popup.style.transition = 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.27)';

        const dateStr = new Date(issue.created_at).toLocaleDateString('ja-JP');

        popup.innerHTML = `
            <div class="pin">📌</div>
            <button class="close-popup">×</button>
            <h3 class="handwritten">${issue.title}</h3>
            <p class="meta">📅 ${dateStr} | ${issue.status === 'open' ? '未対応' : '対応済'}</p>
            <p class="desc">${issue.description || '詳細なし'}</p>
            ${issue.image_url ? `<img src="${issue.image_url}" class="attachment-thumb" />` : ''}
            <div class="actions">
                <button class="edit-btn">編集</button>
                ${issue.status === 'open' ? '<button class="resolve-btn">解決!</button>' : ''}
            </div>
        `;

        document.body.appendChild(popup);
        this.currentPopup = popup;

        // 表示アニメーション
        setTimeout(() => {
            popup.style.transform = 'scale(1) rotate(0deg)';
        }, 10);

        // イベント設定
        popup.querySelector('.close-popup').addEventListener('click', (e) => {
            e.stopPropagation();
            this.closePopup();
        });

        // ドラッグ可能にするなどは今後の課題
    }

    closeModal() {
        this.modal.classList.add('hidden');
    }

    closePopup() {
        if (this.currentPopup) {
            this.currentPopup.style.transform = 'scale(0)';
            setTimeout(() => {
                this.currentPopup.remove();
                this.currentPopup = null;
            }, 300);
        }
    }

    getPriorityColorClass(priority) {
        switch (priority) {
            case 'high': return 'pink';
            case 'low': return 'blue';
            default: return 'yellow';
        }
    }
}
