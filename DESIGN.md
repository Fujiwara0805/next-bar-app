# DESIGN.md — NIKENME+

> NIKENME+ / 二軒目プラス（`next-bar` リポジトリ）のデザイン仕様書。  
> 既存のブランドカラー **Brewer Navy `#13294b` / Brass Yellow `#ffc82c` / Cream Off-white `#F7F3E9`** を基準に、顧客画面・店舗画面・運営画面・LIFF画面で一貫したUIを実現するためのデザインシステム。

---

## 1. Visual Theme & Atmosphere

- **デザイン方針**: 夜の街をスマートに楽しむための、上質で安心感のあるナイトライフUI。暗すぎず、軽すぎず、「大人の回遊体験」を自然に後押しする。
- **密度**: 顧客向け画面は余白を広めに取り、視認性と操作のしやすさを優先。店舗・運営画面は情報密度をやや高め、一覧性と業務効率を重視する。
- **キーワード**: 上質、安心、夜の街、スマート、直感的、温かみ、信頼感、回遊性。
- **特徴**: 深いネイビーを基調に、ブラスイエローをCTAやハイライトに使用。オフホワイトで温かみを出し、飲食店・夜の街・観光の雰囲気を過度に派手にせず表現する。
- **適用範囲**: 顧客向けLP、店舗検索、マップ、マイページ、チェックイン、空席通知、店舗管理、運営管理、LIFF画面。

---

## 2. Color Palette & Roles

### Primary（ブランドカラー）

- **Brewer Navy** (`#13294b`): メインのブランドカラー。CTAボタン、ヘッダー、ナビゲーション、重要な強調面に使用。
- **Brass Yellow** (`#ffc82c`): セカンダリカラー。主要CTA、バッジ、通知、選択状態、特別感の演出に使用。
- **Cream Off-white** (`#F7F3E9`): ダーク背景上の文字色、上質な余白、カード内の明るい面に使用。

### Brewer Navy Scale

| Token | HEX | HSL | Role |
|---|---:|---:|---|
| Brewer Navy 950 | `#071022` | `216 60% 7%` | 最も深い背景、モーダル背面、夜の奥行き |
| Brewer Navy 900 | `#0B1930` | `216 60% 11%` | ダーク基調の背景 |
| Brewer Navy 800 | `#10233D` | `216 55% 15%` | ダークカード、セクション背景 |
| Brewer Navy 700 | `#13294b` | `216 60% 18%` | ブランドPrimary、ボタン、強調 |
| Brewer Navy 600 | `#20385F` | `216 50% 25%` | Hover、Active、補助アクセント |
| Brewer Navy 500 | `#335280` | `216 45% 35%` | Link、Focus Ring、情報要素 |
| Brewer Navy 300 | `#90A4C1` | `216 35% 65%` | ダーク背景上の副次テキスト |
| Brewer Navy 100 | `#E1E8F3` | `216 45% 92%` | ライト背景、薄い塗り |

### Accent（暖色）

| Token | HEX | HSL | Role |
|---|---:|---:|---|
| Brass 500 | `#ffc82c` | `44 100% 59%` | セカンダリCTA、バッジ、重要通知 |
| Brass 300 | `#ffdf85` | `44 100% 75%` | ソフトなハイライト、背景装飾 |
| Copper 500 | `#B87333` | `26 57% 46%` | ラベルチップ、限定感、温度感のあるアクセント |
| Cream 50 | `#F7F3E9` | `43 56% 94%` | ダーク背景上の文字、上質なオフホワイト |

### Semantic（意味的な色）

| Token | HEX | HSL | Role |
|---|---:|---:|---|
| Success | `#3E8E6B` | `153 39% 40%` | チェックイン完了、予約完了、成功トースト |
| Warning | `#C49A33` | `42 58% 49%` | 注意、確認待ち、残席わずか |
| Destructive | `#B3453F` | `3 48% 47%` | 削除、エラー、失敗、危険操作 |
| Info | `#3B5A87` | `216 39% 38%` | 情報バナー、補足通知 |

### Neutral（ニュートラル）

| Token | HEX | HSL | Role |
|---|---:|---:|---|
| Neutral 0 | `#FFFFFF` | `0 0% 100%` | 明るいカード、入力欄 |
| Neutral 50 | `#F7F8FA` | `220 20% 98%` | ライト画面背景 |
| Neutral 100 | `#EEF0F4` | `220 17% 95%` | 薄い背景、無効状態 |
| Neutral 200 | `#DCE1EB` | `219 22% 89%` | ボーダー、区切り線 |
| Neutral 400 | `#8D95A6` | `220 11% 60%` | 補助テキスト、プレースホルダー |
| Neutral 600 | `#4D5567` | `221 14% 35%` | 本文、説明文 |
| Neutral 900 | `#141821` | `221 24% 11%` | 見出し、強調テキスト |

### Surface & Borders

- **Dark Background** (`#0B1930`): 顧客向けダーク基調画面の背景。
- **Dark Card** (`#10233D`): ダーク基調画面のカード背景。
- **Light Background** (`#F7F8FA`): 運営・店舗ダッシュボードなどのライト背景。
- **Surface White** (`#FFFFFF`): 入力欄、管理画面カード、ポップオーバー。
- **Border** (`#DCE1EB`): ライト画面の区切り線。
- **Dark Border** (`#20385F`): ダーク画面のカード境界、区切り線。
- **Input Background** (`#FFFFFF`): 入力欄背景。
- **Focus Ring** (`#335280`): フォーカスリング、キーボード操作時の強調。

---

## 3. Typography Rules

### 3.1 和文フォント

NIKENME+ は、プロダクトUIとLPで同一のフォント戦略を基本とする。

**プロダクトUI / LIFF / 管理画面**
- `Noto Sans JP`
- `Hiragino Kaku Gothic ProN`
- `Meiryo`
- `sans-serif`

**LP / マーケティングページ**
- `Noto Sans JP`
- 必要に応じて欧文見出しのみ `Inter` または system font を併用

### 3.2 欧文フォント

**プロダクトUI**
- `-apple-system`
- `BlinkMacSystemFont`
- `Helvetica Neue`
- `Arial`

**LP / キャンペーンページ**
- `Inter`
- `Noto Sans`
- `Helvetica Neue`
- `Arial`

### 3.3 font-family 指定

```css
/* NIKENME+ Product UI */
font-family: -apple-system, BlinkMacSystemFont, "Helvetica Neue",
  "Noto Sans JP", "Hiragino Kaku Gothic ProN", Arial,
  "Meiryo", sans-serif;

/* NIKENME+ LP / Website */
font-family: "Noto Sans JP", -apple-system, BlinkMacSystemFont,
  "Helvetica Neue", Arial, sans-serif;

/* English Label / Small Caption */
font-family: "Inter", -apple-system, BlinkMacSystemFont,
  "Helvetica Neue", Arial, sans-serif;
```

**フォールバックの考え方**
- 操作性を重視する画面では system font を優先し、読み込み速度を担保する。
- LPやキャンペーンページでは `Noto Sans JP` を優先し、ブランドの統一感を出す。
- 欧文小見出しやラベルはやや字間を広げ、上質なナイトライフ感を演出する。

### 3.4 文字サイズ・ウェイト階層

**プロダクトUI**

| Role | Token | Size | Weight | Line Height | Letter Spacing | 備考 |
|---|---|---:|---:|---:|---:|---|
| Page Title | `text-2xl` | 24px | 700 | 1.3 | 0 | ページタイトル |
| Section Title | `text-xl` | 20px | 700 | 1.35 | 0 | セクション見出し |
| Card Title | `text-base` | 16px | 700 | 1.5 | 0 | カード内見出し |
| Body | `text-sm` | 14px | 400 | 1.6 | 0 | 標準本文 |
| Body Large | `text-base` | 16px | 400 | 1.6 | 0 | LP・説明文 |
| Caption | `text-xs` | 12px | 400 / 500 | 1.5 | 0.02em | 補足、注記 |
| Label | `text-xs` | 12px | 700 | 1.4 | 0.08em | バッジ、英字ラベル |
| Smallest | `text-[10px]` | 10px | 500 | 1.4 | 0.04em | アイコンラベル |

**LP / Website**

| Role | Size | Weight | Line Height | Letter Spacing | Color | 備考 |
|---|---:|---:|---:|---:|---|---|
| Hero H1 | 48px〜64px | 700 | 1.15 | 0.02em | `#F7F3E9` / `#13294b` | ファーストビュー |
| Section H2 | 32px〜40px | 700 | 1.25 | 0.02em | `#13294b` | セクション見出し |
| Sub H3 | 22px〜28px | 700 | 1.35 | normal | `#13294b` | 機能見出し |
| Lead | 18px〜20px | 400 / 500 | 1.7 | normal | `#4D5567` | 導入文 |
| Body | 16px | 400 | 1.7 | normal | `#4D5567` | 本文 |
| Caption | 12px〜13px | 500 / 700 | 1.5 | 0.08em | `#335280` | 英字・ラベル |
| Nav Link | 14px | 500 | 1.5 | 0.02em | `#13294b` | ヘッダーナビ |
| CTA | 15px〜16px | 700 | 1.2 | normal | 状況に応じる | ボタン文言 |

### 3.5 行間・字間

**行間**
- プロダクトUI本文: `1.5`〜`1.6`
- LP本文: `1.7`
- 見出し: `1.15`〜`1.35`
- ボタン: `1.15`〜`1.2`

**字間**
- プロダクトUI本文: `0`
- LP大見出し: `0.02em`
- 英字ラベル: `0.08em`〜`0.12em`
- 数字・価格・カウント表示: `0.02em`〜`0.06em`

**ガイドライン**
- 顧客向け画面では、暗い背景上でも読みやすいように本文の行間をやや広めにする。
- 店舗名・空席状況・チェックイン状態など、即時判断が必要な情報は太字と余白で強調する。
- 英字ラベルは装飾的に使いすぎず、補助的な世界観づくりに留める。

### 3.6 禁則処理・改行ルール

```css
overflow-wrap: break-word;
word-break: normal;
line-break: strict;
```

- 店舗名・イベント名・エリア名は不自然な分割を避ける。
- CTAボタン内の文言は原則1行。
- モバイルでは「空いてるお店が、すぐ見つかる。」のように意味単位で改行する。

### 3.7 OpenType 機能

```css
font-feature-settings: "palt" 1;
```

- LP見出しや大きなキャッチコピーでは `palt` を有効にして詰まりすぎない文字組みにする。
- 管理画面の表・数値・コード表示では可読性を優先し、必要に応じて `palt` を無効化する。

### 3.8 縦書き

- 原則として横書きのみ。
- キャンペーンビジュアルやSNS画像で縦書きを使う場合も、Web UI本体には持ち込まない。

---

## 4. Component Stylings

### Buttons

**Primary（Navy）**
- Background: `#13294b`
- Text: `#F7F3E9`
- Border: 1px solid `#13294b`
- Hover: `#20385F`
- Active: `#0B1930`
- Border Radius: 8px
- Font Size: 14px〜16px
- Font Weight: 700
- Height: 40px〜48px

**Secondary（Brass）**
- Background: `#ffc82c`
- Text: `#0B1930`
- Border: 1px solid `#ffc82c`
- Hover: `#ffdf85`
- Active: `#C49A33`
- Border Radius: 8px
- Font Weight: 700

**Outline**
- Background: transparent
- Text: `#13294b` / dark mode `#F7F3E9`
- Border: 1px solid `#DCE1EB` / dark mode `#20385F`
- Hover: `rgba(19, 41, 75, 0.08)`
- Border Radius: 8px

**Ghost**
- Background: transparent
- Text: `#335280`
- Hover: `rgba(51, 82, 128, 0.10)`
- Border Radius: 8px

**Destructive**
- Background: `#B3453F`
- Text: `#FFFFFF`
- Hover: `rgba(179, 69, 63, 0.88)`
- Border Radius: 8px

### Inputs

- Background: `#FFFFFF`
- Text: `#141821`
- Border: 1px solid `#DCE1EB`
- Focus Border: `#335280`
- Focus Ring: `0 0 0 3px rgba(51, 82, 128, 0.25)`
- Placeholder: `#8D95A6`
- Border Radius: 8px
- Font Size: 16px
- Height: 44px〜48px

**Dark UI の入力欄**
- Background: `#FFFFFF`
- Text: `#141821`
- Border: `#DCE1EB`
- Label: `#F7F3E9`
- Helper Text: `#90A4C1`

### Cards

**Dark Card**
- Background: `#10233D`
- Text: `#F7F3E9`
- Border: 1px solid `rgba(255,255,255,0.08)`
- Border Radius: 16px
- Shadow: `0 16px 40px rgba(0,0,0,0.24)`

**Light Card**
- Background: `#FFFFFF`
- Text: `#141821`
- Border: 1px solid `#DCE1EB`
- Border Radius: 16px
- Shadow: `0 12px 32px rgba(19,41,75,0.08)`

**Floating Card / Sheet**
- Background: `#FFFFFF`
- Border Radius: 20px
- Shadow: `0 20px 60px rgba(7,16,34,0.20)`
- Used for: 空席カード、店舗詳細、通知設定、モーダル。

### Badges

**Brand Badge**
- Background: `#ffc82c`
- Text: `#0B1930`
- Border Radius: 999px
- Font Size: 12px
- Font Weight: 700

**Soft Badge**
- Background: `rgba(255, 200, 44, 0.14)`
- Text: `#ffc82c`
- Border: 1px solid `rgba(255, 200, 44, 0.28)`

**Status Badge**
- 空席あり: `Success`
- 残りわずか: `Warning`
- 満席: `Destructive`
- 確認中: `Info`

### Navigation

**Dark Header**
- Background: `#0B1930`
- Text: `#F7F3E9`
- Active: `#ffc82c`
- Border Bottom: `rgba(255,255,255,0.08)`

**Light Header**
- Background: `#FFFFFF`
- Text: `#13294b`
- Active: `#13294b`
- Border Bottom: `#DCE1EB`

### Map / Store Cards

- 店舗名: 16px / 700 / `#141821` または `#F7F3E9`
- エリア・ジャンル: 12px〜13px / 500 / muted color
- 空席状態: badgeで明確に表示
- CTA: 「詳しく見る」「チェックイン」「空席通知」
- カードは角丸16px以上、スマホでは下部シートUIを基本とする。

---

## 5. Layout Principles

### Spacing Scale

| Token | Value | 用途 |
|---|---:|---|
| 2xs | 4px | アイコン間、細かな余白 |
| xs | 8px | ラベル間、フォーム補助 |
| sm | 12px | カード内の小余白 |
| md | 16px | 標準余白 |
| lg | 24px | セクション内余白 |
| xl | 32px | カード間、主要ブロック |
| 2xl | 48px | LPセクション余白 |
| 3xl | 64px | ファーストビュー、セクション間 |
| 4xl | 96px | LPの大きな余白 |

### Border Radius Scale

| Token | Value | 用途 |
|---|---:|---|
| Mini | 4px | 小さなラベル、フォーカス補助 |
| Base | 8px | ボタン、入力欄 |
| Card | 16px | カード、パネル |
| Floating | 20px | ボトムシート、フローティングカード |
| Dialog | 24px | モーダル、重要な確認画面 |
| Full | 999px | バッジ、ピル型要素 |

### Container

- LP Max Width: 1120px〜1200px
- 管理画面 Max Width: 1280px
- フォーム画面 Max Width: 640px
- モバイル横余白: 16px
- デスクトップ横余白: 32px〜48px

### Grid

- LP Desktop: 12 column grid
- Product Desktop: 12 column grid
- Tablet: 8 column grid
- Mobile: 4 column grid
- Map UI: コンテンツカードは下部または右側パネルに集約

### Layout Guidelines

- 顧客向け画面では、重要CTAをファーストビュー内に1つ置く。
- 店舗一覧・マップでは「探す → 比較する → 詳細を見る → 行動する」の導線を短くする。
- 管理画面では左ナビ + メインコンテンツを基本とし、操作ボタンは右上または各行末に配置する。
- LIFFでは画面下部の親指操作領域を重視し、主要CTAは下部固定も許可する。

---

## 6. Depth & Elevation

| Level | Shadow | 用途 |
|---|---|---|
| Card | `0 12px 32px rgba(19,41,75,0.08)` | 通常カード |
| Dark Card | `0 16px 40px rgba(0,0,0,0.24)` | ダーク背景上のカード |
| Floating | `0 20px 60px rgba(7,16,34,0.20)` | ボトムシート、フローティング要素 |
| Popup | `0 24px 80px rgba(7,16,34,0.28)` | モーダル、ポップアップ |
| Glow | `0 0 32px rgba(255,200,44,0.22)` | Brass CTA、キャンペーン強調 |

- 影は強くしすぎず、夜の奥行きを出す用途に限定する。
- 管理画面ではシャドウよりもボーダーで構造を表現する。
- 顧客向けLPでは、Brassの淡いグローを限定的に使い、特別感を演出する。
- Transition: `0.2s`（hover / focus）、`0.3s`（sheet / modal / fade）。

---

## 7. Tailwind / CSS Tokens

### `app/globals.css`

```css
:root {
  /* Brewer Navy palette */
  --bn-950: 216 60% 7%;
  --bn-900: 216 60% 11%;
  --bn-800: 216 55% 15%;
  --bn-700: 216 60% 18%;
  --bn-600: 216 50% 25%;
  --bn-500: 216 45% 35%;
  --bn-300: 216 35% 65%;
  --bn-100: 216 45% 92%;

  /* Accent */
  --brass-500: 44 100% 59%;
  --brass-300: 44 100% 75%;
  --copper-500: 26 57% 46%;
  --cream-50: 43 56% 94%;

  /* Semantic */
  --success: 153 39% 40%;
  --warning: 42 58% 49%;
  --destructive: 3 48% 47%;
  --info: 216 39% 38%;
}

@layer base {
  :root {
    --background: var(--bn-900);
    --foreground: var(--cream-50);

    --card: var(--bn-800);
    --card-foreground: var(--cream-50);

    --popover: 0 0% 100%;
    --popover-foreground: var(--bn-900);

    --primary: var(--bn-700);
    --primary-foreground: var(--cream-50);

    --secondary: var(--brass-500);
    --secondary-foreground: var(--bn-900);

    --muted: 220 17% 95%;
    --muted-foreground: 221 14% 35%;

    --accent: var(--copper-500);
    --accent-foreground: var(--cream-50);

    --border: 219 22% 89%;
    --input: 0 0% 100%;
    --ring: var(--bn-500);

    --radius: 0.5rem;
  }

  .theme-light {
    --background: 220 20% 98%;
    --foreground: var(--bn-900);

    --card: 0 0% 100%;
    --card-foreground: var(--bn-900);

    --popover: 0 0% 100%;
    --popover-foreground: var(--bn-900);

    --primary: var(--bn-700);
    --primary-foreground: var(--cream-50);

    --secondary: var(--brass-500);
    --secondary-foreground: var(--bn-900);

    --muted: 220 17% 95%;
    --muted-foreground: 221 14% 35%;

    --border: 219 22% 89%;
    --input: 0 0% 100%;
    --ring: var(--bn-500);
  }
}
```

### `tailwind.config.ts`

```ts
colors: {
  brewer: {
    950: "hsl(var(--bn-950))",
    900: "hsl(var(--bn-900))",
    800: "hsl(var(--bn-800))",
    700: "hsl(var(--bn-700))",
    600: "hsl(var(--bn-600))",
    500: "hsl(var(--bn-500))",
    300: "hsl(var(--bn-300))",
    100: "hsl(var(--bn-100))",
  },
  brass: {
    500: "hsl(var(--brass-500))",
    300: "hsl(var(--brass-300))",
  },
  copper: {
    500: "hsl(var(--copper-500))",
  },
  cream: {
    50: "hsl(var(--cream-50))",
  },
  success: "hsl(var(--success))",
  warning: "hsl(var(--warning))",
  info: "hsl(var(--info))",
}
```

### 使用ルール

**推奨**
- 基本は `bg-primary` / `text-foreground` / `bg-card` / `border-border` の意味的トークンを使う。
- ブランド表現が必要な箇所のみ `bg-brewer-700` / `text-brass-500` / `bg-cream-50` を許可する。
- 半透明は `bg-primary/10`、`border-secondary/40` のように Tailwind のopacity修飾子で表現する。
- 状態色は `text-success` / `text-warning` / `text-destructive` / `text-info` を使用する。

**禁止**
- 新規コードで `bg-blue-500` / `text-yellow-400` など Tailwind デフォルトパレット直指定を使わない。
- `style={{ color: "#xxxxxx" }}` のようなインラインカラー指定を使わない。
- `bg-white` / `text-black` の生指定を原則避ける。`bg-background` / `text-foreground` / `bg-card` を使う。
- Brass Yellowの上に白文字を置かない。コントラスト不足になりやすいため、`#0B1930` 系の濃色を使用する。

---

## 8. Do's and Don'ts

### Do（推奨）

- Brewer NavyをUI全体の軸にし、Brass YellowはCTA・バッジ・重要通知に限定して使う。
- 顧客向け画面ではダーク基調を活用し、夜の街らしい雰囲気と視認性を両立する。
- 店舗・運営画面では `.theme-light` を使い、業務UIとしての読みやすさを優先する。
- CTAは「店舗を探す」「空席通知を受け取る」「チェックインする」など、行動が明確な文言にする。
- カードやボトムシートは角丸16px以上を基本にし、柔らかく上質な印象にする。
- 色のコントラスト比はWCAG AA以上を目標にする。
- 4px単位のスペーシングで揃える。
- 空席・満席・待ちありなどの状態は、色だけでなくテキストやアイコンでも伝える。

### Don't（禁止）

- 全体を黒背景に寄せすぎない。ブランドの基調は黒ではなくBrewer Navy。
- Brass Yellowを広い面積に使いすぎない。アクセントとして使う。
- テキスト色に純粋な `#000000` を使わない。
- 暗い背景上に低コントラストのグレー文字を置かない。
- 空席状況を色だけで表現しない。
- 管理画面まで過度に夜の雰囲気へ寄せない。業務画面は明快さを優先する。
- 画面ごとに独自カラーを追加しない。必要な場合はDESIGN.mdに追記してから使用する。

---

## 9. Responsive Behavior

### Breakpoints

| Name | Width | 説明 |
|---|---:|---|
| Narrow Mobile | ≤ 375px | 狭いスマートフォン |
| Mobile | ≤ 768px | 標準スマートフォン |
| Tablet | ≤ 1024px | タブレット |
| Desktop | > 1024px | デスクトップ |

### モバイル対応

- 顧客向けUIはモバイルファースト。
- 主要CTAは画面下部の親指操作領域に配置してもよい。
- マップ画面では、店舗カードは下部シート形式を基本とする。
- 入力欄とボタンは最小44px以上を推奨。
- 店舗カードの情報は「店舗名 → 空席状態 → エリア/ジャンル → CTA」の順で表示する。

### デスクトップ対応

- LPは最大1120px〜1200pxの中央寄せ。
- 管理画面は左サイドバー + メインコンテンツ。
- テーブル表示では行間を十分に取り、ステータスバッジで視認性を確保する。
- マップと店舗一覧を横並びにする場合、一覧幅は360px〜440pxを目安にする。

### タッチターゲット

- 最小サイズ: 44px × 44px
- 小さなアイコンボタンでも、クリック領域は44px以上を確保する。
- LIFF画面では下部固定CTAの高さを56px前後にする。

---

## 10. Agent Prompt Guide

### クイックリファレンス

```txt
Primary Color: #13294b
Primary Dark Background: #0B1930
Primary Card: #10233D
Secondary / Accent Yellow: #ffc82c
Cream Foreground: #F7F3E9
Text Dark: #141821
Text Body: #4D5567
Text Muted: #8D95A6
Light Background: #F7F8FA
Border: #DCE1EB
Success: #3E8E6B
Warning: #C49A33
Destructive: #B3453F
Info: #3B5A87

Product UI Font:
-apple-system, BlinkMacSystemFont, "Helvetica Neue",
"Noto Sans JP", "Hiragino Kaku Gothic ProN", Arial,
"Meiryo", sans-serif

Website Font:
"Noto Sans JP", -apple-system, BlinkMacSystemFont,
"Helvetica Neue", Arial, sans-serif

Body Size Product: 14px
Body Size Website: 16px
Line Height Product: 1.5〜1.6
Line Height Website: 1.7
Heading Weight: 700
Button Radius: 8px
Card Radius: 16px
Dialog Radius: 24px
Spacing: 4px単位
```

### プロンプト例

```txt
NIKENME+ の顧客向け店舗検索画面を作成してください。
- ブランドカラー: Brewer Navy #13294b、Brass Yellow #ffc82c、Cream #F7F3E9
- 背景: #0B1930 を基調に、カードは #10233D
- CTA: 背景 #ffc82c、文字 #0B1930、角丸8px、太字
- テキスト: ダーク背景上は #F7F3E9、補助テキストは #90A4C1
- カード: 角丸16px、薄いボーダー、夜の街らしい上質な雰囲気
- 空席状態: 空席あり/残りわずか/満席を色とテキストの両方で表現
- フォント: Noto Sans JP + system font
- モバイルファースト、下部シートUIを意識
```

```txt
NIKENME+ の店舗管理画面を作成してください。
- .theme-light を前提にしたライトUI
- 背景 #F7F8FA、カード #FFFFFF、本文 #4D5567、見出し #141821
- Primary CTA は #13294b、Secondary CTA は #ffc82c
- テーブルは読みやすさ重視。ステータスバッジで空席状況を表示
- 角丸16pxのカード、1pxの薄いボーダー、控えめなシャドウ
- 4px単位のスペーシング
```

---

## 11. Implementation Snippets

### Primary CTA

```tsx
<Button className="bg-primary text-primary-foreground hover:bg-primary/90">
  店舗を探す
</Button>
```

### Brass CTA

```tsx
<Button className="bg-secondary text-secondary-foreground hover:bg-secondary/90">
  空席通知を受け取る
</Button>
```

### Dark Brand Card

```tsx
<Card className="bg-gradient-to-br from-brewer-800 to-brewer-700 text-cream-50 border border-brewer-600/40 shadow-[0_16px_40px_rgba(0,0,0,0.24)]">
  ...
</Card>
```

### Status Badges

```tsx
<span className="rounded-full bg-success/10 px-2 py-1 text-xs font-bold text-success">
  空席あり
</span>

<span className="rounded-full bg-warning/10 px-2 py-1 text-xs font-bold text-warning">
  残りわずか
</span>

<span className="rounded-full bg-destructive/10 px-2 py-1 text-xs font-bold text-destructive">
  満席
</span>
```

### LIFF Bottom CTA

```tsx
<div className="fixed inset-x-0 bottom-0 border-t border-border bg-card/95 p-4 backdrop-blur">
  <Button className="h-14 w-full rounded-xl bg-secondary text-base font-bold text-secondary-foreground">
    チェックインする
  </Button>
</div>
```

---

## 12. Migration Strategy

既存コードではカラー指定が散在しているため、段階的に意味的トークンへ移行する。

### Phase 1 — Token Definition

- `globals.css` に Brewer Navy / Brass / Cream / Semantic tokens を定義する。
- `tailwind.config.ts` に `brewer` / `brass` / `copper` / `cream` / `success` / `warning` / `info` を追加する。
- 既存の `bg-primary` などが新ブランドカラーへ追従する状態を作る。

### Phase 2 — Hard-coded Color Replacement

以下を検索し、画面単位で置換する。

```txt
#[0-9a-fA-F]{3,6}
bg-(blue|amber|red|green|orange|yellow|purple|pink|indigo)-\d{3}
text-(blue|amber|red|green|orange|yellow|purple|pink|indigo)-\d{3}
style={{ color: ... }}
style={{ backgroundColor: ... }}
```

### Phase 3 — Component Standardization

- Button、Card、Badge、Input、Sheet、DialogのclassNameを統一。
- 店舗カード、空席カード、通知カードを共通コンポーネント化する。
- 管理画面は `.theme-light` を基準に整理する。

### Phase 4 — Accessibility Review

- コントラスト比を確認する。
- 状態表示が色だけに依存していないか確認する。
- キーボードフォーカスが見えるか確認する。
- LIFF画面のタッチターゲットが44px以上か確認する。

### Phase 5 — Visual QA

- 顧客LP
- 店舗検索
- マップ
- マイページ
- チェックインQR
- 空席通知設定
- 店舗管理画面
- 運営管理画面

上記画面を対象に、スマホ・タブレット・PCで目視確認する。

---

## 付録 A — 命名ルール

- `primary`: Brewer Navy
- `secondary`: Brass Yellow
- `accent`: Copper
- `background`: 現在テーマの背景
- `foreground`: 現在テーマの文字色
- `card`: カード背景
- `muted`: 補助背景
- `muted-foreground`: 補助テキスト
- `destructive`: 削除・エラー
- `success`: 成功
- `warning`: 注意
- `info`: 情報

---

## 付録 B — レビュー時チェックリスト

- [ ] Tailwindデフォルト色を新規で使っていない
- [ ] インラインカラー指定をしていない
- [ ] Brass Yellow上の文字は濃色になっている
- [ ] ダーク背景上の文字コントラストが十分
- [ ] 空席状態を色だけで伝えていない
- [ ] ボタン・入力欄の高さが44px前後ある
- [ ] カード角丸が16px基準になっている
- [ ] LPと管理画面でトーンを適切に分けている
- [ ] スマホで主要CTAが押しやすい位置にある
- [ ] `DESIGN.md` にない色を勝手に追加していない
