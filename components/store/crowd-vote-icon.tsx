'use client';

/**
 * 「空席状況を投票しよう」のステータスをコンパクトに表すアイコン (Phase 1-A 改修)
 *
 * 店舗カード・マップ画面の空席アイコン横に並べる小さなインジケータ。
 * 直近30分の客報告を集計し、優勢ステータスに応じて色 + アイコンを切替える。
 *
 * - 定休日 (店舗が今日休み) : カレンダーアイコン (グレー)
 * - 投票なし: メッセージ + ハテナ (アンバー)
 * - 1〜2票 (未確定): メッセージ + 少数 (ライトグレー)
 * - 3票以上 (確定): vacant/open/busy/full の各色アイコン
 *
 * onClick が渡された場合のみクリック可能になる (店舗詳細画面で投票モーダルを開く)。
 */

import { useEffect, useState } from 'react';
import {
  CheckCircle2,
  Flame,
  Users2,
  MessageCircleQuestion,
  MessageCirclePlus,
} from 'lucide-react';
import type { CrowdAggregate, CrowdStatus } from '@/lib/crowd/aggregate';

type Props = {
  storeId: string;
  /** 表示自体を抑止する (定休日 / 営業時間外 / 閉店時など) */
  hidden?: boolean;
  /** クリック可能にする場合 (店舗詳細画面で投票モーダルを開く用) */
  onClick?: () => void;
  /**
   * 投票がない時の挙動:
   *   - 'hide' (default): 何も表示しない (マップ系UIで使用)
   *   - 'button': 「投票する」ボタンを表示 (店舗詳細画面で使用)
   */
  emptyMode?: 'hide' | 'button';
  size?: 'sm' | 'md';
};

const SIZE_CLASS: Record<NonNullable<Props['size']>, string> = {
  sm: 'w-9 h-9',
  md: 'w-11 h-11',
};

const ICON_SIZE: Record<NonNullable<Props['size']>, string> = {
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
};

const STATUS_VISUAL: Record<
  CrowdStatus,
  { Icon: typeof CheckCircle2; color: string; bg: string; label: string }
> = {
  vacant: {
    Icon: CheckCircle2,
    color: '#16a34a',
    bg: 'rgba(34, 197, 94, 0.15)',
    label: 'お客様の声: 空席有',
  },
  busy: {
    Icon: Users2,
    color: '#f59e0b',
    bg: 'rgba(245, 158, 11, 0.18)',
    label: 'お客様の声: 混雑',
  },
  full: {
    Icon: Flame,
    color: '#dc2626',
    bg: 'rgba(220, 38, 38, 0.15)',
    label: 'お客様の声: 満席',
  },
};

const NO_VOTE_VISUAL = {
  Icon: MessageCircleQuestion,
  color: '#9ca3af',
  bg: 'rgba(156, 163, 175, 0.15)',
  label: 'まだ投票がありません',
};

const FEW_VISUAL = {
  Icon: MessageCircleQuestion,
  color: '#a78bfa',
  bg: 'rgba(167, 139, 250, 0.15)',
  label: 'お客様の声 (集計中)',
};

export function CrowdVoteIcon({
  storeId,
  hidden = false,
  onClick,
  emptyMode = 'hide',
  size = 'md',
}: Props) {
  const [aggregate, setAggregate] = useState<CrowdAggregate | null>(null);
  const [loading, setLoading] = useState(!hidden);

  useEffect(() => {
    if (hidden) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/stores/${storeId}/crowd-report`, {
          cache: 'no-store',
        });
        if (!res.ok) return;
        const json = (await res.json()) as { aggregate: CrowdAggregate };
        if (!cancelled) setAggregate(json.aggregate);
      } catch {
        // 無視 (アイコンを「投票なし」扱いにする)
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [storeId, hidden]);

  // 定休日 / 営業時間外 / 閉店中: 完全に非表示
  if (hidden) return null;

  // ロード中はスペース確保のため何も表示しない (アイコンサイズが固定だと点滅するため)
  if (loading) return null;

  // 投票なしの場合の分岐
  if (!aggregate || aggregate.totalReports === 0) {
    if (emptyMode === 'hide' || !onClick) {
      return null;
    }
    // emptyMode === 'button' && onClick: 「空席状況を投票」ボタンを表示
    return (
      <button
        type="button"
        onClick={onClick}
        aria-label="空席状況を投票する"
        className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition-all hover:scale-105 active:scale-95"
        style={{
          background: 'linear-gradient(135deg, #ffc62d 0%, #FFD966 50%, #C9A86C 100%)',
          color: '#13294b',
          border: '1px solid rgba(201, 168, 108, 0.4)',
          boxShadow: '0 2px 8px rgba(201, 168, 108, 0.25)',
        }}
      >
        <MessageCirclePlus className="w-3.5 h-3.5" />
        <span>空席状況を投票</span>
      </button>
    );
  }

  // 投票ありの場合: 集計に応じたアイコンを表示
  let visual = NO_VOTE_VISUAL;
  if (aggregate.isValid && aggregate.status) {
    visual = STATUS_VISUAL[aggregate.status];
  } else if (aggregate.totalReports > 0) {
    visual = FEW_VISUAL;
  }

  const interactive = !!onClick;

  return (
    <button
      type="button"
      disabled={!interactive}
      onClick={onClick}
      aria-label={visual.label}
      title={visual.label}
      className={`${SIZE_CLASS[size]} rounded-full flex items-center justify-center transition-all ${
        interactive ? 'hover:scale-110 active:scale-95 cursor-pointer' : 'cursor-default'
      }`}
      style={{
        background: visual.bg,
        border: `1px solid ${visual.color}33`,
      }}
    >
      <visual.Icon className={ICON_SIZE[size]} style={{ color: visual.color }} />
    </button>
  );
}
