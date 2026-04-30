'use client';

// ============================================
// /liff/store-checkin?store={storeId}&v=1
// 店舗QR (店内ポスター) を客がLINEカメラで読み取った後の中継ページ。
// LIFF経由で id_token を取得 → navigator.geolocation で位置取得 →
// POST /api/store-checkin → ジオフェンス検証 + チェックイン記録 → 結果表示。
// (Phase 2-C 双方向QR)
// ============================================

import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  CheckCircle2,
  AlertCircle,
  MapPin,
  Loader2,
  User,
  Ticket,
  Clock,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { useLiff } from '@/lib/line/context';
import { getFreshLineIdToken } from '@/lib/line/liff';
import { useAppMode } from '@/lib/app-mode-context';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CloseCircleButton } from '@/components/ui/close-circle-button';

type Stage =
  | 'init'
  | 'awaiting_login'
  | 'requesting_location'
  | 'checking_in'
  | 'success'
  | 'error';

type CheckInResult = {
  storeId: string;
  storeName: string;
  userId: string;
  userDisplayName: string;
  isNewStamp: boolean;
  windowStoreCount: number;
  lotteryThreshold: number;
  lotteryMax: number;
  canEnterLottery: boolean;
  hasLotteryEntry: boolean;
  visitDate: string;
  windowHours: number;
  source: string;
  distanceM: number;
  thresholdM: number;
};

type ErrorPayload = {
  code: string;
  message: string;
  distanceM?: number;
  thresholdM?: number;
};

function StoreCheckinInner() {
  const router = useRouter();
  const search = useSearchParams();
  const storeId = search.get('store') ?? '';
  const { isLiffReady, isLineLoggedIn, liffLogin } = useLiff();
  const { colorsB: COLORS } = useAppMode();

  const [stage, setStage] = useState<Stage>('init');
  const [result, setResult] = useState<CheckInResult | null>(null);
  const [error, setError] = useState<ErrorPayload | null>(null);
  const submittedRef = useRef(false);

  // ナビ背景色
  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;
    const prevRoot = root.style.background;
    const prevBody = body.style.background;
    const bg = COLORS.cardGradient;
    root.style.background = bg;
    body.style.background = bg;
    return () => {
      root.style.background = prevRoot;
      body.style.background = prevBody;
    };
  }, [COLORS.cardGradient]);

  const requestLocation = useCallback((): Promise<GeolocationPosition> => {
    return new Promise((resolve, reject) => {
      if (typeof navigator === 'undefined' || !navigator.geolocation) {
        reject(new Error('geolocation_unsupported'));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve(pos),
        (err) => reject(err),
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 5000,
        }
      );
    });
  }, []);

  const submitCheckIn = useCallback(
    async (lat: number, lng: number, accuracy: number | null) => {
      setStage('checking_in');
      try {
        const token = await getFreshLineIdToken();
        if (!token) {
          // login にリダイレクト中なので何もしない
          return;
        }
        const res = await fetch('/api/store-checkin', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ storeId, lat, lng, accuracy }),
        });
        const json = await res.json();
        if (!res.ok) {
          setError({
            code: json?.error ?? 'unknown',
            message: errorMessage(json?.error),
            distanceM: json?.distanceM,
            thresholdM: json?.thresholdM,
          });
          setStage('error');
          return;
        }
        setResult(json as CheckInResult);
        setStage('success');
      } catch (err) {
        console.error('[liff/store-checkin] submit error', err);
        setError({ code: 'network', message: errorMessage('network') });
        setStage('error');
      }
    },
    [storeId]
  );

  const start = useCallback(async () => {
    if (submittedRef.current) return;

    if (!storeId) {
      setError({ code: 'invalid_payload', message: errorMessage('invalid_payload') });
      setStage('error');
      return;
    }

    if (!isLiffReady) return;

    if (!isLineLoggedIn) {
      setStage('awaiting_login');
      await liffLogin();
      return;
    }

    submittedRef.current = true;
    setStage('requesting_location');

    try {
      const pos = await requestLocation();
      await submitCheckIn(
        pos.coords.latitude,
        pos.coords.longitude,
        pos.coords.accuracy ?? null
      );
    } catch (err) {
      const code =
        err instanceof GeolocationPositionError
          ? err.code === 1
            ? 'location_denied'
            : err.code === 3
            ? 'location_timeout'
            : 'location_unavailable'
          : 'location_unavailable';
      setError({ code, message: errorMessage(code) });
      setStage('error');
    }
  }, [storeId, isLiffReady, isLineLoggedIn, liffLogin, requestLocation, submitCheckIn]);

  useEffect(() => {
    start();
  }, [start]);

  const handleRetry = useCallback(() => {
    submittedRef.current = false;
    setError(null);
    setResult(null);
    setStage('init');
    start();
  }, [start]);

  const handleClose = useCallback(() => {
    router.push('/mypage');
  }, [router]);

  return (
    <div className="min-h-[100dvh] pb-16" style={{ background: COLORS.cardGradient }}>
      <header
        className="sticky top-0 z-20 safe-top"
        style={{
          background: COLORS.luxuryGradient,
          borderBottom: `1px solid rgba(201, 168, 108, 0.2)`,
        }}
      >
        <div className="relative flex items-center justify-center p-4 max-w-md mx-auto">
          <h1
            className="text-lg font-light tracking-[0.2em]"
            style={{ color: COLORS.ivory }}
          >
            チェックイン
          </h1>
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <CloseCircleButton
              size="md"
              aria-label="閉じる"
              onClick={handleClose}
            />
          </div>
        </div>
      </header>

      <div className="max-w-md mx-auto px-4 py-8">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          {/* ステージ別UI */}
          {(stage === 'init' ||
            stage === 'awaiting_login' ||
            stage === 'requesting_location' ||
            stage === 'checking_in') && (
            <Card
              className="rounded-2xl p-8 text-center"
              style={{
                background: 'white',
                border: `1px solid ${COLORS.champagneGold}33`,
              }}
            >
              <div className="flex flex-col items-center gap-4">
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center"
                  style={{ background: `${COLORS.champagneGold}20` }}
                >
                  {stage === 'requesting_location' ? (
                    <MapPin
                      className="w-8 h-8 animate-pulse"
                      style={{ color: COLORS.champagneGold }}
                    />
                  ) : (
                    <Loader2
                      className="w-8 h-8 animate-spin"
                      style={{ color: COLORS.champagneGold }}
                    />
                  )}
                </div>
                <div>
                  <h2
                    className="text-base font-bold mb-1"
                    style={{ color: COLORS.deepNavy }}
                  >
                    {stage === 'init' && 'LINE連携を準備中...'}
                    {stage === 'awaiting_login' && 'LINEログインに進みます...'}
                    {stage === 'requesting_location' && '位置情報を確認中'}
                    {stage === 'checking_in' && 'チェックイン中...'}
                  </h2>
                  <p
                    className="text-xs"
                    style={{ color: 'rgba(19, 41, 75, 0.6)' }}
                  >
                    {stage === 'requesting_location' &&
                      '店舗近辺にいることを確認します。位置情報の許可をお願いします。'}
                    {stage === 'checking_in' && 'スタンプを記録しています'}
                  </p>
                </div>
              </div>
            </Card>
          )}

          {stage === 'success' && result && (
            <Card
              className="p-6 rounded-2xl shadow-lg"
              style={{
                background: 'white',
                border: `1px solid ${COLORS.champagneGold}26`,
              }}
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 220, damping: 18 }}
                className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(34, 197, 94, 0.12)' }}
              >
                <CheckCircle2 className="w-8 h-8" style={{ color: '#16a34a' }} />
              </motion.div>

              <h2
                className="text-xl font-bold text-center mb-1"
                style={{ color: COLORS.deepNavy }}
              >
                {result.isNewStamp
                  ? 'スタンプを獲得しました'
                  : '本日チェックイン済みです (12時間以内)'}
              </h2>
              <p
                className="text-xs text-center mb-4"
                style={{ color: 'rgba(19, 41, 75, 0.6)' }}
              >
                {result.storeName}
              </p>

              <div
                className="rounded-xl p-4 mb-4 flex items-center gap-3"
                style={{ background: `${COLORS.champagneGold}14` }}
              >
                <User className="w-5 h-5" style={{ color: COLORS.champagneGold }} />
                <div>
                  <div
                    className="text-xs font-medium"
                    style={{ color: 'rgba(19, 41, 75, 0.6)' }}
                  >
                    お客様
                  </div>
                  <div
                    className="text-base font-bold"
                    style={{ color: COLORS.deepNavy }}
                  >
                    {result.userDisplayName}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-5">
                <div
                  className="rounded-xl p-3"
                  style={{ background: 'rgba(0, 0, 0, 0.03)' }}
                >
                  <div
                    className="text-xs mb-1"
                    style={{ color: 'rgba(19, 41, 75, 0.6)' }}
                  >
                    スタンプ進捗
                  </div>
                  <div
                    className="text-2xl font-bold"
                    style={{ color: COLORS.deepNavy }}
                  >
                    {result.windowStoreCount}
                    <span
                      className="text-sm ml-1"
                      style={{ color: 'rgba(19, 41, 75, 0.6)' }}
                    >
                      / {result.lotteryThreshold}
                    </span>
                  </div>
                </div>
                <div
                  className="rounded-xl p-3 flex items-center"
                  style={{ background: 'rgba(0, 0, 0, 0.03)' }}
                >
                  <div className="flex items-start gap-2">
                    {result.hasLotteryEntry ? (
                      <Ticket
                        className="w-5 h-5 mt-0.5"
                        style={{ color: '#16a34a' }}
                      />
                    ) : result.canEnterLottery ? (
                      <Ticket
                        className="w-5 h-5 mt-0.5"
                        style={{ color: COLORS.champagneGold }}
                      />
                    ) : (
                      <Clock
                        className="w-5 h-5 mt-0.5"
                        style={{ color: 'rgba(19, 41, 75, 0.6)' }}
                      />
                    )}
                    <div
                      className="text-xs font-semibold leading-tight"
                      style={{ color: COLORS.charcoal }}
                    >
                      {result.hasLotteryEntry
                        ? '本日応募済み'
                        : result.canEnterLottery
                        ? '抽選応募可能'
                        : `あと${Math.max(
                            0,
                            result.lotteryThreshold - result.windowStoreCount
                          )}店舗で応募可能`}
                    </div>
                  </div>
                </div>
              </div>

              <Button
                onClick={handleClose}
                size="lg"
                className="w-full rounded-xl font-bold"
                style={{
                  background: COLORS.goldGradient,
                  color: COLORS.deepNavy,
                }}
              >
                マイページへ
              </Button>
            </Card>
          )}

          {stage === 'error' && error && (
            <Card
              className="p-6 rounded-2xl shadow-lg"
              style={{
                background: 'white',
                border: `1px solid rgba(220, 38, 38, 0.2)`,
              }}
            >
              <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center bg-destructive/10">
                <AlertCircle className="w-8 h-8 text-destructive" />
              </div>
              <h2
                className="text-lg font-bold text-center mb-2"
                style={{ color: COLORS.deepNavy }}
              >
                {errorTitle(error.code)}
              </h2>
              <p
                className="text-sm text-center mb-3"
                style={{ color: 'rgba(19, 41, 75, 0.65)' }}
              >
                {error.message}
              </p>

              {/* ジオフェンスエラー時の補足 */}
              {error.code === 'out_of_range' && error.distanceM != null && (
                <div
                  className="rounded-xl p-3 mb-4 text-xs"
                  style={{
                    background: 'rgba(220, 38, 38, 0.05)',
                    color: COLORS.deepNavy,
                  }}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <MapPin className="w-3.5 h-3.5" />
                    <span className="font-semibold">距離情報</span>
                  </div>
                  <div>
                    現在地: 店舗から約 <strong>{error.distanceM}m</strong>
                    {error.thresholdM != null && (
                      <span style={{ color: 'rgba(19, 41, 75, 0.6)' }}>
                        {' '}
                        (許容範囲: {error.thresholdM}m以内)
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* プロフィール未完成時の誘導 */}
              {error.code === 'profile_incomplete' && (
                <Button
                  onClick={() => router.push('/mypage')}
                  size="lg"
                  className="w-full rounded-xl font-bold mb-2"
                  style={{
                    background: COLORS.goldGradient,
                    color: COLORS.deepNavy,
                  }}
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  プロフィールを設定する
                </Button>
              )}

              <div className="flex gap-2">
                {error.code !== 'profile_incomplete' && (
                  <Button
                    onClick={handleRetry}
                    size="lg"
                    className="flex-1 rounded-xl font-bold"
                    style={{
                      background: COLORS.goldGradient,
                      color: COLORS.deepNavy,
                    }}
                  >
                    再試行
                  </Button>
                )}
                <Button
                  onClick={handleClose}
                  size="lg"
                  variant="outline"
                  className={
                    error.code === 'profile_incomplete'
                      ? 'w-full rounded-xl font-bold'
                      : 'rounded-xl font-bold'
                  }
                >
                  閉じる
                </Button>
              </div>
            </Card>
          )}

          {/* セキュリティ案内 (位置情報の説明) */}
          {(stage === 'init' || stage === 'requesting_location') && (
            <div className="mt-4 px-2">
              <div className="flex items-start gap-2">
                <Sparkles
                  className="w-3.5 h-3.5 mt-0.5 flex-shrink-0"
                  style={{ color: COLORS.champagneGold }}
                />
                <p
                  className="text-[11px] leading-relaxed"
                  style={{ color: 'rgba(19, 41, 75, 0.55)' }}
                >
                  位置情報は店舗近辺にいることの確認のみに使用し、保存された情報は
                  チェックイン履歴とともに管理されます。
                </p>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}

function errorTitle(code: string): string {
  switch (code) {
    case 'out_of_range':
      return 'お店から離れすぎています';
    case 'location_denied':
      return '位置情報の許可が必要です';
    case 'location_timeout':
    case 'location_unavailable':
    case 'geolocation_unsupported':
      return '位置情報を取得できません';
    case 'profile_incomplete':
      return 'プロフィール登録が必要です';
    case 'user_not_found':
      return 'LINEログインが必要です';
    case 'customer_only':
      return '顧客アカウントでログインしてください';
    case 'store_not_found':
      return '店舗が見つかりません';
    case 'store_no_location':
      return '店舗の位置情報が未登録です';
    case 'invalid_payload':
      return 'QRコードの形式が不正です';
    case 'unauthorized':
      return 'ログインが必要です';
    default:
      return 'チェックインに失敗しました';
  }
}

function errorMessage(code: string | undefined): string {
  switch (code) {
    case 'out_of_range':
      return 'チェックインするには店舗から200m以内にいる必要があります。';
    case 'location_denied':
      return 'ブラウザの設定から位置情報を許可してください。';
    case 'location_timeout':
      return '位置情報の取得に時間がかかっています。もう一度お試しください。';
    case 'location_unavailable':
    case 'geolocation_unsupported':
      return 'お使いの端末で位置情報を取得できませんでした。';
    case 'profile_incomplete':
      return 'プロフィール (住所・年齢・職業・性別) の登録が必要です。';
    case 'user_not_found':
      return 'LINEで初回ログインを完了してください。';
    case 'customer_only':
      return '顧客アカウントでログインしてからチェックインしてください。';
    case 'store_not_found':
      return 'QRコードに紐づく店舗が見つかりません。';
    case 'store_no_location':
      return 'この店舗は位置情報が未登録のため、ジオフェンス検証ができません。';
    case 'invalid_payload':
      return '読み取ったURLに問題があります。もう一度QRを読み直してください。';
    case 'unauthorized':
      return 'LINEログインが必要です。';
    case 'network':
      return 'ネットワークエラーが発生しました。';
    default:
      return 'もう一度お試しください。';
  }
}

export default function LiffStoreCheckinPage() {
  return (
    <Suspense fallback={null}>
      <StoreCheckinInner />
    </Suspense>
  );
}
