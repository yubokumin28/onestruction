# Supabaseデータベース セットアップ手順書

**担当**: インフラ・データベース担当  
**作成日**: 2026-01-17  
**対応**: research.md v5.1, design_spec.md v6.1

---

## 概要

建設DXツールで使用するSupabaseデータベースのセットアップ手順です。
以下の6つのテーブルと2つのストレージバケットを作成します。

---

## 前提条件

- Supabaseアカウントの作成済み
- 新規プロジェクトの作成済み

---

## 手順1: データベーステーブルの作成

### 1.1 Supabase Dashboardにアクセス

1. [https://app.supabase.com](https://app.supabase.com) にアクセス
2. 対象のProjectを選択
3. 左メニューから「SQL Editor」をクリック

### 1.2 スキーマSQLの実行

1. 「New Query」をクリック
2. [`database/supabase_schema_complete.sql`](file:///c:/Antigravity/website/260115_onestruction/database/supabase_schema_complete.sql) の内容を全てコピー
3. SQL Editorにペースト
4. 「Run」ボタンをクリックして実行

**作成されるテーブル**:
- `issues` - 指摘事項管理
- `issue_attachments` - 添付ファイル
- `camera_views` - 保存された視点
- `schedules` - 工区別スケジュール
- `annotations` - 3Dアノテーション
- `project_settings` - プロジェクト設定

### 1.3 テーブル作成の確認

1. 左メニューから「Table Editor」をクリック
2. 上記6つのテーブルが表示されることを確認

---

## 手順2: Row Level Security (RLS) の設定

### 2.1 RLSポリシーの実行

1. SQL Editorで「New Query」を作成
2. [`database/supabase_rls.sql`](file:///c:/Antigravity/website/260115_onestruction/database/supabase_rls.sql) の内容をコピー＆ペースト
3. 「Run」をクリックして実行

**設定内容**:
- 認証済みユーザーのみがデータにアクセス可能
- 自分が作成したデータのみ編集・削除可能

---

## 手順3: Storageバケットの作成

### 3.1 issue-attachmentsバケットの作成

1. 左メニューから「Storage」をクリック
2. 「Create a new bucket」をクリック
3. 以下の設定を入力:
   - **Name**: `issue-attachments`
   - **Public bucket**: チェックを**外す** (Private)
   - **File size limit**: `5242880` (5MB)
   - **Allowed MIME types**: `image/jpeg, image/png, image/webp, image/gif`
4. 「Save」をクリック

### 3.2 site-assetsバケットの作成

1. 「Create a new bucket」をクリック
2. 以下の設定を入力:
   - **Name**: `site-assets`
   - **Public bucket**: チェックを**入れる** (Public)
   - **File size limit**: `104857600` (100MB)
   - **Allowed MIME types**: `model/gltf+json, model/gltf-binary, application/octet-stream, image/jpeg, image/png`
3. 「Save」をクリック

### 3.3 Storageポリシーの設定

1. SQL Editorで「New Query」を作成
2. [`database/supabase_storage.sql`](file:///c:/Antigravity/website/260115_onestruction/database/supabase_storage.sql) の内容をコピー＆ペースト
3. 「Run」をクリックして実行

---

## 手順4: APIキーの取得

### 4.1 プロジェクトURLとキーの確認

1. 左メニューから「Settings」→「API」をクリック
2. 以下の情報をコピー:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon public key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

### 4.2 環境変数ファイルの作成

1. プロジェクトルートで `.env.example` を `.env` にコピー:
   ```cmd
   copy .env.example .env
   ```

2. `.env` ファイルを開き、以下を更新:
   ```env
   VITE_SUPABASE_URL=https://xxxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOiJI...（コピーしたキー）
   VITE_USE_MOCK_DATA=false
   ```

3. 保存

---

## 手順5: アプリケーションの動作確認

### 5.1 開発サーバーの起動

```cmd
cd c:\Antigravity\website\260115_onestruction
npm install
npm run dev
```

### 5.2 Supabase接続の確認

1. ブラウザで `http://localhost:5173/` を開く
2. ブラウザのDevTools (F12) > Consoleを開く
3. エラーがないことを確認

### 5.3 データ保存のテスト

1. 📌ボタンをクリックして付箋を作成
2. Supabase Dashboard > Table Editor > `issues` テーブルを開く
3. 作成したデータが表示されることを確認

---

## トラブルシューティング

### エラー: "Invalid API key"

- `.env`ファイルの`VITE_SUPABASE_ANON_KEY`が正しくコピーされているか確認
- 開発サーバーを再起動 (Ctrl+C → `npm run dev`)

### エラー: "Row Level Security policy violation"

- `database/supabase_rls.sql`が正しく実行されているか確認
- Supabase Dashboard > Authentication で匿名ログインが有効か確認

### データが保存されない

- ブラウザのConsoleでエラーを確認
- `.env`ファイルの`VITE_USE_MOCK_DATA`が`false`になっているか確認

---

## 完了チェックリスト

- [ ] 6つのテーブルが作成されている
- [ ] RLSポリシーが設定されている
- [ ] 2つのStorageバケットが作成されている
- [ ] `.env`ファイルが正しく設定されている
- [ ] 開発サーバーが起動し、エラーがない
- [ ] データの保存・読み込みができる

---

**作成**: 2026-01-17 21:10  
**担当**: インフラ・データベース担当
