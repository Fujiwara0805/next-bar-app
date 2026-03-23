/**
 * ============================================
 * おごり酒 年齢確認モーダル（20代確認）
 *
 * チケット利用前に20代であることを確認する
 * CustomModal + アプリ既存カラーパレット
 * ============================================
 */
'use client';

import { Wine } from 'lucide-react';
import { CustomModal } from '@/components/ui/custom-modal';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/lib/i18n/context';
import { useAppMode } from '@/lib/app-mode-context';

interface OgoriAgeCheckModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function OgoriAgeCheckModal({ isOpen, onConfirm, onCancel }: OgoriAgeCheckModalProps) {
  const { colorsB: COLORS } = useAppMode();
  const { t } = useLanguage();

  return (
    <CustomModal
      isOpen={isOpen}
      onClose={onCancel}
      title=""
      showCloseButton={false}
    >
      <div className="text-center space-y-4">
        {/* アイコン */}
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center mx-auto"
          style={{
            background: 'linear-gradient(135deg, rgba(201, 168, 108, 0.15) 0%, rgba(232, 213, 183, 0.15) 100%)',
          }}
        >
          <Wine className="w-8 h-8" style={{ color: COLORS.champagneGold }} />
        </div>

        {/* タイトル */}
        <h3 className="text-xl font-bold" style={{ color: COLORS.deepNavy }}>
          {t('store_detail.ogori_age_check_title')}
        </h3>

        {/* 説明文 */}
        <div className="space-y-3">
          <p className="text-sm leading-relaxed" style={{ color: COLORS.charcoal }}>
            {t('store_detail.ogori_age_check_desc')}
          </p>
          <p className="text-xs italic" style={{ color: COLORS.champagneGold }}>
            {t('store_detail.ogori_age_check_slogan')}
          </p>
          <p className="text-base font-semibold pt-2" style={{ color: COLORS.deepNavy }}>
            {t('store_detail.ogori_age_check_question')}
          </p>
        </div>

        {/* ボタン */}
        <div className="flex flex-col sm:flex-row gap-2 pt-2">
          <Button
            onClick={onCancel}
            variant="outline"
            className="flex-1 rounded-xl border-2 font-semibold"
            style={{
              borderColor: COLORS.champagneGold,
              color: COLORS.deepNavy,
              background: 'transparent',
            }}
          >
            {t('store_detail.ogori_age_check_no')}
          </Button>
          <Button
            onClick={onConfirm}
            className="flex-1 rounded-xl font-semibold border-0"
            style={{
              background: COLORS.goldGradient,
              color: COLORS.deepNavy,
              boxShadow: '0 4px 15px rgba(201, 168, 108, 0.3)',
            }}
          >
            {t('store_detail.ogori_age_check_yes')}
          </Button>
        </div>
      </div>
    </CustomModal>
  );
}
