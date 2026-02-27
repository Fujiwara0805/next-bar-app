/**
 * ============================================
 * おごり酒 ドリンク選択リスト
 *
 * 購入モーダル・チケット利用モーダルの両方で共有される
 * ドリンク選択グリッドコンポーネント
 *
 * ドリンクには名前のみ（価格なし）
 * カラー: アプリ既存カラーパレット
 * ============================================
 */
'use client';

import { motion } from 'framer-motion';
import { Wine } from 'lucide-react';
import { useLanguage } from '@/lib/i18n/context';

// アプリ共通カラー
const COLORS = {
  deepNavy: '#0A1628',
  champagneGold: '#C9A86C',
  charcoal: '#2D3436',
  warmGray: '#636E72',
  ivory: '#FDFBF7',
};

/** ドリンク行の型（API レスポンス互換 - 価格なし） */
export interface OgoriDrinkRow {
  id: string;
  name: string;
  image_url: string | null;
}

interface OgoriDrinkListProps {
  drinks: OgoriDrinkRow[];
  selectedDrinkId: string | null;
  onSelect: (drinkId: string) => void;
}

export function OgoriDrinkList({ drinks, selectedDrinkId, onSelect }: OgoriDrinkListProps) {
  const { t } = useLanguage();

  if (drinks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center" style={{ color: COLORS.warmGray }}>
        <Wine className="w-10 h-10 mb-2 opacity-40" />
        <p className="text-sm">{t('store_detail.ogori_no_drinks')}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      {drinks.map((drink) => {
        const isSelected = selectedDrinkId === drink.id;

        return (
          <motion.button
            key={drink.id}
            type="button"
            onClick={() => onSelect(drink.id)}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="relative rounded-xl p-3 text-left transition-all duration-200 border-2 cursor-pointer"
            style={{
              background: isSelected
                ? 'linear-gradient(145deg, #FDFBF7 0%, #F5F1EB 100%)'
                : COLORS.ivory,
              borderColor: isSelected ? COLORS.champagneGold : 'rgba(201, 168, 108, 0.2)',
              boxShadow: isSelected
                ? '0 0 0 1px rgba(201, 168, 108, 0.5), 0 4px 12px rgba(201, 168, 108, 0.25)'
                : '0 1px 3px rgba(0, 0, 0, 0.05)',
            }}
          >
            {/* 選択インジケーター */}
            {isSelected && (
              <motion.div
                layoutId="drink-selection"
                className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center"
                style={{ background: COLORS.champagneGold }}
                initial={false}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              >
                <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                  <path d="M1 4L3.5 6.5L9 1" stroke={COLORS.deepNavy} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </motion.div>
            )}

            {/* ドリンク画像 */}
            {drink.image_url && (
              <div className="w-full aspect-square rounded-lg overflow-hidden mb-2">
                <img src={drink.image_url} alt={drink.name} className="w-full h-full object-cover" loading="lazy" />
              </div>
            )}

            {/* ドリンク名 */}
            <p className="text-sm font-semibold leading-tight pr-6" style={{ color: COLORS.charcoal }}>
              {drink.name}
            </p>
          </motion.button>
        );
      })}
    </div>
  );
}
