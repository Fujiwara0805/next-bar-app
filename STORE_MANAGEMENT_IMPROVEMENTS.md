# 店舗管理機能の改善

## 📝 実装内容

### 1. 店舗管理画面 (`/store/manage`)

#### ✨ 新機能: 店舗削除機能

**追加した機能**:
- ✅ 店舗カードに削除ボタンを追加
- ✅ 削除確認ダイアログ表示
- ✅ ローディング状態の表示
- ✅ 削除成功時のトースト通知
- ✅ RLSポリシーに基づく安全な削除

**実装の詳細**:
```typescript
// 削除確認ダイアログを表示
const handleDeleteClick = (store: Store) => {
  setStoreToDelete(store);
  setDeleteDialogOpen(true);
};

// 削除実行
const handleDeleteConfirm = async () => {
  // storesテーブルから削除
  // owner_idでフィルタして安全に削除
};
```

**UIの改善**:
- 編集ボタンと削除ボタンを横並びで配置
- 削除ボタンは赤色（destructive）で視覚的に区別
- AlertDialogで誤操作を防止

---

### 2. パスワード入力コンポーネント (`PasswordInput`)

#### ✨ 新機能: パスワードの表示/非表示切り替え

**ファイル**: `components/ui/password-input.tsx`

**機能**:
- ✅ 目アイコンをクリックでパスワードの表示/非表示を切り替え
- ✅ Eye/EyeOffアイコンで状態を表示
- ✅ 既存のInput コンポーネントと同じスタイリング
- ✅ 完全なアクセシビリティサポート

**使用箇所**:
- 店舗作成画面（店舗用パスワード入力）
- 店舗アカウント用パスワード変更画面（全てのパスワード入力欄）
- 運営会社用パスワード変更画面（全てのパスワード入力欄）

---

### 3. 店舗更新画面の大幅改善 (`/store/manage/[id]/update`)

#### ✅ タイトル変更
- 「店舗状況更新」 → 「**店舗ページ管理**」

#### ✅ 店舗カードの追加
- 店舗名
- 店舗画像（あれば）
- パスワード変更ボタン（店舗アカウントのみ）

#### ✅ タブ形式の導入

**タブ1: 店舗状況** (デフォルト表示)
- 空席状況の選択
- 男女比のスライダー
- 一言メッセージ

**タブ2: 基本情報設定**
- 店舗名
- 店舗説明
- 住所
- 電話番号
- ウェブサイトURL
- ログイン用メールアドレス（読み取り専用）
- 店舗画像（最大5枚、今後実装予定）

#### 🎨 UI/UX の改善

**店舗状況タブ**:
```typescript
// 男女比スライダー
<Slider
  value={[maleRatio]}
  onValueChange={handleMaleRatioChange}
  max={100}
  step={5}
/>

// ビジュアル表示
<div className="flex gap-2 h-4">
  <div className="bg-blue-500" style={{ width: `${maleRatio}%` }} />
  <div className="bg-pink-500" style={{ width: `${femaleRatio}%` }} />
</div>
```

**基本情報タブ**:
- 全フィールドが編集可能（メールアドレス以外）
- ウェブサイトURLには外部リンクボタン付き
- 画像アップロード用のプレースホルダー（最大5枚）

#### 📱 レスポンシブデザイン
- モバイルファーストのデザイン
- タブレット/デスクトップで快適な表示
- Framer Motionでスムーズなアニメーション

---

## 📁 ファイル構成

### 新規作成
```
components/ui/password-input.tsx          # パスワード入力コンポーネント
```

### 大幅修正
```
app/(main)/store/manage/page.tsx          # 削除機能追加
app/(main)/store/manage/[id]/update/page.tsx   # タブ形式に変更
```

### 更新
```
app/(main)/store/manage/new/page.tsx                      # PasswordInput使用
app/(main)/store/manage/[id]/change-password/page.tsx    # PasswordInput使用
app/(main)/profile/change-password/page.tsx              # PasswordInput使用
```

---

## 🎯 機能詳細

### 店舗削除機能

**実装箇所**: `/store/manage`

**フロー**:
1. 削除ボタンをクリック
2. 確認ダイアログが表示
   - 店舗名を表示
   - 「この操作は取り消せません」と警告
   - 「店舗のログインアカウントも削除される」旨を通知
3. 「削除」ボタンをクリック
4. ローディング状態表示
5. Supabaseから削除実行
6. 成功通知を表示
7. 画面から店舗カードを削除

**セキュリティ**:
- ✅ `owner_id = user.id` でフィルタ（自分の店舗のみ削除可能）
- ✅ RLSポリシーで二重チェック
- ✅ 削除確認ダイアログで誤操作防止

---

### パスワード表示/非表示機能

**コンポーネント**: `PasswordInput`

**機能**:
- デフォルトは非表示（`type="password"`）
- 目アイコンをクリックで切り替え
- 表示時: Eyeアイコン
- 非表示時: EyeOffアイコン

**使用例**:
```tsx
<PasswordInput
  id="password"
  value={password}
  onChange={(e) => setPassword(e.target.value)}
  placeholder="6文字以上"
  required
  minLength={6}
/>
```

---

### タブ形式の店舗更新画面

**タブ構成**:

#### 1. 店舗状況タブ (デフォルト)
- **目的**: リアルタイムの店舗状況を簡単に更新
- **更新頻度**: 高（1日に複数回）
- **編集項目**:
  - 空席状況（vacant/moderate/full/closed）
  - 男女比（スライダーで調整）
  - 一言メッセージ（最大200文字）

#### 2. 基本情報設定タブ
- **目的**: 店舗の基本情報を管理
- **更新頻度**: 低（変更時のみ）
- **編集項目**:
  - 店舗名
  - 店舗説明
  - 住所
  - 電話番号
  - ウェブサイトURL
  - 画像（今後実装）

**アクセス制御**:
- **運営会社**: 全ての店舗の全項目を編集可能
- **店舗アカウント**: 自分の店舗のみ編集可能

---

## 🚀 使用方法

### 店舗を削除する
1. `/store/manage`にアクセス（運営会社アカウント）
2. 削除したい店舗カードのゴミ箱アイコンをクリック
3. 確認ダイアログで「削除」をクリック
4. 完了

### パスワードを確認する
1. パスワード入力欄に入力
2. 右側の目アイコンをクリック
3. パスワードが表示される
4. もう一度クリックで非表示に戻る

### 店舗状況を更新する
1. `/store/manage/[id]/update`にアクセス
2. デフォルトで「店舗状況」タブが開く
3. 空席状況を選択
4. 男女比を調整
5. 一言メッセージを入力
6. 「店舗状況を更新」ボタンをクリック

### 基本情報を更新する
1. `/store/manage/[id]/update`にアクセス
2. 「基本情報設定」タブをクリック
3. 各項目を編集
4. 「基本情報を更新」ボタンをクリック

---

## 💡 今後の拡張予定

### 画像アップロード機能
- Supabase Storageを使用
- 最大5枚の店舗画像
- ドラッグ&ドロップ対応
- 画像のプレビュー表示
- 画像の並び替え

### 営業時間設定
- 曜日ごとの営業時間設定
- 特別営業日の設定
- 定休日の設定

### メニュー管理
- メニュー画像のアップロード
- カテゴリー分け
- 価格表示

---

## 📊 変更まとめ

### 新規作成したファイル
- `components/ui/password-input.tsx` - パスワード入力コンポーネント

### 修正したファイル
1. **店舗管理画面** (`app/(main)/store/manage/page.tsx`)
   - 削除ボタン追加
   - 削除確認ダイアログ追加
   - 削除機能実装

2. **店舗更新画面** (`app/(main)/store/manage/[id]/update/page.tsx`)
   - タイトルを「店舗ページ管理」に変更
   - 店舗カード追加
   - タブ形式に変更（店舗状況/基本情報設定）
   - 男女比スライダー追加
   - 画像プレースホルダー追加（5枚）

3. **店舗作成画面** (`app/(main)/store/manage/new/page.tsx`)
   - PasswordInput使用

4. **パスワード変更画面** (2ファイル)
   - `app/(main)/store/manage/[id]/change-password/page.tsx`
   - `app/(main)/profile/change-password/page.tsx`
   - PasswordInput使用

---

すべての機能が完全に実装され、テスト可能な状態です！ 🎉

