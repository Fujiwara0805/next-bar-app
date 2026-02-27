/**
 * ============================================
 * おごり酒 チケット数バッジ
 *
 * マップピンやリストカードに表示する
 * チケット残数の小型バッジコンポーネント
 *
 * カラー: アプリ既存カラーパレット
 * ============================================
 */
'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '@/lib/i18n/context';

const COLORS = {
  champagneGold: '#C9A86C',
  deepNavy: '#0A1628',
};

interface OgoriTicketBadgeProps {
  storeId: string;
  compact?: boolean;
}

export function OgoriTicketBadge({ storeId, compact = false }: OgoriTicketBadgeProps) {
  const { t } = useLanguage();
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    const fetchCount = async () => {
      try {
        const res = await fetch(`/api/ogori/tickets/${storeId}`);
        if (!res.ok) return;
        const data = await res.json();
        setCount(data.count ?? 0);
      } catch {
        setCount(null);
      }
    };
    fetchCount();
  }, [storeId]);

  if (count === null || count === 0) return null;

  return (
    <AnimatePresence>
      <motion.span
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 400, damping: 20 }}
        className="inline-flex items-center gap-1 rounded-full text-xs font-bold"
        style={{
          padding: compact ? '2px 6px' : '3px 8px',
          background: 'linear-gradient(135deg, rgba(201, 168, 108, 0.15) 0%, rgba(232, 213, 183, 0.2) 100%)',
          color: COLORS.champagneGold,
          border: '1px solid rgba(201, 168, 108, 0.3)',
          fontSize: compact ? '10px' : '11px',
        }}
      >
        {compact ? (
          <>
            <span role="img" aria-label={t('store_detail.ogori_title')}>🍶</span>
            {count}
          </>
        ) : (
          <>
            <span role="img" aria-label={t('store_detail.ogori_title')}>🍶</span>
            {t('store_detail.ogori_badge_count').replace('{count}', String(count))}
          </>
        )}
      </motion.span>
    </AnimatePresence>
  );
}
