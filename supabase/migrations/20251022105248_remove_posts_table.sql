/*
  # postsテーブルの削除

  ## 概要
  投稿機能を削除するため、postsテーブルとその関連オブジェクトを削除します。

  ## 変更内容
  1. postsテーブルに関連するポリシーを削除
  2. postsテーブルのトリガーを削除
  3. postsテーブルを削除
*/

-- ポリシーを削除
DROP POLICY IF EXISTS "投稿は全員が閲覧可能" ON posts;
DROP POLICY IF EXISTS "認証ユーザーは投稿を作成可能" ON posts;
DROP POLICY IF EXISTS "ユーザーは自分の投稿を更新可能" ON posts;
DROP POLICY IF EXISTS "ユーザーは自分の投稿を削除可能" ON posts;

-- トリガーを削除
DROP TRIGGER IF EXISTS update_posts_updated_at ON posts;

-- インデックスを削除
DROP INDEX IF EXISTS idx_posts_user;
DROP INDEX IF EXISTS idx_posts_store;
DROP INDEX IF EXISTS idx_posts_created;

-- テーブルを削除
DROP TABLE IF EXISTS posts;
