/**
 * ============================================
 * おごり酒セクション（店舗詳細ページ用）
 *
 * 「席をキープする」「営業時間」等と同じレイアウトで
 * おごり酒システムの項目を表示する。
 *
 * - おごり酒ボタン: 常に表示（自動音声予約ボタンと同サイズ）
 * - おごりチケットボタン: チケット1枚以上の場合のみ表示
 *
 * Stripe決済後リダイレクト時:
 *   ?ogori=success&session_id=xxx が付与されるので、
 *   セッション検証APIでチケットを作成（Webhookフォールバック）
 * ============================================
 */
'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Wine, Ticket, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { OgoriPurchaseModal } from './OgoriPurchaseModal';
import { OgoriUseTicketModal } from './OgoriUseTicketModal';
import { useLanguage } from '@/lib/i18n/context';

// 店舗詳細画面と同じカラーパレット
const COLORS = {
  deepNavy: '#0A1628',
  champagneGold: '#C9A86C',
  warmGray: '#636E72',
};

interface OgoriSectionProps {
  storeId: string;
  storeName: string;
  ogoriEnabled: boolean;
}

export function OgoriSection({ storeId, storeName, ogoriEnabled }: OgoriSectionProps) {
  const { t } = useLanguage();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [ticketCount, setTicketCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isPurchaseOpen, setIsPurchaseOpen] = useState(false);
  const [isUseTicketOpen, setIsUseTicketOpen] = useState(false);
  const verifyAttempted = useRef(false);

  const fetchTicketCount = useCallback(async () => {
    try {
      const res = await fetch(`/api/ogori/tickets/${storeId}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setTicketCount(data.count ?? 0);
    } catch {
      setTicketCount(0);
    } finally {
      setIsLoading(false);
    }
  }, [storeId]);

  // Stripe決済成功後のセッション検証（Webhookフォールバック）
  useEffect(() => {
    if (!ogoriEnabled) return;
    if (verifyAttempted.current) return;

    const ogoriParam = searchParams.get('ogori');
    const sessionId = searchParams.get('session_id');

    if (ogoriParam === 'success' && sessionId) {
      verifyAttempted.current = true;

      // セッション検証APIを呼び出してチケットを作成
      const verifySession = async () => {
        try {
          await fetch('/api/ogori/verify-session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId }),
          });
        } catch (err) {
          console.error('セッション検証エラー:', err);
        }

        // チケット数を再取得
        await fetchTicketCount();

        // URLからクエリパラメータをクリーンアップ
        const url = new URL(window.location.href);
        url.searchParams.delete('ogori');
        url.searchParams.delete('session_id');
        router.replace(url.pathname + url.search, { scroll: false });
      };

      verifySession();
    } else {
      fetchTicketCount();
    }
  }, [ogoriEnabled, searchParams, fetchTicketCount, router]);

  if (!ogoriEnabled) return null;

  const handleTicketUsed = () => fetchTicketCount();

  return (
    <>
      {/* 「営業時間」「席をキープ」と同じレイアウトパターン */}
      <div className="flex items-start gap-3">
        <Wine className="w-5 h-5 shrink-0 mt-0.5" style={{ color: COLORS.champagneGold }} />
        <div className="flex-1">
          <p className="text-sm font-bold mb-1" style={{ color: COLORS.deepNavy }}>
            {t('store_detail.ogori_system')}
          </p>

          {/* ボタンエリア — 自動音声予約ボタンと同じサイズ */}
          <div className="flex flex-wrap items-center gap-2">
            {/* おごり酒ボタン（購入）— 予約ボタンと同じ size="default" + bg-primary */}
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button
                onClick={() => setIsPurchaseOpen(true)}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold"
                size="default"
              >
                <Wine className="w-3 h-3 mr-2" />
                {t('store_detail.ogori_button')}
              </Button>
            </motion.div>

            {/* おごりチケットボタン（チケット1枚以上の場合のみ表示） */}
            {!isLoading && ticketCount > 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Button
                  onClick={() => setIsUseTicketOpen(true)}
                  variant="outline"
                  className="font-bold"
                  size="default"
                  style={{
                    background: 'rgba(201, 168, 108, 0.1)',
                    borderColor: COLORS.champagneGold,
                    color: COLORS.deepNavy,
                  }}
                >
                  <Ticket className="w-3 h-3 mr-2" />
                  {t('store_detail.ogori_ticket_button').replace('{count}', String(ticketCount))}
                </Button>
              </motion.div>
            )}

            {/* ローディング中 */}
            {isLoading && (
              <Loader2 className="w-4 h-4 animate-spin" style={{ color: COLORS.warmGray }} />
            )}
          </div>
        </div>
      </div>

      {/* 購入モーダル */}
      <OgoriPurchaseModal
        isOpen={isPurchaseOpen}
        onClose={() => { setIsPurchaseOpen(false); fetchTicketCount(); }}
        storeId={storeId}
        storeName={storeName}
      />

      {/* チケット利用モーダル */}
      <OgoriUseTicketModal
        isOpen={isUseTicketOpen}
        onClose={() => setIsUseTicketOpen(false)}
        storeId={storeId}
        storeName={storeName}
        onTicketUsed={handleTicketUsed}
      />
    </>
  );
}
