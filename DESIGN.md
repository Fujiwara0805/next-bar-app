# NIKENME+ / 二軒目プラス デザインシステム

**バージョン:** 1.0.0（2026-04-21 初版）
**対象:** `next-bar` リポジトリ全画面（顧客・店舗・運営・LIFF）

---

## 0. 目的とスコープ

画面ごとに異なるカラー指定が散在しており、ブランドの一貫性・保守性が低下している。本ドキュメントで

1. **ブルワーズネイビーを軸とした単一カラーパレット** を定義し、
2. **Tailwind の意味的トークン（`primary` / `secondary` / `muted` など）経由でのみ** 色を使うルールを定める。

HSL 値は `app/globals.css` の CSS 変数と同期させ、Tailwind クラスは `bg-primary` のような**意味名**だけを使う。`text-blue-600` のような**パレット直指定は新規コードで禁止**、既存コードは段階的に置換する。

---

## 1. コアパレット — "Brewer's Navy" トーン

バーカウンターのブラスタップ、黒染めオーク、ほのかな銅色のビールという情景から拾った色域。ネイビーを主軸に、ゴールド・コッパー・クリームで暖色のアクセントを入れる。

| トークン | HEX | HSL (`H S L`) | 用途 |
|---|---|---|---|
| **Brewer Navy 950**（≒Ink） | `#0B1220` | `218 47% 8%` | 深いヘッダー背景・暗いオーバーレイ |
| **Brewer Navy 900**（Base） | `#111A2E` | `221 46% 12%` | `--background`（ダーク基調面） |
| **Brewer Navy 800** | `#1A2540` | `221 42% 18%` | セクション区切り・`--card`（ダーク） |
| **Brewer Navy 700**（Primary） | `#20324F` | `219 44% 22%` | `--primary` — ボタン、強調 |
| **Brewer Navy 600** | `#2A4369` | `218 42% 29%` | ホバー・アクティブ |
| **Brewer Navy 500** | `#3B5A87` | `216 39% 38%` | リンク、フォーカスリング |
| **Brewer Navy 300** | `#8DA2C4` | `218 33% 66%` | ダーク上の副次テキスト |
| **Brewer Navy 100** | `#E6ECF5` | `219 44% 93%` | ライト背景（ライトモード継承） |

### アクセント（暖色）

| トークン | HEX | HSL | 用途 |
|---|---|---|---|
| **Brass 500**（Secondary） | `#C8A35A` | `40 51% 57%` | `--secondary` — 金属光沢・ラベル |
| **Brass 300** | `#E3C995` | `38 56% 74%` | ソフトゴールド、ハイライト |
| **Copper 500**（Accent） | `#B87333` | `26 57% 46%` | ホットアクセント（CTAのラベルチップ等） |
| **Cream 50**（Foreground） | `#F7F3E9` | `43 56% 94%` | 暖かみのあるオフホワイト文字 |

### 状態色（Semantic）

| トークン | HEX | HSL | 用途 |
|---|---|---|---|
| **Success** | `#3E8E6B` | `153 39% 40%` | 成功トースト、チェック完了 |
| **Warning** | `#C49A33` | `42 58% 49%` | 注意喚起（ブランド調和） |
| **Destructive** | `#B3453F` | `3 48% 47%` | 削除・エラー |
| **Info** | `#3B5A87` | Brewer Navy 500 と共用 | 情報バナー |

### ニュートラル（階調）

| トークン | HEX | HSL |
|---|---|---|
| Neutral 0 | `#FFFFFF` | `0 0% 100%` |
| Neutral 50 | `#F7F8FA` | `220 20% 98%` |
| Neutral 100 | `#EEF0F4` | `220 17% 95%` |
| Neutral 200 | `#DCE1EB` | `219 22% 89%` |
| Neutral 400 | `#8D95A6` | `220 11% 60%` |
| Neutral 600 | `#4D5567` | `221 14% 35%` |
| Neutral 900 | `#141821` | `221 24% 11%` |

---

## 2. Tailwind トークンとの対応（`app/globals.css`）

既存の `:root`（現状ティール系）を以下に差し替え。**HSL の 3 値のみ** を入れる（hslラッパーは Tailwind 側）。

```css
:root {
  /* Brewer Navy palette */
  --bn-950: 218 47% 8%;
  --bn-900: 221 46% 12%;
  --bn-800: 221 42% 18%;
  --bn-700: 219 44% 22%;
  --bn-600: 218 42% 29%;
  --bn-500: 216 39% 38%;
  --bn-300: 218 33% 66%;
  --bn-100: 219 44% 93%;
  --brass-500: 40 51% 57%;
  --brass-300: 38 56% 74%;
  --copper-500: 26 57% 46%;
  --cream-50: 43 56% 94%;
}

@layer base {
  /* ダーク基調（顧客・マイページ・マップ等） */
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

    --muted: 220 17% 95%;           /* Neutral 100 */
    --muted-foreground: 221 14% 35%; /* Neutral 600 */

    --accent: var(--copper-500);
    --accent-foreground: var(--cream-50);

    --destructive: 3 48% 47%;
    --destructive-foreground: 0 0% 98%;

    --border: 219 22% 89%;          /* Neutral 200 */
    --input: 0 0% 100%;
    --ring: var(--bn-500);

    --radius: 0.5rem;
  }

  /* ライト優先画面（運営ダッシュボード等）で任意に上書きする場合は
     .theme-light を body に付けて以下を適用 */
  .theme-light {
    --background: 220 20% 98%;      /* Neutral 50 */
    --foreground: var(--bn-900);
    --card: 0 0% 100%;
    --card-foreground: var(--bn-900);
  }
}
```

### Tailwind 側（`tailwind.config.ts`）に追加するパレット

既存の `primary/secondary/...` の意味的トークンはそのまま。加えてブランド直指定が必要な稀有ケース向けにスケールを解放する：

```ts
colors: {
  // ... 既存 ...
  brewer: {
    950: 'hsl(var(--bn-950))',
    900: 'hsl(var(--bn-900))',
    800: 'hsl(var(--bn-800))',
    700: 'hsl(var(--bn-700))',
    600: 'hsl(var(--bn-600))',
    500: 'hsl(var(--bn-500))',
    300: 'hsl(var(--bn-300))',
    100: 'hsl(var(--bn-100))',
  },
  brass: {
    500: 'hsl(var(--brass-500))',
    300: 'hsl(var(--brass-300))',
  },
  copper: {
    500: 'hsl(var(--copper-500))',
  },
  cream: {
    50: 'hsl(var(--cream-50))',
  },
}
```

---

## 3. 使用ルール（必読）

### ✅ 推奨

- **常に意味的トークンを使う**: `bg-primary` / `text-foreground` / `border-border` / `bg-muted` 等。
- ブランド直指定が真に必要な場合のみ `bg-brewer-700` / `text-brass-500` のスケール指定を許可。
- ステータス色は `text-destructive` / `bg-destructive/10` のように **`--destructive`** 経由で。成功・警告・情報は後述。
- グラデは `from-brewer-900 to-brewer-700` など **同系スケール内**で構成。

### ❌ 禁止

- 新規コードで `bg-blue-500` / `text-amber-600` のような **Tailwind デフォルトパレット直指定は不可**（既存 80+ 箇所は Phase 6-2 で順次置換）。
- `style={{ color: '#xxxxxx' }}` の **インラインカラー指定は不可**（既存 228 箇所は Phase 6-2 で順次置換）。
- `bg-white` / `bg-black` の生指定は原則避ける。`bg-background` / `bg-foreground` を使う。
- 半透明は **意味トークン + Tailwind 不透明度修飾子** で表現: `bg-primary/10`, `border-primary/40`。

### 状態色の使い分け

| シナリオ | クラス |
|---|---|
| 成功トースト・完了 | `bg-success/10 text-success` ※ `--success` を追加する（下記TODO） |
| 警告・注意 | `bg-warning/10 text-warning` |
| エラー・削除 | `bg-destructive/10 text-destructive` |
| 情報 | `bg-primary/10 text-primary` |

---

## 4. コンポーネント別ガイド

| コンポーネント | 推奨 |
|---|---|
| プライマリボタン | `bg-primary text-primary-foreground hover:bg-primary/90` |
| セカンダリボタン | `bg-secondary text-secondary-foreground hover:bg-secondary/90` |
| アウトラインボタン | `border border-border bg-transparent hover:bg-accent/10` |
| 破壊的アクション | `bg-destructive text-destructive-foreground` |
| カード | `bg-card text-card-foreground border-border` |
| 入力欄 | `bg-input border-border focus:ring-ring` |
| ナビ背景（ダーク基調） | `bg-brewer-900 text-cream-50` |
| バッジ（ブランド） | `bg-brass-500 text-brewer-900` |
| スタンプ枠（充填） | `border-primary bg-primary/10` |
| スタンプ枠（未充填） | `border-dashed border-muted-foreground/30 bg-muted/30` |

---

## 5. タイポグラフィ（既存踏襲）

- フォント: `Noto Sans JP` 400 / 500 / 700（`globals.css` で `@import`）。
- 見出し `line-height: 1.2`、本文 `1.5`（既存の base 継承）。
- サイズは Tailwind デフォルト（`text-xs` 〜 `text-3xl`）をそのまま。変更は本ドキュメントで議論の上で。

---

## 6. 移行戦略（Phase 6 として todo.md で管理）

規模が大きいため、**一括置換ではなく段階的 PR**。各フェーズごとに画面挙動を目視で確認する。

1. **6-1 トークン定義（破壊変更なし）**
   `globals.css` の HSL を新カラーに差し替え・`tailwind.config.ts` に brewer/brass/copper/cream スケール追加。既存の `bg-primary` 等は自動的に新色に追従するため、この時点で大半の画面が新カラーに切り替わる。

2. **6-2 ハードコード色の洗い出しと置換**
   - `#[0-9a-fA-F]{3,6}`（228 件 / 30 ファイル）
   - `bg-(blue|amber|red|green|orange|yellow|purple|pink|indigo)-\d{3}`（80+ 件 / 20 ファイル）
   - `style={{ color: ... }}` / `style={{ backgroundColor: ... }}`
   画面ごとに PR を分け、意味トークンへ置換。

3. **6-3 状態色トークンの追加**
   `--success` / `--warning` / `--info` を `:root` と `tailwind.config.ts` に追加し、トースト・アラート・バッジを統一。

4. **6-4 ダークモード（オプション）**
   `.dark` を使う場合の HSL 差分を別途定義（現在は未使用で保留）。

---

## 7. 参考スニペット（ストーリーブック代替）

```tsx
// プライマリ CTA
<Button className="bg-primary text-primary-foreground hover:bg-primary/90">
  抽選に応募する
</Button>

// ブランド強調エリア（マイページのスキャンCTA等）
<Card className="bg-gradient-to-br from-brewer-800 to-brewer-700 text-cream-50 border-brewer-600">
  ...
</Card>

// ブラスバッジ
<span className="inline-flex items-center px-2 py-0.5 rounded-full bg-brass-500 text-brewer-900 text-xs font-medium">
  LIMITED
</span>
```

---

## 付録 A — 禁止事項のESLintヒント（任意）

将来的に `eslint-plugin-tailwindcss` の `no-custom-classname` とカスタム正規表現で
`bg-(blue|amber|...)-\d` をエラーにすることを検討。現時点ではレビュー時の目視チェックで運用。
