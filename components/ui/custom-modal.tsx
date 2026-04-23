'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { CloseCircleButton } from './close-circle-button';

interface CustomModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children?: React.ReactNode;
  showCloseButton?: boolean;
}

export function CustomModal({
  isOpen,
  onClose,
  title,
  description,
  children,
  showCloseButton = true,
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
              className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 relative"
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

              {/* ヘッダー */}
              {(title || description) && (
                <div className="mb-4">
                  {title && <h2 className="text-2xl font-bold mb-2 text-card-foreground">{title}</h2>}
                  {description && (
                    <p className="text-card-foreground text-sm font-bold">{description}</p>
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