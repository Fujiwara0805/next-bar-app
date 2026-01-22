'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Ticket,
  X,
  Clock,
  AlertCircle,
  Copy,
  Check,
  Gift,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  CouponData,
  isCouponValid,
  formatDiscountValue,
  CouponDiscountType,
} from '@/lib/types/coupon';
import { toast } from 'sonner';

interface CouponDisplayModalProps {
  isOpen: boolean;
  onClose: () => void;
  coupon: Partial<CouponData>;
  storeName: string;
  onUse?: () => void;
}

export function CouponDisplayModal({
  isOpen,
  onClose,
  coupon,
  storeName,
  onUse,
}: CouponDisplayModalProps) {
  const [copied, setCopied] = useState(false);

  const isValid = isCouponValid(coupon);

  const handleCopyCode = async () => {
    if (coupon.coupon_code) {
      await navigator.clipboard.writeText(coupon.coupon_code);
      setCopied(true);
      toast.success('クーポンコードをコピーしました', { 
        position: 'top-center',
        duration: 1500,
      });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getRemainingDays = () => {
    if (!coupon.coupon_expiry_date) return null;
    const expiry = new Date(coupon.coupon_expiry_date);
    const now = new Date();
    const diffTime = expiry.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const remainingDays = getRemainingDays();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md p-0 overflow-hidden">
        {/* ヘッダー（グラデーション背景） */}
        <div className="bg-gradient-to-br from-amber-400 via-orange-500 to-red-500 p-6 text-white">
          <DialogHeader>
            <div className="flex items-center gap-2 mb-2">
              <Ticket className="w-6 h-6" />
              <span className="text-sm font-medium opacity-90">クーポン</span>
            </div>
            <DialogTitle className="text-2xl font-bold text-white">
              {coupon.coupon_title || 'お得なクーポン'}
            </DialogTitle>
            <DialogDescription className="text-white/90 mt-1">
              {storeName}
            </DialogDescription>
          </DialogHeader>

          {/* 割引表示 */}
          <div className="mt-4 text-center">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="inline-block bg-white/20 backdrop-blur-sm rounded-2xl px-8 py-4"
            >
              <p className="text-4xl font-bold">
                {coupon.coupon_discount_type === 'free_item' 
                  ? '無料サービス'
                  : formatDiscountValue(
                      coupon.coupon_discount_type as CouponDiscountType,
                      coupon.coupon_discount_value || 0
                    )
                }
              </p>
            </motion.div>
          </div>
        </div>

        {/* コンテンツ */}
        <div className="p-6 space-y-4">
          {/* クーポン画像 */}
          {coupon.coupon_image_url && (
            <div className="rounded-lg overflow-hidden">
              <img
                src={coupon.coupon_image_url}
                alt="クーポン"
                className="w-full h-auto"
              />
            </div>
          )}

          {/* 説明 */}
          {coupon.coupon_description && (
            <div className="text-gray-700">
              <p className="font-bold text-sm mb-1">詳細</p>
              <p className="text-sm">{coupon.coupon_description}</p>
            </div>
          )}

          {/* 利用条件 */}
          {coupon.coupon_conditions && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-bold text-sm text-amber-800 mb-1">利用条件</p>
                  <p className="text-sm text-amber-700">{coupon.coupon_conditions}</p>
                </div>
              </div>
            </div>
          )}

          {/* 有効期限 */}
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2 text-gray-600">
              <Clock className="w-4 h-4" />
              <span className="text-sm font-bold">有効期限</span>
            </div>
            <div className="text-right">
              {coupon.coupon_expiry_date ? (
                <>
                  <p className="text-sm font-bold text-gray-800">
                    {formatDate(coupon.coupon_expiry_date)}まで
                  </p>
                  {remainingDays !== null && remainingDays > 0 && remainingDays <= 7 && (
                    <p className="text-xs text-red-500 font-bold">
                      残り{remainingDays}日
                    </p>
                  )}
                </>
              ) : (
                <p className="text-sm text-gray-500">期限なし</p>
              )}
            </div>
          </div>

          {/* クーポンコード */}
          {coupon.coupon_code && (
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
              <p className="text-xs text-gray-500 font-bold text-center mb-2">
                クーポンコード
              </p>
              <div className="flex items-center justify-center gap-2">
                <code className="text-2xl font-bold tracking-widest text-gray-800">
                  {coupon.coupon_code}
                </code>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleCopyCode}
                  className="p-2"
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-green-500" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* バーコード/QRコード */}
          {coupon.coupon_barcode_url && (
            <div className="text-center">
              <p className="text-xs text-gray-500 font-bold mb-2">
                店舗でこちらを提示してください
              </p>
              <img
                src={coupon.coupon_barcode_url}
                alt="バーコード"
                className="max-w-[200px] mx-auto"
              />
            </div>
          )}

          {/* 残り枚数表示 */}
          {coupon.coupon_max_uses && (
            <div className="text-center text-sm text-gray-500">
              <span className="font-bold">
                残り {coupon.coupon_max_uses - (coupon.coupon_current_uses || 0)} 枚
              </span>
              {' / '}
              {coupon.coupon_max_uses} 枚
            </div>
          )}

          {/* 無効な場合の表示 */}
          {!isValid && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
              <p className="text-red-600 font-bold text-sm">
                このクーポンは現在ご利用いただけません
              </p>
              {coupon.coupon_expiry_date && new Date(coupon.coupon_expiry_date) < new Date() && (
                <p className="text-red-500 text-xs mt-1">有効期限が切れています</p>
              )}
              {coupon.coupon_max_uses && 
                (coupon.coupon_current_uses || 0) >= coupon.coupon_max_uses && (
                <p className="text-red-500 text-xs mt-1">発行上限に達しました</p>
              )}
            </div>
          )}

          {/* 使用ボタン */}
          {onUse && isValid && (
            <Button
              className="w-full font-bold bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
              onClick={onUse}
            >
              <Gift className="w-4 h-4 mr-2" />
              このクーポンを使用する
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// クーポンバッジコンポーネント（店舗カードなどで使用）
interface CouponBadgeProps {
  coupon: Partial<CouponData>;
  onClick?: () => void;
  size?: 'sm' | 'md' | 'lg';
}

export function CouponBadge({ coupon, onClick, size = 'md' }: CouponBadgeProps) {
  const isValid = isCouponValid(coupon);

  if (!isValid || !coupon.coupon_title) return null;

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-1.5 text-base',
  };

  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={`
        inline-flex items-center gap-1.5 
        bg-gradient-to-r from-amber-500 to-orange-500 
        text-white font-bold rounded-full shadow-md
        ${sizeClasses[size]}
      `}
    >
      <Ticket className={size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'} />
      <span>
        {coupon.coupon_discount_type === 'free_item'
          ? '無料'
          : formatDiscountValue(
              coupon.coupon_discount_type as CouponDiscountType,
              coupon.coupon_discount_value || 0
            )
        }
      </span>
    </motion.button>
  );
}
