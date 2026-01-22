'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Ticket,
  Clock,
  AlertCircle,
  Copy,
  Check,
  Gift,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CustomModal } from '@/components/ui/custom-modal';
import {
  CouponData,
  isCouponValid,
  formatDiscountValue,
  CouponDiscountType,
} from '@/lib/types/coupon';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase/client';
import type { Database } from '@/lib/supabase/types';

interface CouponDisplayModalProps {
  isOpen: boolean;
  onClose: () => void;
  coupon: Partial<CouponData>;
  storeName: string;
  storeId: string;
  onCouponUsed?: () => void;
}

export function CouponDisplayModal({
  isOpen,
  onClose,
  coupon,
  storeName,
  storeId,
  onCouponUsed,
}: CouponDisplayModalProps) {
  const [copied, setCopied] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isUsing, setIsUsing] = useState(false);
  const [isUsed, setIsUsed] = useState(false);

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

  // クーポン使用処理
  const handleUseCoupon = async () => {
    setIsUsing(true);
    try {
      // coupon_current_usesをインクリメント
      const currentUses = coupon.coupon_current_uses || 0;
      const { error } = await supabase
        .from('stores')
        // @ts-ignore - Supabaseの型推論の問題を回避
        .update({ coupon_current_uses: currentUses + 1 })
        .eq('id', storeId);

      if (error) throw error;

      setIsUsed(true);
      setShowConfirmModal(false);
      toast.success('クーポンを使用しました', {
        position: 'top-center',
        duration: 2000,
      });
      
      // 親コンポーネントに通知
      if (onCouponUsed) {
        onCouponUsed();
      }
    } catch (error) {
      console.error('Error using coupon:', error);
      toast.error('クーポンの使用に失敗しました', {
        position: 'top-center',
        duration: 3000,
      });
    } finally {
      setIsUsing(false);
    }
  };

  return (
    <>
      <CustomModal
        isOpen={isOpen}
        onClose={onClose}
        title=""
        description=""
        showCloseButton={true}
      >
        <div className="space-y-4">
          {/* ヘッダー（グラデーション背景） */}
          <div className="bg-gradient-to-br from-amber-400 via-orange-500 to-red-500 p-6 text-white rounded-lg -m-6 mb-4">
            <div className="flex items-center gap-2 mb-2">
              <Ticket className="w-6 h-6" />
              <span className="text-sm font-medium opacity-90">クーポン</span>
            </div>
            <h2 className="text-2xl font-bold text-white">
              {coupon.coupon_title || 'お得なクーポン'}
            </h2>
            <p className="text-white/90 mt-1 text-sm font-bold">{storeName}</p>

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

          {/* 使用済み表示 */}
          {isUsed && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
              <p className="text-green-600 font-bold text-sm">
                このクーポンは使用済みです
              </p>
            </div>
          )}

          {/* コンテンツ */}
          <div className="space-y-4">
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
          {!isUsed && isValid && (
            <Button
              className="w-full font-bold bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
              onClick={() => setShowConfirmModal(true)}
              disabled={isUsing}
            >
              <Gift className="w-4 h-4 mr-2" />
              クーポンを使う
            </Button>
          )}
          </div>
        </div>
      </CustomModal>

      {/* 確認モーダル */}
      <CustomModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        title="クーポンを使用しますか？"
        description="クーポンを使うを押すと、このクーポンは使用済みになります"
        showCloseButton={true}
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-700 font-bold">
            この操作は取り消せません。クーポンを使用しますか？
          </p>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setShowConfirmModal(false)}
              className="flex-1 font-bold"
              disabled={isUsing}
            >
              キャンセル
            </Button>
            <Button
              onClick={handleUseCoupon}
              disabled={isUsing}
              className="flex-1 font-bold bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
            >
              {isUsing ? '処理中...' : 'OK'}
            </Button>
          </div>
        </div>
      </CustomModal>
    </>
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
