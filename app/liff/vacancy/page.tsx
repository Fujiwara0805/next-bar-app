'use client';

// ============================================
// /liff/vacancy
// LIFF経由で「近くの空席通知」オプトインを設定するページ。
// LINEアプリ内で開かれる前提だが、ブラウザLIFF (LINE Login) でも動作する。
// ============================================

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Bell, BellOff, Loader2, MapPin, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { useLiff } from '@/lib/line/context';
import { useLanguage } from '@/lib/i18n/context';
import { LINE_BRAND_COLOR } from '@/lib/line/constants';
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
  const { t } = useLanguage();
  const { isLiffReady, isLineLoggedIn, liffLogin, getIdToken, liffError } = useLiff();

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

  return (
    <div
      className="min-h-screen safe-top pb-16"
      style={{
        background: 'linear-gradient(180deg, #0B2447 0%, #152C5B 100%)',
        color: '#F5F3EC',
      }}
    >
      <div className="max-w-xl mx-auto px-4 pt-6">
        <div className="flex items-center gap-2 mb-6">
          <Bell className="w-5 h-5" style={{ color: LINE_BRAND_COLOR }} />
          <h1 className="text-lg font-bold">{t('liffVacancy.title')}</h1>
        </div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          {!isLiffReady ? (
            <div className="flex justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : !canUseLine ? (
            <Card className="p-5 bg-white text-slate-800">
              <p className="text-sm mb-4">{t('liffVacancy.login_required_body')}</p>
              {liffError ? (
                <p className="text-xs text-destructive mb-3">{liffError}</p>
              ) : null}
              <Button
                onClick={() => liffLogin()}
                className="w-full"
                style={{ backgroundColor: LINE_BRAND_COLOR, color: 'white' }}
              >
                {t('liffVacancy.login_button')}
              </Button>
            </Card>
          ) : loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : exists === false ? (
            <Card className="p-5 bg-white text-slate-800">
              <p className="text-sm mb-3">{t('liffVacancy.need_follow_oa_title')}</p>
              <p className="text-xs text-slate-500">{t('liffVacancy.need_follow_oa_body')}</p>
            </Card>
          ) : (
            <>
              <Card className="p-5 bg-white text-slate-800 mb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold">{t('liffVacancy.opt_in_label')}</p>
                    <p className="text-xs text-slate-500 mt-1">{t('liffVacancy.opt_in_hint')}</p>
                  </div>
                  <Switch checked={optIn} onCheckedChange={setOptIn} />
                </div>
              </Card>

              <Card className="p-5 bg-white text-slate-800 mb-4">
                <p className="text-sm font-bold mb-2">
                  {t('liffVacancy.radius_label')}: {radiusKm} km
                </p>
                <input
                  type="range"
                  min={minRadius}
                  max={maxRadius}
                  step={0.5}
                  value={radiusKm}
                  onChange={(e) => setRadiusKm(Number(e.target.value))}
                  className="w-full"
                  disabled={!optIn}
                />
                <p className="text-xs text-slate-500 mt-2">{t('liffVacancy.radius_hint')}</p>
              </Card>

              <Card className="p-5 bg-white text-slate-800 mb-4">
                <p className="text-sm font-bold mb-2">{t('liffVacancy.area_label')}</p>
                <Input
                  value={areaLabel}
                  onChange={(e) => setAreaLabel(e.target.value.slice(0, 64))}
                  placeholder={t('liffVacancy.area_placeholder')}
                  disabled={!optIn}
                />
                <p className="text-xs text-slate-500 mt-2">{t('liffVacancy.area_hint')}</p>
                <div className="flex items-center justify-between mt-3">
                  <div className="text-xs text-slate-500 truncate">
                    {centerLat != null && centerLng != null ? (
                      <span>
                        <MapPin className="inline w-3 h-3 mr-1" />
                        {centerLat.toFixed(4)}, {centerLng.toFixed(4)}
                      </span>
                    ) : (
                      <span>{t('liffVacancy.no_center_hint')}</span>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleUseCurrentLocation}
                    disabled={!optIn || locating}
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

              <Button
                onClick={handleSave}
                disabled={saving}
                className="w-full"
                size="lg"
                style={{ backgroundColor: LINE_BRAND_COLOR, color: 'white' }}
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
                <p className="text-[11px] text-center mt-3 text-white/60">
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
