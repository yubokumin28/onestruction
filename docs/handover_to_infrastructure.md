# デザイナー担当からInfrastructure担当への引き継ぎドキュメント

**作成日**: 2026-01-18  
**作成者**: デザイナー担当  
**次の担当**: Infrastructure and Database Engineer

---

## 📋 引き継ぎ概要

デザイナー担当として、`final_quality_report.md` v14.0 と `research.md` v6.0 の内容を完全に反映した **`design_spec.md` v11.0** を作成しました。

これにより、実機検証で判明した「現場での操作性課題」を解決するための具体的なデザイン仕様が確定しました。

---

## 🎯 実施した作業

### 1. ドキュメント分析
- `research.md` v6.0: 技術仕様と実装制約の確認
- `final_quality_report.md` v14.0: ユーザーからの不具合報告と改善要望の整理
- `design_spec.md` v10.0: 既存仕様の構造把握

### 2. デザイン仕様の全面改訂
以下のP0（最優先）課題を中心に、design_spec.md を更新しました：

#### 🔴 P0対応項目
1. **モーダルUIの拡大** (D-V-4)
   - アイコンボタン: 60px → **90px**
   - テキストエリア: **18px**, 最小高さ **100px**
   - アクションボタン: 高さ **50px**

2. **タスクバー操作機能** (I-V-6)
   - 両端ドラッグによる開始/終了時刻の個別調整
   - リサイズハンドルのCSS定義

#### 🟡 P1対応項目
1. **アイコンの統一** (D-V-3)
   - ツールバー、モーダル、3Dピンで同一アイコン使用のルール化

2. **3D空間の視覚補助** (D-V-5, I-V-7, I-V-8)
   - 軸ラベル（X/Y/Z）の色分け定義
   - 5m間隔の目盛り表示仕様

3. **新機能追加**
   - 付箋追加ボタン（🗒️）をツールバーに追加

---

## 📂 更新したファイル

### メインドキュメント
- **`design_spec.md`** → v11.0に更新
  - パス: `c:\Antigravity\website\260115_onestruction\docs\design_spec.md`

---

## 🔧 Infrastructure担当への具体的な指示

### 最優先で実装すべき項目（P0）

#### 1. モーダルUIのサイズ変更
**ファイル**: おそらく `style.css` または `index.html`

```css
/* 新規指摘事項モーダル */
.icon-selector {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

.icon-btn {
  width: 90px;   /* 旧: 60px */
  height: 90px;  /* 旧: 60px */
  font-size: 48px; /* 旧: 32px */
}

.comment-input {
  font-size: 18px;      /* 旧: 14px */
  min-height: 100px;    /* 旧: 60px */
  padding: 16px;        /* 旧: 8px */
}

.modal-footer button {
  height: 50px;         /* 旧: 36px */
  font-size: 16px;      /* 旧: 14px */
  padding: 12px 24px;   /* 旧: 8px 16px */
}
```

#### 2. タスクバー両端ドラッグ機能
**ファイル**: `main.js` または `schedule.js`

実装すべき機能：
- タスクバー上端をドラッグ → 開始時刻変更
- タスクバー下端をドラッグ → 終了時刻変更
- 15分単位（40pxグリッド）でスナップ

参考実装は `design_spec.md` のセクション6.1を参照。

#### 3. アイコンの統一
**ファイル**: `index.html`

ツールバーの📌ボタンとモーダルヘッダーのアイコンを一致させる：

```html
<!-- ツールバー -->
<button class="tool-btn" data-tool="annotation">
  <span class="icon">📌</span>
</button>

<!-- モーダルヘッダー（ここも📌に統一） -->
<div class="modal-header">
  <span class="icon">📌</span> <!-- 統一 -->
  <h2>新規指摘事項</h2>
</div>
```

### 次に実装すべき項目（P1）

#### 4. 3D空間の軸ラベル・目盛り
**ファイル**: `src/bim-viewer.js`

- X/Y/Z軸のラベル表示（CSS2DRendererを使用）
- 5m間隔の目盛りとラベル

詳細は `design_spec.md` のセクション5.1を参照。

#### 5. 付箋追加ボタン
**ファイル**: `index.html`, `main.js`

ツールバーに🗒️ボタンを追加し、クリックで新しい付箋を3D空間に配置。

---

## ✅ 実装完了の確認方法

実装後、**必ずブラウザで以下を確認**してください：

### P0項目
- [ ] 「新規指摘事項」モーダルを開き、アイコンボタンが大きく（90px）表示される
- [ ] テキストエリアが読みやすいサイズ（18px）になっている
- [ ] タスクバーの上端・下端をドラッグして、時間調整ができる
- [ ] ツールバーとモーダルのアイコンが統一されている

### P1項目
- [ ] 3D空間にX/Y/Z軸のラベルが表示される
- [ ] 5m、10m、15m...の目盛りが表示される
- [ ] 🗒️ボタンで付箋が追加できる

---

## 📚 参照ドキュメント

実装時に必ず参照してください：

1. **`design_spec.md` v11.0** (最新仕様)
   - パス: `c:\Antigravity\website\260115_onestruction\docs\design_spec.md`
   - 特に重要: セクション4（UIコンポーネント）、セクション6（スケジュール機能）

2. **`research.md` v6.0** (技術制約)
   - パス: `c:\Antigravity\website\260115_onestruction\docs\research.md`
   - セクション5（UI/UX実装技術要件）

3. **`final_quality_report.md` v14.0** (ユーザーフィードバック)
   - パス: `c:\Antigravity\website\260115_onestruction\docs\final_quality_report.md`
   - セクション12（担当者別タスクリスト）

---

## ⚠️ 重要な注意事項

### 1. ドキュメントと実装の一致を厳守
前回のサイクルで「ドキュメント上は実装済みだが、ブラウザでは動かない」という問題が発生しました。

**必須手順**:
1. コードを書く
2. ブラウザでハードリフレッシュ（Ctrl+Shift+R）
3. 実際に操作して動作確認
4. スクリーンショットまたは動画を記録
5. `infra_setup_guide.md` に実装完了を記載

### 2. CSS変数の活用
`design_spec.md` で定義されたCSS変数を必ず使用してください：

```css
:root {
  --tool-btn-size: 90px;  /* v11.0で変更 */
  --tool-icon-size: 32px;
}
```

### 3. エビデンス提出
実装完了後、以下を提出してください：
- 動作確認のスクリーンショット
- 主要機能の操作動画（可能であれば）
- 更新した `infra_setup_guide.md` のバージョン

---

## 🚀 次のステップ

Infrastructure担当は、以下の順序で作業を進めてください：

1. **`design_spec.md` v11.0を熟読** (30分)
2. **P0項目の実装** (優先度順)
   - モーダルUI拡大
   - タスクバー操作機能
   - アイコン統一
3. **ブラウザでの動作確認** (各項目ごと)
4. **P1項目の実装**
5. **`infra_setup_guide.md` の更新**
6. **Analytics担当への引き継ぎ**

---

**デザイナー担当より**:

本仕様書は、現場の監督が「手袋をしたまま、屋外の強い日差しの下でも使える」ことを最優先に設計しています。

Infrastructure担当は、コードの美しさよりも**「実際に触って使える」**ことを重視してください。

ご質問があれば、本ドキュメントまたは `design_spec.md` のコメントを参照してください。

よろしくお願いします！
