'use client';

import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { useAppMode } from '@/lib/app-mode-context';
import { cn } from '@/lib/utils';

interface LoadingScreenProps {
  /** ローディングメッセージ（メインテキスト） */
  message?: string;
  /** サブメッセージ */
  subMessage?: string;
  /** 表示サイズ: sm=インライン, md=セクション, lg=フルスクリーン */
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * 統一ローディング画面
 * ランディングページの位置情報取得ローディングデザインを全画面で共通使用
 * - 回転リング（ゴールドボーダー）
 * - 中央Sparklesアイコン（パルスアニメーション）
 * - 3つのパルスドット
 */
export function LoadingScreen({
  message,
  subMessage,
  size = 'lg',
  className,
}: LoadingScreenProps) {
  const { colorsA } = useAppMode();

  const containerStyles = {
    sm: 'py-8',
    md: 'py-16',
    lg: 'flex items-center justify-center h-screen',
  };

  const ringSize = {
    sm: 'w-12 h-12',
    md: 'w-16 h-16',
    lg: 'w-20 h-20',
  };

  const sparklesSize = {
    sm: 'w-5 h-5',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  };

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center',
        containerStyles[size],
        className,
      )}
      style={{
        background: size === 'lg' ? colorsA.luxuryGradient : 'transparent',
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center justify-center"
      >
        {/* 回転リング + Sparklesアイコン */}
        <div className="relative">
          {/* グロー背景 */}
          <motion.div
            className="absolute inset-0 -m-4"
            animate={{ opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 2, repeat: Infinity }}
            style={{
              background: `radial-gradient(circle, ${colorsA.accent}40 0%, transparent 70%)`,
              filter: 'blur(20px)',
            }}
          />
          {/* 回転ボーダーリング */}
          <motion.div
            className={cn(ringSize[size], 'rounded-full')}
            style={{
              border: `2px solid ${colorsA.borderGold}`,
              borderTopColor: colorsA.accent,
            }}
            animate={{ rotate: 360 }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
          />
          {/* 中央アイコン */}
          <div className="absolute inset-0 flex items-center justify-center">
            <motion.div
              animate={{ scale: [1, 1.2, 1], opacity: [0.8, 1, 0.8] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            >
              <Sparkles
                className={sparklesSize[size]}
                style={{ color: colorsA.accent }}
              />
            </motion.div>
          </div>
        </div>

        {/* テキスト */}
        {(message || subMessage) && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-8 text-center"
          >
            {message && (
              <p
                className={cn(
                  'font-medium mb-1',
                  size === 'sm' ? 'text-sm' : 'text-lg',
                )}
                style={{ color: colorsA.text }}
              >
                {message}
              </p>
            )}
            {subMessage && (
              <p className="text-sm" style={{ color: colorsA.textMuted }}>
                {subMessage}
              </p>
            )}
          </motion.div>
        )}

        {/* パルスドットインジケーター */}
        <div className={cn('flex gap-2', message || subMessage ? 'mt-6' : 'mt-8')}>
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: colorsA.accent }}
              animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1, 0.8] }}
              transition={{
                duration: 1.2,
                repeat: Infinity,
                delay: i * 0.2,
                ease: 'easeInOut',
              }}
            />
          ))}
        </div>
      </motion.div>
    </div>
  );
}
