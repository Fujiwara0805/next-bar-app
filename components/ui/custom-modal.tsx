'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { CloseCircleButton } from './close-circle-button';

interface CustomModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** タイトル省略時は空文字 or undefined を渡す */
  title?: string;
  description?: string;
  children?: React.ReactNode;
  showCloseButton?: boolean;
  /** PCでのモーダル横幅。デフォルト 'md' (28rem) */
  size?: 'md' | 'lg' | 'xl';
}

const SIZE_CLASS: Record<NonNullable<CustomModalProps['size']>, string> = {
  md: 'max-w-md',
  lg: 'max-w-xl',
  xl: 'max-w-2xl',
};

export function CustomModal({
  isOpen,
  onClose,
  title,
  description,
  children,
  showCloseButton = true,
  size = 'md',
}: CustomModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* オーバーレイ */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />

          {/* モーダルコンテンツ */}
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className={`bg-white rounded-2xl shadow-2xl ${SIZE_CLASS[size]} w-full p-6 relative`}
              onClick={(e) => e.stopPropagation()}
            >
              {/* 閉じるボタン */}
              {showCloseButton && (
                <CloseCircleButton
                  type="button"
                  onClick={onClose}
                  className="absolute top-4 right-4"
                  aria-label="閉じる"
                />
              )}

              {/* ヘッダー (白カード → Brewer Navy テキスト) */}
              {(title || description) && (
                <div className="mb-4">
                  {title && <h2 className="text-2xl font-bold mb-2 text-brewer-700">{title}</h2>}
                  {description && (
                    <p className="text-brewer-700 text-sm font-bold">{description}</p>
                  )}
                </div>
              )}

              {/* コンテンツ */}
              <div>{children}</div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}