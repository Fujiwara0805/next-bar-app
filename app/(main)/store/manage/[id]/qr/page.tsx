'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Download, Loader2, QrCode, Users, Sparkles, Info } from 'lucide-react';
import QRCode from 'qrcode';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CloseCircleButton } from '@/components/ui/close-circle-button';
import { useAuth } from '@/lib/auth/context';
import { supabase } from '@/lib/supabase/client';
import { useLanguage } from '@/lib/i18n/context';
import { useAppMode } from '@/lib/app-mode-context';
import { toast } from 'sonner';

const SectionHeader = ({ icon: Icon, title }: { icon: React.ElementType; title: string }) => {
  const { colorsB: COLORS } = useAppMode();
  return (
    <div className="flex items-center gap-3 mb-4">
      <div
        className="p-2 rounded-lg"
        style={{
          background: COLORS.goldGradient,
          boxShadow: '0 2px 8px rgba(201, 168, 108, 0.25)',
        }}
      >
        <Icon className="w-4 h-4" style={{ color: COLORS.deepNavy }} />
      </div>
      <h2 className="text-lg font-bold" style={{ color: COLORS.deepNavy }}>
        {title}
      </h2>
    </div>
  );
};

export default function StoreQrPage() {
  const params = useParams();
  const router = useRouter();
  const storeId = Array.isArray(params.id) ? params.id[0] : (params.id as string);
  const { user, accountType, store, loading } = useAuth();
  const { t } = useLanguage();
  const { colorsB: COLORS } = useAppMode();

  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [scanCount, setScanCount] = useState<number | null>(null);
  const [generating, setGenerating] = useState(true);
  const [storeName, setStoreName] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

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

  const isAuthorized = useMemo(() => {
    if (loading || !user) return false;
    if (accountType === 'platform') return true;
    if (accountType === 'store' && store?.id === storeId) return true;
    return false;
  }, [loading, user, accountType, store, storeId]);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace('/login?role=store');
      return;
    }
    if (!isAuthorized) {
      router.replace('/store/manage');
    }
  }, [loading, user, isAuthorized, router]);

  useEffect(() => {
    if (!isAuthorized || !storeId) return;
    const run = async () => {
      setGenerating(true);
      try {
        const [{ data: s }, { count }, { data: sessionData }] = await Promise.all([
          supabase.from('stores').select('name').eq('id', storeId).maybeSingle(),
          supabase
            .from('store_check_ins')
            .select('id', { count: 'exact', head: true })
            .eq('store_id', storeId),
          supabase.auth.getSession(),
        ]);
        setStoreName(s?.name ?? null);
        setScanCount(count ?? 0);

        const token = sessionData.session?.access_token;
        if (!token) {
          throw new Error('qr_url_failed');
        }
        const res = await fetch(`/api/stores/${storeId}/qr-url`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          throw new Error('qr_url_failed');
        }
        const json = (await res.json()) as { url: string };
        setQrUrl(json.url);

        const dataUrl = await QRCode.toDataURL(json.url, {
          errorCorrectionLevel: 'M',
          margin: 2,
          width: 512,
          color: { dark: '#13294b', light: '#FFFFFF' },
        });
        setQrDataUrl(dataUrl);

        if (canvasRef.current) {
          await QRCode.toCanvas(canvasRef.current, json.url, {
            errorCorrectionLevel: 'M',
            margin: 2,
            width: 512,
            color: { dark: '#13294b', light: '#FFFFFF' },
          });
        }
      } catch (err) {
        console.error('[qr page] error', err);
        toast.error(t('storeQr.generate_failed'));
      } finally {
        setGenerating(false);
      }
    };
    run();
  }, [isAuthorized, storeId, t]);

  const handleDownload = () => {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `nikenme-qr-${storeName ?? storeId}.png`;
    a.click();
  };

  if (loading || !user || !isAuthorized) {
    return (
      <div
        className="min-h-[100dvh] flex items-center justify-center"
        style={{ background: COLORS.cardGradient }}
      >
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
        >
          <Sparkles className="w-10 h-10" style={{ color: COLORS.champagneGold }} />
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] pb-20" style={{ background: COLORS.cardGradient }}>
      <header
        className="sticky top-0 z-20 safe-top"
        style={{
          background: COLORS.luxuryGradient,
          borderBottom: `1px solid rgba(201, 168, 108, 0.2)`,
        }}
      >
        <div className="flex items-center justify-center p-4 relative">
          <div className="flex items-center gap-2">
            <h1
              className="text-lg font-light tracking-widest"
              style={{ color: COLORS.ivory }}
            >
              {t('storeQr.title')}
            </h1>
          </div>
          <CloseCircleButton
            type="button"
            size="lg"
            onClick={() => router.push(`/store/manage/${storeId}/update`)}
            className="absolute right-4"
            aria-label={t('common.close')}
          />
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 pt-6">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <div className="mb-6 text-center">
            <div className="inline-flex items-center gap-2 mb-2">
              <div
                className="h-px w-6"
                style={{ background: COLORS.champagneGold }}
              />
              <span
                className="text-xs font-semibold uppercase tracking-[0.2em]"
                style={{ color: COLORS.champagneGold }}
              >
                {t('storeQr.badge')}
              </span>
              <div
                className="h-px w-6"
                style={{ background: COLORS.champagneGold }}
              />
            </div>
            <p
              className="text-sm font-medium mt-2"
              style={{ color: COLORS.warmGray }}
            >
              {t('storeQr.description')}
            </p>
          </div>

          <Card
            className="p-6 mb-4 rounded-2xl shadow-lg"
            style={{
              background: '#FFFFFF',
              border: `1px solid rgba(201, 168, 108, 0.15)`,
            }}
          >
            <SectionHeader icon={QrCode} title={storeName ?? ''} />

            <div className="flex flex-col items-center">
              <div
                className="p-4 rounded-2xl"
                style={{
                  background: '#FDFBF7',
                  border: `1px solid rgba(201, 168, 108, 0.2)`,
                  boxShadow: '0 8px 30px rgba(19, 41, 75, 0.08)',
                }}
              >
                {generating ? (
                  <div className="w-[280px] h-[280px] flex items-center justify-center">
                    <Loader2
                      className="w-8 h-8 animate-spin"
                      style={{ color: COLORS.champagneGold }}
                    />
                  </div>
                ) : qrDataUrl ? (
                  <img src={qrDataUrl} alt="Store QR" className="w-[280px] h-[280px]" />
                ) : (
                  <div className="w-[280px] h-[280px] flex items-center justify-center">
                    <p
                      className="text-sm font-medium"
                      style={{ color: COLORS.warmGray }}
                    >
                      {t('storeQr.generate_failed')}
                    </p>
                  </div>
                )}
              </div>

              {qrUrl && (
                <p
                  className="text-xs break-all max-w-full mt-3 text-center"
                  style={{ color: COLORS.warmGray }}
                >
                  {qrUrl}
                </p>
              )}
            </div>

            <canvas ref={canvasRef} className="hidden" />

            <div className="mt-6 grid grid-cols-2 gap-3">
              <div
                className="rounded-xl p-4 flex items-center gap-3"
                style={{
                  background: 'rgba(201, 168, 108, 0.08)',
                  border: `1px solid rgba(201, 168, 108, 0.2)`,
                }}
              >
                <Users className="w-5 h-5" style={{ color: COLORS.champagneGold }} />
                <div>
                  <div
                    className="text-xs font-medium"
                    style={{ color: COLORS.warmGray }}
                  >
                    {t('storeQr.total_scans')}
                  </div>
                  <div
                    className="text-lg font-bold"
                    style={{ color: COLORS.deepNavy }}
                  >
                    {scanCount ?? '—'}
                  </div>
                </div>
              </div>
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button
                  onClick={handleDownload}
                  disabled={!qrDataUrl}
                  size="lg"
                  className="w-full h-full rounded-xl font-bold shadow-md"
                  style={{
                    background: COLORS.goldGradient,
                    color: COLORS.deepNavy,
                    boxShadow: '0 4px 15px rgba(201, 168, 108, 0.3)',
                  }}
                >
                  <Download className="w-4 h-4 mr-2" />
                  {t('storeQr.download')}
                </Button>
              </motion.div>
            </div>
          </Card>

          <Card
            className="p-6 rounded-2xl shadow-lg"
            style={{
              background: '#FFFFFF',
              border: `1px solid rgba(201, 168, 108, 0.15)`,
            }}
          >
            <SectionHeader icon={Info} title={t('storeQr.how_to_use_title')} />
            <ol
              className="text-sm space-y-2 list-decimal ml-5 font-medium"
              style={{ color: COLORS.charcoal }}
            >
              <li>{t('storeQr.how_to_use_1')}</li>
              <li>{t('storeQr.how_to_use_2')}</li>
              <li>{t('storeQr.how_to_use_3')}</li>
            </ol>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
