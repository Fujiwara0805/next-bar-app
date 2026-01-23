'use client';

import { useEffect, useCallback, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from 'lucide-react';

// ============================================
// カラーパレット定義
// ============================================
const COLORS = {
  deepNavy: '#0A1628',
  champagneGold: '#C9A86C',
  ivory: '#FDFBF7',
  warmGray: '#636E72',
};

interface ImageLightboxProps {
  images: string[];
  initialIndex: number;
  isOpen: boolean;
  onClose: () => void;
  alt?: string;
}

export function ImageLightbox({
  images,
  initialIndex,
  isOpen,
  onClose,
  alt = '画像',
}: ImageLightboxProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const lastTapRef = useRef<number>(0);
  const initialDistanceRef = useRef<number | null>(null);
  const initialScaleRef = useRef<number>(1);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  // ============================================
  // isOpen または initialIndex が変更されたときに状態をリセット
  // ============================================
  useEffect(() => {
    if (isOpen) {
      // モーダルが開いたときに初期化
      setCurrentIndex(initialIndex);
      setScale(1);
      setPosition({ x: 0, y: 0 });
      document.body.style.overflow = 'hidden';
    } else {
      // モーダルが閉じたときにリセット
      document.body.style.overflow = '';
      setScale(1);
      setPosition({ x: 0, y: 0 });
    }
    
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen, initialIndex]);

  // ============================================
  // キーボード操作
  // ============================================
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          onClose();
          break;
        case 'ArrowLeft':
          handlePrevious();
          break;
        case 'ArrowRight':
          handleNext();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentIndex, images.length, scale]);

  // ============================================
  // ナビゲーション関数
  // ============================================
  const handleNext = useCallback(() => {
    if (scale > 1 || images.length <= 1) return;
    setCurrentIndex((prev) => (prev + 1) % images.length);
    setScale(1);
    setPosition({ x: 0, y: 0 });
  }, [images.length, scale]);

  const handlePrevious = useCallback(() => {
    if (scale > 1 || images.length <= 1) return;
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
    setScale(1);
    setPosition({ x: 0, y: 0 });
  }, [images.length, scale]);

  // ============================================
  // ダブルタップでズーム
  // ============================================
  const handleDoubleTap = useCallback(() => {
    if (scale > 1) {
      setScale(1);
      setPosition({ x: 0, y: 0 });
    } else {
      setScale(2.5);
    }
  }, [scale]);

  const handleImageClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    const now = Date.now();
    const timeSinceLastTap = now - lastTapRef.current;
    
    if (timeSinceLastTap < 300 && timeSinceLastTap > 0) {
      handleDoubleTap();
    }
    lastTapRef.current = now;
  }, [handleDoubleTap]);

  // ============================================
  // タッチジェスチャー（ピンチズーム・スワイプ）
  // ============================================
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      // ピンチズーム開始
      const distance = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      initialDistanceRef.current = distance;
      initialScaleRef.current = scale;
    } else if (e.touches.length === 1) {
      // スワイプ開始
      touchStartRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
      };
    }
  }, [scale]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2 && initialDistanceRef.current !== null) {
      // ピンチズーム中
      const distance = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const newScale = Math.max(1, Math.min(4, 
        initialScaleRef.current * (distance / initialDistanceRef.current)
      ));
      setScale(newScale);
      
      if (newScale === 1) {
        setPosition({ x: 0, y: 0 });
      }
    }
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    // ピンチズーム終了
    initialDistanceRef.current = null;
    
    // スワイプ検出
    if (scale <= 1 && touchStartRef.current && e.changedTouches.length === 1) {
      const deltaX = e.changedTouches[0].clientX - touchStartRef.current.x;
      const deltaY = e.changedTouches[0].clientY - touchStartRef.current.y;
      
      // 横スワイプで画像切り替え
      if (Math.abs(deltaX) > 60 && Math.abs(deltaX) > Math.abs(deltaY) * 1.5) {
        if (deltaX > 0) {
          handlePrevious();
        } else {
          handleNext();
        }
      }
      // 下スワイプで閉じる
      else if (deltaY > 80 && Math.abs(deltaY) > Math.abs(deltaX) * 1.5) {
        onClose();
      }
    }
    
    touchStartRef.current = null;
  }, [scale, handleNext, handlePrevious, onClose]);

  // ============================================
  // ズームボタン
  // ============================================
  const handleZoomIn = useCallback(() => {
    setScale((prev) => Math.min(4, prev + 0.5));
  }, []);

  const handleZoomOut = useCallback(() => {
    const newScale = Math.max(1, scale - 0.5);
    setScale(newScale);
    if (newScale === 1) {
      setPosition({ x: 0, y: 0 });
    }
  }, [scale]);

  // ============================================
  // 背景クリックで閉じる
  // ============================================
  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget && scale === 1) {
      onClose();
    }
  }, [scale, onClose]);

  // ============================================
  // インジケーターでの画像切り替え
  // ============================================
  const handleIndicatorClick = useCallback((index: number) => {
    setCurrentIndex(index);
    setScale(1);
    setPosition({ x: 0, y: 0 });
  }, []);

  // 画像がない場合は何も表示しない
  if (!images || images.length === 0) return null;

  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <motion.div
          key="lightbox-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ backgroundColor: 'rgba(10, 22, 40, 0.98)' }}
          onClick={handleBackdropClick}
          role="dialog"
          aria-modal="true"
          aria-label="画像ビューアー"
        >
          {/* 背景のブラー効果 */}
          <div 
            className="absolute inset-0 backdrop-blur-md pointer-events-none"
            style={{ backgroundColor: 'rgba(10, 22, 40, 0.5)' }}
          />

          {/* ヘッダー（閉じるボタン・ズームコントロール） */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ delay: 0.1 }}
            className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between p-4 safe-top"
            style={{
              background: 'linear-gradient(to bottom, rgba(10, 22, 40, 0.9), transparent)',
            }}
          >
            {/* 画像カウンター */}
            <div 
              className="px-3 py-1.5 rounded-full text-sm font-medium"
              style={{ 
                backgroundColor: 'rgba(201, 168, 108, 0.2)',
                color: COLORS.champagneGold,
              }}
            >
              {currentIndex + 1} / {images.length}
            </div>

            <div className="flex items-center gap-2">
              {/* ズームコントロール */}
              <button
                onClick={handleZoomOut}
                disabled={scale <= 1}
                className="p-2.5 rounded-full transition-all disabled:opacity-30 active:scale-95"
                style={{ 
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  color: COLORS.ivory,
                }}
                aria-label="縮小"
              >
                <ZoomOut className="w-5 h-5" />
              </button>
              <button
                onClick={handleZoomIn}
                disabled={scale >= 4}
                className="p-2.5 rounded-full transition-all disabled:opacity-30 active:scale-95"
                style={{ 
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  color: COLORS.ivory,
                }}
                aria-label="拡大"
              >
                <ZoomIn className="w-5 h-5" />
              </button>

              {/* 閉じるボタン */}
              <button
                onClick={onClose}
                className="p-2.5 rounded-full transition-all hover:scale-110 active:scale-95"
                style={{ 
                  backgroundColor: 'rgba(255, 255, 255, 0.15)',
                  color: COLORS.ivory,
                }}
                aria-label="閉じる"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </motion.div>

          {/* メイン画像エリア */}
          <div
            className="relative w-full h-full flex items-center justify-center overflow-hidden z-10"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <motion.img
              key={`image-${currentIndex}`}
              src={images[currentIndex]}
              alt={`${alt} ${currentIndex + 1}`}
              className="max-w-full max-h-full object-contain select-none touch-none"
              style={{
                cursor: scale > 1 ? 'grab' : 'default',
                transform: `scale(${scale}) translate(${position.x / scale}px, ${position.y / scale}px)`,
              }}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.2 }}
              onClick={handleImageClick}
              draggable={false}
            />
          </div>

          {/* ナビゲーションボタン（複数画像の場合のみ表示） */}
          {images.length > 1 && scale <= 1 && (
            <>
              <motion.button
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ delay: 0.15 }}
                onClick={(e) => {
                  e.stopPropagation();
                  handlePrevious();
                }}
                className="absolute left-3 top-1/2 -translate-y-1/2 p-3 rounded-full z-20 transition-all hover:scale-110 active:scale-95"
                style={{ 
                  backgroundColor: 'rgba(10, 22, 40, 0.85)',
                  color: COLORS.champagneGold,
                  border: `1px solid rgba(201, 168, 108, 0.3)`,
                }}
                aria-label="前の画像"
              >
                <ChevronLeft className="w-6 h-6" />
              </motion.button>
              <motion.button
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ delay: 0.15 }}
                onClick={(e) => {
                  e.stopPropagation();
                  handleNext();
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-3 rounded-full z-20 transition-all hover:scale-110 active:scale-95"
                style={{ 
                  backgroundColor: 'rgba(10, 22, 40, 0.85)',
                  color: COLORS.champagneGold,
                  border: `1px solid rgba(201, 168, 108, 0.3)`,
                }}
                aria-label="次の画像"
              >
                <ChevronRight className="w-6 h-6" />
              </motion.button>
            </>
          )}

          {/* サムネイルインジケーター */}
          {images.length > 1 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ delay: 0.2 }}
              className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-2 z-20 safe-bottom"
            >
              {images.map((_, index) => (
                <button
                  key={index}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleIndicatorClick(index);
                  }}
                  className="h-2 rounded-full transition-all duration-300 active:scale-90"
                  style={{
                    width: index === currentIndex ? '24px' : '8px',
                    backgroundColor: index === currentIndex 
                      ? COLORS.champagneGold 
                      : 'rgba(201, 168, 108, 0.4)',
                  }}
                  aria-label={`画像 ${index + 1} を表示`}
                  aria-current={index === currentIndex ? 'true' : 'false'}
                />
              ))}
            </motion.div>
          )}

          {/* 操作ヒント */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ delay: 0.5 }}
            className="absolute bottom-20 left-1/2 -translate-x-1/2 text-center z-20 pointer-events-none"
          >
            <p 
              className="text-xs px-4 py-2 rounded-full"
              style={{ 
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                color: COLORS.warmGray,
              }}
            >
              {scale <= 1 
                ? 'ダブルタップでズーム・下スワイプで閉じる' 
                : 'ダブルタップでリセット'}
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}