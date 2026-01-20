# プロジェクト構造分析レポート

**分析日**: 2026-01-20 22:10  
**目的**: Snowdon Towersモデルの保護と潜在的な干渉要因の特定

---

## 🏔️ Snowdon Towersモデルの位置

### 定義場所: `src/bim-viewer.js`

**createSnowdonMock()** 関数（221-257行目）:
```javascript
createSnowdonMock() {
    // タワーA: 高層（ガラス）
    const towerA = new THREE.Mesh(towerAGeo, matGlass);
    towerA.position.set(-10, 15, -5);
    
    // タワーB: 中層（コンクリート）
    const towerB = new THREE.Mesh(towerBGeo, matConcrete);
    towerB.position.set(5, 10, 5);
    
    // 連結通路
    const bridge = new THREE.Mesh(bridgeGeo, matConcrete);
    bridge.position.set(-2, 10, 0);
    
    console.log("🏔️ Snowdon Towers (Mock) 作成完了");
}
```

### 呼び出し箇所

1. **`init()` → `loadModel()` → `createSnowdonMock()`** (159行目)
2. **`loadSampleModel()` → `createSnowdonMock()`** (215行目)

### 参照ファイル

- **test-folder/Snowdon Towers Sample Architectural.rvt** (94.7MB)
  - RVTファイル（Revit形式）は直接読み込めない
  - Three.jsでモックとしてエミュレーション

### ✅ 結論: モデルは安全

- モデル生成ロジックは`bim-viewer.js`にのみ存在
- 削除や上書きするコードは見当たらない
- **Snowdon Towersモデルは消える心配なし**

---

## ⚠️ 発見された潜在的な問題

### 問題1: 複数のDOMContentLoadedリスナー（重大）

`main.js`内に**3箇所**もDOMContentLoadedリスナーが存在:

#### 箇所1: 行72-76（現在有効）
```javascript
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}
```

#### 箇所2: 行1154（重複・無効化すべき）
```javascript
document.addEventListener('DOMContentLoaded', async () => {
    // 重複している初期化コード
});
```

#### 箇所3: 行1436（さらに重複）
```javascript
document.addEventListener('DOMContentLoaded', () => {
    // さらに重複している初期化コード
});
```

#### 箇所4: `event-handlers.js` 24行目（競合の可能性）
```javascript
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Global Event Handlers Initialized (v2.1)');
    // main.jsと機能が重複
});
```

### 影響

- **初期化が複数回実行される**可能性
- **イベントリスナーが多重登録**
- **パフォーマンス低下**
- **予期しない動作**

---

## 問題2: event-handlers.jsとmain.jsの機能重複

### 重複している機能

| 機能 | event-handlers.js | main.js |
|:---|:---:|:---:|
| DOMContentLoadedリスナー | ✅ (24行目) | ✅ (72, 1154, 1436行目) |
| 付箋ドラッグ | ✅ | ✅ |
| タスクバーリサイズ | ✅ | ✅ |
| 工区切り替え | ✅ (381-409行目) | ✅ (636-656行目) |
| ビュー切り替え | ✅ (442-450行目) | ✅ (682-710行目) |
| タスク削除 | ✅ (340-346行目) | ✅ (1214-1224行目) |

### 現在の状態

`main.js` 18行目:
```javascript
// event-handlers.jsを一時的に無効化（main.jsとの競合を解決）
// import './event-handlers.js';
```

**event-handlers.jsは無効化されている**はずだが、HTMLファイルで直接読み込まれている可能性がある。

---

## 📊 プロジェクト構造まとめ

### ディレクトリ構成

```
c:\Antigravity\website\260115_onestruction\
├── index.html                          # メインHTML
├── style.css                           # グローバルCSS
├── src/
│   ├── main.js                         # ✅ メインロジック（有効）
│   ├── bim-viewer.js                   # ✅ 3Dビューア（Snowdon Towers定義）
│   ├── ui-manager.js                   # ✅ UIマネージャー（有効）
│   ├── axis-labels.js                  # ✅ 軸ラベル（有効）
│   ├── event-handlers.js               # ⚠️ 無効化中だが確認必要
│   ├── sticky-note-add.js              # ⚠️ 未使用の可能性
│   ├── sticky-note-resize.js           # ⚠️ 未使用の可能性
│   ├── task-helpers.js                 # ⚠️ 未使用の可能性
│   ├── task-resize.js                  # ⚠️ 未使用の可能性
│   ├── ui-patches.css                  # ⚠️ リンク確認必要
│   ├── lib/
│   │   ├── supabase.js                 # ✅ モック実装（v9.0で修正済み）
│   │   └── database.js                 # ✅ データアクセス層
│   └── modules/
│       └── TaskBarManager.js           # ⚠️ 未使用の可能性
├── test-folder/
│   └── Snowdon Towers Sample Architectural.rvt  # ✅ 参照用（94.7MB）
├── docs/
│   ├── design_spec.md                  # デザイン仕様
│   ├── research.md                     # 技術仕様
│   ├── infra_setup_guide.md            # セットアップガイド（v8.0破損）
│   ├── final_quality_report.md         # 品質レポート
│   └── handover_to_infrastructure.md   # 引き継ぎ書
└── database/                            # Supabaseスキーマ（未使用）
```

---

## 🎯 まとめ

### Snowdon Towersモデル

✅ **完全に安全**: `bim-viewer.js`の`createSnowdonMock()`関数で定義されており、削除や上書きのコードは存在しない

### 潜在的な問題

⚠️ **複数のDOMContentLoadedリスナーが競合**している可能性が高い  
⚠️ **event-handlers.jsとmain.jsの機能が重複**  
⚠️ **未使用ファイルが散在**

### 次のステップ

1. index.htmlの確認
2. 重複コードの削除
3. ファイル整理
