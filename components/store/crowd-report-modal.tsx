'use client';

/**
 * 「空席状況を投票しよう」モーダル (Phase 1-A 改修)
 *
 * 店舗詳細画面 (/store/[id]) でのみ使用。CustomModal でラップ。
 * トリガーはアイコンタップ (CrowdVoteIcon の onClick) や明示的なボタン。
 * 中身は CrowdReportCard (full mode) を再利用し、投票成功で自動クローズ。
 */

import { CustomModal } from '@/components/ui/custom-modal';
import { CrowdReportCard } from './crowd-report-card';

type Props = {
  open: boolean;
  onClose: () => void;
  storeId: string;
  storeLabel?: string;
  navy: string;
  champagneGold: string;
  isClosedToday?: boolean;
};

export function CrowdReportModal({
  open,
  onClose,
  storeId,
  storeLabel,
  navy,
  champagneGold,
  isClosedToday = false,
}: Props) {
  return (
    <CustomModal
      isOpen={open}
      onClose={onClose}
      title="空席状況を投票しよう"
      description={
        storeLabel
          ? `${storeLabel}の混雑状況を共有してください`
          : 'この店舗の混雑状況を共有してください'
      }
      size="md"
    >
      <CrowdReportCard
        storeId={storeId}
        storeLabel={storeLabel}
        navy={navy}
        champagneGold={champagneGold}
        cardBackground="white"
        isClosedToday={isClosedToday}
        onSuccess={() => {
          // 投票成功後 1.2秒で自動クローズ (toast 視認用バッファ)
          setTimeout(() => onClose(), 1200);
        }}
      />
    </CustomModal>
  );
}
