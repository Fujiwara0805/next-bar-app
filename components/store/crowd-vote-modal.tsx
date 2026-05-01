'use client';

import { useCallback, useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, Clock, Flame, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { CustomModal } from '@/components/ui/custom-modal';
import { useLanguage } from '@/lib/i18n/context';
import { useLiff } from '@/lib/line/context';
import { getFreshLineIdToken } from '@/lib/line/liff';
import { CROWD_STATUSES, type CrowdStatus } from '@/lib/crowd/aggregate';

type Props = {
  storeId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
};

const STATUS_VISUAL: Record<
  CrowdStatus,
  { Icon: typeof CheckCircle2; color: string; bg: string }
> = {
  vacant: {
    Icon: CheckCircle2,
    color: '#16a34a',
    bg: 'rgba(34, 197, 94, 0.10)',
  },
  wait: {
    Icon: Clock,
    color: '#f59e0b',
    bg: 'rgba(245, 158, 11, 0.12)',
  },
  full: {
    Icon: Flame,
    color: '#dc2626',
    bg: 'rgba(220, 38, 38, 0.10)',
  },
};

export function CrowdVoteModal({ storeId, isOpen, onClose, onSuccess }: Props) {
  const { t } = useLanguage();
  const { isLineLoggedIn } = useLiff();
  const [submitting, setSubmitting] = useState<CrowdStatus | null>(null);
  const [cooldownUntil, setCooldownUntil] = useState<number | null>(null);

  const cooldownActive = !!(cooldownUntil && cooldownUntil > Date.now());

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

  const submit = useCallback(
    async (status: CrowdStatus) => {
      if (submitting || cooldownActive) return;
      setSubmitting(status);
      try {
        if (!isLineLoggedIn) {
          toast.error(t('store_status.error_login_required'), {
            description: t('store_status.error_login_required_description'),
          });
          return;
        }
        const token = await getFreshLineIdToken();
        if (!token) return;

        let position: GeolocationPosition;
        try {
          position = await requestLocation();
        } catch (err) {
          const denied =
            err instanceof GeolocationPositionError && err.code === 1;
          toast.error(
            denied
              ? t('store_status.error_location_denied')
              : t('store_status.error_location_unavailable')
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

        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          if (res.status === 429) {
            const minutes = json?.retryAfterMinutes ?? 10;
            setCooldownUntil(Date.now() + minutes * 60 * 1000);
            toast.warning(
              t('store_status.error_rate_limited').replace(
                '{minutes}',
                String(minutes)
              )
            );
            return;
          }
          if (json?.error === 'out_of_range') {
            toast.error(t('store_status.error_out_of_range'), {
              description: t('store_status.error_out_of_range_description')
                .replace('{distance}', String(json?.distanceM ?? '?'))
                .replace('{threshold}', String(json?.thresholdM ?? '?')),
            });
            return;
          }
          if (json?.error === 'profile_incomplete') {
            toast.error(t('store_status.error_profile_incomplete'), {
              description: t('store_status.error_profile_incomplete_description'),
            });
            return;
          }
          if (json?.error === 'user_not_found') {
            toast.error(t('store_status.error_login_required'));
            return;
          }
          toast.error(t('store_status.error_send_failed'));
          return;
        }

        toast.success(t('store_status.submit_thanks'), {
          description: t('store_status.submit_thanks_description'),
        });
        setCooldownUntil(Date.now() + 10 * 60 * 1000);
        onSuccess?.();
        onClose();
      } catch (err) {
        console.error('[CrowdVoteModal] submit error', err);
        toast.error(t('store_status.error_network'));
      } finally {
        setSubmitting(null);
      }
    },
    [
      submitting,
      cooldownActive,
      isLineLoggedIn,
      requestLocation,
      storeId,
      t,
      onClose,
      onSuccess,
    ]
  );

  return (
    <CustomModal
      isOpen={isOpen}
      onClose={onClose}
      title={t('store_status.modal_title')}
      description={t('store_status.modal_description')}
      size="md"
    >
      <div className="grid grid-cols-3 gap-2 mt-2">
        {CROWD_STATUSES.map((s) => {
          const visual = STATUS_VISUAL[s];
          const isSubmittingThis = submitting === s;
          const disabled = !!submitting || cooldownActive;
          return (
            <motion.button
              key={s}
              type="button"
              disabled={disabled}
              onClick={() => submit(s)}
              whileTap={{ scale: 0.95 }}
              className="rounded-xl p-3 flex flex-col items-center gap-1.5 text-xs font-bold transition-all disabled:cursor-not-allowed"
              style={{
                background: visual.bg,
                color: visual.color,
                border: `1px solid ${visual.color}33`,
                opacity: disabled && !isSubmittingThis ? 0.7 : 1,
              }}
              aria-label={t(`store_status.${s}`)}
            >
              {isSubmittingThis ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                <visual.Icon className="w-6 h-6" />
              )}
              <span>{t(`store_status.${s}`)}</span>
            </motion.button>
          );
        })}
      </div>
      <div className="mt-4 text-[11px]" style={{ color: 'rgba(19, 41, 75, 0.55)' }}>
        {cooldownActive ? (
          <span>{t('store_status.cooldown_note')}</span>
        ) : !isLineLoggedIn ? (
          <span>{t('store_status.need_login_note')}</span>
        ) : (
          <span>{t('store_status.geofence_note')}</span>
        )}
      </div>
    </CustomModal>
  );
}
