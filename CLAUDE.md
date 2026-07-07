# NIKENME+（にけんめぷらす）

大分県を主軸とした飲食店の回遊マップ・空席情報サービス。LINE（LIFF）と Web の両方から利用される。

## 技術スタック

- Next.js 14 (App Router) / React 18 / TypeScript
- UI: Tailwind CSS + shadcn/ui（`components/ui/`）+ Framer Motion
- DB・認証: Supabase（`lib/supabase/`）。会員認証は LINE/メール・LIFF/Web を問わず Supabase セッションで統一
- LINE 連携: `@line/bot-sdk`・`@line/liff`（`lib/line/`, `app/liff/`）
- 地図: Google Maps（`components/map/`）
- 通知: Web Push（`lib/push/`）、Twilio（`lib/twilio/`）。空席関連は `lib/vacancy/`

## コマンド

- `npm run dev` — 開発サーバ
- `npm run typecheck` — 型チェック（変更後は必ず実行）
- `npm run build` — 本番ビルド
- `npm run lint` — Lint

テストスイートは無い。検証は typecheck + build + 該当フローの実操作で行う。

## ディレクトリ構成

- `app/` — App Router。`(main)`=一般向け、`(auth)`=認証、`partner/`=店舗向け、`api/`=Route Handlers、`liff/`=LINE ミニアプリ
- `components/` — 機能別（map / store / reservation / mypage / admin / sponsors など）。`ui/` は shadcn/ui 生成物
- `lib/` — ドメインロジック。`actions/`=Server Actions、`i18n/`、`check-in/`、`vacancy/` など
- `tasks/` — ローカル作業メモ（gitignore 済み。コミットしない）

## 規約

- ユーザー向け文言はハードコードせず `lib/i18n/translations.ts`（ja / en / ko / zh の4言語）に追加する
- 対外的な表記はひらがなの「にけんめぷらす」。コード・DB・i18n キーは `NIKENME+` のままで可
- サービスの主軸は大分県（`origin_prefecture` は `oita` / `other`）
- 定期処理に Vercel Cron は使わない（pg_cron かオンデマンド実行で代替）
- Supabase の DB 操作・マイグレーションは Supabase MCP ツール経由で行う
- コミットメッセージは日本語（既存履歴のスタイルに合わせる）

## 作業の進め方

- Simplicity First: 変更は必要最小限に。影響範囲を最小のコードに留める
- 根本原因を直す。一時しのぎの修正はしない
- アーキテクチャに関わる非自明な判断が必要なときだけ、実装前に方針を確認する
- 完了と報告する前に動作を確認する（typecheck / build / 該当フローの実操作）
- うまくいかないときは押し切らず、立ち止まって方針を見直す
