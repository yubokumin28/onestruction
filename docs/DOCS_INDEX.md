# 引き継ぎ資料索引

次のエージェントへ渡すすべての資料の一覧です。

---

## 📑 資料一覧（読む順序順）

### 1. 必読資料

| 資料名 | 目的 | 重要度 | 読了時間 |
|:---|:---|:---:|:---:|
| **[QUICKSTART.md](file:///C:/Users/omele_uw5enx6/.gemini/antigravity/brain/a5dab338-594b-4cda-bf95-aeca3ecc3618/QUICKSTART.md)** | 3ステップで作業開始 | ★★★ | 3分 |
| **[handover_report.md](file:///C:/Users/omele_uw5enx6/.gemini/antigravity/brain/a5dab338-594b-4cda-bf95-aeca3ecc3618/handover_report.md)** | 包括的な引き継ぎ情報 | ★★★ | 15分 |
| **[project_analysis.md](file:///C:/Users/omele_uw5enx6/.gemini/antigravity/brain/a5dab338-594b-4cda-bf95-aeca3ecc3618/project_analysis.md)** | プロジェクト構造分析 | ★★★ | 10分 |

### 2. 検証・実装資料

| 資料名 | 目的 | 重要度 | 読了時間 |
|:---|:---|:---:|:---:|
| **[final_report.md](file:///C:/Users/omele_uw5enx6/.gemini/antigravity/brain/a5dab338-594b-4cda-bf95-aeca3ecc3618/final_report.md)** | v9.0最終検証結果 | ★★☆ | 8分 |
| **[task.md](file:///C:/Users/omele_uw5enx6/.gemini/antigravity/brain/a5dab338-594b-4cda-bf95-aeca3ecc3618/task.md)** | タスク管理（完了状態） | ★☆☆ | 2分 |
| **[implementation_plan.md](file:///C:/Users/omele_uw5enx6/.gemini/antigravity/brain/a5dab338-594b-4cda-bf95-aeca3ecc3618/implementation_plan.md)** | Supabase修正計画 | ★☆☆ | 5分 |
| **[walkthrough.md](file:///C:/Users/omele_uw5enx6/.gemini/antigravity/brain/a5dab338-594b-4cda-bf95-aeca3ecc3618/walkthrough.md)** | 修正内容ウォークスルー | ★☆☆ | 8分 |

### 3. プロジェクトファイル（参照用）

| ファイル | 内容 | 重要度 |
|:---|:---|:---:|
| **[src/bim-viewer.js](file:///c:/Antigravity/website/260115_onestruction/src/bim-viewer.js)** | Snowdon Towers定義（221-257行目） | ★★★ |
| **[src/lib/supabase.js](file:///c:/Antigravity/website/260115_onestruction/src/lib/supabase.js)** | モック実装（v9.0完成版） | ★★★ |
| **[src/main.js](file:///c:/Antigravity/website/260115_onestruction/src/main.js)** | 重複DOMContentLoaded整理対象 | ★★☆ |
| **[index.html](file:///c:/Antigravity/website/260115_onestruction/index.html)** | メインHTML | ★☆☆ |

---

## 🎯 推奨読了順序

### 急いでいる場合（10分）

1. **QUICKSTART.md** (3分) - 全体像把握
2. **handover_report.md** のエグゼクティブサマリーのみ (2分)
3. ブラウザで動作確認 (5分)

### 標準（30分）

1. **QUICKSTART.md** (3分)
2. **handover_report.md** (15分)
3. **project_analysis.md** (10分)
4. ブラウザで動作確認 (2分)

### 完全理解（1時間）

1. **QUICKSTART.md** (3分)
2. **handover_report.md** (15分)
3. **project_analysis.md** (10分)
4. **final_report.md** (8分)
5. **implementation_plan.md** (5分)
6. **walkthrough.md** (8分)
7. **task.md** (2分)
8. プロジェクトファイル確認 (9分)

---

## 📊 資料の相関関係

```
QUICKSTART.md (全体像)
    │
    ├─→ handover_report.md (引き継ぎ詳細)
    │       │
    │       ├─→ project_analysis.md (構造分析)
    │       │       └─→ src/bim-viewer.js (Snowdon Towers)
    │       │       └─→ src/main.js (重複コード)
    │       │
    │       └─→ final_report.md (検証結果)
    │               └─→ implementation_plan.md (実装計画)
    │               └─→ walkthrough.md (詳細手順)
    │
    └─→ task.md (タスク状態)
```

---

## 🏔️ Snowdon Towersモデル保護（最重要）

**必ず確認すべきファイル**:
- **[src/bim-viewer.js](file:///c:/Antigravity/website/260115_onestruction/src/bim-viewer.js#L221-L257)** 221-257行目

**関連資料**:
- handover_report.md「Snowdon Towersモデルについて」セクション
- project_analysis.md「Snowdon Towersモデルの位置」セクション

---

## ✅ チェックリスト

次のエージェントが作業開始前に確認すべき項目:

- [ ] QUICKSTART.mdを読んだ
- [ ] handover_report.mdを読んだ
- [ ] ブラウザで動作確認した（127.0.0.1:8000）
- [ ] Snowdon Towersモデルの位置を確認した
- [ ] 削除してはいけないコードを把握した
- [ ] 重複DOMContentLoadedリスナーの位置を確認した

---

**作成日**: 2026-01-20 22:25  
**総資料数**: 11ファイル  
**推奨開始資料**: QUICKSTART.md
