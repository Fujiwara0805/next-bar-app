'use client';

/**
 * 「いま空いてる？」客報告カード (Phase 1-A)
 *
 * 店舗詳細ページに常設するセクション。直近30分の客報告を表示し、
 * LIFF経由のユーザーが自分でも報告ボタンを押せるようにする。
 *
 * - GET /api/stores/[id]/crowd-report で集計取得 (誰でも閲覧可)
 * - POST 同URL で報告 (LIFF id_token + 位置情報必須、ジオフェンス200m)
 * - 同一ユーザー × 同店舗 10分1回のレート制限はサーバ側で判定
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  CheckCircle2,
  Flame,
  Users2,
  Loader2,
  MessageCircle,
  MessageCircleQuestion,
  CalendarX,
} from 'lucide-react';
import { toast } from 'sonner';
import { useLiff } from '@/lib/line/context';
import { getFreshLineIdToken } from '@/lib/line/liff';
import {
  CROWD_STATUSES,
  type CrowdAggregate,
  type CrowdStatus,
} from '@/lib/crowd/aggregate';

type Props = {
  storeId: string;
  storeLabel?: string;
  navy: string;
  champagneGold: string;
  cardBackground?: string;
  /**
   * 集計のみの表示モード (4ボタングリッドを非表示)。
   * マップ系UIなど、投票機能を持たない場面で使用する。
   */
  readonly?: boolean;
  /** 投票成功時のコールバック (モーダル閉じる用) */
  onSuccess?: () => void;
  /** 今日が定休日の場合 (投票UIを無効化し、定休日アイコン表示) */
  isClosedToday?: boolean;
};

type StatusMeta = {
  status: CrowdStatus;
  label: string;
  shortLabel: string;
  Icon: typeof CheckCircle2;
  color: string;
  bg: string;
};

const STATUS_META: Record<CrowdStatus, StatusMeta> = {
  vacant: {
    status: 'vacant',
    label: '空席有',
    shortLabel: '空席有',
    Icon: CheckCircle2,
    color: '#16a34a',
    bg: 'rgba(34, 197, 94, 0.10)',
  },
  busy: {
    status: 'busy',
    label: '混雑',
    shortLabel: '混雑',
    Icon: Users2,
    color: '#f59e0b',
    bg: 'rgba(245, 158, 11, 0.12)',
  },
  full: {
    status: 'full',
    label: '満席',
    shortLabel: '満席',
    Icon: Flame,
    color: '#dc2626',
    bg: 'rgba(220, 38, 38, 0.10)',
  },
};

export function CrowdReportCard({
  storeId,
  storeLabel,
  navy,
  champagneGold,
  cardBackground = 'white',
  readonly = false,
  onSuccess,
  isClosedToday = false,
}: Props) {
  const { isLineLoggedIn } = useLiff();
  const [aggregate, setAggregate] = useState<CrowdAggregate | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState<CrowdStatus | null>(null);
  const [cooldownUntil, setCooldownUntil] = useState<number | null>(null);

  const fetchAggregate = useCallback(async () => {
    try {
      const res = await fetch(`/api/stores/${storeId}/crowd-report`, {
        cache: 'no-store',
      });
      if (!res.ok) return;
      const json = (await res.json()) as { aggregate: CrowdAggregate };
      setAggregate(json.aggregate);
    } catch (err) {
      console.error('[CrowdReportCard] fetch error', err);
    } finally {
      setLoading(false);
    }
  }, [storeId]);

  useEffect(() => {
    fetchAggregate();
  }, [fetchAggregate]);

  const requestLocation = useCallback((): Promise<GeolocationPosition> => {
    return new Promise((resolve, reject) => {
      if (typeof navigator === 'undefined' || !navigator.geolocation) {
        reject(new Error('geolocation_unsupported'));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve(pos),
        (err) => reject(err),
        { enableHighAccuracy: true, timeout: 12000, maximumAge: 5000 }
      );
    });
  }, []);

  const cooldownActive = !!(cooldownUntil && cooldownUntil > Date.now());

  const submit = useCallback(
    async (status: CrowdStatus) => {
      if (submitting || cooldownActive) return;
      setSubmitting(status);
      try {
        if (!isLineLoggedIn) {
          toast.error('LINEログインが必要です', {
            description: 'マイページからLINEログインを行ってください',
          });
          return;
        }
        const token = await getFreshLineIdToken();
        if (!token) {
          // login にリダイレクト中
          return;
        }
        let position: GeolocationPosition;
        try {
          position = await requestLocation();
        } catch (err) {
          const code =
            err instanceof GeolocationPositionError && err.code === 1
              ? 'location_denied'
              : 'location_unavailable';
          toast.error(
            code === 'location_denied'
              ? '位置情報の許可が必要です'
              : '位置情報を取得できませんでした'
          );
          return;
        }

        const res = await fetch(`/api/stores/${storeId}/crowd-report`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            reportType: status,
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy ?? null,
          }),
        });

        const json = await res.json();
        if (!res.ok) {
          if (res.status === 429) {
            const minutes = json?.retryAfterMinutes ?? 10;
            setCooldownUntil(Date.now() + minutes * 60 * 1000);
            toast.warning(`連続報告は${minutes}分に1回までです`);
            return;
          }
          if (json?.error === 'out_of_range') {
            toast.error('お店から離れすぎています', {
              description: `現在地: 約${json?.distanceM}m / 許容: ${json?.thresholdM}m以内`,
            });
            return;
          }
          if (json?.error === 'profile_incomplete') {
            toast.error('プロフィール登録が必要です', {
              description: 'マイページから住所・年齢・職業・性別を登録してください',
            });
            return;
          }
          if (json?.error === 'user_not_found') {
            toast.error('LINEログインが必要です');
            return;
          }
          toast.error('報告を送信できませんでした');
          return;
        }
        toast.success('ありがとうございます！', {
          description: 'お客様の報告が反映されました',
        });
        if (json?.aggregate) {
          setAggregate(json.aggregate as CrowdAggregate);
        }
        // 10分のクールダウン (UI上のみ)
        setCooldownUntil(Date.now() + 10 * 60 * 1000);
        onSuccess?.();
      } catch (err) {
        console.error('[CrowdReportCard] submit error', err);
        toast.error('通信エラーが発生しました');
      } finally {
        setSubmitting(null);
      }
    },
    [submitting, cooldownActive, isLineLoggedIn, requestLocation, storeId]
  );

  const topMeta = aggregate?.status ? STATUS_META[aggregate.status] : null;

  const statusButtons = useMemo(() => CROWD_STATUSES.map((s) => STATUS_META[s]), []);

  return (
    <div
      className="rounded-2xl p-5"
      style={{
        background: cardBackground,
        border: `1px solid ${champagneGold}33`,
        boxShadow: '0 8px 24px rgba(19, 41, 75, 0.06)',
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <MessageCircle className="w-4 h-4" style={{ color: champagneGold }} />
          <h3 className="font-semibold text-sm" style={{ color: navy }}>
            空席状況を投票しよう
          </h3>
        </div>
        <span
          className="text-[10px] uppercase tracking-[0.2em] px-2 py-0.5 rounded-full"
          style={{ background: `${champagneGold}20`, color: champagneGold }}
        >
          BETA
        </span>
      </div>

      {/* 集計表示 */}
      <div className="mb-4">
        {isClosedToday ? (
          <div
            className="flex items-center gap-3 rounded-xl px-4 py-3"
            style={{ background: 'rgba(107, 114, 128, 0.10)' }}
          >
            <CalendarX className="w-6 h-6" style={{ color: '#6b7280' }} />
            <div className="flex-1">
              <div className="text-base font-bold" style={{ color: '#374151' }}>
                本日は定休日
              </div>
              <div className="text-[11px]" style={{ color: 'rgba(55, 65, 81, 0.7)' }}>
                投票はお店の営業日にお願いします
              </div>
            </div>
          </div>
        ) : loading ? (
          <div className="flex items-center gap-2 text-xs" style={{ color: 'rgba(19, 41, 75, 0.5)' }}>
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>読み込み中...</span>
          </div>
        ) : aggregate && aggregate.totalReports > 0 ? (
          aggregate.isValid && topMeta ? (
            <div
              className="flex items-center gap-3 rounded-xl px-4 py-3"
              style={{ background: topMeta.bg }}
            >
              <topMeta.Icon className="w-6 h-6" style={{ color: topMeta.color }} />
              <div className="flex-1">
                <div className="text-base font-bold" style={{ color: topMeta.color }}>
                  「{topMeta.label}」が優勢
                </div>
                <div className="text-[11px]" style={{ color: 'rgba(19, 41, 75, 0.6)' }}>
                  直近30分で{aggregate.totalReports}件の報告
                </div>
              </div>
            </div>
          ) : (
            <div
              className="flex items-center gap-3 rounded-xl px-4 py-3"
              style={{ background: 'rgba(167, 139, 250, 0.12)' }}
            >
              <MessageCircleQuestion className="w-6 h-6" style={{ color: '#7c3aed' }} />
              <div className="flex-1">
                <div className="text-sm font-bold" style={{ color: '#7c3aed' }}>
                  集計中 (現在 {aggregate.totalReports}件)
                </div>
                <div className="text-[11px]" style={{ color: 'rgba(19, 41, 75, 0.6)' }}>
                  あと{Math.max(0, 3 - aggregate.totalReports)}件で「優勢」表示に切り替わります
                </div>
              </div>
            </div>
          )
        ) : (
          <div
            className="flex items-center gap-3 rounded-xl px-4 py-3"
            style={{ background: 'rgba(156, 163, 175, 0.12)' }}
          >
            <MessageCircleQuestion className="w-6 h-6" style={{ color: '#6b7280' }} />
            <div className="flex-1">
              <div className="text-sm font-bold" style={{ color: '#374151' }}>
                まだ投票がありません
              </div>
              <div className="text-[11px]" style={{ color: 'rgba(55, 65, 81, 0.7)' }}>
                最初の1人になりませんか？
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 報告ボタン (readonly / 定休日 では非表示) */}
      {!readonly && !isClosedToday && (
        <>
          <div className="grid grid-cols-3 gap-2">
            {statusButtons.map((meta) => {
              const isSubmittingThis = submitting === meta.status;
              const disabled = !!submitting || cooldownActive;
              return (
                <motion.button
                  key={meta.status}
                  type="button"
                  disabled={disabled}
                  onClick={() => submit(meta.status)}
                  whileTap={{ scale: 0.95 }}
                  className="rounded-xl p-2.5 flex flex-col items-center gap-1 text-[11px] font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    background: meta.bg,
                    color: meta.color,
                    border: `1px solid ${meta.color}33`,
                  }}
                >
                  {isSubmittingThis ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <meta.Icon className="w-5 h-5" />
                  )}
                  <span>{meta.shortLabel}</span>
                </motion.button>
              );
            })}
          </div>

          <div
            className="mt-3 text-[10px]"
            style={{ color: 'rgba(19, 41, 75, 0.5)' }}
          >
            {cooldownActive ? (
              <span>※ 同じお店への連続報告は10分に1回まで</span>
            ) : !isLineLoggedIn ? (
              <span>※ 報告にはLINEログインと位置情報の許可が必要です</span>
            ) : (
              <span>※ お店から200m以内で報告できます</span>
            )}
          </div>
        </>
      )}
    </div>
  );
}
