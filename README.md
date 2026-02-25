# NIKENME+ (ニケンメプラス)

大分県大分市における飲食店の空席情報をリアルタイムで提供するWebアプリケーション

## 主な機能

- リアルタイム空席情報の地図表示
- **10分後予約機能**（Twilio自動音声電話システム）
- ログイン不要の即時利用
- 位置情報による近隣店舗表示
- 多言語対応（日本語・英語・韓国語・中国語）
- クーポン・キャンペーン管理
- 完全無料

## 10分後予約機能とは

ユーザーが「10分後に来店予約」ボタンを押すと、システムが自動で店舗に電話をかけ、音声ガイダンスで予約内容を通知します。店舗側は電話のボタン操作（1: 承認、2: 拒否）で即座に回答でき、結果はSMSでユーザーに通知されます。

### 特徴
- 完全自動の音声電話システム
- 店舗側はアプリ不要（電話だけで完結）
- ユーザーにはSMSで結果通知
- リアルタイムでステータス追跡

## クイックスタート

### 必要な環境

- Node.js 18+
- Supabaseアカウント
- Twilioアカウント（10分後予約機能用）
- Google Maps APIキー

### インストール

```bash
git clone https://github.com/your-username/next-bar.git
cd next-bar
npm install

# 環境変数を設定
cp ENV_TEMPLATE.txt .env
# .env ファイルを編集して必要な値を設定

npm run dev
```

### 10分後予約機能のセットアップ

詳しくは以下のドキュメントをご覧ください:
- [クイックスタートガイド](./QUICK_START.md) - 最短3ステップ
- [詳細セットアップガイド](./SETUP_GUIDE.md) - 完全な設定方法

## 技術スタック

| カテゴリ | 技術 |
|---|---|
| フレームワーク | Next.js 14 (App Router) |
| 言語 | TypeScript 5.6 |
| スタイリング | Tailwind CSS 3.4 |
| アニメーション | Framer Motion |
| データベース | Supabase (PostgreSQL) |
| 地図 | Google Maps API |
| 音声通話・SMS | Twilio Voice / Messaging API |
| UIコンポーネント | Radix UI + shadcn/ui |
| フォーム | React Hook Form + Zod |
| チャート | Recharts |

## プロジェクト構造

```
next-bar/
├── app/
│   ├── api/                          # APIルート
│   │   ├── contact/                  # お問い合わせAPI
│   │   ├── geocode/                  # ジオコーディング
│   │   ├── reservations/             # 予約関連API
│   │   │   ├── request/              # 予約リクエスト
│   │   │   └── status/[id]/          # 予約ステータス取得
│   │   ├── stores/                   # 店舗関連API
│   │   │   ├── [id]/vacancy-status/  # 空席状況
│   │   │   ├── place-photos/         # 写真取得
│   │   │   ├── place-photo-proxy/    # 写真プロキシ
│   │   │   └── update-is-open/       # 営業状況更新
│   │   └── twilio/                   # Twilio関連API
│   │       ├── ivr/                  # 自動音声応答
│   │       ├── ivr-response/         # ボタン押下処理
│   │       └── call-status/          # 通話ステータスコールバック
│   ├── (main)/                       # メインページ
│   │   ├── map/                      # 地図表示
│   │   ├── store/                    # 店舗詳細
│   │   ├── store-list/               # 店舗一覧
│   │   └── profile/                  # プロフィール
│   ├── (auth)/                       # 認証ページ
│   │   ├── login/                    # ログイン
│   │   └── register/                 # ユーザー登録
│   ├── landing/                      # ランディングページ
│   ├── contact/                      # お問い合わせ
│   ├── faq/                          # よくある質問
│   ├── privacy/                      # プライバシーポリシー
│   ├── terms/                        # 利用規約
│   ├── language-settings/            # 言語設定
│   └── release-notes/                # リリースノート
├── components/
│   ├── ui/                           # shadcn/ui コンポーネント
│   ├── map/                          # 地図コンポーネント
│   ├── store/                        # 店舗コンポーネント
│   ├── reservation/                  # 予約コンポーネント
│   └── analytics/                    # アナリティクス
├── lib/
│   ├── i18n/                         # 多言語対応 (ja/en/ko/zh)
│   ├── supabase/                     # Supabase設定・型定義
│   ├── auth/                         # 認証コンテキスト
│   ├── types/                        # 型定義
│   ├── actions/                      # Server Actions
│   └── cache/                        # キャッシュ
└── public/                           # 静的ファイル
```

## 環境変数

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Twilio（10分後予約機能）
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=+81975109305
TWILIO_MESSAGING_SERVICE_SID=  # オプション

# App
NEXT_PUBLIC_APP_URL=https://nikenme.jp
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=
```

詳細は [ENV_TEMPLATE.txt](./ENV_TEMPLATE.txt) を参照してください。

## データベーススキーマ

### stores テーブル
店舗情報を管理

### quick_reservations テーブル
10分後予約のリクエストを管理

```sql
CREATE TABLE quick_reservations (
  id UUID PRIMARY KEY,
  store_id UUID REFERENCES stores(id),
  caller_name TEXT,
  caller_phone TEXT NOT NULL,
  party_size INTEGER NOT NULL,
  arrival_time TIMESTAMPTZ NOT NULL,
  status TEXT CHECK (status IN ('pending', 'confirmed', 'rejected', 'cancelled', 'expired')),
  call_sid TEXT,
  confirmed_at TIMESTAMPTZ,
  rejection_reason TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## 開発

```bash
# 開発サーバー
npm run dev

# ビルド
npm run build

# 型チェック
npm run typecheck

# Lintチェック
npm run lint
```

### ローカル開発でのTwilioテスト

```bash
# ngrokでローカルサーバーを公開
ngrok http 3000

# 出力されたURLを.envに設定
NEXT_PUBLIC_APP_URL=https://xxxx.ngrok.io
```

## 使用方法

### ユーザー側
1. アプリを開いて位置情報を許可
2. 地図上で店舗を選択
3. 「10分後に来店予約」ボタンをクリック
4. 名前、電話番号、人数を入力
5. SMSで予約結果を受信

### 店舗側
1. システムから自動で電話がかかる
2. 音声ガイダンスで予約内容を確認
3. 電話のボタンで応答
   - **1**: 予約を承認
   - **2**: 予約を拒否
   - **3**: もう一度聞く

## デプロイ

### Vercel（推奨）

```bash
npm i -g vercel
vercel

# 環境変数を設定
vercel env add TWILIO_PHONE_NUMBER
vercel env add TWILIO_ACCOUNT_SID
# ... その他の環境変数
```

### Twilioの設定更新
デプロイ後、Twilioコンソールで本番URLに更新:
```
https://nikenme.jp/api/twilio/ivr
```

## 料金

### Twilio料金（目安）
- 電話番号維持: ~150円/月
- 音声通話: ~10円/分
- SMS送信: ~10円/通

## ライセンス

MIT License

## 開発チーム

NIKENME+ Development Team

## コントリビューション

プルリクエストを歓迎します！

## サポート

質問や問題がある場合は、Issueを作成してください。

---

Made with love in Oita, Japan
