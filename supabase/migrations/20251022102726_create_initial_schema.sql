/*
  # 初期データベーススキーマの作成

  ## 概要
  位置情報ベースの飲食店混雑状況共有アプリケーションのための初期スキーマを作成します。

  ## 1. 新規テーブル
  
  ### `profiles`
  - `id` (uuid, primary key) - auth.usersと連動するユーザーID
  - `email` (text) - ユーザーのメールアドレス
  - `display_name` (text) - 表示名
  - `avatar_url` (text, nullable) - プロフィール画像URL
  - `bio` (text, nullable) - 自己紹介
  - `is_business` (boolean) - 企業アカウントフラグ
  - `created_at` (timestamptz) - 作成日時
  - `updated_at` (timestamptz) - 更新日時
  
  ### `stores`
  - `id` (uuid, primary key) - 店舗ID
  - `owner_id` (uuid, foreign key) - 店舗オーナーのユーザーID
  - `name` (text) - 店舗名
  - `description` (text, nullable) - 店舗説明
  - `address` (text) - 住所
  - `latitude` (numeric) - 緯度
  - `longitude` (numeric) - 経度
  - `phone` (text, nullable) - 電話番号
  - `opening_hours` (jsonb, nullable) - 営業時間（JSON形式）
  - `image_url` (text, nullable) - 店舗画像URL
  - `menu_images` (jsonb, nullable) - メニュー画像URLの配列
  - `is_open` (boolean) - 現在営業中かどうか
  - `vacancy_status` (text) - 空席状況（'vacant', 'moderate', 'crowded'）
  - `male_ratio` (integer) - 男性客の割合（0-100）
  - `female_ratio` (integer) - 女性客の割合（0-100）
  - `last_updated` (timestamptz) - 最終更新日時
  - `created_at` (timestamptz) - 作成日時
  - `updated_at` (timestamptz) - 更新日時
  
  ### `posts`
  - `id` (uuid, primary key) - 投稿ID
  - `user_id` (uuid, foreign key) - 投稿者のユーザーID
  - `store_id` (uuid, foreign key, nullable) - 関連店舗ID
  - `content` (text) - 投稿内容
  - `images` (jsonb, nullable) - 画像URLの配列
  - `latitude` (numeric, nullable) - 投稿場所の緯度
  - `longitude` (numeric, nullable) - 投稿場所の経度
  - `created_at` (timestamptz) - 作成日時
  - `updated_at` (timestamptz) - 更新日時

  ## 2. セキュリティ
  - すべてのテーブルでRLSを有効化
  - profiles: ユーザーは自分のプロフィールのみ編集可能、全員が閲覧可能
  - stores: オーナーのみ編集可能、全員が閲覧可能
  - posts: 投稿者のみ編集・削除可能、全員が閲覧可能

  ## 3. インデックス
  - 位置情報検索の高速化のため、緯度経度にインデックスを追加
  - 外部キーにインデックスを追加
*/

-- profiles テーブル
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  display_name text NOT NULL,
  avatar_url text,
  bio text,
  is_business boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "プロフィールは全員が閲覧可能"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "ユーザーは自分のプロフィールを作成可能"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "ユーザーは自分のプロフィールを更新可能"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- stores テーブル
CREATE TABLE IF NOT EXISTS stores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  address text NOT NULL,
  latitude numeric NOT NULL,
  longitude numeric NOT NULL,
  phone text,
  opening_hours jsonb,
  image_url text,
  menu_images jsonb DEFAULT '[]'::jsonb,
  is_open boolean DEFAULT false,
  vacancy_status text DEFAULT 'vacant' CHECK (vacancy_status IN ('vacant', 'moderate', 'crowded')),
  male_ratio integer DEFAULT 50 CHECK (male_ratio >= 0 AND male_ratio <= 100),
  female_ratio integer DEFAULT 50 CHECK (female_ratio >= 0 AND female_ratio <= 100),
  last_updated timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE stores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "店舗情報は全員が閲覧可能"
  ON stores FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "企業ユーザーは店舗を作成可能"
  ON stores FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = owner_id AND
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_business = true)
  );

CREATE POLICY "オーナーは自分の店舗を更新可能"
  ON stores FOR UPDATE
  TO authenticated
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "オーナーは自分の店舗を削除可能"
  ON stores FOR DELETE
  TO authenticated
  USING (auth.uid() = owner_id);

-- posts テーブル
CREATE TABLE IF NOT EXISTS posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  store_id uuid REFERENCES stores(id) ON DELETE SET NULL,
  content text NOT NULL,
  images jsonb DEFAULT '[]'::jsonb,
  latitude numeric,
  longitude numeric,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "投稿は全員が閲覧可能"
  ON posts FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "認証ユーザーは投稿を作成可能"
  ON posts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "ユーザーは自分の投稿を更新可能"
  ON posts FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "ユーザーは自分の投稿を削除可能"
  ON posts FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_stores_location ON stores(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_stores_owner ON stores(owner_id);
CREATE INDEX IF NOT EXISTS idx_stores_vacancy ON stores(vacancy_status);
CREATE INDEX IF NOT EXISTS idx_posts_user ON posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_store ON posts(store_id);
CREATE INDEX IF NOT EXISTS idx_posts_created ON posts(created_at DESC);

-- 更新日時を自動更新するトリガー関数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- トリガーの作成
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_stores_updated_at BEFORE UPDATE ON stores
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_posts_updated_at BEFORE UPDATE ON posts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
