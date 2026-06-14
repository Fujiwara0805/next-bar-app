'use client';

// ============================================
// 転換装置（PV→LINE友だち化フック）の再利用CTA
//
// metagame-strategy §6/§7手2/§13.3: PVを公式LINEの友だちに転換する唯一の実装枠。
// クリックは /api/line/cta で source 別に計測され、LINE友だち追加URLへ 302 される。
//
// 友だち追加URL (NEXT_PUBLIC_LINE_ADD_FRIEND_URL) が未設定の環境では
// 何も描画しない（graceful）。URL を .env / Vercel に入れると自動で表示される。
// ============================================

import { sendGAEvent } from '@/lib/analytics';
import { LINE_BRAND_COLOR } from '@/lib/line/constants';
import { useLanguage } from '@/lib/i18n/context';

// NEXT_PUBLIC env はビルド時にインライン化される。
const ADD_FRIEND_URL = process.env.NEXT_PUBLIC_LINE_ADD_FRIEND_URL;

export type LineCtaSource = 'map' | 'store_detail' | 'store_page' | 'event';

type LineFriendCtaProps = {
  /** 計測用の設置面ラベル。/api/line/cta のホワイトリストと一致させること。 */
  source: LineCtaSource;
  /** 任意の参照ID（店舗ID/イベントID等）。計測の内訳に使う。 */
  refId?: string | null;
  /** card = 見出し+説明+ボタンの塊 / compact = ボタンのみ */
  variant?: 'card' | 'compact';
  className?: string;
};

const NAVY = '#13294B';
const GRAY = '#5b6472';

export function LineFriendCta({
  source,
  refId,
  variant = 'card',
  className,
}: LineFriendCtaProps) {
  const { t } = useLanguage();

  if (!ADD_FRIEND_URL) return null;

  const href = `/api/line/cta?source=${encodeURIComponent(source)}${
    refId ? `&ref=${encodeURIComponent(refId)}` : ''
  }`;

  const handleClick = () => {
    sendGAEvent('line_cta_click', refId ? { source, ref: refId } : { source });
  };

  const button = (
    <a
      href={href}
      onClick={handleClick}
      className="inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold text-white transition-transform active:scale-[0.98]"
      style={{
        backgroundColor: LINE_BRAND_COLOR,
        boxShadow: '0 6px 18px rgba(6, 199, 85, 0.28)',
      }}
    >
      <LineGlyph />
      {t('lineCta.button')}
    </a>
  );

  if (variant === 'compact') {
    return <div className={className}>{button}</div>;
  }

  return (
    <div
      className={`rounded-2xl p-4 ${className ?? ''}`}
      style={{
        background: 'rgba(6, 199, 85, 0.06)',
        border: `1px solid ${LINE_BRAND_COLOR}33`,
      }}
    >
      <p className="mb-1 text-sm font-bold" style={{ color: NAVY }}>
        {t('lineCta.headline')}
      </p>
      <p className="mb-3 text-xs leading-relaxed" style={{ color: GRAY }}>
        {t('lineCta.sub')}
      </p>
      {button}
    </div>
  );
}

// 公式ロゴは使わず、ニュートラルな吹き出しグリフ。
function LineGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 3C6.48 3 2 6.69 2 11.23c0 2.61 1.5 4.93 3.86 6.45-.13.5-.7 2.5-.74 2.74 0 0-.02.13.07.18.09.05.2.01.2.01.27-.04 3.13-2.05 3.66-2.43.96.14 1.95.21 2.95.21 5.52 0 10-3.69 10-8.23S17.52 3 12 3z" />
    </svg>
  );
}
