import type { messagingApi } from '@line/bot-sdk';

/**
 * クーポン配信用 Flex Message（bubble）ビルダー
 *
 * LIFF 内でコードを表示するための URL は `uriTemplate` として受け取り、
 * 呼び出し側で `{issueId}` に置換する（1 issue = 1 bubble）。
 */

export type CouponFlexParams = {
  title: string;
  body?: string | null;
  storeName: string;
  imageUrl?: string | null;
  validUntilLabel: string;
  ctaLabel: string;
  trackingUrl: string; // `/api/line/track?mid=...&u=...` 経由の追跡URL
};

type FlexBubble = messagingApi.FlexBubble;

const FALLBACK_IMAGE =
  'https://res.cloudinary.com/dz9trbwma/image/upload/f_auto,q_auto,w_1040/v1761355092/%E3%82%B5%E3%83%BC%E3%83%93%E3%82%B9%E3%82%A2%E3%82%A4%E3%82%B3%E3%83%B3_dggltf.png';

export function buildCouponBubble(params: CouponFlexParams): FlexBubble {
  const heroUrl = params.imageUrl || FALLBACK_IMAGE;

  return {
    type: 'bubble',
    hero: {
      type: 'image',
      url: heroUrl,
      size: 'full',
      aspectRatio: '20:13',
      aspectMode: 'cover',
    },
    body: {
      type: 'box',
      layout: 'vertical',
      spacing: 'md',
      contents: [
        {
          type: 'text',
          text: params.storeName,
          size: 'xs',
          color: '#8A8A8A',
          wrap: true,
        },
        {
          type: 'text',
          text: params.title,
          weight: 'bold',
          size: 'lg',
          color: '#13294b',
          wrap: true,
        },
        ...(params.body
          ? ([
              {
                type: 'text',
                text: params.body,
                size: 'sm',
                color: '#424242',
                wrap: true,
              },
            ] as messagingApi.FlexComponent[])
          : []),
        {
          type: 'box',
          layout: 'baseline',
          spacing: 'sm',
          contents: [
            {
              type: 'text',
              text: '有効期限',
              size: 'xs',
              color: '#8A8A8A',
              flex: 0,
            },
            {
              type: 'text',
              text: params.validUntilLabel,
              size: 'xs',
              color: '#424242',
              wrap: true,
            },
          ],
          margin: 'sm',
        },
      ],
    },
    footer: {
      type: 'box',
      layout: 'vertical',
      spacing: 'sm',
      contents: [
        {
          type: 'button',
          style: 'primary',
          color: '#C9A86C',
          action: {
            type: 'uri',
            label: params.ctaLabel,
            uri: params.trackingUrl,
          },
        },
      ],
    },
    styles: {
      footer: { separator: true },
    },
  };
}

export function buildCouponFlexMessage(
  altText: string,
  bubble: FlexBubble
): messagingApi.FlexMessage {
  return {
    type: 'flex',
    altText,
    contents: bubble,
  };
}
