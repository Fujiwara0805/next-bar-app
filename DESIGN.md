# DESIGN.md — NIKENME+ / にけんめぷらす

> NIKENME+（`next-bar` リポジトリ）のデザイン仕様書。
> **コンセプト = 「街の飲食店回遊マップ（終日・フラット）→ ローカルコミュニティマップ」**（戦略 `tasks/metagame-strategy.md` v5 / T7）。
> ビジュアル言語は **雑誌（マガジン）型レイアウト**を採用する。マガジンハウス『BRUTUS』Web版の骨格 — 純白基調・編集的グリッド・「英字（Futura系）＋和文」のセクション見出し・罫線で構造を作る — を、**既存ブランドカラー Brewer Navy `#13294b` / Brass Yellow `#ffc82c` / Cream Off-white `#F7F3E9` を踏襲したまま**翻訳したもの。
>
> 旧仕様（ダークNavyの「夜の街／二軒目」基調）からの転換。**消費者画面 = ライトなマガジン基調**、**店舗管理・運営画面 = 機能的なライト基調**（マガジン装飾は持ち込まない）で一貫させる。

---

## 0. 転換の要点（旧仕様との差分）

| 観点 | 旧（〜2026-05） | 新（本仕様） |
|---|---|---|
| 世界観 | 夜の街・二軒目・ナイトライフ | 終日の街歩き・飲食店回遊・ローカルコミュニティ |
| 基調 | ダーク（Navy背景＋Cream文字） | **ライト（白/クリーム背景＋Navyインク文字）** |
| レイアウト | 没入型ダークUI | **雑誌グリッド**（面色切替・罫線・左揃え見出し） |
| 見出し | 装飾的タイポ | **英字uppercase（Jost）＋和文重厚見出し（Noto 800/900）** の対訳ヘッダー |
| 影 | リッチなシャドウ/グロー | **罫線中心・影は最小** |
| ブランド色 | Navy/Brass/Cream（背景に多用） | Navy/Brass/Cream（**インク・帯・アクセント**として規律的に使用） |

ブランドカラーの三色は不変。役割を「背景の主役」から「インク（Navy）・主アクセント（Brass）・温かい紙面（Cream）」へ移す。

---

## 1. Visual Theme & Atmosphere

- **デザイン方針**: 純白 `#FFFFFF` / クリーム `#F7F3E9` の明るい紙面 × Brewer Navy `#13294b` のインク文字。**雑誌的グリッドとシャープなコントラスト**で、「街を歩いて、次の一軒を見つける」終日の回遊体験を編集的に提示する。
- **密度**: 消費者画面は余白を活かしつつ情報を碁盤目状に整列（写真＋短い文字情報のカード）。店舗・運営画面は情報密度をやや高め、一覧性・業務効率を優先。
- **キーワード**: 終日・回遊・ローカル・編集的・明快・直感的・信頼感・街の鮮度。
- **特徴**:
  - セクションを **面色の切替**（白 / クリーム / 淡Neutral / Navy帯）で区切る。
  - **Navyのチャコール帯**（`#13294b`）に Cream/白文字＋英字大見出しを置くのがアクセント（BRUTUSの暗色帯をブランド色で代替）。
  - **「英字（Jost, uppercase）＋和文（Noto 800/900）」のセクションヘッダー**がシグネチャ。
  - Brass はカテゴリバッジ・主要CTA・選択状態など**点のアクセント**に限定（広面積に塗らない）。
- **適用範囲**: 顧客向けLP・マップ・店舗一覧・店舗詳細・マイページ・チェックイン・空席通知・LIFF（＝ライトマガジン）／店舗管理・運営管理（＝機能的ライト）。

---

## 2. Color Palette & Roles

### Brand（不変）

- **Brewer Navy** (`#13294b`): **インク（本文/見出し）・チャコール帯・Primary CTA・ヘッダー罫**。
- **Brass Yellow** (`#ffc82c`): 主アクセント。カテゴリバッジ・主要CTA・選択/通知・特集の差し色。
- **Cream Off-white** (`#F7F3E9`): 温かい紙面サーフェス。セクション交互背景・Navy帯上の文字色。

### Surface（背景・紙面）

| Token | HEX | Role |
|---|---|---|
| Page White | `#FFFFFF` | 基本のページ/カード背景（純白） |
| Paper Cream | `#F7F3E9` | セクション交互背景・温かい面 |
| Mist | `#F7F8FA` | 淡いNeutralのセクション区切り（Neutral 50） |
| Section Line | `#EEF0F4` | 薄いグレー区切り（Neutral 100） |
| Charcoal Band | `#13294b` | 暗色帯セクション（＝Brewer Navy。白/Cream文字） |

### Brewer Navy Scale（役割を更新）

| Token | HEX | HSL | Role（新） |
|---|---:|---:|---|
| Brewer Navy 950 | `#071022` | `216 60% 7%` | 最深の帯・モーダル背面（限定） |
| Brewer Navy 900 | `#0B1930` | `216 60% 11%` | 帯の濃淡・Active |
| Brewer Navy 800 | `#10233D` | `216 55% 15%` | 帯のサブ面 |
| Brewer Navy 700 | `#13294b` | `216 60% 18%` | **インク・Primary・チャコール帯** |
| Brewer Navy 600 | `#20385F` | `216 50% 25%` | Hover/Active・帯上の罫 |
| Brewer Navy 500 | `#335280` | `216 45% 35%` | Link・Focus Ring |
| Brewer Navy 300 | `#90A4C1` | `216 35% 65%` | Navy帯上の副次テキスト |
| Brewer Navy 100 | `#E1E8F3` | `216 45% 92%` | 淡い塗り・選択面 |

### Accent

| Token | HEX | HSL | Role |
|---|---:|---:|---|
| Brass 500 | `#ffc82c` | `44 100% 59%` | 主アクセント・CTA・カテゴリバッジ |
| Brass 300 | `#ffdf85` | `44 100% 75%` | ソフトハイライト |
| Copper 500 | `#B87333` | `26 57% 46%` | 食の温度感・限定ラベル |
| Cream 50 | `#F7F3E9` | `43 56% 94%` | Navy帯上の文字・温かい紙面 |

### Text / Foreground

| Token | HEX | Role |
|---|---:|---|
| Ink (Primary) | `#13294b` | 本文・見出し（＝Navy。純黒は使わない） |
| Body | `#4D5567` | 説明文・本文補助（Neutral 600） |
| Muted | `#8D95A6` | 補助テキスト・プレースホルダー（Neutral 400） |
| Inverse | `#F7F3E9` / `#FFFFFF` | Navy帯/Navy CTA上の文字 |

### Border / Rule（雑誌は罫線で構造を作る）

| Token | HEX | Role |
|---|---:|---|
| Hairline | `#DCE1EB` | カード/セクションの細罫（Neutral 200） |
| Rule Ink | `#13294b` | 見出し下の太罫・編集的セパレータ |
| Border on Dark | `rgba(255,255,255,0.14)` | Navy帯上の区切り |

### Semantic（不変）

| Token | HEX | Role |
|---|---:|---|
| Success | `#3E8E6B` | 空席あり・完了 |
| Warning | `#C49A33` | 残席わずか・確認待ち |
| Destructive | `#B3453F` | 満席・削除・エラー |
| Info | `#3B5A87` | 情報・補足 |

### Category Accent（規律的・最小）

カテゴリの色分けは**ブランド三色＋Copperに限定**する。BRUTUSのカテゴリ虹色は採用しない（ブランド規律）。差別化は色数ではなく**写真・タイポ・面色**で行う。

- 飲食一般 / ランチ・定食: **Brass `#ffc82c`**
- カフェ・喫茶 / ベーカリー: **Copper `#B87333`**
- バー・夜 / 特集の核: **Navy `#13294b`**
- 状態（空席等）は Semantic 色＋テキストで（色だけに依存しない）。

> 画面ごとに独自カラーを足さない。必要なら本ファイルに追記してから使う（§8）。

---

## 3. Typography Rules

### 3.1 和文フォント

`Noto Sans JP` を主軸に、雑誌的なウェイト運用を行う。

- **本文**: 400
- **小見出し / 強調**: 700
- **大見出し / セクション和文 / HERO**: 800〜900（重厚な雑誌見出し）
- **フォールバック**: `-apple-system, BlinkMacSystemFont, "Helvetica Neue", "Hiragino Kaku Gothic ProN", "Meiryo", sans-serif`

### 3.2 欧文フォント（マガジン英字）

`Jost`（Google Fonts・無料の幾何学サンセリフ／Futura系の代替）を、**英字ラベル・セクションヘッダーの英字・日付・カテゴリ表記**に使う。

- **ウェイト**: 400 / 500 / 600 / 700
- **用途**: uppercase ラベル（`letter-spacing: 0.06–0.1em`）、対訳ヘッダーの英字
- **CSS変数**: `var(--font-jost)`（`app/layout.tsx` で `next/font/google` 読込）
- **フォールバック**: `"Futura", "Century Gothic", system-ui, sans-serif`

> 商用ライセンスの「FOT-筑紫ゴシック」「Futura PT」は同梱しない。和文＝Noto Sans JP／英字＝Jost で雑誌トーンを再現する。

### 3.3 font-family 指定

```css
/* 既定（和文・本文） */
font-family: var(--font-noto-sans-jp), -apple-system, BlinkMacSystemFont,
  "Helvetica Neue", "Hiragino Kaku Gothic ProN", "Meiryo", sans-serif;

/* 英字ラベル / セクションヘッダー英字 / 日付 */
font-family: var(--font-jost), "Futura", "Century Gothic", system-ui, sans-serif;
/* Tailwind では font-en ユーティリティ（fontFamily.en）で適用 */
```

### 3.4 サイズスケール

**消費者UI / LP（PC基準。モバイルは1段下げ）**

| Role | Size | Weight | Font | Line-height | 用途 |
|---|---:|---:|---|---:|---|
| Magazine Head (H1) | 40–56px | 900 | Noto | 1.15 | HERO・特集大見出し |
| Section H2 | 28–32px | 800 | Noto | 1.25 | セクション和文見出し |
| Sub H3 | 20–22px | 700 | Noto | 1.35 | 機能/小見出し |
| Card Title | 16px | 700 | Noto | 1.45 | カード見出し |
| Body | 16px | 400 | Noto | 1.6 | 本文・説明 |
| Lead | 18px | 400/500 | Noto | 1.6 | 導入文 |
| English Label | 13–14px | 700 | **Jost** | 1.2 | uppercase 英字ラベル（`tracking 0.08em`） |
| Caption | 12px | 500 | Noto | 1.5 | 注記・日付（和） |

**店舗管理 / 運営UI**

| Role | Size | Weight | 用途 |
|---|---:|---:|---|
| Page Title | 24px | 700 | ページ見出し |
| Section Title | 20px | 700 | セクション |
| Card/Table Title | 16px | 700 | カード/表見出し |
| Body | 14px | 400 | 本文・表セル |
| Label | 12px | 700 | バッジ・英字ラベル（`tracking 0.08em`） |

### 3.5 行間・字間

- 本文: `line-height 1.6`（雑誌的にタイト）。Lead/長文も 1.6〜1.7。
- 見出し: `1.15`〜`1.35`。
- 字間: 和文本文 `normal`。**英字ラベルのみ** `0.06em`〜`0.1em`。数字/価格 `0.02em`。
- `font-feature-settings: "palt" 1` は**大きな和文見出し限定**（本文・表・数値では使わない）。

### 3.6 禁則・改行

```css
overflow-wrap: break-word;
word-break: normal;
line-break: strict;
```

- 店舗名・エリア名・イベント名は不自然な分割を避ける。CTA文言は原則1行。
- モバイルは意味単位で改行（例「街の“今いける”お店が、／すぐ見つかる。」）。

---

## 4. Component Stylings

### 4.1 セクションヘッダー（シグネチャ）

英字uppercase（Jost）＋和文見出し（Noto 800）を**左揃え**で並べ、下に**太罫（Rule Ink）**を引く。共通コンポーネント `components/ui/section-header.tsx` を使う。

```html
<header class="section-header">
  <span class="en">LOCAL DINING MAP</span>
  <h2 class="ja">街の飲食店回遊マップ</h2>
</header>
```

```css
.section-header .en {
  font-family: var(--font-jost), sans-serif;
  font-size: 13px; font-weight: 700;
  letter-spacing: 0.1em; text-transform: uppercase;
  color: #B87333; /* Copper か Navy。差し色は規律内で */
}
.section-header .ja {
  font-family: var(--font-noto-sans-jp), sans-serif;
  font-size: 28px; font-weight: 800; color: #13294b;
  line-height: 1.25;
}
.section-header { border-bottom: 2px solid #13294b; padding-bottom: 8px; }
```

### 4.2 カード（記事/店舗サムネイル）

- 写真（4:3 または 16:9）＋ タイトル ＋ メタ（エリア/カテゴリ/状態）。
- **背景 白 `#FFFFFF`、細罫 `1px solid #DCE1EB`、影なし〜最小、角丸 8–12px**。
- 情報は縦配置。区切りは余白と罫線で。Cream面の上では罫を `rgba(19,41,75,0.1)`。

```tsx
<article className="rounded-[12px] border border-border bg-white overflow-hidden">
  <div className="aspect-[4/3] bg-muted">{/* image */}</div>
  <div className="p-4">
    <h3 className="text-base font-bold text-foreground">店舗名</h3>
    <p className="font-en text-[12px] tracking-[0.08em] text-[#8D95A6]">OITA / BAR</p>
  </div>
</article>
```

### 4.3 ボタン

**Primary（Navy）**: bg `#13294b` / text `#F7F3E9` / radius 8px / weight 700 / h 44–48px / hover `bg-primary/90`。
**Secondary（Brass）**: bg `#ffc82c` / **text `#13294b`（白文字禁止）** / hover `bg-brass-300`。
**Outline**: 透明 / text `#13294b` / border `#DCE1EB` / hover `bg-primary/8`。
**Ghost**: 透明 / text `#4D5567` / hover `bg-primary/8`。
**Destructive**: bg `#B3453F` / text 白。

### 4.4 カテゴリバッジ

```css
.category-badge {
  font-family: var(--font-jost), sans-serif;
  font-size: 12px; font-weight: 700; letter-spacing: 0.06em;
  text-transform: uppercase;
  background: #ffc82c; color: #13294b;     /* 主アクセント */
  padding: 4px 10px; border-radius: 999px;
}
```

- Navy アウトライン版（`border:1px solid #13294b; color:#13294b; background:transparent`）も可。

### 4.5 入力 / フォーム

- 背景 `#FFFFFF` / text `#141821`（=foreground） / border `1px solid #DCE1EB` / radius 8px / height 44–48px / font-size 16px。
- Focus: border `#335280` ＋ ring `0 0 0 3px rgba(51,82,128,0.25)`。
- Placeholder `#8D95A6`。

### 4.6 ナビゲーション

- **ヘッダー**: 白背景 ＋ Navy文字 ＋ 下罫 `#DCE1EB`。Active は Navy 太字／Brass下線。
- **Navy帯ヘッダー**（限定）: bg `#13294b` ＋ Cream文字 ＋ Active Brass。

### 4.7 マップ / 店舗カード

- 店舗名 16px/700/`#13294b`。エリア・カテゴリ 12–13px/Jost/`#8D95A6`。
- 空席状態は Semantic 色のバッジ＋テキスト（色のみに依存しない）。
- 下部シート/詳細パネルは**白背景＋細罫＋角丸16px**（旧ダークパネルを置換）。

---

## 5. Layout Principles

- **コンテナ最大幅**: LP/消費者 1120–1200px、管理 1280px、フォーム 640px。
- **グリッド**: 12カラム。カード 3〜4カラム配置が基本。
- **セクション区切り = 面色の切替**: `#FFFFFF` / `#F7F3E9` / `#F7F8FA` / `#13294b`帯 を交互に。**SVGウェーブ等の装飾区切りは廃止**し、面色＋罫線で区切る。
- 見出しは**左揃え**。画像は 4:3 / 16:9。
- セクション間余白: 中庸（48–80px）。
- モバイル横余白 16px、PC 32–48px。
- マップUIはカードを下部シート/右パネルに集約。

---

## 6. Depth & Elevation

雑誌は**罫線で構造**を作る。影は最小限。

| Level | Shadow | 用途 |
|---|---|---|
| Flat | none（border のみ） | カード・セクションの基本 |
| Card (subtle) | `0 8px 24px rgba(19,41,75,0.06)` | 浮かせたいカード限定 |
| Floating | `0 16px 40px rgba(7,16,34,0.14)` | ボトムシート・モーダル |
| Glow | `0 0 24px rgba(255,200,44,0.20)` | Brass CTAの限定強調 |

- Transition: `0.2s`（hover/focus）、`0.3s`（sheet/modal）。
- 管理画面はシャドウよりボーダーで構造を表現。

---

## 7. Tailwind / CSS Tokens

### `app/globals.css`（ライト既定）

意味トークンを**ライト基調**で定義する（旧仕様はダーク既定だった）。

```css
:root {
  /* Brewer Navy 生スケール（HSL） */
  --bn-950: 216 60% 7%;
  --bn-900: 216 60% 11%;
  --bn-800: 216 55% 15%;
  --bn-700: 216 60% 18%;   /* #13294b — ink / primary */
  --bn-600: 216 50% 25%;
  --bn-500: 216 45% 35%;
  --bn-300: 216 35% 65%;
  --bn-100: 216 45% 92%;

  --brass-500: 44 100% 59%;  /* #ffc82c */
  --brass-300: 44 100% 75%;
  --copper-500: 26 57% 46%;
  --cream-50: 43 56% 94%;    /* #F7F3E9 */

  --success: 153 39% 40%;
  --warning: 42 58% 49%;
  --destructive: 3 48% 47%;
  --info: 216 39% 38%;
}

@layer base {
  :root {
    /* ===== ライト既定（消費者マガジン基調） ===== */
    --background: 0 0% 100%;            /* 白 */
    --foreground: var(--bn-700);        /* Navy インク */

    --card: 0 0% 100%;                  /* 白カード */
    --card-foreground: var(--bn-700);

    --popover: 0 0% 100%;
    --popover-foreground: var(--bn-700);

    --primary: var(--bn-700);           /* Navy */
    --primary-foreground: var(--cream-50);

    --secondary: var(--brass-500);      /* Brass */
    --secondary-foreground: var(--bn-700);  /* Brass上はNavy文字 */

    --muted: 220 17% 95%;               /* Neutral 100 */
    --muted-foreground: 221 14% 35%;    /* Neutral 600 = Body */

    --accent: var(--copper-500);
    --accent-foreground: var(--cream-50);

    --destructive: 3 48% 47%;
    --destructive-foreground: 0 0% 98%;

    --border: 219 22% 89%;              /* Hairline #DCE1EB */
    --input: 0 0% 100%;
    --ring: var(--bn-500);

    --radius: 0.5rem;
  }

  /* 旧 .theme-light は実質ライト既定と同義（store/manage 用に維持・no-op） */
  .theme-light { /* same as :root light */ }
}
```

> 旧 `:root`（ダーク）→ ライトへ反転したことで、`bg-background`/`text-foreground`/`bg-card` を使う既存箇所は自動的にライトへ追従する。

### `tailwind.config.ts`

```ts
fontFamily: {
  // 既定は globals.css の body で Noto。英字ラベルは font-en。
  en: ['var(--font-jost)', 'Futura', 'Century Gothic', 'system-ui', 'sans-serif'],
},
borderRadius: {
  dialog: '1.25rem',
  floating: '1rem',
  card: '0.75rem',   /* 雑誌寄りに控えめ */
  lg: 'var(--radius)',
  md: 'calc(var(--radius) - 2px)',
  sm: 'calc(var(--radius) - 4px)',
},
// colors（brewer/brass/copper/cream/success/warning/info）は現状維持
```

### 使用ルール

**推奨**
- 基本は意味トークン `bg-background` / `text-foreground` / `bg-card` / `border-border` / `bg-primary` / `bg-secondary`。
- ブランド強調が要る所のみ `text-brewer-700` / `bg-brass-500` / `bg-cream-50`。
- 英字ラベルは `font-en`（Jost）＋ `uppercase tracking-[0.08em]`。
- 半透明は Tailwind opacity 修飾子（`bg-primary/10`）。

**禁止**
- `bg-blue-500` 等 Tailwind 既定パレットの新規直指定。
- `style={{ color: '#xxxxxx' }}` のインライン色（既存は段階的に意味トークンへ）。
- Brass地に白文字（必ず `#13294b` 系）。
- 画面ごとの独自カラー追加（本ファイルに追記してから）。
- 広面積のダークNavy背景への回帰（帯・アクセントとして限定使用）。

---

## 8. Do's and Don'ts

### Do

- 白/クリームの紙面を基調に、Navyをインク、Brassを点アクセントにする。
- セクションは面色の切替＋罫線で区切る。見出しは「英字＋和文」で左揃え。
- カードは白＋細罫＋影最小、角丸は控えめ（8–12px）。
- 終日・回遊の文脈で写真を選ぶ（昼の街・店内・人の流れ）。夜は数あるシーンの一つ。
- 空席/満席/残りわずかは色＋テキスト＋アイコンで伝える。
- コントラスト比 WCAG AA 以上。4px単位のスペーシング。

### Don't

- 全面をダークNavyに戻さない（基調はライト）。
- Brassを広面積に塗らない／Brass上に白文字を置かない。
- 純黒 `#000000` を本文に使わない（インクはNavy）。
- SVGウェーブ等の装飾区切りを多用しない（面色＋罫で）。
- 管理画面に雑誌装飾を持ち込みすぎない（明快さ優先）。
- 影/グローを多用しない（罫線で構造を作る）。

---

## 9. Responsive Behavior

| Name | Width | 説明 |
|---|---:|---|
| Narrow Mobile | ≤ 375px | 狭いスマホ |
| Mobile | ≤ 768px | 標準スマホ（1カラム、本文15–16px、H2 20–24px） |
| Tablet | ≤ 1024px | 2カラム、本文16px |
| Desktop | > 1024px | 12カラム、本文16px |

- 消費者UIはモバイルファースト。主要CTAは親指圏（下部固定可、LIFFは56px前後）。
- マップは下部シート、カードは「店舗名→空席→エリア/カテゴリ→CTA」順。
- 英字ラベルの `letter-spacing` はモバイルでも維持。カテゴリ色はモバイルでも保つ。
- タッチターゲット最小 44×44px。

---

## 10. Agent Prompt Guide

### クイックリファレンス

```txt
Base: Light magazine (BRUTUS-style) on brand colors
Page White: #FFFFFF   Paper Cream: #F7F3E9   Mist: #F7F8FA
Ink / Primary (Navy): #13294b      Accent (Brass): #ffc82c
Copper: #B87333        Inverse text: #F7F3E9
Body text: #4D5567     Muted: #8D95A6     Hairline: #DCE1EB
Success #3E8E6B / Warning #C49A33 / Destructive #B3453F / Info #3B5A87

JP font: Noto Sans JP (body 400 / subhead 700 / head 800–900)
EN label font: Jost (var(--font-jost)) uppercase, letter-spacing 0.06–0.1em
Body 16px / line-height 1.6 / Heading 800–900
Button radius 8px / Card radius 8–12px / Spacing 4px grid
Shadows minimal — use hairline rules for structure
```

### プロンプト例（消費者画面）

```txt
NIKENME+ の消費者向け画面を「街の飲食店回遊マップ」の BRUTUS風ライトマガジンで作成。
- 背景: 白/クリーム(#F7F3E9)を交互。区切りは面色＋細罫(#DCE1EB)。SVGウェーブ等の装飾区切りは使わない。
- インク文字＝Brewer Navy #13294b（純黒は使わない）。本文 #4D5567。
- セクション見出し＝英字uppercase(Jost)＋和文見出し(Noto 800)＋下に太罫(Navy)。
- カード＝白＋細罫＋影なし、角丸8–12px、写真4:3。
- CTA＝Primary:Navy塗り/Cream文字、Secondary:Brass塗り/Navy文字。
- カテゴリ色は Navy/Brass/Copper に限定。状態は色＋テキスト。
- 和文 Noto Sans JP、英字ラベル Jost。モバイルファースト。
```

### プロンプト例（管理画面）

```txt
NIKENME+ の店舗/運営管理画面（機能的ライト）を作成。
- 背景 #F7F8FA、カード #FFFFFF、本文 #4D5567、見出し #13294b。
- Primary CTA #13294b、Secondary #ffc82c(Navy文字)。
- テーブルは可読性優先。ステータスはバッジ＋テキスト。
- カード角丸8–12px、1pxの細罫(#DCE1EB)、影は控えめ。マガジン装飾は持ち込まない。
- 4px単位のスペーシング。
```

---

## 11. Implementation Snippets

### Section Header（シグネチャ）

```tsx
<header className="border-b-2 border-primary pb-2">
  <span className="font-en block text-[13px] font-bold uppercase tracking-[0.1em] text-copper-500">
    LOCAL DINING MAP
  </span>
  <h2 className="text-2xl md:text-3xl font-extrabold text-foreground">街の飲食店回遊マップ</h2>
</header>
```

### Primary / Secondary CTA

```tsx
<Button className="bg-primary text-primary-foreground hover:bg-primary/90">お店を探す</Button>
<Button className="bg-secondary text-secondary-foreground hover:bg-brass-300">空席通知を受け取る</Button>
```

### Magazine Card

```tsx
<article className="rounded-card border border-border bg-card overflow-hidden">
  <div className="aspect-[4/3] bg-muted" />
  <div className="p-4">
    <h3 className="text-base font-bold text-foreground">店舗名</h3>
    <p className="font-en mt-1 text-[12px] uppercase tracking-[0.08em] text-muted-foreground">OITA · CAFE</p>
  </div>
</article>
```

### Category Badge

```tsx
<span className="font-en rounded-full bg-secondary px-2.5 py-1 text-[12px] font-bold uppercase tracking-[0.06em] text-secondary-foreground">
  LUNCH
</span>
```

### Status Badges

```tsx
<span className="rounded-full bg-success/10 px-2 py-1 text-xs font-bold text-success">空席あり</span>
<span className="rounded-full bg-warning/10 px-2 py-1 text-xs font-bold text-warning">残りわずか</span>
<span className="rounded-full bg-destructive/10 px-2 py-1 text-xs font-bold text-destructive">満席</span>
```

### Navy Charcoal Band（暗色帯セクション・限定）

```tsx
<section className="bg-primary text-cream-50">
  <span className="font-en text-[13px] uppercase tracking-[0.1em] text-brass-500">FOR ORGANIZERS</span>
  <h2 className="text-3xl font-extrabold">イベントの回遊マップ、卒業しませんか</h2>
</section>
```

---

## 12. Migration Strategy

`tasks/metagame-strategy.md` v5 のリポジションに同期。色指定が散在するため段階移行する。

### Phase 1 — Token Foundation（軸）
- `globals.css` の `:root` を**ライト既定**へ反転。`app/layout.tsx` に `Jost`（`--font-jost`）追加。`tailwind.config.ts` に `fontFamily.en` ＋角丸調整。
- `lib/app-mode.ts`（`useAppMode()` の参照ハブ・消費者画面36ファイルに波及）の `BAR_COLORS_A/B`・パネルテーマを**ダーク→ライトマガジン**へ書換。

### Phase 2 — Shared UI
- `components/ui/{button,input,select,sonner,card,badge}` のダーク決め打ちを意味トークンへ。
- `components/ui/section-header.tsx`（英字＋和文シグネチャ）を新設。

### Phase 3 — 主要消費者画面
- LP（`app/landing/page.tsx`：独自 `LP_*` 定数・`WaveDivider`/`GoldDivider` を雑誌区切りへ）／マップ／店舗一覧／店舗詳細／マイページ／LIFF を各々目視パスでライトマガジン化。

### Phase 4 — 残り画面（次パス）
- 認証 / 店舗管理 / 運営 / 法務・情報系を、本基盤・`SectionHeader`・トークンで順次。

### Phase 5 — Visual QA
- LP（ja/en/ko/zh）・マップ・店舗一覧/詳細・マイページ・チェックインQR・空席通知設定・店舗管理・運営管理を、スマホ/タブレット/PCで目視。

### 置換の検索パターン

```txt
#13294b / #ffc82c / #F7F3E9（インライン）→ 役割に応じ意味トークン or app-mode 経由
bg-(blue|amber|red|green|orange|yellow|...)-\d{3}
style={{ color: ... }} / style={{ background... }}
bg-brewer-700 を広背景に使う箇所（→ 帯/アクセントへ限定）
```

---

## 付録 A — 命名ルール

- `primary`: Brewer Navy（インク/CTA） / `secondary`: Brass / `accent`: Copper
- `background`/`foreground`: ライト基調の背景・Navyインク
- `card` / `muted` / `muted-foreground` / `border`(Hairline)
- `destructive` / `success` / `warning` / `info`
- `font-en`: Jost（英字ラベル）

## 付録 B — レビュー時チェックリスト

- [ ] 基調がライト（白/クリーム）。広面積ダークNavyへ回帰していない
- [ ] 見出しが「英字(Jost uppercase)＋和文(Noto 800)」＋太罫のヘッダーになっている
- [ ] カードが白＋細罫＋影最小／角丸8–12px
- [ ] Brass地の文字は Navy（白文字でない）／Brassを広面積に塗っていない
- [ ] 本文インクが Navy（純黒でない）。低コントラストの灰文字が残っていない
- [ ] セクション区切りが面色＋罫線（SVGウェーブ等の装飾に依存しない）
- [ ] 空席状態を色だけで伝えていない
- [ ] Tailwind既定色/インライン色を新規追加していない
- [ ] 英字ラベルに `font-en` ＋ `letter-spacing` が付いている
- [ ] ボタン/入力の高さ44px前後／タッチターゲット44px以上
- [ ] LPが ja/en/ko/zh で崩れない
- [ ] `DESIGN.md` にない色を勝手に追加していない
