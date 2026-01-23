'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Ticket,
  Clock,
  AlertCircle,
  Copy,
  Check,
  Gift,
  X,
  Instagram,
  MapPin,
  Star,
  Sparkles,
  PartyPopper,
  ExternalLink,
  ChevronRight,
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

// ============================================
// カラーパレット定義（コンシェルジュモーダル準拠）
// ============================================
const COLORS = {
  // プライマリ
  deepNavy: '#0A1628',
  midnightBlue: '#162447',
  royalNavy: '#1F4068',
  
  // アクセント
  champagneGold: '#C9A86C',
  paleGold: '#E8D5B7',
  antiqueGold: '#B8956E',
  
  // ニュートラル
  charcoal: '#2D3436',
  warmGray: '#636E72',
  platinum: '#DFE6E9',
  ivory: '#FDFBF7',
  
  // 背景グラデーション
  luxuryGradient: 'linear-gradient(165deg, #0A1628 0%, #162447 50%, #1F4068 100%)',
  goldGradient: 'linear-gradient(135deg, #C9A86C 0%, #E8D5B7 50%, #B8956E 100%)',
  marbleTexture: `
    linear-gradient(135deg, rgba(255,255,255,0.03) 0%, transparent 50%),
    linear-gradient(225deg, rgba(201,168,108,0.05) 0%, transparent 50%)
  `,
  
  // 追加カラー
  celebrationGradient: 'linear-gradient(135deg, #FFD700 0%, #FFA500 50%, #FF8C00 100%)',
  instagramGradient: 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)',
  googleGradient: 'linear-gradient(135deg, #4285F4 0%, #34A853 33%, #FBBC05 66%, #EA4335 100%)',
};

// ============================================
// 装飾コンポーネント
// ============================================
const GoldDivider = () => (
  <div className="flex items-center justify-center gap-4 my-4">
    <div 
      className="h-px flex-1 max-w-16"
      style={{ 
        background: `linear-gradient(90deg, transparent, ${COLORS.champagneGold}40)` 
      }}
    />
    <div 
      className="w-1.5 h-1.5 rotate-45"
      style={{ backgroundColor: COLORS.champagneGold }}
    />
    <div 
      className="h-px flex-1 max-w-16"
      style={{ 
        background: `linear-gradient(90deg, ${COLORS.champagneGold}40, transparent)` 
      }}
    />
  </div>
);

// ============================================
// 紙吹雪アニメーションコンポーネント
// ============================================
const Confetti = () => {
  const confettiColors = ['#FFD700', '#FFA500', '#FF6347', '#9370DB', '#00CED1', '#C9A86C'];
  
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {Array.from({ length: 20 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-2 h-2 rounded-full"
          style={{
            backgroundColor: confettiColors[i % confettiColors.length],
            left: `${Math.random() * 100}%`,
            top: '-10px',
          }}
          initial={{ y: -10, opacity: 1, rotate: 0 }}
          animate={{
            y: ['0%', '100%'],
            opacity: [1, 0.8, 0],
            rotate: [0, 360],
            x: [0, (Math.random() - 0.5) * 100],
          }}
          transition={{
            duration: 2 + Math.random() * 2,
            delay: Math.random() * 0.5,
            ease: 'easeOut',
          }}
        />
      ))}
    </div>
  );
};

// ============================================
// Next Actionカードコンポーネント
// ============================================
interface ActionCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  buttonText: string;
  href: string;
  gradientStyle: string;
  delay?: number;
}

const ActionCard = ({ 
  icon, 
  title, 
  description, 
  buttonText, 
  href, 
  gradientStyle,
  delay = 0,
}: ActionCardProps) => (
  <motion.a
    href={href}
    target="_blank"
    rel="noopener noreferrer"
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: delay + 0.3, duration: 0.4 }}
    className="block rounded-xl p-4 transition-all hover:scale-[1.02] group"
    style={{
      backgroundColor: 'rgba(255, 255, 255, 0.05)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
    }}
  >
    <div className="flex items-start gap-4">
      {/* アイコン */}
      <div 
        className="flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center"
        style={{ background: gradientStyle }}
      >
        {icon}
      </div>
      
      {/* コンテンツ */}
      <div className="flex-1 min-w-0">
        <h4 
          className="font-bold text-sm mb-1"
          style={{ color: COLORS.ivory }}
        >
          {title}
        </h4>
        <p 
          className="text-xs leading-relaxed mb-2"
          style={{ color: COLORS.warmGray }}
        >
          {description}
        </p>
        <div 
          className="inline-flex items-center gap-1 text-xs font-medium group-hover:underline"
          style={{ color: COLORS.champagneGold }}
        >
          {buttonText}
          <ChevronRight className="w-3 h-3 transition-transform group-hover:translate-x-1" />
        </div>
      </div>
    </div>
  </motion.a>
);

interface CouponDisplayModalProps {
  isOpen: boolean;
  onClose: () => void;
  coupon: Partial<CouponData>;
  storeName: string;
  storeId: string;
  instagramUrl?: string;
  googlePlaceId?: string;
  onCouponUsed?: () => void;
}

export function CouponDisplayModal({
  isOpen,
  onClose,
  coupon,
  storeName,
  storeId,
  instagramUrl,
  googlePlaceId,
  onCouponUsed,
}: CouponDisplayModalProps) {
  const [copied, setCopied] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isUsing, setIsUsing] = useState(false);
  const [isUsed, setIsUsed] = useState(false);

  const isValid = isCouponValid(coupon);

  // Google Maps口コミURLを生成
  const generateReviewUrl = (placeId: string): string => {
    return `https://search.google.com/local/writereview?placeid=${encodeURIComponent(placeId)}`;
  };

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
      const currentUses = coupon.coupon_current_uses || 0;
      const { error } = await supabase
        .from('stores')
        // @ts-ignore
        .update({ coupon_current_uses: currentUses + 1 })
        .eq('id', storeId);

      if (error) throw error;

      setIsUsed(true);
      setShowConfirmModal(false);
      toast.success('クーポンを使用しました', {
        position: 'top-center',
        duration: 2000,
      });
      
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
        showCloseButton={false}
      >
        {/* 
          CustomModalの白背景を完全に覆うため、
          margin/paddingを大きく取り、絶対配置で全体をカバー 
        */}
        <div 
          className="absolute inset-0 rounded-2xl overflow-hidden"
          style={{
            background: COLORS.luxuryGradient,
            margin: '-1px',
          }}
        >
          {/* 大理石風テクスチャオーバーレイ */}
          <div 
            className="absolute inset-0 opacity-50 pointer-events-none"
            style={{ background: COLORS.marbleTexture }}
          />
          
          {/* 使用済み時の紙吹雪 */}
          {isUsed && <Confetti />}
        </div>

        {/* コンテンツコンテナ */}
        <div className="relative z-10 -m-6">
          {/* 閉じるボタン */}
          <motion.button
            whileHover={{ scale: 1.1, opacity: 1 }}
            whileTap={{ scale: 0.95 }}
            onClick={onClose}
            className="absolute top-4 right-4 z-20 p-2 rounded-full transition-colors"
            style={{ 
              color: COLORS.warmGray,
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
            }}
            aria-label="閉じる"
          >
            <X className="w-5 h-5" />
          </motion.button>

          {/* 使用済み時のコンテンツ */}
          {isUsed ? (
            <div className="px-6 py-8">
              {/* お祝いヘッダー */}
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                className="text-center mb-6"
              >
                <div 
                  className="inline-flex items-center justify-center w-20 h-20 rounded-full mb-4"
                  style={{
                    background: COLORS.goldGradient,
                    boxShadow: '0 10px 40px rgba(201, 168, 108, 0.4)',
                  }}
                >
                  <PartyPopper className="w-10 h-10" style={{ color: COLORS.deepNavy }} />
                </div>
                
                <motion.h2
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="text-2xl font-bold mb-2"
                  style={{ 
                    color: COLORS.champagneGold,
                    fontFamily: '"Cormorant Garamond", "Noto Serif JP", serif',
                  }}
                >
                  ご来店ありがとうございます！
                </motion.h2>
                
                <motion.p
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="text-sm"
                  style={{ color: COLORS.platinum }}
                >
                  {storeName}でのひとときをお楽しみください
                </motion.p>
              </motion.div>

              <GoldDivider />

              {/* 追加特典案内 */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="mb-6"
              >
                <div 
                  className="rounded-xl p-4 mb-4"
                  style={{
                    backgroundColor: 'rgba(201, 168, 108, 0.1)',
                    border: `1px solid rgba(201, 168, 108, 0.2)`,
                  }}
                >
                  <div className="flex items-start gap-3">
                    <div 
                      className="flex-shrink-0 p-2 rounded-full"
                      style={{ backgroundColor: 'rgba(201, 168, 108, 0.2)' }}
                    >
                      <Gift className="w-5 h-5" style={{ color: COLORS.champagneGold }} />
                    </div>
                    <div>
                      <h3 
                        className="font-bold text-sm mb-1"
                        style={{ color: COLORS.champagneGold }}
                      >
                        さらにお得なチャンス！
                      </h3>
                      <p 
                        className="text-xs leading-relaxed"
                        style={{ color: COLORS.platinum }}
                      >
                        以下のいずれかの画面をスタッフに提示すると、追加特典をプレゼントいたします。
                      </p>
                    </div>
                  </div>
                </div>

                {/* アクションカード */}
                <div className="space-y-3">
                  {/* Instagramフォロー */}
                  <ActionCard
                    icon={<Instagram className="w-6 h-6 text-white" />}
                    title="Instagram公式アカウントをフォロー"
                    description="最新情報やお得なキャンペーン情報をお届けします"
                    buttonText="Instagramを開く"
                    href={instagramUrl || `https://www.instagram.com/explore/locations/${storeName}`}
                    gradientStyle={COLORS.instagramGradient}
                    delay={0}
                  />

                  {/* Googleクチコミ */}
                  <ActionCard
                    icon={<Star className="w-6 h-6 text-white" />}
                    title="Googleマップでクチコミを投稿"
                    description="あなたの体験を共有して、お店を応援しましょう"
                    buttonText="クチコミを書く"
                    href={googlePlaceId ? generateReviewUrl(googlePlaceId) : `https://www.google.com/maps/search/${encodeURIComponent(storeName)}`}
                    gradientStyle={COLORS.googleGradient}
                    delay={0.1}
                  />
                </div>
              </motion.div>

              {/* 閉じるボタン */}
              <motion.button
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={onClose}
                className="w-full py-4 rounded-xl font-medium tracking-wider transition-all"
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  color: COLORS.platinum,
                }}
              >
                閉じる
              </motion.button>
            </div>
          ) : (
            /* 通常のクーポン表示 */
            <>
              {/* ヘッダー */}
              <div className="relative px-6 pt-8 pb-4">
                {/* 店舗名バッジ */}
                <div 
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-4"
                  style={{
                    backgroundColor: 'rgba(201, 168, 108, 0.12)',
                    border: `1px solid rgba(201, 168, 108, 0.25)`,
                  }}
                >
                  <Ticket className="w-4 h-4" style={{ color: COLORS.champagneGold }} />
                  <span 
                    className="text-xs font-medium tracking-widest uppercase"
                    style={{ color: COLORS.champagneGold }}
                  >
                    Special Coupon
                  </span>
                </div>

                {/* タイトル */}
                <h2 
                  className="text-2xl font-light tracking-wide mb-1 pr-8"
                  style={{ 
                    color: COLORS.ivory,
                    fontFamily: '"Cormorant Garamond", "Noto Serif JP", serif',
                  }}
                >
                  {coupon.coupon_title || 'お得なクーポン'}
                </h2>
                <p 
                  className="text-sm tracking-wide"
                  style={{ color: COLORS.warmGray }}
                >
                  {storeName}
                </p>

                <GoldDivider />

                {/* 割引表示 - エレガントカードスタイル */}
                <motion.div
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.1, duration: 0.3 }}
                  className="relative rounded-xl px-6 py-5 text-center overflow-hidden"
                  style={{
                    backgroundColor: 'rgba(201, 168, 108, 0.08)',
                    border: `1px solid rgba(201, 168, 108, 0.2)`,
                  }}
                >
                  {/* 装飾ライン - 上 */}
                  <div className="flex items-center gap-4 mb-4">
                    <div 
                      className="flex-1 h-px" 
                      style={{ background: `linear-gradient(to right, transparent, ${COLORS.champagneGold}50, transparent)` }} 
                    />
                    <div 
                      className="w-2 h-2 rotate-45" 
                      style={{ backgroundColor: COLORS.champagneGold }} 
                    />
                    <div 
                      className="flex-1 h-px" 
                      style={{ background: `linear-gradient(to right, transparent, ${COLORS.champagneGold}50, transparent)` }} 
                    />
                  </div>

                  <p 
                    className="text-4xl font-bold tracking-tight"
                    style={{ 
                      color: COLORS.champagneGold,
                      textShadow: '0 0 30px rgba(201, 168, 108, 0.3)',
                    }}
                  >
                    {coupon.coupon_discount_type === 'free_item' 
                      ? '無料サービス'
                      : formatDiscountValue(
                          coupon.coupon_discount_type as CouponDiscountType,
                          coupon.coupon_discount_value || 0
                        )
                    }
                  </p>

                  {/* 装飾ライン - 下 */}
                  <div className="flex items-center gap-4 mt-4">
                    <div 
                      className="flex-1 h-px" 
                      style={{ background: `linear-gradient(to right, transparent, ${COLORS.champagneGold}50, transparent)` }} 
                    />
                    <div 
                      className="w-2 h-2 rotate-45" 
                      style={{ backgroundColor: COLORS.champagneGold }} 
                    />
                    <div 
                      className="flex-1 h-px" 
                      style={{ background: `linear-gradient(to right, transparent, ${COLORS.champagneGold}50, transparent)` }} 
                    />
                  </div>
                </motion.div>
              </div>

              {/* コンテンツ */}
              <div className="relative space-y-4 px-6 pb-6">
                {/* クーポン画像 */}
                {coupon.coupon_image_url && (
                  <div 
                    className="rounded-xl overflow-hidden"
                    style={{ 
                      border: `1px solid rgba(201, 168, 108, 0.2)`,
                    }}
                  >
                    <img
                      src={coupon.coupon_image_url}
                      alt="クーポン"
                      className="w-full h-auto"
                    />
                  </div>
                )}

                {/* 説明 */}
                {coupon.coupon_description && (
                  <div 
                    className="p-4 rounded-xl"
                    style={{ 
                      backgroundColor: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                    }}
                  >
                    <p 
                      className="font-medium text-sm mb-2"
                      style={{ color: COLORS.paleGold }}
                    >
                      詳細
                    </p>
                    <p 
                      className="text-sm leading-relaxed"
                      style={{ color: COLORS.platinum }}
                    >
                      {coupon.coupon_description}
                    </p>
                  </div>
                )}

                {/* 利用条件 */}
                {coupon.coupon_conditions && (
                  <div 
                    className="rounded-xl p-4"
                    style={{
                      backgroundColor: 'rgba(201, 168, 108, 0.08)',
                      border: `1px solid rgba(201, 168, 108, 0.15)`,
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <AlertCircle 
                        className="w-4 h-4 mt-0.5 flex-shrink-0" 
                        style={{ color: COLORS.champagneGold }}
                      />
                      <div>
                        <p 
                          className="font-medium text-sm mb-1"
                          style={{ color: COLORS.champagneGold }}
                        >
                          ご利用条件
                        </p>
                        <p 
                          className="text-sm leading-relaxed"
                          style={{ color: COLORS.platinum }}
                        >
                          {coupon.coupon_conditions}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* 有効期限 */}
                <div 
                  className="flex items-center justify-between p-4 rounded-xl"
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                  }}
                >
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" style={{ color: COLORS.warmGray }} />
                    <span 
                      className="text-sm font-medium"
                      style={{ color: COLORS.warmGray }}
                    >
                      有効期限
                    </span>
                  </div>
                  <div className="text-right">
                    {coupon.coupon_expiry_date ? (
                      <>
                        <p 
                          className="text-sm font-medium"
                          style={{ color: COLORS.ivory }}
                        >
                          {formatDate(coupon.coupon_expiry_date)}まで
                        </p>
                        {remainingDays !== null && remainingDays > 0 && remainingDays <= 7 && (
                          <p 
                            className="text-xs font-medium mt-0.5"
                            style={{ color: COLORS.champagneGold }}
                          >
                            残り{remainingDays}日
                          </p>
                        )}
                      </>
                    ) : (
                      <p 
                        className="text-sm"
                        style={{ color: COLORS.warmGray }}
                      >
                        期限なし
                      </p>
                    )}
                  </div>
                </div>

                {/* クーポンコード */}
                {coupon.coupon_code && (
                  <div 
                    className="rounded-xl p-5"
                    style={{
                      backgroundColor: 'rgba(255, 255, 255, 0.03)',
                      border: `2px dashed rgba(201, 168, 108, 0.3)`,
                    }}
                  >
                    <p 
                      className="text-xs font-medium text-center mb-3 tracking-widest uppercase"
                      style={{ color: COLORS.warmGray }}
                    >
                      Coupon Code
                    </p>
                    <div className="flex items-center justify-center gap-3">
                      <code 
                        className="text-2xl font-bold tracking-widest"
                        style={{ color: COLORS.paleGold }}
                      >
                        {coupon.coupon_code}
                      </code>
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={handleCopyCode}
                        className="p-2.5 rounded-xl transition-all"
                        style={{
                          backgroundColor: copied 
                            ? 'rgba(34, 197, 94, 0.2)' 
                            : 'rgba(201, 168, 108, 0.15)',
                          border: `1px solid ${copied ? 'rgba(34, 197, 94, 0.3)' : 'rgba(201, 168, 108, 0.25)'}`,
                        }}
                        aria-label={copied ? 'コピー完了' : 'コードをコピー'}
                      >
                        {copied ? (
                          <Check className="w-4 h-4" style={{ color: '#4ade80' }} />
                        ) : (
                          <Copy className="w-4 h-4" style={{ color: COLORS.champagneGold }} />
                        )}
                      </motion.button>
                    </div>
                  </div>
                )}

                {/* バーコード/QRコード */}
                {coupon.coupon_barcode_url && (
                  <div className="text-center">
                    <p 
                      className="text-xs font-medium mb-3"
                      style={{ color: COLORS.warmGray }}
                    >
                      店舗でこちらを提示してください
                    </p>
                    <div 
                      className="inline-block p-4 rounded-xl"
                      style={{ backgroundColor: COLORS.ivory }}
                    >
                      <img
                        src={coupon.coupon_barcode_url}
                        alt="バーコード"
                        className="max-w-[200px] mx-auto"
                      />
                    </div>
                  </div>
                )}

                {/* 残り枚数表示 */}
                {coupon.coupon_max_uses && (
                  <div className="text-center text-sm">
                    <span 
                      className="font-medium"
                      style={{ color: COLORS.champagneGold }}
                    >
                      残り {coupon.coupon_max_uses - (coupon.coupon_current_uses || 0)} 枚
                    </span>
                    <span style={{ color: COLORS.warmGray }}>
                      {' / '}
                      {coupon.coupon_max_uses} 枚
                    </span>
                  </div>
                )}

                {/* 無効な場合の表示 */}
                {!isValid && (
                  <div 
                    className="rounded-xl p-4 text-center"
                    style={{
                      backgroundColor: 'rgba(239, 68, 68, 0.15)',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                    }}
                  >
                    <p 
                      className="font-medium text-sm"
                      style={{ color: '#f87171' }}
                    >
                      このクーポンは現在ご利用いただけません
                    </p>
                    {coupon.coupon_expiry_date && new Date(coupon.coupon_expiry_date) < new Date() && (
                      <p 
                        className="text-xs mt-1"
                        style={{ color: '#fca5a5' }}
                      >
                        有効期限が切れています
                      </p>
                    )}
                    {coupon.coupon_max_uses && 
                      (coupon.coupon_current_uses || 0) >= coupon.coupon_max_uses && (
                      <p 
                        className="text-xs mt-1"
                        style={{ color: '#fca5a5' }}
                      >
                        発行上限に達しました
                      </p>
                    )}
                  </div>
                )}

                {/* 使用ボタン */}
                {isValid && (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full py-4 rounded-xl font-medium tracking-wider relative overflow-hidden group transition-all"
                    onClick={() => setShowConfirmModal(true)}
                    disabled={isUsing}
                    style={{
                      background: COLORS.goldGradient,
                      color: COLORS.deepNavy,
                      boxShadow: '0 10px 30px rgba(201, 168, 108, 0.3)',
                    }}
                  >
                    {/* ホバー時の光沢エフェクト */}
                    <div 
                      className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                      style={{
                        background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.3) 50%, transparent 100%)',
                      }}
                    />
                    <span className="relative flex items-center justify-center gap-2">
                      <Gift className="w-5 h-5" />
                      クーポンを使う
                    </span>
                  </motion.button>
                )}
              </div>
            </>
          )}
        </div>
      </CustomModal>

      {/* 確認モーダル */}
      <CustomModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        title=""
        description=""
        showCloseButton={false}
      >
        {/* 背景を完全にカバー */}
        <div 
          className="absolute inset-0 rounded-2xl overflow-hidden"
          style={{
            background: COLORS.luxuryGradient,
            margin: '-1px',
          }}
        >
          <div 
            className="absolute inset-0 opacity-50 pointer-events-none"
            style={{ background: COLORS.marbleTexture }}
          />
        </div>

        <div className="relative z-10 -m-6 p-6">
          {/* 閉じるボタン */}
          <motion.button
            whileHover={{ scale: 1.1, opacity: 1 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowConfirmModal(false)}
            className="absolute top-4 right-4 z-20 p-2 rounded-full transition-colors"
            style={{ 
              color: COLORS.warmGray,
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
            }}
            aria-label="閉じる"
          >
            <X className="w-4 h-4" />
          </motion.button>

          <div className="relative text-center pt-2">
            <div 
              className="inline-flex items-center justify-center w-14 h-14 rounded-full mb-4"
              style={{
                backgroundColor: 'rgba(201, 168, 108, 0.15)',
                border: `1px solid rgba(201, 168, 108, 0.25)`,
              }}
            >
              <Gift className="w-7 h-7" style={{ color: COLORS.champagneGold }} />
            </div>
            <h3 
              className="text-xl font-light tracking-wide mb-2"
              style={{ 
                color: COLORS.ivory,
                fontFamily: '"Cormorant Garamond", "Noto Serif JP", serif',
              }}
            >
              クーポンを使用しますか？
            </h3>
            <p 
              className="text-sm mb-6"
              style={{ color: COLORS.warmGray }}
            >
              この操作は取り消せません
            </p>
          </div>
          
          <div className="relative flex gap-3">
            <button
              onClick={() => setShowConfirmModal(false)}
              disabled={isUsing}
              className="flex-1 py-3.5 rounded-xl font-medium tracking-wider transition-all hover:scale-105"
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: COLORS.warmGray,
              }}
            >
              キャンセル
            </button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleUseCoupon}
              disabled={isUsing}
              className="flex-1 py-3.5 rounded-xl font-medium tracking-wider transition-all disabled:opacity-50"
              style={{
                background: COLORS.goldGradient,
                color: COLORS.deepNavy,
                boxShadow: '0 10px 30px rgba(201, 168, 108, 0.3)',
              }}
            >
              {isUsing ? '処理中...' : '使用する'}
            </motion.button>
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
    sm: 'px-2.5 py-1 text-xs',
    md: 'px-3.5 py-1.5 text-sm',
    lg: 'px-5 py-2 text-base',
  };

  return (
    <motion.button
      whileHover={{ scale: 1.05, y: -1 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={`
        inline-flex items-center gap-1.5 
        font-medium rounded-full
        ${sizeClasses[size]}
      `}
      style={{
        background: COLORS.goldGradient,
        color: COLORS.deepNavy,
        boxShadow: '0 4px 15px rgba(201, 168, 108, 0.35)',
      }}
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