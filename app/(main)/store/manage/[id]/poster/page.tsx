'use client';

/**
 * ============================================
 * ファイルパス: app/(main)/store/manage/[id]/poster/page.tsx
 * 店舗QRポスター生成ページ (Phase 2-A 双方向QR)
 *
 * 店舗管理者がここで店内設置用のQRを発行する。客がLIFFで読み取ると
 * /store-checkin?store={storeId}&v=1 にアクセスし、ジオフェンス検証を経て
 * セルフチェックインが完了する。印刷用PDFも出力可能。
 * ============================================
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Download,
  Printer,
  Loader2,
  QrCode,
  Info,
  Sparkles,
} from 'lucide-react';
import QRCode from 'qrcode';
import { useAuth } from '@/lib/auth/context';
import { supabase } from '@/lib/supabase/client';
import { useAppMode } from '@/lib/app-mode-context';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CloseCircleButton } from '@/components/ui/close-circle-button';
import { LoadingScreen } from '@/components/ui/loading-screen';

const POSTER_VERSION = '1';

function resolveSiteUrl(): string {
  const env =
    process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL;
  if (env) return env;
  if (typeof window !== 'undefined') return window.location.origin;
  return 'https://nikenme.jp';
}

export default function StorePosterPage() {
  const params = useParams();
  const router = useRouter();
  const storeId = Array.isArray(params.id) ? params.id[0] : (params.id as string);
  const { user, accountType, store, loading: authLoading } = useAuth();
  const { colorsB: COLORS } = useAppMode();

  const [storeName, setStoreName] = useState<string>('');
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [generating, setGenerating] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const isAuthorized = useMemo(() => {
    if (authLoading || !user) return false;
    if (accountType === 'platform') return true;
    if (accountType === 'store' && store?.id === storeId) return true;
    return false;
  }, [authLoading, user, accountType, store, storeId]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    if (!isAuthorized) {
      router.replace('/store/manage');
    }
  }, [authLoading, user, isAuthorized, router]);

  const checkInUrl = useMemo(() => {
    const url = new URL('/liff/store-checkin', resolveSiteUrl());
    url.searchParams.set('store', storeId);
    url.searchParams.set('v', POSTER_VERSION);
    return url.toString();
  }, [storeId]);

  // 店舗名取得 + QR生成
  useEffect(() => {
    if (!isAuthorized) return;
    let cancelled = false;
    (async () => {
      try {
        setGenerating(true);
        const { data: storeRow } = await supabase
          .from('stores')
          .select('name')
          .eq('id', storeId)
          .maybeSingle();
        if (cancelled) return;
        if (storeRow?.name) setStoreName(storeRow.name);

        const dataUrl = await QRCode.toDataURL(checkInUrl, {
          errorCorrectionLevel: 'H', // 高精度: 印刷後の汚れにも耐性
          margin: 2,
          width: 1024,
          color: { dark: '#13294b', light: '#FFFFFF' },
        });
        if (!cancelled) setQrDataUrl(dataUrl);
      } catch (err) {
        console.error('[store/poster] generate error', err);
      } finally {
        if (!cancelled) setGenerating(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isAuthorized, storeId, checkInUrl]);

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  const handleDownloadPdf = useCallback(async () => {
    if (!qrDataUrl || !storeName) return;
    setDownloading(true);
    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      // 用紙サイズ: A4 = 210 x 297 mm
      const pageWidth = 210;
      const margin = 15;
      const navy = '#13294b';
      const gold = '#C9A86C';

      // 上端ゴールドライン
      doc.setFillColor(201, 168, 108);
      doc.rect(0, 0, pageWidth, 4, 'F');

      // タイトル
      doc.setTextColor(navy);
      doc.setFontSize(10);
      doc.text('NIKENME+ CHECK-IN', pageWidth / 2, 25, { align: 'center' });

      // ハイライト線
      doc.setDrawColor(gold);
      doc.setLineWidth(0.4);
      doc.line(pageWidth / 2 - 20, 28, pageWidth / 2 + 20, 28);

      // 店舗名
      doc.setFontSize(20);
      doc.setTextColor(navy);
      doc.text(storeName, pageWidth / 2, 42, { align: 'center' });

      // QR (中心、サイズ110mm)
      const qrSize = 110;
      const qrX = (pageWidth - qrSize) / 2;
      const qrY = 60;
      doc.addImage(qrDataUrl, 'PNG', qrX, qrY, qrSize, qrSize);

      // ガイド文 (英語＋日本語アスキーで印刷フォント問題を回避)
      const guideY = qrY + qrSize + 16;
      doc.setFontSize(13);
      doc.setTextColor(navy);
      doc.text('Scan with LINE to check in', pageWidth / 2, guideY, {
        align: 'center',
      });
      doc.setFontSize(9);
      doc.setTextColor(120, 120, 120);
      doc.text(
        'Open LINE camera and scan the QR code above',
        pageWidth / 2,
        guideY + 7,
        { align: 'center' }
      );

      // 下部ロゴ風
      doc.setFontSize(8);
      doc.setTextColor(180, 180, 180);
      doc.text('powered by NIKENME+', pageWidth / 2, 285, { align: 'center' });

      doc.save(`nikenme-checkin-${storeId.slice(0, 8)}.pdf`);
    } catch (err) {
      console.error('[store/poster] pdf error', err);
    } finally {
      setDownloading(false);
    }
  }, [qrDataUrl, storeName, storeId]);

  if (authLoading || !user || !isAuthorized) {
    return <LoadingScreen size="lg" />;
  }

  return (
    <div
      className="min-h-[100dvh] pb-16 print:bg-white"
      style={{ background: COLORS.cardGradient }}
    >
      <header
        className="sticky top-0 z-20 safe-top print:hidden"
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
            店舗QRポスター
          </h1>
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <CloseCircleButton
              size="md"
              aria-label="閉じる"
              onClick={() => router.push(`/store/manage/${storeId}/update`)}
            />
          </div>
        </div>
      </header>

      <div className="max-w-md mx-auto px-4 py-6 print:max-w-none print:p-0">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          {/* 紹介セクション */}
          <div className="mb-5 text-center print:hidden">
            <div className="inline-flex items-center gap-2 mb-2">
              <div className="h-px w-6" style={{ background: COLORS.champagneGold }} />
              <span
                className="text-xs font-semibold uppercase tracking-[0.2em]"
                style={{ color: COLORS.champagneGold }}
              >
                STORE QR
              </span>
              <div className="h-px w-6" style={{ background: COLORS.champagneGold }} />
            </div>
            <h2 className="text-xl font-bold mb-1" style={{ color: COLORS.deepNavy }}>
              店内設置用QRコード
            </h2>
            <p className="text-sm" style={{ color: 'rgba(19, 41, 75, 0.65)' }}>
              印刷して店内に掲示すると、お客様が自分でチェックインできます
            </p>
          </div>

          {/* ポスター本体 (印刷対象) */}
          <div ref={printRef} className="print:p-12">
            <Card
              className="rounded-2xl overflow-hidden mb-5 print:shadow-none print:border-0 print:rounded-none"
              style={{
                background: 'white',
                border: `1px solid ${COLORS.champagneGold}33`,
                boxShadow: '0 12px 32px rgba(19, 41, 75, 0.10)',
              }}
            >
              {/* 上端ゴールド帯 */}
              <div
                className="h-[4px] print:h-[6px]"
                style={{ background: COLORS.goldGradient }}
              />
              <div className="p-6 print:p-12">
                <div className="text-center mb-4">
                  <div
                    className="text-[10px] font-semibold tracking-[0.3em] mb-1 print:text-[12px]"
                    style={{ color: COLORS.champagneGold }}
                  >
                    NIKENME+ CHECK-IN
                  </div>
                  <h3
                    className="text-2xl font-bold print:text-4xl"
                    style={{ color: COLORS.deepNavy }}
                  >
                    {storeName || '...'}
                  </h3>
                </div>

                <div className="flex justify-center my-6 print:my-10">
                  <div
                    className="p-4 rounded-2xl print:p-6 print:rounded-none"
                    style={{
                      background: '#FFFFFF',
                      border: `1.5px solid ${COLORS.champagneGold}50`,
                    }}
                  >
                    {generating || !qrDataUrl ? (
                      <div className="w-[260px] h-[260px] flex items-center justify-center">
                        <Loader2
                          className="w-8 h-8 animate-spin"
                          style={{ color: COLORS.champagneGold }}
                        />
                      </div>
                    ) : (
                      <img
                        src={qrDataUrl}
                        alt="Store Check-in QR"
                        className="w-[260px] h-[260px] print:w-[400px] print:h-[400px]"
                      />
                    )}
                  </div>
                </div>

                <div className="text-center">
                  <p
                    className="text-base font-semibold print:text-2xl mb-1"
                    style={{ color: COLORS.deepNavy }}
                  >
                    LINEで読み取ってチェックイン
                  </p>
                  <p
                    className="text-xs print:text-base"
                    style={{ color: 'rgba(19, 41, 75, 0.55)' }}
                  >
                    LINEのカメラ機能で上記QRをスキャンしてください
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t print:hidden" style={{ borderColor: `${COLORS.champagneGold}30` }}>
                  <p className="text-[10px] text-center" style={{ color: 'rgba(19, 41, 75, 0.4)' }}>
                    powered by NIKENME+
                  </p>
                </div>
              </div>
            </Card>
          </div>

          {/* アクションボタン */}
          <div className="grid grid-cols-2 gap-3 mb-5 print:hidden">
            <Button
              onClick={handleDownloadPdf}
              disabled={generating || downloading || !qrDataUrl}
              size="lg"
              className="rounded-xl font-bold"
              style={{
                background: COLORS.goldGradient,
                color: COLORS.deepNavy,
              }}
            >
              {downloading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Download className="w-4 h-4 mr-2" />
              )}
              PDF出力
            </Button>
            <Button
              onClick={handlePrint}
              disabled={generating || !qrDataUrl}
              size="lg"
              variant="outline"
              className="rounded-xl font-bold"
              style={{
                background: 'white',
                color: COLORS.deepNavy,
                border: `1.5px solid ${COLORS.champagneGold}60`,
              }}
            >
              <Printer className="w-4 h-4 mr-2" />
              印刷
            </Button>
          </div>

          {/* 使い方ガイド */}
          <Card
            className="rounded-2xl p-5 mb-3 print:hidden"
            style={{
              background: 'white',
              border: `1px solid ${COLORS.champagneGold}33`,
            }}
          >
            <div className="flex items-center gap-2 mb-3">
              <Info className="w-4 h-4" style={{ color: COLORS.champagneGold }} />
              <h3 className="font-semibold text-sm" style={{ color: COLORS.deepNavy }}>
                使い方
              </h3>
            </div>
            <ol
              className="text-sm space-y-2 list-decimal ml-5"
              style={{ color: 'rgba(19, 41, 75, 0.75)' }}
            >
              <li>「PDF出力」または「印刷」でこのQRポスターを出力</li>
              <li>店内のお客様の目につく場所に掲示</li>
              <li>お客様がLINEで読み取り、自動的にチェックインが完了</li>
            </ol>
          </Card>

          {/* 注意事項 */}
          <Card
            className="rounded-2xl p-5 print:hidden"
            style={{
              background: `${COLORS.champagneGold}10`,
              border: `1px solid ${COLORS.champagneGold}40`,
            }}
          >
            <div className="flex items-start gap-2">
              <Sparkles
                className="w-4 h-4 mt-0.5 flex-shrink-0"
                style={{ color: COLORS.champagneGold }}
              />
              <div className="text-xs leading-relaxed" style={{ color: COLORS.deepNavy }}>
                <p className="font-semibold mb-1">セキュリティのご案内</p>
                <p style={{ color: 'rgba(19, 41, 75, 0.7)' }}>
                  店舗の位置情報を基にチェックインを検証するため、店外でこのQRを撮影しても
                  チェックインは成立しません。安心して掲示いただけます。
                </p>
              </div>
            </div>
          </Card>

          {/* QR URL (デバッグ用、小さく表示) */}
          <div className="mt-4 text-center print:hidden">
            <p
              className="text-[10px] break-all"
              style={{ color: 'rgba(19, 41, 75, 0.35)' }}
            >
              {checkInUrl}
            </p>
          </div>
        </motion.div>
      </div>

      {/* 印刷時のスタイル */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4;
            margin: 0;
          }
          body {
            margin: 0;
            background: white !important;
          }
        }
      `}</style>
    </div>
  );
}
