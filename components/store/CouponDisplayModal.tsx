'use client';

import { useState, useEffect, useCallback } from 'react';
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
  Star,
  PartyPopper,
  ChevronRight,
  ChevronLeft,
  MapPin,
  User,
  Home,
  Plane,
  Sparkles,
  Heart,
} from 'lucide-react';
import { CustomModal } from '@/components/ui/custom-modal';
import {
  CouponData,
  isCouponValid,
  formatDiscountValue,
  CouponDiscountType,
} from '@/lib/types/coupon';
import {
  SurveyAnswers,
  SurveyStep,
  getOrCreateSessionId,
  isSurveyComplete,
} from '@/lib/types/coupon-usage';
import { recordCouponUsage } from '@/lib/actions/coupon-usage';
import { toast } from 'sonner';
import { useLanguage } from '@/lib/i18n/context';

// ============================================
// カラーパレット定義（ラグジュアリーテーマ）
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
  instagramGradient: 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)',
  googleGradient: 'linear-gradient(135deg, #4285F4 0%, #34A853 33%, #FBBC05 66%, #EA4335 100%)',
};

// ============================================
// アニメーション設定
// ============================================
const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 300 : -300,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction < 0 ? 300 : -300,
    opacity: 0,
  }),
};

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
};

// ============================================
// 装飾コンポーネント
// ============================================
const GoldDivider = () => (
  <div className="flex items-center justify-center gap-4 my-4">
    <div 
      className="h-px flex-1 max-w-16"
      style={{ background: `linear-gradient(90deg, transparent, ${COLORS.champagneGold}40)` }}
    />
    <div 
      className="w-1.5 h-1.5 rotate-45"
      style={{ backgroundColor: COLORS.champagneGold }}
    />
    <div 
      className="h-px flex-1 max-w-16"
      style={{ background: `linear-gradient(90deg, ${COLORS.champagneGold}40, transparent)` }}
    />
  </div>
);

// 紙吹雪アニメーション
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

// ステップインジケーター
const StepIndicator = ({ currentStep, totalSteps }: { currentStep: number; totalSteps: number }) => (
  <div className="flex items-center justify-center gap-2 mb-6">
    {Array.from({ length: totalSteps }).map((_, i) => (
      <motion.div
        key={i}
        className="h-1.5 rounded-full transition-all duration-300"
        style={{
          width: i === currentStep ? 24 : 8,
          backgroundColor: i <= currentStep 
            ? COLORS.champagneGold 
            : 'rgba(255, 255, 255, 0.2)',
        }}
        animate={{
          scale: i === currentStep ? [1, 1.1, 1] : 1,
        }}
        transition={{ duration: 0.3 }}
      />
    ))}
  </div>
);

// 選択肢ボタン
interface ChoiceButtonProps {
  icon: React.ReactNode;
  label: string;
  sublabel?: string;
  isSelected: boolean;
  onClick: () => void;
  delay?: number;
}

const ChoiceButton = ({ icon, label, sublabel, isSelected, onClick, delay = 0 }: ChoiceButtonProps) => (
  <motion.button
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay }}
    whileHover={{ scale: 1.02, y: -2 }}
    whileTap={{ scale: 0.98 }}
    onClick={onClick}
    className="w-full p-5 rounded-xl text-left transition-all relative overflow-hidden group"
    style={{
      backgroundColor: isSelected 
        ? 'rgba(201, 168, 108, 0.15)' 
        : 'rgba(255, 255, 255, 0.05)',
      border: `2px solid ${isSelected ? COLORS.champagneGold : 'rgba(255, 255, 255, 0.1)'}`,
      boxShadow: isSelected 
        ? '0 10px 30px rgba(201, 168, 108, 0.2)' 
        : 'none',
    }}
  >
    {/* 選択時のグロー効果 */}
    {isSelected && (
      <motion.div
        className="absolute inset-0 pointer-events-none"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        style={{
          background: 'radial-gradient(circle at center, rgba(201, 168, 108, 0.1) 0%, transparent 70%)',
        }}
      />
    )}
    
    <div className="relative flex items-center gap-4">
      <div 
        className="flex-shrink-0 w-14 h-14 rounded-xl flex items-center justify-center transition-all"
        style={{
          backgroundColor: isSelected 
            ? 'rgba(201, 168, 108, 0.2)' 
            : 'rgba(255, 255, 255, 0.08)',
          border: `1px solid ${isSelected ? COLORS.champagneGold : 'rgba(255, 255, 255, 0.1)'}`,
        }}
      >
        <div style={{ color: isSelected ? COLORS.champagneGold : COLORS.warmGray }}>
          {icon}
        </div>
      </div>
      
      <div className="flex-1 min-w-0">
        <h4 
          className="font-bold text-base"
          style={{ color: isSelected ? COLORS.champagneGold : COLORS.ivory }}
        >
          {label}
        </h4>
        {sublabel && (
          <p 
            className="text-sm mt-0.5"
            style={{ color: isSelected ? COLORS.paleGold : COLORS.warmGray }}
          >
            {sublabel}
          </p>
        )}
      </div>
      
      {/* チェックマーク */}
      <AnimatePresence>
        {isSelected && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center"
            style={{ backgroundColor: COLORS.champagneGold }}
          >
            <Check className="w-5 h-5" style={{ color: COLORS.deepNavy }} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  </motion.button>
);

// Next Actionカード
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
      <div 
        className="flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center"
        style={{ background: gradientStyle }}
      >
        {icon}
      </div>
      
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

// ============================================
// メインコンポーネント
// ============================================

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
  // ============================================
  // 多言語対応
  // ============================================
  const { t, language } = useLanguage();

  // ============================================
  // 状態管理
  // ============================================
  
  // アンケート関連
  const [surveyStep, setSurveyStep] = useState<SurveyStep>('intro');
  const [surveyAnswers, setSurveyAnswers] = useState<SurveyAnswers>({
    isFirstVisit: null,
    isLocalResident: null,
  });
  const [slideDirection, setSlideDirection] = useState(1);
  
  // クーポン関連
  const [copied, setCopied] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isUsing, setIsUsing] = useState(false);
  const [isUsed, setIsUsed] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [showAdditionalBonus, setShowAdditionalBonus] = useState(false);

  const isValid = isCouponValid(coupon);

  // ============================================
  // 効果
  // ============================================
  
  // モーダルを閉じた時にリセット
  useEffect(() => {
    if (!isOpen) {
      // 少し遅延させてアニメーション後にリセット
      const timer = setTimeout(() => {
        setSurveyStep('intro');
        setSurveyAnswers({ isFirstVisit: null, isLocalResident: null });
        setSlideDirection(1);
        setIsUsed(false);
        setShowAdditionalBonus(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // ============================================
  // ハンドラー
  // ============================================

  // ステップを進める
  const handleNextStep = useCallback(() => {
    setSlideDirection(1);
    
    switch (surveyStep) {
      case 'intro':
        setSurveyStep('first_visit');
        break;
      case 'first_visit':
        if (surveyAnswers.isFirstVisit !== null) {
          setSurveyStep('residence');
        }
        break;
      case 'residence':
        if (surveyAnswers.isLocalResident !== null) {
          handleSurveyComplete();
        }
        break;
    }
  }, [surveyStep, surveyAnswers]);

  // ステップを戻る
  const handlePrevStep = useCallback(() => {
    setSlideDirection(-1);
    
    switch (surveyStep) {
      case 'first_visit':
        setSurveyStep('intro');
        break;
      case 'residence':
        setSurveyStep('first_visit');
        break;
    }
  }, [surveyStep]);

  // アンケート完了時の処理
  const handleSurveyComplete = async () => {
    if (!isSurveyComplete(surveyAnswers)) return;
    
    setIsRecording(true);
    
    try {
      const sessionId = getOrCreateSessionId();
      
      const result = await recordCouponUsage({
        storeId,
        storeName,
        sessionId,
        isFirstVisit: surveyAnswers.isFirstVisit!,
        isLocalResident: surveyAnswers.isLocalResident!,
      });

      if (!result.success) {
        if (result.error === 'DUPLICATE_USAGE') {
          toast.error(result.message || t('coupon.duplicate_usage'), {
            position: 'top-center',
            duration: 4000,
          });
          return;
        }
        // エラーでも表示は続行（UX優先）
      }
      
      setSlideDirection(1);
      setSurveyStep('complete');
    } catch (error) {
      console.error('Error recording coupon usage:', error);
      // エラーでも表示は続行
      setSlideDirection(1);
      setSurveyStep('complete');
    } finally {
      setIsRecording(false);
    }
  };

  // 初来店の回答
  const handleFirstVisitAnswer = (isFirst: boolean) => {
    setSurveyAnswers(prev => ({ ...prev, isFirstVisit: isFirst }));
  };

  // 居住地の回答
  const handleResidenceAnswer = (isLocal: boolean) => {
    setSurveyAnswers(prev => ({ ...prev, isLocalResident: isLocal }));
  };

  // クーポンコードをコピー
  const handleCopyCode = async () => {
    if (coupon.coupon_code) {
      await navigator.clipboard.writeText(coupon.coupon_code);
      setCopied(true);
      toast.success(t('coupon.copied'), { 
        position: 'top-center',
        duration: 1500,
      });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // クーポン使用
  const handleUseCoupon = async () => {
    setIsUsing(true);
    try {
      // 使用回数のインクリメントはサーバーアクションで既に行われているため、
      // ここでは状態の更新のみ
      setIsUsed(true);
      setShowConfirmModal(false);
      toast.success(t('coupon.used_success'), {
        position: 'top-center',
        duration: 2000,
      });
      
      if (onCouponUsed) {
        onCouponUsed();
      }
    } catch (error) {
      console.error('Error using coupon:', error);
      toast.error(t('coupon.use_failed'), {
        position: 'top-center',
        duration: 3000,
      });
    } finally {
      setIsUsing(false);
    }
  };

  // ============================================
  // ユーティリティ関数
  // ============================================

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
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  /**
   * Google Maps口コミ投稿URLを生成
   */
  const generateGoogleReviewUrl = (placeId: string): string => {
    return `https://search.google.com/local/writereview?placeid=${encodeURIComponent(placeId)}`;
  };

  const remainingDays = getRemainingDays();
  const stepNumber = surveyStep === 'intro' ? 0 : surveyStep === 'first_visit' ? 1 : surveyStep === 'residence' ? 2 : 3;

  // ============================================
  // レンダリング
  // ============================================

  return (
    <>
      <CustomModal
        isOpen={isOpen}
        onClose={onClose}
        title=""
        description=""
        showCloseButton={false}
      >
        {/* 背景 */}
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
          {isUsed && <Confetti />}
        </div>

        {/* コンテンツ */}
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
            aria-label={t('coupon.close')}
          >
            <X className="w-5 h-5" />
          </motion.button>

          <AnimatePresence mode="wait" custom={slideDirection}>
            {/* ============================================
                Step 0: イントロ画面
                ============================================ */}
            {surveyStep === 'intro' && (
              <motion.div
                key="intro"
                custom={slideDirection}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.3, ease: 'easeInOut' }}
                className="px-6 py-8"
              >
                {/* ヘッダー */}
                <div className="text-center mb-6">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                    className="inline-flex items-center justify-center w-20 h-20 rounded-full mb-4"
                    style={{
                      background: COLORS.goldGradient,
                      boxShadow: '0 10px 40px rgba(201, 168, 108, 0.4)',
                    }}
                  >
                    <Gift className="w-10 h-10" style={{ color: COLORS.deepNavy }} />
                  </motion.div>
                  
                  <h2 
                    className="text-2xl font-bold mb-2"
                    style={{ 
                      color: COLORS.ivory,
                      fontFamily: '"Cormorant Garamond", "Noto Serif JP", serif',
                    }}
                  >
                    {t('coupon.special_coupon')}
                  </h2>
                  <p 
                    className="text-sm"
                    style={{ color: COLORS.warmGray }}
                  >
                    {storeName}{t('coupon.from_store')}
                  </p>
                </div>

                <GoldDivider />

                {/* クーポンプレビュー */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="rounded-xl p-5 mb-6 text-center"
                  style={{
                    backgroundColor: 'rgba(201, 168, 108, 0.1)',
                    border: `1px solid rgba(201, 168, 108, 0.2)`,
                  }}
                >
                  <p 
                    className="text-sm mb-2"
                    style={{ color: COLORS.warmGray }}
                  >
                    {coupon.coupon_title || t('coupon.default_coupon_title')}
                  </p>
                    <p 
                      className="text-3xl font-bold"
                      style={{ 
                        color: COLORS.champagneGold,
                        textShadow: '0 0 30px rgba(201, 168, 108, 0.3)',
                      }}
                    >
                      {coupon.coupon_discount_type === 'free_item' 
                        ? t('coupon.free_item')
                        : formatDiscountValue(
                            coupon.coupon_discount_type as CouponDiscountType,
                            coupon.coupon_discount_value || 0
                          )
                      }
                    </p>
                  </motion.div>

                {/* 説明 */}
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="text-center text-sm mb-6 whitespace-pre-line"
                  style={{ color: COLORS.platinum }}
                >
                  {t('coupon.survey_intro')}
                </motion.p>

                {/* 開始ボタン */}
                <motion.button
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleNextStep}
                  className="w-full py-4 rounded-xl font-medium tracking-wider relative overflow-hidden group transition-all"
                  style={{
                    background: COLORS.goldGradient,
                    color: COLORS.deepNavy,
                    boxShadow: '0 10px 30px rgba(201, 168, 108, 0.3)',
                  }}
                >
                  <span className="relative flex items-center justify-center gap-2">
                    {t('coupon.receive_coupon')}
                    <ChevronRight className="w-5 h-5" />
                  </span>
                </motion.button>
              </motion.div>
            )}

            {/* ============================================
                Step 1: 初来店確認
                ============================================ */}
            {surveyStep === 'first_visit' && (
              <motion.div
                key="first_visit"
                custom={slideDirection}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.3, ease: 'easeInOut' }}
                className="px-6 py-8"
              >
                <StepIndicator currentStep={0} totalSteps={2} />
                
                <div className="text-center mb-6">
                  <h3 
                    className="text-xl font-bold mb-2"
                    style={{ 
                      color: COLORS.ivory,
                      fontFamily: '"Cormorant Garamond", "Noto Serif JP", serif',
                    }}
                  >
                    {t('coupon.thank_you_visit')}
                  </h3>
                  <p 
                    className="text-sm"
                    style={{ color: COLORS.warmGray }}
                  >
                    {language === 'en' ? t('coupon.first_time_question') + storeName + '?' : storeName + t('coupon.first_time_question')}
                  </p>
                </div>

                <div className="space-y-3 mb-6">
                  <ChoiceButton
                    icon={<Sparkles className="w-6 h-6" />}
                    label={t('coupon.yes_first_time')}
                    sublabel={t('coupon.welcome_first_time')}
                    isSelected={surveyAnswers.isFirstVisit === true}
                    onClick={() => handleFirstVisitAnswer(true)}
                    delay={0.1}
                  />
                  <ChoiceButton
                    icon={<Heart className="w-6 h-6" />}
                    label={t('coupon.no_been_before')}
                    sublabel={t('coupon.thank_repeat_customer')}
                    isSelected={surveyAnswers.isFirstVisit === false}
                    onClick={() => handleFirstVisitAnswer(false)}
                    delay={0.2}
                  />
                </div>

                {/* ナビゲーション */}
                <div className="flex gap-3">
                  <motion.button
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handlePrevStep}
                    className="flex-1 py-3.5 rounded-xl font-medium tracking-wider transition-all flex items-center justify-center gap-2"
                    style={{
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      color: COLORS.warmGray,
                    }}
                  >
                    <ChevronLeft className="w-4 h-4" />
                    {t('coupon.back')}
                  </motion.button>
                  <motion.button
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    whileHover={{ scale: surveyAnswers.isFirstVisit !== null ? 1.02 : 1 }}
                    whileTap={{ scale: surveyAnswers.isFirstVisit !== null ? 0.98 : 1 }}
                    onClick={handleNextStep}
                    disabled={surveyAnswers.isFirstVisit === null}
                    className="flex-1 py-3.5 rounded-xl font-medium tracking-wider transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{
                      background: surveyAnswers.isFirstVisit !== null 
                        ? COLORS.goldGradient 
                        : 'rgba(255, 255, 255, 0.1)',
                      color: surveyAnswers.isFirstVisit !== null 
                        ? COLORS.deepNavy 
                        : COLORS.warmGray,
                      boxShadow: surveyAnswers.isFirstVisit !== null 
                        ? '0 10px 30px rgba(201, 168, 108, 0.3)' 
                        : 'none',
                    }}
                  >
                    {t('coupon.next')}
                    <ChevronRight className="w-4 h-4" />
                  </motion.button>
                </div>
              </motion.div>
            )}

            {/* ============================================
                Step 2: 居住地確認
                ============================================ */}
            {surveyStep === 'residence' && (
              <motion.div
                key="residence"
                custom={slideDirection}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.3, ease: 'easeInOut' }}
                className="px-6 py-8"
              >
                <StepIndicator currentStep={1} totalSteps={2} />
                
                <div className="text-center mb-6">
                  <h3 
                    className="text-xl font-bold mb-2"
                    style={{ 
                      color: COLORS.ivory,
                      fontFamily: '"Cormorant Garamond", "Noto Serif JP", serif',
                    }}
                  >
                    {t('coupon.residence_question')}
                  </h3>
                  <p 
                    className="text-sm"
                    style={{ color: COLORS.warmGray }}
                  >
                    {t('coupon.local_question')}
                  </p>
                </div>

                <div className="space-y-3 mb-6">
                  <ChoiceButton
                    icon={<Home className="w-6 h-6" />}
                    label={t('coupon.live_locally')}
                    sublabel={t('coupon.thank_local')}
                    isSelected={surveyAnswers.isLocalResident === true}
                    onClick={() => handleResidenceAnswer(true)}
                    delay={0.1}
                  />
                  <ChoiceButton
                    icon={<Plane className="w-6 h-6" />}
                    label={t('coupon.from_outside')}
                    sublabel={t('coupon.thank_visitor')}
                    isSelected={surveyAnswers.isLocalResident === false}
                    onClick={() => handleResidenceAnswer(false)}
                    delay={0.2}
                  />
                </div>

                {/* ナビゲーション */}
                <div className="flex gap-3">
                  <motion.button
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handlePrevStep}
                    className="flex-1 py-3.5 rounded-xl font-medium tracking-wider transition-all flex items-center justify-center gap-2"
                    style={{
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      color: COLORS.warmGray,
                    }}
                  >
                    <ChevronLeft className="w-4 h-4" />
                    {t('coupon.back')}
                  </motion.button>
                  <motion.button
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    whileHover={{ scale: surveyAnswers.isLocalResident !== null ? 1.02 : 1 }}
                    whileTap={{ scale: surveyAnswers.isLocalResident !== null ? 0.98 : 1 }}
                    onClick={handleNextStep}
                    disabled={surveyAnswers.isLocalResident === null || isRecording}
                    className="flex-1 py-3.5 rounded-xl font-medium tracking-wider transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{
                      background: surveyAnswers.isLocalResident !== null 
                        ? COLORS.goldGradient 
                        : 'rgba(255, 255, 255, 0.1)',
                      color: surveyAnswers.isLocalResident !== null 
                        ? COLORS.deepNavy 
                        : COLORS.warmGray,
                      boxShadow: surveyAnswers.isLocalResident !== null 
                        ? '0 10px 30px rgba(201, 168, 108, 0.3)' 
                        : 'none',
                    }}
                  >
                    {isRecording ? (
                      <>
                        <motion.div
                          className="w-4 h-4 border-2 rounded-full"
                          style={{ borderColor: `${COLORS.deepNavy} transparent` }}
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        />
                        {t('coupon.processing')}
                      </>
                    ) : (
                      <>
                        {t('coupon.show_coupon')}
                        <Gift className="w-4 h-4" />
                      </>
                    )}
                  </motion.button>
                </div>
              </motion.div>
            )}

            {/* ============================================
                Step 3: クーポン表示（使用前）
                ============================================ */}
            {surveyStep === 'complete' && !isUsed && (
              <motion.div
                key="coupon"
                custom={slideDirection}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.3, ease: 'easeInOut' }}
              >
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
                    {coupon.coupon_title || t('coupon.default_coupon_title')}
                  </h2>
                  <p 
                    className="text-sm tracking-wide"
                    style={{ color: COLORS.warmGray }}
                  >
                    {storeName}
                  </p>

                  <GoldDivider />

                  {/* 割引表示 */}
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
                    <div className="flex items-center gap-4 mb-4">
                      <div className="flex-1 h-px" style={{ background: `linear-gradient(to right, transparent, ${COLORS.champagneGold}50, transparent)` }} />
                      <div className="w-2 h-2 rotate-45" style={{ backgroundColor: COLORS.champagneGold }} />
                      <div className="flex-1 h-px" style={{ background: `linear-gradient(to right, transparent, ${COLORS.champagneGold}50, transparent)` }} />
                    </div>

                    <p 
                      className="text-4xl font-bold tracking-tight"
                      style={{ 
                        color: COLORS.champagneGold,
                        textShadow: '0 0 30px rgba(201, 168, 108, 0.3)',
                      }}
                    >
                      {coupon.coupon_discount_type === 'free_item' 
                        ? t('coupon.free_item')
                        : formatDiscountValue(
                            coupon.coupon_discount_type as CouponDiscountType,
                            coupon.coupon_discount_value || 0
                          )
                      }
                    </p>

                    <div className="flex items-center gap-4 mt-4">
                      <div className="flex-1 h-px" style={{ background: `linear-gradient(to right, transparent, ${COLORS.champagneGold}50, transparent)` }} />
                      <div className="w-2 h-2 rotate-45" style={{ backgroundColor: COLORS.champagneGold }} />
                      <div className="flex-1 h-px" style={{ background: `linear-gradient(to right, transparent, ${COLORS.champagneGold}50, transparent)` }} />
                    </div>
                  </motion.div>
                </div>

                {/* コンテンツ */}
                <div className="relative space-y-4 px-6 pb-6">
                  {/* クーポン画像 */}
                  {coupon.coupon_image_url && (
                    <div 
                      className="rounded-xl overflow-hidden"
                      style={{ border: `1px solid rgba(201, 168, 108, 0.2)` }}
                    >
                      <img
                        src={coupon.coupon_image_url}
                        alt={t('coupon.coupon_image_alt')}
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
                      <p className="font-medium text-sm mb-2" style={{ color: COLORS.paleGold }}>
                        {t('coupon.detail')}
                      </p>
                      <p className="text-sm leading-relaxed" style={{ color: COLORS.platinum }}>
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
                        <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: COLORS.champagneGold }} />
                        <div>
                          <p className="font-medium text-sm mb-1" style={{ color: COLORS.champagneGold }}>
                            {t('coupon.conditions')}
                          </p>
                          <p className="text-sm leading-relaxed" style={{ color: COLORS.platinum }}>
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
                      <span className="text-sm font-medium" style={{ color: COLORS.warmGray }}>
                        {t('coupon.expiry')}
                      </span>
                    </div>
                    <div className="text-right">
                      {coupon.coupon_expiry_date ? (
                        <>
                          <p className="text-sm font-medium" style={{ color: COLORS.ivory }}>
                            {formatDate(coupon.coupon_expiry_date)}{language === 'ja' ? t('coupon.until') : ''}
                          </p>
                          {remainingDays !== null && remainingDays > 0 && remainingDays <= 7 && (
                            <p className="text-xs font-medium mt-0.5" style={{ color: COLORS.champagneGold }}>
                              {t('coupon.remaining_days').replace('{days}', String(remainingDays))}
                            </p>
                          )}
                        </>
                      ) : (
                        <p className="text-sm" style={{ color: COLORS.warmGray }}>{t('coupon.no_expiry')}</p>
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
                        <code className="text-2xl font-bold tracking-widest" style={{ color: COLORS.paleGold }}>
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
                          aria-label={copied ? t('coupon.copied_label') : t('coupon.copy_code')}
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

                  {/* バーコード */}
                  {coupon.coupon_barcode_url && (
                    <div className="text-center">
                      <p className="text-xs font-medium mb-3" style={{ color: COLORS.warmGray }}>
                        {t('coupon.show_to_staff')}
                      </p>
                      <div className="inline-block p-4 rounded-xl" style={{ backgroundColor: COLORS.ivory }}>
                        <img
                          src={coupon.coupon_barcode_url}
                          alt={t('coupon.barcode_alt')}
                          className="max-w-[200px] mx-auto"
                        />
                      </div>
                    </div>
                  )}

                  {/* 残り枚数 */}
                  {coupon.coupon_max_uses && (
                    <div className="text-center text-sm">
                      <span className="font-medium" style={{ color: COLORS.champagneGold }}>
                        {t('coupon.remaining_count')
                          .replace('{remaining}', String(coupon.coupon_max_uses - (coupon.coupon_current_uses || 0)))
                          .replace('{total}', String(coupon.coupon_max_uses))}
                      </span>
                    </div>
                  )}

                  {/* 無効な場合 */}
                  {!isValid && (
                    <div 
                      className="rounded-xl p-4 text-center"
                      style={{
                        backgroundColor: 'rgba(239, 68, 68, 0.15)',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                      }}
                    >
                      <p className="font-medium text-sm" style={{ color: '#f87171' }}>
                        {t('coupon.unavailable')}
                      </p>
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
                      <div 
                        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                        style={{
                          background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.3) 50%, transparent 100%)',
                        }}
                      />
                      <span className="relative flex items-center justify-center gap-2">
                        <Gift className="w-5 h-5" />
                        {t('coupon.use_coupon')}
                      </span>
                    </motion.button>
                  )}
                </div>
              </motion.div>
            )}

            {/* ============================================
                Step 4: 使用後画面
                ============================================ */}
            {surveyStep === 'complete' && isUsed && (
              <motion.div
                key="used"
                custom={slideDirection}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.3, ease: 'easeInOut' }}
                className="px-6 py-8"
              >
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
                    {t('coupon.thank_you')}
                  </motion.h2>
                  
                  <motion.p
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="text-sm"
                    style={{ color: COLORS.platinum }}
                  >
                    {t('coupon.enjoy_time')}
                  </motion.p>
                </motion.div>

                {/* 店員に見せてください案内 */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.35 }}
                  className="mb-4 rounded-xl p-4 text-center"
                  style={{
                    background: 'linear-gradient(135deg, rgba(201, 168, 108, 0.2) 0%, rgba(184, 149, 110, 0.15) 100%)',
                    border: '2px solid rgba(201, 168, 108, 0.4)',
                  }}
                >
                  <p 
                    className="font-bold text-base"
                    style={{ color: COLORS.champagneGold }}
                  >
                    {t('coupon.show_to_staff_payment')}
                  </p>
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
                        <h3 className="font-bold text-sm mb-1" style={{ color: COLORS.champagneGold }}>
                          {t('coupon.extra_bonus')}
                        </h3>
                        <p className="text-xs leading-relaxed" style={{ color: COLORS.platinum }}>
                          {t('coupon.bonus_instruction')}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {/* Instagram導線（URLがある場合のみ表示） */}
                    {instagramUrl && (
                      <ActionCard
                        icon={<Instagram className="w-6 h-6 text-white" />}
                        title={t('coupon.follow_instagram')}
                        description={t('coupon.instagram_desc')}
                        buttonText={t('coupon.open_instagram')}
                        href={instagramUrl}
                        gradientStyle={COLORS.instagramGradient}
                        delay={0}
                      />
                    )}

                    {/* Googleレビュー導線（常に表示、placeIdがなければ検索URLにフォールバック） */}
                    <ActionCard
                      icon={<Star className="w-6 h-6 text-white" />}
                      title={t('coupon.write_google_review')}
                      description={t('coupon.review_desc')}
                      buttonText={t('coupon.write_review')}
                      href={googlePlaceId ? generateGoogleReviewUrl(googlePlaceId) : `https://www.google.com/maps/search/${encodeURIComponent(storeName)}`}
                      gradientStyle={COLORS.googleGradient}
                      delay={instagramUrl ? 0.1 : 0}
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
                  {t('coupon.close')}
                </motion.button>

                {/* 追加特典ボタン */}
                <motion.button
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7 }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setShowAdditionalBonus(true)}
                  className="w-full py-4 mt-3 rounded-xl font-medium tracking-wider transition-all flex items-center justify-center gap-2"
                  style={{
                    background: COLORS.goldGradient,
                    color: COLORS.deepNavy,
                    boxShadow: '0 8px 25px rgba(201, 168, 108, 0.35)',
                  }}
                >
                  <Sparkles className="w-5 h-5" />
                  {t('coupon.additional_bonus')}
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>
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
            aria-label={t('coupon.close')}
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
              {t('coupon.confirm_use')}
            </h3>
            <p className="text-sm mb-6" style={{ color: COLORS.warmGray }}>
              {t('coupon.cannot_undo')}
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
              {t('coupon.cancel')}
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
              {isUsing ? t('coupon.processing') : t('coupon.confirm')}
            </motion.button>
          </div>
        </div>
      </CustomModal>

      {/* 追加特典モーダル */}
      <CustomModal
        isOpen={showAdditionalBonus}
        onClose={() => setShowAdditionalBonus(false)}
        title=""
        description=""
        showCloseButton={false}
      >
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
          <motion.button
            whileHover={{ scale: 1.1, opacity: 1 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowAdditionalBonus(false)}
            className="absolute top-4 right-4 z-20 p-2 rounded-full transition-colors"
            style={{ 
              color: COLORS.warmGray,
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
            }}
            aria-label={t('coupon.close')}
          >
            <X className="w-4 h-4" />
          </motion.button>

          <div className="relative text-center pt-2">
            <div 
              className="inline-flex items-center justify-center w-14 h-14 rounded-full mb-4"
              style={{
                background: COLORS.goldGradient,
                boxShadow: '0 10px 40px rgba(201, 168, 108, 0.4)',
              }}
            >
              <Sparkles className="w-7 h-7" style={{ color: COLORS.deepNavy }} />
            </div>
            <h3 
              className="text-xl font-bold mb-2"
              style={{ color: COLORS.champagneGold }}
            >
              {t('coupon.additional_bonus')}
            </h3>
            <p className="text-sm mb-6" style={{ color: COLORS.platinum }}>
              {t('coupon.show_to_staff_payment')}
            </p>

            {/* 追加特典内容 */}
            <div 
              className="rounded-xl p-4 mb-6 text-left"
              style={{
                backgroundColor: 'rgba(201, 168, 108, 0.1)',
                border: '1px solid rgba(201, 168, 108, 0.3)',
              }}
            >
              {coupon.coupon_additional_bonus ? (
                <p 
                  className="font-medium whitespace-pre-wrap"
                  style={{ color: COLORS.ivory }}
                >
                  {coupon.coupon_additional_bonus}
                </p>
              ) : (
                <p 
                  className="text-sm italic"
                  style={{ color: COLORS.warmGray }}
                >
                  {t('coupon.no_additional_bonus')}
                </p>
              )}
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowAdditionalBonus(false)}
              className="w-full py-3.5 rounded-xl font-medium tracking-wider transition-all"
              style={{
                background: COLORS.goldGradient,
                color: COLORS.deepNavy,
                boxShadow: '0 10px 30px rgba(201, 168, 108, 0.3)',
              }}
            >
              {t('coupon.close')}
            </motion.button>
          </div>
        </div>
      </CustomModal>
    </>
  );
}

// ============================================
// クーポンバッジコンポーネント
// ============================================

interface CouponBadgeProps {
  coupon: Partial<CouponData>;
  onClick?: () => void;
  size?: 'sm' | 'md' | 'lg';
}

export function CouponBadge({ coupon, onClick, size = 'md' }: CouponBadgeProps) {
  const { t } = useLanguage();
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
      className={`inline-flex items-center gap-1.5 font-medium rounded-full ${sizeClasses[size]}`}
      style={{
        background: COLORS.goldGradient,
        color: COLORS.deepNavy,
        boxShadow: '0 4px 15px rgba(201, 168, 108, 0.35)',
      }}
    >
      <Ticket className={size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'} />
      <span>
        {coupon.coupon_discount_type === 'free_item'
          ? t('coupon.free')
          : formatDiscountValue(
              coupon.coupon_discount_type as CouponDiscountType,
              coupon.coupon_discount_value || 0
            )
        }
      </span>
    </motion.button>
  );
}