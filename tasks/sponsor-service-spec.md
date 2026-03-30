# NIKENME+ スポンサーサービス実装仕様書 & 実装プロンプト

## 概要

NIKENME+（大分県の飲食店リアルタイム空席情報Webアプリ）に、企業向けスポンサー広告サービスを実装する。管理画面からスポンサー登録・広告枠管理を行い、スポンサー企業は操作不要で広告配信と成果データの提供を受けられる仕組みを構築する。

---

## 実装プロンプト

以下のプロンプトを使用して、段階的に実装を進めること。

---

### Phase 1: データベース設計 & マイグレーション

```
あなたはNIKENME+（Next.js 14 App Router + Supabase）のシニアバックエンドエンジニアです。
以下のスポンサーサービス用テーブルをSupabaseに設計・作成してください。

■ 既存アーキテクチャ
- Supabase PostgreSQL（lib/supabase/types.ts に既存スキーマ定義あり）
- 認証: profiles（管理者）/ stores（加盟店）の2層認証
- 既存テーブル: stores, campaigns, coupons, coupon_usages 等

■ 新規テーブル設計

1. sponsors（スポンサー企業マスタ）
   - id: uuid PRIMARY KEY DEFAULT gen_random_uuid()
   - company_name: text NOT NULL（企業名）
   - company_logo_url: text（ロゴ画像URL）
   - contact_name: text（担当者名）
   - contact_email: text（担当者メール）
   - contact_phone: text（担当者電話番号）
   - website_url: text（企業Webサイト）
   - notes: text（管理者メモ）
   - is_active: boolean DEFAULT true（有効/無効）
   - created_at: timestamptz DEFAULT now()
   - updated_at: timestamptz DEFAULT now()
   - created_by: uuid REFERENCES profiles(id)（登録した管理者）

2. sponsor_contracts（スポンサー契約）
   - id: uuid PRIMARY KEY DEFAULT gen_random_uuid()
   - sponsor_id: uuid REFERENCES sponsors(id) ON DELETE CASCADE
   - plan_type: text NOT NULL CHECK (plan_type IN ('1day', '7day', '30day', 'custom'))
   - start_date: date NOT NULL（契約開始日）
   - end_date: date NOT NULL（契約終了日）
   - status: text DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'active', 'expired', 'cancelled'))
   - price: integer（契約金額・税抜）
   - currency: text DEFAULT 'JPY'
   - notes: text
   - created_at: timestamptz DEFAULT now()
   - updated_at: timestamptz DEFAULT now()
   - created_by: uuid REFERENCES profiles(id)

3. sponsor_ad_slots（広告枠定義）
   - id: uuid PRIMARY KEY DEFAULT gen_random_uuid()
   - contract_id: uuid REFERENCES sponsor_contracts(id) ON DELETE CASCADE
   - slot_type: text NOT NULL CHECK (slot_type IN ('modal', 'cta_button', 'map_icon', 'campaign_banner'))
   - display_priority: integer DEFAULT 0（表示優先度、高い値が優先）
   - is_enabled: boolean DEFAULT true
   - schedule_config: jsonb（曜日・時間帯指定など）
     例: {"weekdays": [0,1,2,3,4,5,6], "start_hour": 17, "end_hour": 5}
   - created_at: timestamptz DEFAULT now()
   - updated_at: timestamptz DEFAULT now()

4. sponsor_ad_creatives（広告クリエイティブ）
   - id: uuid PRIMARY KEY DEFAULT gen_random_uuid()
   - ad_slot_id: uuid REFERENCES sponsor_ad_slots(id) ON DELETE CASCADE
   - title: text（広告タイトル）
   - description: text（広告説明文）
   - image_url: text（メイン画像URL）
   - background_image_url: text（背景画像URL）
   - cta_text: text（CTAボタンテキスト。例:「今すぐ予約」「詳しく見る」）
   - cta_url: text（CTAリンク先URL）
   - cta_color: text（CTAボタンカラー。例: '#C5A572'）
   - icon_url: text（マップアイコン用画像URL）
   - icon_position: jsonb DEFAULT '{"top": "16px", "left": "16px"}'（マップ上の表示位置）
   - icon_size: integer DEFAULT 48（マップアイコンサイズpx）
   - custom_css: jsonb（カスタムスタイル指定）
   - display_config: jsonb（表示設定）
     例: {"show_close_button": true, "auto_close_seconds": null, "animation": "slideUp", "frequency_cap_per_session": 1}
   - translations: jsonb（多言語対応）
     例: {"en": {"title": "...", "description": "...", "cta_text": "..."}, "ko": {...}, "zh": {...}}
   - is_active: boolean DEFAULT true
   - version: integer DEFAULT 1（クリエイティブバージョン管理）
   - created_at: timestamptz DEFAULT now()
   - updated_at: timestamptz DEFAULT now()

5. sponsor_impressions（インプレッションログ）
   - id: uuid PRIMARY KEY DEFAULT gen_random_uuid()
   - ad_slot_id: uuid REFERENCES sponsor_ad_slots(id) ON DELETE SET NULL
   - creative_id: uuid REFERENCES sponsor_ad_creatives(id) ON DELETE SET NULL
   - contract_id: uuid REFERENCES sponsor_contracts(id) ON DELETE SET NULL
   - sponsor_id: uuid REFERENCES sponsors(id) ON DELETE SET NULL
   - event_type: text NOT NULL CHECK (event_type IN ('impression', 'click', 'cta_click', 'close', 'conversion'))
   - session_id: text（ブラウザセッション識別子）
   - user_agent: text
   - referrer: text
   - device_type: text（'mobile' | 'tablet' | 'desktop'）
   - geo_data: jsonb（位置情報: {"lat": ..., "lng": ..., "city": "大分"}）
   - metadata: jsonb（追加メタデータ）
   - created_at: timestamptz DEFAULT now()

   -- パーティション or インデックス戦略:
   -- CREATE INDEX idx_impressions_sponsor_date ON sponsor_impressions(sponsor_id, created_at);
   -- CREATE INDEX idx_impressions_contract ON sponsor_impressions(contract_id, event_type, created_at);
   -- CREATE INDEX idx_impressions_slot ON sponsor_impressions(ad_slot_id, event_type, created_at);

6. sponsor_reports（日次集計レポート）
   - id: uuid PRIMARY KEY DEFAULT gen_random_uuid()
   - sponsor_id: uuid REFERENCES sponsors(id) ON DELETE CASCADE
   - contract_id: uuid REFERENCES sponsor_contracts(id) ON DELETE CASCADE
   - report_date: date NOT NULL
   - impressions_count: integer DEFAULT 0
   - clicks_count: integer DEFAULT 0
   - cta_clicks_count: integer DEFAULT 0
   - unique_users_count: integer DEFAULT 0
   - ctr: numeric(5,4)（クリック率）
   - device_breakdown: jsonb（デバイス別内訳）
   - hourly_breakdown: jsonb（時間帯別内訳）
   - slot_breakdown: jsonb（広告枠別内訳）
   - created_at: timestamptz DEFAULT now()
   - UNIQUE(contract_id, report_date)

■ RLS（Row Level Security）ポリシー
- 全テーブルにRLS有効化
- sponsors, sponsor_contracts, sponsor_ad_slots, sponsor_ad_creatives:
  → profiles（管理者）のみ CRUD 可能
- sponsor_impressions:
  → INSERT: 匿名ユーザー含む全員（広告表示時に記録）
  → SELECT: profiles のみ
- sponsor_reports:
  → SELECT: profiles のみ

■ Edge Function / Cron
- 日次集計: sponsor_impressions → sponsor_reports に集計するCronジョブ（毎日AM6:00 JST）
- 契約ステータス更新: scheduled → active、active → expired を自動遷移するCron（毎日AM0:00 JST）

■ 出力
- SupabaseマイグレーションSQL
- lib/supabase/types.ts への型追記
- 設計判断の根拠コメント付き
```

---

### Phase 2: 管理画面 — スポンサー管理CRUD

```
あなたはNIKENME+のフルスタックエンジニアです。
管理画面にスポンサー管理機能を実装してください。

■ 既存アーキテクチャ
- Next.js 14 App Router
- 管理画面: app/(ad)/ad-lp/ に既存ページあり
- UI: shadcn/ui + Radix UI + Tailwind CSS
- フォーム: React Hook Form + Zod
- デザイン: ネイビー×シャンパンゴールドのラグジュアリーテーマ
- 認証: profiles テーブルの管理者のみアクセス可

■ 実装する管理画面ページ

1. app/(ad)/sponsors/page.tsx — スポンサー一覧
   - テーブル表示: 企業名、ステータス、アクティブ契約数、次回期限
   - フィルタ: アクティブ/非アクティブ
   - 検索: 企業名
   - 新規登録ボタン → 登録フォームモーダル
   - 各行クリック → 詳細ページへ

2. app/(ad)/sponsors/[id]/page.tsx — スポンサー詳細
   タブ構成:

   [基本情報タブ]
   - 企業情報の閲覧・編集フォーム
   - Zodバリデーション（メール形式、URL形式、必須チェック）

   [契約管理タブ]
   - 契約一覧（ステータスバッジ: scheduled=青, active=緑, expired=灰, cancelled=赤）
   - 新規契約作成フォーム:
     - プラン選択: 1日/7日/30日/カスタム（カスタム時は日付レンジピッカー）
     - 開始日選択 → 終了日自動計算
     - 金額入力
   - 契約キャンセルボタン（確認モーダル付き）

   [広告枠管理タブ]
   - 契約ごとの広告枠一覧
   - 広告枠追加:
     - 枠タイプ選択: モーダル広告/CTAボタン/マップアイコン/キャンペーンバナー
     - 表示優先度設定
     - スケジュール設定（曜日・時間帯）
     - 有効/無効トグル

   [クリエイティブ管理タブ]
   - 枠タイプ別のクリエイティブ編集フォーム:

   ● モーダル広告:
     - タイトル、説明文、メイン画像アップロード、背景画像
     - CTAボタン: テキスト、リンクURL、カラーピッカー
     - 表示設定: 閉じるボタン有無、自動閉じ秒数、アニメーション選択
     - フリークエンシーキャップ（1セッションあたりの表示回数上限）
     - プレビューボタン → モーダルプレビュー表示

   ● CTAボタン:
     - ボタンテキスト、リンクURL、カラー
     - アイコン画像
     - 表示位置（画面下部固定 or インライン）
     - プレビュー

   ● マップアイコン:
     - アイコン画像アップロード（推奨: 48x48px PNG）
     - 表示位置（left/top指定）
     - アイコンサイズ
     - タップ時のリンク先URL
     - プレビュー（ミニマップ上での表示確認）

   ● キャンペーンバナー:
     - バナー画像、テキスト、リンク
     - 表示位置（店舗一覧上部 or 店舗詳細内）

   - 多言語入力: 各フィールドにja/en/ko/zhタブ
   - バージョン管理: 保存時にversion++、履歴表示

   [レポートタブ]
   - 契約期間中のKPIサマリーカード:
     - 総インプレッション数
     - 総クリック数
     - CTR（クリック率）
     - ユニークユーザー数
   - 日次推移グラフ（recharts使用）
   - 時間帯別ヒートマップ
   - デバイス別円グラフ
   - 広告枠別パフォーマンス比較
   - CSV/PDFエクスポートボタン

■ 共通要件
- 全ページ管理者認証ガード（useAuth で accountType === 'platform' チェック）
- ローディング状態: Skeleton UI
- エラーハンドリング: Toast通知（sonner）
- レスポンシブ対応（モバイルでも管理可能）
- 既存のラグジュアリーテーマ（ネイビー×ゴールド）を踏襲
- Framer Motion でページ遷移・カード表示アニメーション
```

---

### Phase 3: フロントエンド — 広告配信コンポーネント

```
あなたはNIKENME+のフロントエンドエンジニアです。
スポンサー広告を表示するクライアントコンポーネントを実装してください。

■ 既存アーキテクチャ
- Google Maps: @react-google-maps/api（components/map/map-view.tsx）
- モーダル: components/ui/custom-modal.tsx（Framer Motion + AnimatePresence）
- CTA: components/instant-reservation-button.tsx のパターン参照
- テーマ: useAppMode() でbar/cafeモード自動切替
- i18n: useLanguage() の t() 関数 + translations オブジェクト
- セッション管理: Supabase Auth

■ 実装コンポーネント

1. lib/sponsors/context.tsx — スポンサーコンテキスト
   ```typescript
   interface SponsorContextType {
     activeAds: {
       modal: SponsorAdCreative | null;
       cta_button: SponsorAdCreative | null;
       map_icon: SponsorAdCreative[];
       campaign_banner: SponsorAdCreative | null;
     };
     trackEvent: (eventType: EventType, creativeId: string, metadata?: Record<string, unknown>) => void;
     isLoading: boolean;
     sessionId: string;
   }
   ```
   - アプリ起動時に有効な広告データをフェッチ
   - 現在時刻・曜日に基づくスケジュールフィルタリング
   - セッションID生成（crypto.randomUUID()）
   - フリークエンシーキャップ管理（sessionStorage）
   - イベントトラッキング関数（バッチ送信: 5件溜まるか10秒経過で送信）

2. components/sponsors/sponsor-modal.tsx — モーダル広告
   - SponsorContext から modal 広告データ取得
   - 既存 custom-modal.tsx を拡張
   - 表示トリガー:
     a. ページ初回訪問時（フリークエンシーキャップ内）
     b. マップページ表示から30秒後
   - アニメーション: slideUp / fadeIn / scaleUp（creative.display_config.animation で指定）
   - 構成:
     - 背景画像（background_image_url）
     - ロゴ or メイン画像
     - タイトル（多言語対応: translations[language].title || title）
     - 説明文
     - CTAボタン（cta_text, cta_url, cta_color）
     - 閉じるボタン（display_config.show_close_button）
     - 「広告」ラベル（左上に小さく表示、透明度50%）
   - イベント記録: impression（表示時）、click（任意箇所クリック）、cta_click（CTAクリック）、close（閉じる）
   - 自動閉じ: display_config.auto_close_seconds 秒後（設定時）

3. components/sponsors/sponsor-cta-button.tsx — CTAボタン
   - 画面下部に固定表示（既存の予約ボタンと共存）
   - スポンサーCTAが有効な場合、既存CTAの上に表示
   - パルスアニメーション（attention-grabbing but not annoying）
   - タップ → cta_url へ遷移 + cta_click イベント記録
   - 小さな「×」で非表示可能（セッション中は非表示を維持）
   - 「PR」バッジ表示

4. components/sponsors/sponsor-map-icon.tsx — マップアイコン
   - map-view.tsx に統合
   - マップ左上エリアにスポンサーアイコンをオーバーレイ表示
   - 位置: icon_position（top, left）で指定
   - サイズ: icon_size px
   - タップ → cta_url へ遷移 + click イベント記録
   - 微細なバウンスアニメーション（3秒ごと）
   - 複数スポンサーの場合は縦に並べて表示
   - 「AD」小バッジ

5. components/sponsors/sponsor-campaign-banner.tsx — キャンペーンバナー
   - 店舗一覧ページ上部 or 店舗詳細ページ内に表示
   - フルワイドバナー（角丸、シャドウ）
   - スワイプ対応（複数バナーの場合）
   - 「PR」表示

■ API エンドポイント

6. app/api/sponsors/active/route.ts — アクティブ広告取得
   GET /api/sponsors/active
   - 現在日時でactiveな契約 → 有効な広告枠 → 有効なクリエイティブを取得
   - display_priority 順にソート
   - レスポンス: { modal, cta_button, map_icons, campaign_banner }
   - キャッシュ: Cache-Control max-age=300（5分）
   - パブリックAPI（認証不要）

7. app/api/sponsors/track/route.ts — イベントトラッキング
   POST /api/sponsors/track
   - バッチ受付: { events: Array<{event_type, creative_id, ad_slot_id, contract_id, sponsor_id, metadata}> }
   - session_id, user_agent, device_type をサーバーサイドで付与
   - rate limiting: IPあたり100件/分
   - 非同期INSERT（レスポンスを待たせない）
   - パブリックAPI（認証不要だがrate limit必須）

■ パフォーマンス要件
- 広告データ取得: < 200ms（Supabase Edge Function or API Route + キャッシュ）
- イベント送信: 非同期バッチ（UIをブロックしない）
- 画像: next/image で最適化、WebP優先、lazy loading
- バンドルサイズ: 広告コンポーネントは動的import（next/dynamic）
```

---

### Phase 4: レポーティング & 分析基盤

```
あなたはNIKENME+のデータエンジニアです。
スポンサー向けレポーティング機能を実装してください。

■ 日次集計バッチ（Supabase Edge Function or pg_cron）

CREATE OR REPLACE FUNCTION aggregate_sponsor_reports()
RETURNS void AS $$
  対象: 前日分の sponsor_impressions
  集計先: sponsor_reports

  集計項目:
  - impressions_count: event_type = 'impression' のCOUNT
  - clicks_count: event_type IN ('click', 'cta_click') のCOUNT
  - cta_clicks_count: event_type = 'cta_click' のCOUNT
  - unique_users_count: session_id のDISTINCT COUNT
  - ctr: clicks_count / NULLIF(impressions_count, 0)
  - device_breakdown: {"mobile": N, "tablet": N, "desktop": N}
  - hourly_breakdown: {"0": N, "1": N, ..., "23": N}（時間帯別インプレッション）
  - slot_breakdown: {"modal": {impressions: N, clicks: N}, "cta_button": {...}, ...}
$$ LANGUAGE plpgsql;

■ 管理画面レポートAPI

GET /api/sponsors/[sponsorId]/reports
  Query: ?contract_id=xxx&start_date=2026-01-01&end_date=2026-01-31
  Response: {
    summary: { total_impressions, total_clicks, total_cta_clicks, avg_ctr, unique_users },
    daily: [{ date, impressions, clicks, ctr, unique_users }],
    hourly_heatmap: { "Mon": {"17": 245, "18": 312, ...}, ... },
    device_breakdown: { mobile: 65, tablet: 10, desktop: 25 },
    slot_performance: [{ slot_type, impressions, clicks, ctr }]
  }

■ PDF/CSVエクスポート

GET /api/sponsors/[sponsorId]/reports/export
  Query: ?format=pdf|csv&contract_id=xxx

  PDF（jspdf + html2canvas 既存ライブラリ活用）:
  - ヘッダー: NIKENME+ スポンサーレポート
  - スポンサー企業名、契約期間
  - KPIサマリー
  - 日次推移グラフ
  - デバイス別・時間帯別・枠別の分析
  - フッター: 生成日時、機密情報注意書き

  CSV:
  - 日次データ: date, impressions, clicks, cta_clicks, ctr, unique_users
  - デバイス別・時間帯別を別シート or 別CSV

■ リアルタイムダッシュボード（管理画面レポートタブ）
  - recharts ライブラリでグラフ描画:
    - LineChart: 日次インプレッション/クリック推移
    - BarChart: 時間帯別パフォーマンス
    - PieChart: デバイス別割合
    - AreaChart: CTR推移
  - 期間フィルタ: 直近7日/30日/契約期間全体/カスタム
  - 自動リフレッシュ: 5分間隔
```

---

### Phase 5: 統合テスト & エッジケース対応

```
あなたはNIKENME+のQAエンジニアです。
スポンサーサービスの統合テストとエッジケース対応を実装してください。

■ エッジケース対応

1. 契約期間の境界
   - 開始日00:00:00 JSTに正確にactive化
   - 終了日23:59:59 JSTまで表示、翌日00:00:00に非表示化
   - タイムゾーン: Asia/Tokyo固定（UTCからの変換を正確に）

2. 複数スポンサー競合
   - 同一枠タイプに複数スポンサー → display_priority 最大を表示
   - 同一priority → contract の start_date が新しい方を優先
   - マップアイコンのみ複数同時表示可能（最大3つ）

3. 広告なし状態
   - アクティブなスポンサーがゼロの場合 → 広告コンポーネント非表示
   - CTA枠空き → 既存の予約ボタンのみ表示（デフォルト動作）
   - APIレスポンスが空でもエラーにならない

4. クリエイティブ未設定
   - 広告枠はあるがクリエイティブ未登録 → その枠はスキップ
   - 画像URLが無効 → フォールバック画像 or 非表示

5. セッション管理
   - sessionStorage非対応環境 → メモリ内フォールバック
   - フリークエンシーキャップ: セッション単位で厳密にカウント

6. パフォーマンス
   - 広告APIが遅延してもメインコンテンツ表示をブロックしない
   - トラッキングAPI失敗時はサイレントリトライ（最大3回、指数バックオフ）
   - 画像読み込み失敗のフォールバック

7. 多言語
   - translations に該当言語がない → デフォルト（ja）にフォールバック
   - 翻訳キー未設定 → フィールドのデフォルト値を使用

■ テスト戦略

ユニットテスト:
- フリークエンシーキャップロジック
- スケジュールフィルタリング（曜日・時間帯）
- 契約ステータス判定
- CTR計算
- 多言語フォールバック

統合テスト:
- 広告データ取得→表示フロー
- イベントトラッキング→集計フロー
- 管理画面CRUD操作
- 契約期間自動遷移
```

---

## 非機能要件チェックリスト

### セキュリティ
- [ ] RLSポリシーで管理者以外の管理データへのアクセスを完全遮断
- [ ] トラッキングAPIにrate limiting実装（DDoS/不正インプレッション防止）
- [ ] 広告画像URLのバリデーション（XSS防止）
- [ ] CSRF対策（既存のNext.js CSRFトークン踏襲）
- [ ] SQLインジェクション防止（Supabase JS Client使用で担保）
- [ ] クリエイティブ内のcta_urlバリデーション（悪意あるURL防止）

### パフォーマンス
- [ ] 広告配信API: p95 < 200ms
- [ ] トラッキングバッチ送信: UIスレッドブロックゼロ
- [ ] 広告コンポーネント: dynamic import + code splitting
- [ ] 画像最適化: next/image + Cloudinary/Supabase Storage
- [ ] API レスポンスキャッシュ: 5分TTL（stale-while-revalidate）
- [ ] インプレッションテーブル: created_at + sponsor_id複合インデックス
- [ ] 日次集計で生ログへのクエリ負荷を軽減

### 可用性
- [ ] 広告サービス障害時もメインアプリに影響なし（graceful degradation）
- [ ] APIエラー時のフォールバック（広告非表示）
- [ ] Supabase障害時のローカルキャッシュフォールバック

### 運用性
- [ ] 管理画面から全操作可能（DB直接操作不要）
- [ ] 契約ステータス自動遷移（手動対応不要）
- [ ] レポート自動集計（日次バッチ）
- [ ] クリエイティブのバージョン管理（ロールバック可能）
- [ ] 管理者操作ログ（誰がいつ何を変更したか）

### スケーラビリティ
- [ ] インプレッションログの肥大化対策（90日超過データのアーカイブ/削除ポリシー）
- [ ] 将来的なスポンサー数増加に耐えるクエリ設計
- [ ] 広告枠タイプの拡張容易性（slot_typeにenum追加のみ）

### UX
- [ ] 広告表示が既存UXを損なわない（閉じるボタン必須、頻度制限）
- [ ] 広告であることの明示（「PR」「広告」ラベル）
- [ ] スムーズなアニメーション（Framer Motion統一）
- [ ] 多言語対応（4言語: ja/en/ko/zh）

---

## ファイル構成（想定）

```
app/
├── (ad)/
│   └── sponsors/
│       ├── page.tsx                    # スポンサー一覧
│       ├── [id]/
│       │   └── page.tsx                # スポンサー詳細（タブ構成）
│       └── layout.tsx                  # 管理者認証ガード
├── api/
│   └── sponsors/
│       ├── route.ts                    # CRUD: GET(一覧), POST(新規)
│       ├── [id]/
│       │   ├── route.ts               # CRUD: GET, PATCH, DELETE
│       │   └── reports/
│       │       ├── route.ts           # レポートデータ取得
│       │       └── export/
│       │           └── route.ts       # PDF/CSVエクスポート
│       ├── contracts/
│       │   └── route.ts               # 契約CRUD
│       ├── ad-slots/
│       │   └── route.ts               # 広告枠CRUD
│       ├── creatives/
│       │   └── route.ts               # クリエイティブCRUD
│       ├── active/
│       │   └── route.ts               # パブリック: アクティブ広告取得
│       └── track/
│           └── route.ts               # パブリック: イベントトラッキング

components/
└── sponsors/
    ├── sponsor-modal.tsx               # モーダル広告
    ├── sponsor-cta-button.tsx          # CTAボタン広告
    ├── sponsor-map-icon.tsx            # マップアイコン広告
    ├── sponsor-campaign-banner.tsx     # キャンペーンバナー
    ├── sponsor-provider.tsx            # Context Provider
    └── admin/
        ├── sponsor-list-table.tsx      # 一覧テーブル
        ├── sponsor-form.tsx            # 企業情報フォーム
        ├── contract-form.tsx           # 契約フォーム
        ├── ad-slot-form.tsx            # 広告枠フォーム
        ├── creative-form-modal.tsx     # モーダル広告クリエイティブ編集
        ├── creative-form-cta.tsx       # CTA広告クリエイティブ編集
        ├── creative-form-map-icon.tsx  # マップアイコンクリエイティブ編集
        ├── creative-form-banner.tsx    # バナークリエイティブ編集
        ├── creative-preview.tsx        # プレビューコンポーネント
        ├── report-dashboard.tsx        # レポートダッシュボード
        └── report-export-button.tsx    # エクスポートボタン

lib/
└── sponsors/
    ├── context.tsx                     # SponsorContext
    ├── types.ts                        # 型定義
    ├── utils.ts                        # ユーティリティ（スケジュール判定等）
    └── tracking.ts                     # イベントトラッキングロジック
```

---

## 実装順序（推奨）

| Phase | 内容 | 依存関係 | 見積 |
|-------|------|----------|------|
| 1 | DB設計 & マイグレーション | なし | — |
| 2 | 管理画面 — スポンサー・契約CRUD | Phase 1 | — |
| 3-A | 広告配信API（active, track） | Phase 1 | — |
| 3-B | フロント — モーダル広告 | Phase 3-A | — |
| 3-C | フロント — CTAボタン | Phase 3-A | — |
| 3-D | フロント — マップアイコン | Phase 3-A | — |
| 3-E | フロント — キャンペーンバナー | Phase 3-A | — |
| 4 | 管理画面 — クリエイティブ管理 | Phase 2 | — |
| 5 | レポーティング & 集計基盤 | Phase 3-A | — |
| 6 | 統合テスト & エッジケース | Phase 1-5 | — |
