# 認証システム実装ドキュメント

## 概要

このアプリケーションでは、3種類の登場人物が存在します：

1. **ユーザー**: 一般利用者（ログイン機能なし、まだ実装不要）
2. **運営会社**: 店舗を作成・管理するアカウント（profilesテーブル）
3. **店舗**: 各店舗が自分の情報を更新できるアカウント（storesテーブル）

## データベース構造

### profilesテーブル（運営会社アカウント）
- `id`: Supabase Auth user ID
- `email`: ログイン用メールアドレス
- `display_name`: 会社名
- `is_business`: 常にtrue
- その他のフィールド...

### storesテーブル（店舗情報 + 店舗アカウント）
- `id`: Supabase Auth user ID（店舗専用）
- `owner_id`: 運営会社のID（profilesテーブルのidを参照）
- `email`: 店舗用ログインメールアドレス
- `name`: 店舗名
- `address`, `latitude`, `longitude`: 位置情報
- その他の店舗情報...

## 認証フロー

### 1. 運営会社の登録とログイン

#### 登録 (`/register`)
1. 運営会社が会社名、メールアドレス、パスワードを入力
2. Supabase Authでユーザーアカウントを作成
3. profilesテーブルにレコードを作成
4. `/store/manage`にリダイレクト

#### ログイン (`/login`)
1. メールアドレスとパスワードでログイン
2. Supabase Authで認証
3. profilesテーブルをチェック
4. 運営会社として認識され、`/store/manage`にリダイレクト

### 2. 店舗アカウントの作成

#### 店舗作成 (`/store/manage/new`)
1. 運営会社がログインした状態で店舗作成画面にアクセス
2. 店舗情報（名前、住所、位置情報）と店舗用ログイン情報（email, password）を入力
3. Supabase Authで店舗用ユーザーアカウントを作成
4. storesテーブルにレコードを作成
   - `id`: 作成したAuth user ID
   - `owner_id`: 運営会社のID
   - `email`: 店舗用メールアドレス
   - その他の店舗情報
5. 店舗アカウントが作成され、店舗側でログイン可能になる

### 3. 店舗のログイン

#### ログイン (`/login`)
1. 店舗が店舗用メールアドレスとパスワードでログイン
2. Supabase Authで認証
3. storesテーブルをチェック
4. 店舗として認識され、`/store/manage/[店舗ID]/update`にリダイレクト

### 4. 店舗情報の更新

#### 店舗ダッシュボード (`/store/manage/[id]/update`)
- 運営会社アカウント: 自分が作成した全ての店舗にアクセス可能
- 店舗アカウント: 自分の店舗のみアクセス可能
- 空席状況、一言メッセージを更新可能

## 実装ファイル

### 認証関連
- `lib/auth/context.tsx`: 認証コンテキスト（profilesとstoresの両方に対応）
- `lib/supabase/types.ts`: TypeScript型定義（emailカラムを追加）

### 画面
- `app/(auth)/login/page.tsx`: ログイン画面（運営会社と店舗の両方に対応）
- `app/(auth)/register/page.tsx`: 運営会社アカウント登録画面
- `app/(main)/store/manage/page.tsx`: 店舗管理画面（運営会社専用）
- `app/(main)/store/manage/new/page.tsx`: 店舗作成画面（店舗アカウントも作成）
- `app/(main)/store/manage/[id]/update/page.tsx`: 店舗更新画面（運営会社と店舗の両方に対応）

## Supabaseセットアップ

### 必要なマイグレーション

`supabase_migration.sql`ファイルをSupabaseのSQL Editorで実行してください。

```sql
ALTER TABLE stores ADD COLUMN IF NOT EXISTS email TEXT NOT NULL DEFAULT '';
ALTER TABLE stores ADD CONSTRAINT stores_email_unique UNIQUE (email);
```

### 注意事項

1. 既存のstoresレコードがある場合は、まず手動でemailカラムに適切な値を設定してください
2. stores.idはauth.usersのidと同じ値を使用します
3. 店舗作成時に新しいSupabase Authアカウントが作成されます

## アカウントタイプの判定

`lib/auth/context.tsx`で、ログイン時に以下のロジックでアカウントタイプを判定します：

1. profilesテーブルをチェック → 存在すれば運営会社アカウント（`accountType: 'platform'`）
2. profilesになければstoresテーブルをチェック → 存在すれば店舗アカウント（`accountType: 'store'`）

## リダイレクト戦略

### ログイン後
- 運営会社 → `/store/manage`（店舗管理画面）
- 店舗 → `/store/manage/[店舗ID]/update`（自分の店舗更新画面）

### アクセス制御
- `/store/manage`: 運営会社のみ
  - 店舗アカウントは自動的に自分の更新画面にリダイレクト
- `/store/manage/[id]/update`: 運営会社と店舗の両方
  - 運営会社: 自分が作成した店舗のみ（owner_idでフィルタ）
  - 店舗: 自分の店舗のみ（idでフィルタ）
- `/profile`: 運営会社のみ
  - 店舗アカウントは自動的に自分の更新画面にリダイレクト

## 今後の拡張
- ユーザーアカウント機能の追加（一般利用者向け）
- 店舗詳細情報の編集機能（住所、電話番号など）
- 画像アップロード機能
- メニュー管理機能

