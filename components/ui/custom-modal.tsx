'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { Button } from './button';

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
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={onClose}
                  className="absolute top-4 right-4"
                >
                  <X className="w-4 h-4" />
                </Button>
              )}

              {/* ヘッダー */}
              <div className="mb-4">
                <h2 className="text-2xl font-bold mb-2 text-card-foreground">{title}</h2>
                {description && (
                  <p className="text-card-foreground/80 text-sm font-bold">{description}</p>
                )}
              </div>

              {/* コンテンツ */}
              <div>{children}</div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}