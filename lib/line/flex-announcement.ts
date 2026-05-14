// ============================================
// LINE OA 配信メッセージ用 Flex ビルダー
// - 営業中シグナル (open_signal)
// - お知らせ (announcement)
// - 空席通知 (vacancy / auto_vacancy)
//
// カラートークンは DESIGN.md のブランドカラーを使用:
//   Brewer Navy  #13294b  / Navy 600 #20385F / Navy 500 #335280
//   Brass Yellow #ffc82c  / Brass 300 #ffdf85 / Copper #B87333
//   Cream Off-white #F7F3E9
// ============================================

import type { messagingApi } from '@line/bot-sdk';

type FlexBubble = messagingApi.FlexBubble;
type FlexComponent = messagingApi.FlexComponent;

// --- DESIGN.md tokens ---
const NAVY_700 = '#13294b'; // Brand primary
const NAVY_500 = '#335280'; // Caption / info text
const BRASS_500 = '#ffc82c'; // CTA
const COPPER_500 = '#B87333'; // Accent chip
const CREAM_50 = '#F7F3E9'; // Off-white body bg
const NEUTRAL_600 = '#4D5567'; // Body text
const NEUTRAL_400 = '#8D95A6'; // Sub text

const FALLBACK_HERO =
  'https://res.cloudinary.com/dz9trbwma/image/upload/f_auto,q_auto,w_520/v1777620739/a7ec37de-d4b1-46ff-8639-f2d49f567279_kym3yo.png';

type Kind = 'open_signal' | 'announcement' | 'vacancy';

const KIND_META: Record<
  Kind,
  { badge: string; emoji: string; ctaLabel: string; altPrefix: string }
> = {
  open_signal: {
    badge: 'OPEN',
    emoji: '🏠',
    ctaLabel: 'お店を見る',
    altPrefix: '営業中シグナル',
  },
  announcement: {
    badge: 'NEWS',
    emoji: '🔔',
    ctaLabel: '詳しく見る',
    altPrefix: 'お知らせ',
  },
  vacancy: {
    badge: 'SEAT',
    emoji: '🈳',
    ctaLabel: '今すぐ確認',
    altPrefix: '空席が出ました',
  },
};

export type AnnouncementFlexParams = {
  kind: Kind;
  storeName: string;
  body: string;
  trackingUrl: string;
  imageUrl?: string | null;
  /** 空席通知で残席数を表示する場合 */
  vacantSeats?: number | null;
};

export function buildAnnouncementBubble(
  params: AnnouncementFlexParams
): FlexBubble {
  const meta = KIND_META[params.kind];
  const heroUrl = params.imageUrl || FALLBACK_HERO;

  const bodyContents: FlexComponent[] = [
    // バッジ + 店舗名
    {
      type: 'box',
      layout: 'baseline',
      spacing: 'sm',
      contents: [
        {
          type: 'text',
          text: meta.badge,
          size: 'xxs',
          color: COPPER_500,
          weight: 'bold',
          flex: 0,
        },
        {
          type: 'text',
          text: params.storeName,
          size: 'xs',
          color: NAVY_500,
          weight: 'bold',
          wrap: true,
        },
      ],
    },
    // 本文
    {
      type: 'text',
      text: `${meta.emoji} ${params.body}`,
      size: 'md',
      weight: 'bold',
      color: NAVY_700,
      wrap: true,
      margin: 'sm',
    },
  ];

  if (
    params.kind === 'vacancy' &&
    params.vacantSeats != null &&
    params.vacantSeats > 0
  ) {
    bodyContents.push({
      type: 'box',
      layout: 'baseline',
      spacing: 'sm',
      margin: 'md',
      contents: [
        {
          type: 'text',
          text: '残席',
          size: 'xs',
          color: NEUTRAL_400,
          flex: 0,
        },
        {
          type: 'text',
          text: `${params.vacantSeats} 席`,
          size: 'sm',
          color: NAVY_700,
          weight: 'bold',
        },
      ],
    });
  }

  return {
    type: 'bubble',
    size: 'micro',
    body: {
      type: 'box',
      layout: 'vertical',
      spacing: 'sm',
      backgroundColor: CREAM_50,
      paddingAll: 'lg',
      contents: [
        // 画像を hero ではなく body 内に embed して2まわり小さく表示
        {
          type: 'image',
          url: heroUrl,
          size: 'md',
          aspectRatio: '1:1',
          aspectMode: 'cover',
          align: 'center',
          backgroundColor: '#FFFFFF',
        },
        ...bodyContents,
      ],
    },
    footer: {
      type: 'box',
      layout: 'vertical',
      spacing: 'sm',
      paddingAll: 'md',
      backgroundColor: '#FFFFFF',
      contents: [
        // Brass Yellow に Navy 文字を載せるため box+action 方式（LINE Flexの primary button は文字色を変えられないため）
        {
          type: 'box',
          layout: 'vertical',
          backgroundColor: BRASS_500,
          cornerRadius: 'md',
          paddingAll: 'md',
          action: {
            type: 'uri',
            label: meta.ctaLabel,
            uri: params.trackingUrl,
          },
          contents: [
            {
              type: 'text',
              text: meta.ctaLabel,
              color: NAVY_700,
              weight: 'bold',
              size: 'sm',
              align: 'center',
            },
          ],
        },
        {
          type: 'text',
          text: 'NIKENME+',
          size: 'xxs',
          color: NEUTRAL_600,
          align: 'center',
          margin: 'sm',
        },
      ],
    },
    styles: {
      body: { backgroundColor: CREAM_50 },
      footer: { separator: true, separatorColor: '#E1E8F3' },
    },
  };
}

export function buildAnnouncementFlexMessage(
  params: AnnouncementFlexParams
): messagingApi.FlexMessage {
  const meta = KIND_META[params.kind];
  const altText = `${meta.altPrefix}｜${params.storeName}`;
  return {
    type: 'flex',
    altText: altText.slice(0, 400),
    contents: buildAnnouncementBubble(params),
  };
}
