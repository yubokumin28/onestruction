# BIM/CIM Webビューア・建設DXシステム 技術調査報告書

**作成者**: リサーチ担当  
**ステータス**: Version 8.0 (2026-01-18)  
**更新内容**: JSアーキテクチャの抜本的見直し（Classベース・Event Delegation導入）によるUI操作性不具合の根本解決定義。3Dモデル読み込みスコープの明確化。

---

## 1. プロジェクトミッションと技術方針

本ドキュメントは、プロジェクトにおける**「技術的な唯一の正解（Source of Truth）」**です。
Design Spec および Infra Setup Guide は、**必ず本ドキュメントの技術要件を満たす形**で記述・実装されなければなりません。

### 技術スタック
*   **CORE**: `@thatopen/components` (Version 2.x系)
*   **DB**: `Supabase`
*   **Architecture (UPDATE)**: 
    *   **Vanilla JS ES Modules (Class-based)**
    *   **Event Delegation Pattern** (動的要素の操作性確保のため必須)

### 開発スコープ（Version 8.0 Definition）
*   **Focus**: UI/UXのインタラクション完全動作（タスクバー操作、付箋操作）。
*   **Out of Scope**: `.rvt` / IFCファイルの実際のパース処理と表示（今回はモック/グリッドでの動作確認までとする）。

---

## 2. アプリケーションアーキテクチャ刷新 (Refactoring Mandate)

従来の「機能ごとに独立したJSファイルを読み込む」方式は、動的に生成される要素へのイベントハンドリングに失敗するため、**廃止**します。
代わりに、以下のクラスベース設計を採用し、`main.js` がオーケストレーターとして機能します。

### 2.1 推奨ディレクトリ構造
```
src/
├── main.js                (Entry Point: 各Managerの初期化)
├── modules/               (New Directory)
│   ├── TaskBarManager.js  (Schedule操作・Logic)
│   └── StickyNoteManager.js (Annotation操作・Logic)
├── lib/
│   └── supabase.js        (Data Access)
└── bim-viewer.js          (3D Viewer Logic)
```

### 2.2 Event Delegation（イベント委譲）の徹底
動的に追加・削除されるDOM要素（タスクバー、付箋）に対して個別に `addEventListener` を行う実装は**禁止**します。
必ず親コンテナ（`.schedule-body` や `#sticky-container`）でイベントをキャッチし、`e.target.closest(selector)` で操作対象を特定する実装としてください。

---

## 3. 3D空間仕様（Status Quo）

### 3.1 3D空間認識技術
*   **Axis Labels (軸ラベル)**: `CSS2DRenderer` (X:赤, Y:緑, Z:青)
*   **Axis Ticks (軸目盛り)**: 5m刻みのグリッドと数値ラベル
*   **Grid**: XY平面 (100m x 100m)

**(注)**: 本フェーズでは、これらがDOMとして存在し、JSから制御可能であることを確認できれば良しとします（3Dモデルが表示されなくてもOK）。

---

## 4. データ構造定義

### 4.1 アノテーション (Structured Annotations)
*   **Icon Types**: `stamp_check`, `stamp_question`, `stamp_alert`, `stamp_chat`, `stamp_star`, `stamp_memo`
*   **Schema**:
    ```json
    {
      "type": "point_marker",
      "icon": "stamp_alert",
      "position": { "x": 10.0, "y": 2.5, "z": -5.0 },
      "metadata": { "text": "...", "images": ["path/to/img"] }
    }
    ```

### 4.2 工区独立性 (Zone Independence)
*   `zone_id` ("A", "B", "C") によるデータ分離を徹底。
*   グローバルステート `currentZone` の変更検知により、表示データをリフレッシュする。

---

## 5. 新規UX実装技術要件 (Technical UI/UX Requirements)

### 5.1 UIサイズと操作性（P0）
*   **Mobile-First Targets**:
    *   主要ボタン: **90px x 90px**
    *   編集/削除ボタン: **50px** (Tap area include padding)
*   **Implementation**: CSS変数 `--tool-btn-size: 90px` の適用。

### 5.2 スケジュール操作ロジック (TaskBarManager)
*   **Vertical Resize**:
    *   タスクバーの上下端 (`div.resize-handle`) をドラッグ。
    *   **Snap**: 15分（40px）単位。
    *   **Logic**: `TaskBarManager.handleMouseDown` で一元管理。
*   **Drag & Drop**:
    *   タスクバー本体をドラッグして時間をシフト（開始・終了時間の差分を維持）。
    *   **Constraint**: 同一レーン内のみ移動可（左右移動禁止）。

### 5.3 付箋操作ロジック (StickyNoteManager)
*   **Creation**:
    *   ツールバーの `🗒️` ボタン押下 → `StickyNoteManager.createNote()` 呼び出し。
    *   配置座標: 画面中央付近にランダムオフセット。
*   **Interaction**:
    *   ドラッグ移動、リサイズ、削除（×ボタン）、色変更。
    *   これら全てのイベントを `#sticky-container` 上のリスナーで処理すること。

---

## 6. 次フェーズへの引き継ぎ詳細 (Handover Notes)

### 6.1 Designer担当への具体的指示
あなたの作成した `design_spec.md` v11.1 は非常に高品質です。
今回のResearch更新では**JSの実装構造**を変更しましたが、Design Specにおける**視覚仕様（CSS、サイズ、色など）に変更はありません**。
したがって、`design_spec.md` の大幅な更新は不要ですが、以下の点のみ確認してください。

*   **検証項目の微修正**: 「3Dモデルが表示されている状態で」という前提がある検証項目について、「3Dモデルのロード有無に関わらず、UIパーツ（軸ラベル等）が表示されていること」という条件へ緩和してください。

### 6.2 Engineer担当への具体的指示 (Action Items)

**最優先ミッション**: スパゲッティ化したJSコードを、提案されたクラスベースアーキテクチャへリファクタリングし、**P0タスク（操作できない問題）を完遂**してください。

#### 🚀 Step 1: モジュール作成 & リファクタリング
1.  `src/modules/TaskBarManager.js` を作成し、タスクバーのリサイズ・ドラッグロジックを移動（Event Delegation化）。
2.  `src/modules/StickyNoteManager.js` を作成し、付箋の全ロジックを移動。
3.  `main.js` を清掃し、上記モジュールをimportして初期化するだけのシンプルな構成にする。
4.  不要になったJSファイル（`task-bar-resize-standalone.js` 等）を削除。

#### 🚀 Step 2: 機能実装 (P0)
1.  **タスクバー操作**: リファクタリング後のコードで、リサイズと移動がスムーズに動くか確認。
2.  **付箋操作**: 新規追加、移動、削除、色変更がスムーズに動くか確認。
3.  **編集UI**: タスクバー選択時に編集ボタン群が表示されるようにする。

#### 🚀 Step 3: 品質検証
*   ブラウザで実際に操作し、エラーがコンソールに出ないこと。
*   90pxボタンが押しやすいこと。

### 6.3 QA担当への指示
*   検証の際は、「3Dモデルが出ない」ことをバグとして扱わないでください（今回のスコープ外）。
*   「付箋が動くか」「スケジュールが変更できるか」に集中してテストしてください。

---

**以上**
