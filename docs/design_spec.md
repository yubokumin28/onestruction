# 建設DXツール デザイン仕様書 (Design Specifications)

**作成者**: デザイナー担当  
**バージョン**: 12.0 (Interaction Fix Edition)  
**更新日**: 2026-01-18  
**適用範囲**: プロジェクト全体 (UI/UX, CSS, Interaction)  
**重要度**: 🔴 **Critical (P0実装のための完全ガイド)**  
**参照ドキュメント**: `final_quality_report.md` v16.0, `research.md` v8.0

---

## デザイナー担当です。

**Infrastructure and Database Engineer担当へ (重要メッセージ)**:
Report v16.0 で指摘された「見た目はあるが動かない」問題を解決するため、本仕様書では**見た目(CSS)**だけでなく**「振る舞い(Interaction/JS)」**の定義を厳格化しました。
特に **Section 5 (Interaction Rules)** は、Research担当が定めた `Event Delegation` パターンに準拠した実装指示となっています。必ずここを読み込んでください。

---

## 1. デザインコンセプト & 情報階層

**Theme: "Digital Analog" (デジタルだけどアナログな使い心地)**

現場監督が迷わず操作できるよう、以下の4層構造でUIを構築します。この優先順位を守ってください。

1.  **Action (操作) [最前面 / z-index: 2000]**
    *   **編集モーダル**。ユーザーが入力を完了するための集中エリア。
    *   **Rule**: 他の全ての要素の上に表示。ボタンサイズは**90px**必須。

2.  **Tools (道具) [前面・浮動 / z-index: 1000]**
    *   **上部ツールバー**。必要な時だけ現れる腰袋。
    *   **Rule**: 普段は隠れる(Auto-hide)。ホバー判定エリアを広くとり、ストレスなく呼び出せること。

3.  **Context (文脈) [前面・固定 / z-index: 20]**
    *   **スケジュール & 右パネル**。時間と設定の管理。
    *   **Rule**: 3D空間と連動。**ここでのドラッグ操作(タスクバー)が今回の最重要実装項目。**

4.  **Basis (土台) [最背面 / z-index: 0]**
    *   **3D現場空間**。全ての作業の基盤。
    *   **Rule**: タスクバーやモーダルに隠れても良いが、常に存在し続ける。

---

## 2. レイアウト定義 (CSS Grid System)

エンジニアは以下のCSSクラス構造をそのまま使用してください。

```css
/* 全体レイアウト */
.main-container {
  display: grid;
  grid-template-columns: 1fr 5px 400px; /* 3D空間 : リサイズバー : 右パネル */
  height: 100vh;
  overflow: hidden;
  position: relative;
}

/* 右サイドバー (Context層) */
.sidebar {
  display: flex;
  flex-direction: column;
  background-color: #F9F9F9; /* Paper White */
  border-left: 1px solid #CCC;
  /* ドラッグ中の文字選択防止 */
  user-select: none; 
}

/* スケジュールパネル */
.schedule-panel {
  flex: 1; /* 残りの高さを占有 */
  overflow-y: auto; /* スクロール必須 */
  position: relative;
  background: repeating-linear-gradient(
    to bottom,
    transparent 0,
    transparent 39px,
    #EEE 40px /* 15分刻みのグリッド線 */
  );
}
```

---

## 3. UIコンポーネント詳細 (P0 Required)

### 3.1 ツールバー (The "Tool Belt")
*   **サイズ**: ボタン **90px x 90px** (タップ領域確保)。アイコン **32px**。
*   **挙動**: 初期状態は上部20%のみ表示。ホバーで全表示。
*   **必須スタイル**:
    ```css
    .tools-header {
      position: absolute;
      top: 0; left: 0; right: 0;
      height: 114px; /* button 90 + margin */
      transform: translateY(-80%); /* Auto-hide */
      transition: transform 0.3s ease-out;
      z-index: 1000;
      /* 重要: ホバー判定エリアを下方向に拡張 */
      padding-bottom: 30px; 
      clip-path: inset(0 0 -30px 0); /* 拡張分を表示許可 */
    }
    .tools-header:hover {
      transform: translateY(0);
    }
    ```

### 3.2 編集モーダル (The "Workbench")
Report v14.0での指摘事項（小さすぎる）に対応した確定仕様です。

*   **HTML構造**:
    ```html
    <div class="modal">
      <div class="modal-header"><!-- Title & Icon --></div>
      <div class="modal-body">
         <!-- アイコン選択肢 (Grid Layout) -->
         <div class="icon-selector">
           <button class="icon-btn" data-icon="check">✅</button>
           <!-- ... -->
         </div>
         <!-- テキスト入力 -->
         <textarea class="comment-input" placeholder="状況を入力..."></textarea>
      </div>
      <div class="modal-footer">
        <button class="btn-cancel">キャンセル</button>
        <button class="btn-primary">保存</button>
      </div>
    </div>
    ```
*   **スタイル定義**:
    *   `.icon-btn`: **width: 90px; height: 90px;** font-size: 48px;
    *   `.comment-input`: font-size: 18px; min-height: 120px;
    *   `.btn-primary`: height: 50px; background: #2E7D32 (Safety Green);

---

## 4. アノテーションアイコン定義 (Assets)

Research v6.0/v8.0 に準拠し、以下の論理名とデザインを使用します。

| Icon Key | Logical Name | 表示 (Emoji) | 用途 |
| :--- | :--- | :--- | :--- |
| `stamp_check` | 完了 | ✅ | 作業完了報告 |
| `stamp_question`| 疑問 | ❓ | 指示書との不整合確認 |
| `stamp_alert` | 危険 | ⚠️ | 安全配慮、危険箇所 |
| `stamp_chat` | 相談 | 💬 | 監督・作業員間の協議 |
| `stamp_star` | 重要 | ⭐ | 特記事項 |
| `stamp_memo` | メモ | 📝 | その他備忘録 |

---

## 5. インタラクション仕様 (Critical JS Rules)

**ここが今回の最重要セクションです。**
静的なHTML/CSSだけでなく、以下の「動き」を実装してください。

### 5.1 タスクバー操作 (TaskBar Interaction)
ユーザーは「予定を変更する」ためにタスクバーを触ります。

*   **A. 時間変更 (Resize)**
    *   **トリガー**: タスクバーの**上端5px** または **下端5px** をドラッグ。
    *   **カーソル**: `ns-resize`
    *   **制約**: 15分単位 (40px) でスナップ。
    *   **JS実装ヒント**: `mousedown` イベントで `e.target` が `.resize-handle` かどうか判定。

*   **B. 時間帯移動 (Move)**
    *   **トリガー**: タスクバーの**中央部分**をドラッグ。
    *   **カーソル**: `move`
    *   **制約**: Y軸方向のみ移動可（レーン変更禁止）。長さ（所要時間）固定。
    *   **JS実装ヒント**: `transform: translate3d(0, y, 0)` で描画し、ドロップ時に `top` を更新。

*   **C. 編集メニュー表示 (Edit)**
    *   **トリガー**: タスクバーを**クリック**。
    *   **アクション**: タスクバーの右側に「編集ポップアップ（✏️ 🗑️）」を表示。
    *   **ステート**: `data-state="selected"` を付与し、CSSで枠線を太くする赤色にする。

### 5.2 付箋操作 (Sticky Note Interaction)
付箋は「画面上のどこにでも貼れるメモ」です。

*   **A. 生成 (Create)**
    *   ツールバーの `🗒️` ボタン押下で、画面中央に新規生成。
*   **B. 移動 (Drag)**
    *   付箋ヘッダー（色付き部分）をドラッグして自由移動。
    *   **重要**: `stopPropagation()` を確実に実装し、下層の3Dビュー操作（OrbitControls）をブロックすること。
*   **C. 削除 (Delete)**
    *   右上の `×` ボタン押下で即削除（DOMからremove）。

---

## 6. 実装チェックリスト (For Engineer)

コードを書く前に、このリストが全て ✅ になるイメージを持ってください。

- [ ] **ツールバー**: マウスを近づけるとスッと出てくるか？ ボタンは90pxで押しやすいか？
- [ ] **タスクバー**:
    - [ ] 上端・下端をつかんで時間が変えられるか？
    - [ ] 真ん中をつかんで移動できるか？
    - [ ] クリックして編集ボタンが出るか？
- [ ] **付箋**:
    - [ ] ドラッグ中に裏の3Dモデルが回転したりしないか？（イベントの遮断）
    - [ ] `×` ボタンで消せるか？
- [ ] **モーダル**:
    - [ ] 入力欄の文字は小さすぎないか(18px)？
    - [ ] 保存ボタンは緑色で目立つか？

---

**Good Luck, Engineer!**
この設計図通りに組めば、必ず現場で愛されるツールになります。
