'use client';

// ============================================
// /liff/vacancy
// LIFF経由で「近くの空席通知」オプトインを設定するページ。
// LINEアプリ内で開かれる前提だが、ブラウザLIFF (LINE Login) でも動作する。
// ============================================

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { BellOff, Loader2, MapPin, Save, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { CloseCircleButton } from '@/components/ui/close-circle-button';
import { useLiff } from '@/lib/line/context';
import { useLanguage } from '@/lib/i18n/context';
import { LINE_BRAND_COLOR } from '@/lib/line/constants';
import { useAppMode } from '@/lib/app-mode-context';
import { toast } from 'sonner';

type Subscription = {
  lineUserId: string;
  optIn: boolean;
  radiusKm: number | null;
  centerLatitude: number | null;
  centerLongitude: number | null;
  areaLabel: string | null;
  latestLatitude: number | null;
  latestLongitude: number | null;
  latestLocationAt: string | null;
  updatedAt: string | null;
};

export default function LiffVacancyOptInPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const { isLiffReady, isLineLoggedIn, liffLogin, getIdToken, liffError } = useLiff();
  const { colorsB: COLORS } = useAppMode();

  // 画面外（オーバースクロール領域含む）まで navy 系で塗りつぶす。
  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;
    const prevRootBg = root.style.background;
    const prevBodyBg = body.style.background;
    root.style.background = COLORS.deepNavy;
    body.style.background = COLORS.deepNavy;
    return () => {
      root.style.background = prevRootBg;
      body.style.background = prevBodyBg;
    };
  }, [COLORS.deepNavy]);

  const handleClose = () => {
    router.push('/mypage');
  };

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exists, setExists] = useState<boolean | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [defaultRadius, setDefaultRadius] = useState(1.5);
  const [minRadius, setMinRadius] = useState(0.5);
  const [maxRadius, setMaxRadius] = useState(5);

  const [optIn, setOptIn] = useState(true);
  const [radiusKm, setRadiusKm] = useState(1.5);
  const [areaLabel, setAreaLabel] = useState('');
  const [centerLat, setCenterLat] = useState<number | null>(null);
  const [centerLng, setCenterLng] = useState<number | null>(null);
  const [locating, setLocating] = useState(false);

  const canUseLine = isLiffReady && isLineLoggedIn;

  const fetchSubscription = async () => {
    const token = getIdToken();
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const res = await fetch('/api/line/subscription', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(t('liffVacancy.error.load_failed'));
        setLoading(false);
        return;
      }
      setExists(Boolean(json.exists));
      setDefaultRadius(json.defaultRadiusKm ?? 1.5);
      setMinRadius(json.minRadiusKm ?? 0.5);
      setMaxRadius(json.maxRadiusKm ?? 5);
      const sub = json.subscription as Subscription | null;
      if (sub) {
        setSubscription(sub);
        setOptIn(sub.optIn);
        setRadiusKm(sub.radiusKm ?? json.defaultRadiusKm ?? 1.5);
        setAreaLabel(sub.areaLabel ?? '');
        setCenterLat(sub.centerLatitude);
        setCenterLng(sub.centerLongitude);
      } else {
        setRadiusKm(json.defaultRadiusKm ?? 1.5);
      }
    } catch (err) {
      console.error('[liffVacancy] fetch error', err);
      toast.error(t('liffVacancy.error.load_failed'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isLiffReady) return;
    if (!isLineLoggedIn) {
      setLoading(false);
      return;
    }
    fetchSubscription();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLiffReady, isLineLoggedIn]);

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error(t('liffVacancy.error.geolocation_unavailable'));
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCenterLat(pos.coords.latitude);
        setCenterLng(pos.coords.longitude);
        setLocating(false);
        toast.success(t('liffVacancy.location_set'));
      },
      (err) => {
        console.warn('geolocation error', err);
        setLocating(false);
        toast.error(t('liffVacancy.error.geolocation_denied'));
      },
      { enableHighAccuracy: false, timeout: 10000 }
    );
  };

  const handleSave = async () => {
    const token = getIdToken();
    if (!token) {
      toast.error(t('liffVacancy.error.login_required'));
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/line/subscription', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          optIn,
          radiusKm,
          centerLatitude: centerLat,
          centerLongitude: centerLng,
          areaLabel: areaLabel.trim() || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        const code = json?.error ?? 'unknown';
        toast.error(t(`liffVacancy.error.${code}`) || t('liffVacancy.error.save_failed'));
        return;
      }
      setSubscription(json.subscription);
      toast.success(t('liffVacancy.saved'));
    } catch (err) {
      console.error('[liffVacancy] save error', err);
      toast.error(t('liffVacancy.error.save_failed'));
    } finally {
      setSaving(false);
    }
  };

  const lastSavedLabel = useMemo(() => {
    if (!subscription?.updatedAt) return null;
    try {
      return new Date(subscription.updatedAt).toLocaleString('ja-JP');
    } catch {
      return null;
    }
  }, [subscription]);

  const cardStyle: React.CSSProperties = {
    background: '#FFFFFF',
    border: `1px solid ${COLORS.champagneGold}4d`,
    boxShadow: '0 8px 24px rgba(19, 41, 75, 0.18)',
  };

  const labelStyle: React.CSSProperties = { color: COLORS.deepNavy };
  const hintStyle: React.CSSProperties = { color: COLORS.warmGray };

  return (
    <div
      className="min-h-screen safe-top pb-16 relative overflow-hidden"
      style={{
        background: COLORS.luxuryGradient,
        color: COLORS.ivory,
      }}
    >
      {/* 装飾オーラ */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute -top-40 -right-40 h-[34rem] w-[34rem] rounded-full"
          style={{
            background: `radial-gradient(circle, ${COLORS.champagneGold}1f 0%, transparent 60%)`,
          }}
        />
        <div
          className="absolute -bottom-56 -left-48 h-[34rem] w-[34rem] rounded-full"
          style={{
            background: `radial-gradient(circle, ${COLORS.midnightBlue}33 0%, transparent 65%)`,
          }}
        />
        <div
          className="absolute top-0 left-0 right-0 h-[2px]"
          style={{
            background: `linear-gradient(90deg, transparent, ${COLORS.champagneGold}, transparent)`,
          }}
        />
      </div>

      {/* 右上の閉じるボタン */}
      <div className="absolute top-3 right-3 z-20 safe-top">
        <CloseCircleButton
          size="md"
          aria-label={t('common.close')}
          onClick={handleClose}
        />
      </div>

      <div className="relative z-10 max-w-xl mx-auto px-4 pt-8">
        {/* ヘッダー */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col items-center text-center mb-6"
        >
          <div className="flex items-center gap-1.5 mb-1">
            <Sparkles className="w-3.5 h-3.5" style={{ color: COLORS.champagneGold }} />
            <span
              className="text-[10px] tracking-[0.25em] uppercase font-semibold"
              style={{ color: COLORS.champagneGold }}
            >
              NIKENME+
            </span>
            <Sparkles className="w-3.5 h-3.5" style={{ color: COLORS.champagneGold }} />
          </div>
          <h1
            className="text-xl sm:text-2xl font-bold tracking-tight"
            style={{ color: COLORS.ivory }}
          >
            {t('liffVacancy.title')}
          </h1>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          {!isLiffReady ? (
            <div className="flex justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin" style={{ color: COLORS.champagneGold }} />
            </div>
          ) : !canUseLine ? (
            <Card className="p-6 rounded-2xl" style={cardStyle}>
              <p className="text-sm mb-4 leading-relaxed" style={labelStyle}>
                {t('liffVacancy.login_required_body')}
              </p>
              {liffError ? (
                <p className="text-xs text-destructive mb-3">{liffError}</p>
              ) : null}
              <Button
                onClick={() => liffLogin()}
                className="w-full h-12 text-sm font-bold rounded-xl text-white"
                style={{
                  backgroundColor: LINE_BRAND_COLOR,
                  boxShadow: '0 6px 20px rgba(6, 199, 85, 0.32)',
                }}
              >
                {t('liffVacancy.login_button')}
              </Button>
            </Card>
          ) : loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin" style={{ color: COLORS.champagneGold }} />
            </div>
          ) : exists === false ? (
            <Card className="p-6 rounded-2xl" style={cardStyle}>
              <p className="text-sm font-bold mb-2" style={labelStyle}>
                {t('liffVacancy.need_follow_oa_title')}
              </p>
              <p className="text-xs leading-relaxed" style={hintStyle}>
                {t('liffVacancy.need_follow_oa_body')}
              </p>
            </Card>
          ) : (
            <>
              {/* 通知オン/オフ */}
              <Card className="p-5 rounded-2xl mb-4" style={cardStyle}>
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-bold" style={labelStyle}>
                      {t('liffVacancy.opt_in_label')}
                    </p>
                    <p className="text-xs mt-1 leading-relaxed" style={hintStyle}>
                      {t('liffVacancy.opt_in_hint')}
                    </p>
                  </div>
                  <div
                    role="group"
                    aria-label={t('liffVacancy.opt_in_label')}
                    className="inline-flex items-stretch shrink-0 rounded-xl overflow-hidden"
                    style={{
                      border: `2px solid ${COLORS.champagneGold}`,
                      boxShadow: '0 4px 12px rgba(19, 41, 75, 0.18)',
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => setOptIn(true)}
                      aria-pressed={optIn}
                      className="px-5 py-2 text-sm font-extrabold tracking-wider transition-colors duration-150 focus:outline-none focus-visible:ring-2"
                      style={{
                        background: optIn ? COLORS.champagneGold : COLORS.ivory,
                        color: optIn ? COLORS.deepNavy : COLORS.warmGray,
                        minWidth: 64,
                      }}
                    >
                      {t('liffVacancy.opt_in_on')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setOptIn(false)}
                      aria-pressed={!optIn}
                      className="px-5 py-2 text-sm font-extrabold tracking-wider transition-colors duration-150 focus:outline-none focus-visible:ring-2"
                      style={{
                        background: !optIn ? COLORS.champagneGold : COLORS.ivory,
                        color: !optIn ? COLORS.deepNavy : COLORS.warmGray,
                        borderLeft: `2px solid ${COLORS.champagneGold}`,
                        minWidth: 64,
                      }}
                    >
                      {t('liffVacancy.opt_in_off')}
                    </button>
                  </div>
                </div>
              </Card>

              {/* 半径スライダー */}
              <Card className="p-5 rounded-2xl mb-4" style={cardStyle}>
                <div className="flex items-baseline justify-between mb-3">
                  <p className="text-sm font-bold" style={labelStyle}>
                    {t('liffVacancy.radius_label')}
                  </p>
                  <span
                    className="text-base font-bold tabular-nums"
                    style={{ color: COLORS.deepNavy }}
                  >
                    {radiusKm} km
                  </span>
                </div>
                <input
                  type="range"
                  min={minRadius}
                  max={maxRadius}
                  step={0.5}
                  value={radiusKm}
                  onChange={(e) => setRadiusKm(Number(e.target.value))}
                  className="w-full accent-current"
                  style={{ accentColor: COLORS.champagneGold }}
                  disabled={!optIn}
                />
                <div
                  className="flex justify-between text-[11px] mt-1 tabular-nums"
                  style={hintStyle}
                >
                  <span>{minRadius} km</span>
                  <span>{maxRadius} km</span>
                </div>
                <p className="text-xs mt-2 leading-relaxed" style={hintStyle}>
                  {t('liffVacancy.radius_hint')}
                </p>
              </Card>

              {/* エリア + 中心位置 */}
              <Card className="p-5 rounded-2xl mb-5" style={cardStyle}>
                <p className="text-sm font-bold mb-2" style={labelStyle}>
                  {t('liffVacancy.area_label')}
                </p>
                <Input
                  value={areaLabel}
                  onChange={(e) => setAreaLabel(e.target.value.slice(0, 64))}
                  placeholder={t('liffVacancy.area_placeholder')}
                  disabled={!optIn}
                  className="h-11 rounded-xl border-2"
                  style={{
                    borderColor: `${COLORS.champagneGold}55`,
                    color: COLORS.deepNavy,
                    fontSize: '16px',
                  }}
                />
                <p className="text-xs mt-2 leading-relaxed" style={hintStyle}>
                  {t('liffVacancy.area_hint')}
                </p>
                <div
                  className="flex items-center justify-between gap-2 mt-3 pt-3"
                  style={{ borderTop: `1px solid ${COLORS.champagneGold}33` }}
                >
                  <div className="text-xs truncate" style={hintStyle}>
                    {centerLat != null && centerLng != null ? (
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="w-3 h-3" style={{ color: COLORS.champagneGold }} />
                        {centerLat.toFixed(4)}, {centerLng.toFixed(4)}
                      </span>
                    ) : (
                      <span>{t('liffVacancy.no_center_hint')}</span>
                    )}
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleUseCurrentLocation}
                    disabled={!optIn || locating}
                    className="rounded-lg font-semibold shrink-0"
                    style={{
                      background: `${COLORS.champagneGold}1f`,
                      color: COLORS.deepNavy,
                      border: `1px solid ${COLORS.champagneGold}66`,
                    }}
                  >
                    {locating ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <MapPin className="w-4 h-4 mr-1" />
                    )}
                    {t('liffVacancy.use_current_location')}
                  </Button>
                </div>
              </Card>

              {/* 保存ボタン */}
              <Button
                onClick={handleSave}
                disabled={saving}
                className="w-full h-12 text-sm font-bold rounded-xl shadow-lg"
                size="lg"
                style={{
                  background: COLORS.deepNavy,
                  color: COLORS.champagneGold,
                  boxShadow: '0 8px 24px rgba(19, 41, 75, 0.45)',
                }}
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : optIn ? (
                  <Save className="w-4 h-4 mr-2" />
                ) : (
                  <BellOff className="w-4 h-4 mr-2" />
                )}
                {optIn ? t('liffVacancy.save') : t('liffVacancy.save_disabled')}
              </Button>

              {lastSavedLabel ? (
                <p
                  className="text-[11px] text-center mt-3"
                  style={{ color: `${COLORS.ivory}99` }}
                >
                  {t('liffVacancy.last_saved')}: {lastSavedLabel}
                </p>
              ) : null}
            </>
          )}
        </motion.div>
      </div>
    </div>
  );
}
