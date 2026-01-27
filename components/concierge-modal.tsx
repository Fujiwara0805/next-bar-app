/**
 * ============================================
 * ファイルパス: components/concierge-modal.tsx
 * 
 * 機能: 超VIP仕様コンシェルジュモーダル
 *       リッツ・カールトン / アマン級の洗練されたUI
 *       上位3件のみを厳選提案
 * 
 * デザインコンセプト:
 *   - 深みのあるネイビー × シャンパンゴールド
 *   - 贅沢な余白と洗練されたタイポグラフィ
 *   - 滑らかなマイクロインタラクション
 *   - 大理石のような質感表現
 * ============================================
 */

'use client';

import { useState, useCallback, useEffect, CSSProperties, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight, ChevronLeft, RotateCcw } from 'lucide-react';
import { useLanguage } from '@/lib/i18n/context';

// ============================================
// カラーパレット定義
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
};

// ============================================
// 質問データ型定義
// ============================================
interface QuestionOption {
  label: string;
  value: string;
  facilities: string[];
  description?: string;
}

interface Question {
  id: string;
  question: string;
  subtext?: string;
  options: [QuestionOption, QuestionOption];
}

// ============================================
// 質問データを生成する関数（翻訳対応）
// ============================================
const getQuestions = (t: (key: string) => string): Question[] => [
  {
    id: 'gender',
    question: t('concierge.q_gender'),
    subtext: t('concierge.q_gender_sub'),
    options: [
      { 
        label: t('concierge.q_gender_male'), 
        value: 'male', 
        facilities: [],
        description: t('concierge.q_gender_male_desc')
      },
      { 
        label: t('concierge.q_gender_female'), 
        value: 'female', 
        facilities: ['女性客多め', '女性一人でも安心', '女性スタッフ在籍', 'レディースデー有'],
        description: t('concierge.q_gender_female_desc')
      },
    ]
  },
  {
    id: 'visit_type',
    question: t('concierge.q_visit'),
    subtext: t('concierge.q_visit_sub'),
    options: [
      { 
        label: t('concierge.q_visit_local'), 
        value: 'local', 
        facilities: [],
        description: t('concierge.q_visit_local_desc')
      },
      { 
        label: t('concierge.q_visit_tourist'), 
        value: 'tourist', 
        facilities: ['観光客歓迎', '地元の味', '方言OK'],
        description: t('concierge.q_visit_tourist_desc')
      },
    ]
  },
  {
    id: 'party_size',
    question: t('concierge.q_party'),
    subtext: t('concierge.q_party_sub'),
    options: [
      { 
        label: t('concierge.q_party_solo'), 
        value: 'solo', 
        facilities: ['一人客歓迎', 'おひとり様大歓迎', 'カウンター充実'],
        description: t('concierge.q_party_solo_desc')
      },
      { 
        label: t('concierge.q_party_group'), 
        value: 'group', 
        facilities: ['グループ歓迎', '個室あり', 'テーブル席あり'],
        description: t('concierge.q_party_group_desc')
      },
    ]
  },
  {
    id: 'experience',
    question: t('concierge.q_experience'),
    subtext: t('concierge.q_experience_sub'),
    options: [
      { 
        label: t('concierge.q_experience_beginner'), 
        value: 'beginner', 
        facilities: ['初めての方歓迎', '常連さんが優しい', 'スタッフが親切'],
        description: t('concierge.q_experience_beginner_desc')
      },
      { 
        label: t('concierge.q_experience_experienced'), 
        value: 'experienced', 
        facilities: [],
        description: t('concierge.q_experience_experienced_desc')
      },
    ]
  },
  {
    id: 'budget',
    question: t('concierge.q_budget'),
    subtext: t('concierge.q_budget_sub'),
    options: [
      { 
        label: t('concierge.q_budget_no_charge'), 
        value: 'no_charge', 
        facilities: ['チャージなし', '席料なし', 'お通しなし', '明朗会計'],
        description: t('concierge.q_budget_no_charge_desc')
      },
      { 
        label: t('concierge.q_budget_charge_ok'), 
        value: 'charge_ok', 
        facilities: [],
        description: t('concierge.q_budget_charge_ok_desc')
      },
    ]
  },
  {
    id: 'atmosphere',
    question: t('concierge.q_atmosphere'),
    subtext: t('concierge.q_atmosphere_sub'),
    options: [
      { 
        label: t('concierge.q_atmosphere_quiet'), 
        value: 'quiet', 
        facilities: ['落ち着いた雰囲気', '静か', '大人の空間', 'ジャズが流れる'],
        description: t('concierge.q_atmosphere_quiet_desc')
      },
      { 
        label: t('concierge.q_atmosphere_lively'), 
        value: 'lively', 
        facilities: ['賑やか', 'スポーツ観戦可', 'カラオケあり', 'ダーツあり'],
        description: t('concierge.q_atmosphere_lively_desc')
      },
    ]
  },
  {
    id: 'drink_preference',
    question: t('concierge.q_drink'),
    subtext: t('concierge.q_drink_sub'),
    options: [
      { 
        label: t('concierge.q_drink_cocktail'), 
        value: 'cocktail', 
        facilities: ['カクテル充実', 'ウイスキー豊富', 'ワイン充実', 'オーセンティックバー'],
        description: t('concierge.q_drink_cocktail_desc')
      },
      { 
        label: t('concierge.q_drink_japanese'), 
        value: 'japanese', 
        facilities: ['日本酒豊富', '焼酎豊富', '地酒あり', '和風'],
        description: t('concierge.q_drink_japanese_desc')
      },
    ]
  },
];

// ============================================
// コンポーネントProps
// ============================================
interface ConciergeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (selectedFacilities: string[]) => void;
}

// ============================================
// 装飾コンポーネント
// ============================================
const GoldDivider = () => (
  <div className="flex items-center justify-center gap-4 my-6">
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

// LuxuryIconのProps型定義（styleプロパティを含む）
interface LuxuryIconProps {
  className?: string;
  style?: CSSProperties;
}

const LuxuryIcon = ({ className, style }: LuxuryIconProps) => (
  <svg 
    className={className}
    style={style}
    viewBox="0 0 24 24" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg"
  >
    <path 
      d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z" 
      stroke="currentColor" 
      strokeWidth="1.5" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    />
  </svg>
);

// ============================================
// メインコンポーネント
// ============================================
export function ConciergeModal({ isOpen, onClose, onComplete }: ConciergeModalProps) {
  const { t } = useLanguage();
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, QuestionOption>>({});
  const [isCompleting, setIsCompleting] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [selectedFacilities, setSelectedFacilities] = useState<string[]>([]);

  // 翻訳対応した質問を生成
  const questions = useMemo(() => getQuestions(t), [t]);
  
  const currentQuestion = questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;

  // 回答処理
  const handleAnswer = useCallback((option: QuestionOption) => {
    const newAnswers = {
      ...answers,
      [currentQuestion.id]: option
    };
    setAnswers(newAnswers);

    // 最後の質問の場合
    if (currentQuestionIndex === questions.length - 1) {
      setIsCompleting(true);
      
      // 選択されたfacilitiesを収集
      const allFacilities = Object.values(newAnswers).flatMap(a => a.facilities);
      const uniqueFacilities = Array.from(new Set(allFacilities));
      setSelectedFacilities(uniqueFacilities);
      
      // 演出のための遅延
      setTimeout(() => {
        setIsCompleting(false);
        setShowResults(true);
      }, 2000);
    } else {
      // 次の質問へ（優雅な遅延）
      setTimeout(() => {
        setCurrentQuestionIndex(prev => prev + 1);
      }, 400);
    }
  }, [currentQuestion, currentQuestionIndex, answers]);

  // 戻る処理
  const handleBack = useCallback(() => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  }, [currentQuestionIndex]);

  // リセット処理
  const resetModal = useCallback(() => {
    setCurrentQuestionIndex(0);
    setAnswers({});
    setIsCompleting(false);
    setShowResults(false);
    setSelectedFacilities([]);
  }, []);

  // クローズ処理
  const handleClose = useCallback(() => {
    resetModal();
    onClose();
  }, [onClose, resetModal]);

  // 結果確定処理
  const handleConfirmResults = useCallback(() => {
    onComplete(selectedFacilities);
    resetModal();
  }, [selectedFacilities, onComplete, resetModal]);

  // ESCキーで閉じる
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleEsc);
    }
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, handleClose]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {/* オーバーレイ */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.4 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
        style={{ 
          backgroundColor: 'rgba(10, 22, 40, 0.92)',
          backdropFilter: 'blur(8px)',
        }}
        onClick={handleClose}
      >
        {/* モーダル本体 */}
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 30, scale: 0.95 }}
          transition={{ 
            type: 'spring', 
            damping: 30, 
            stiffness: 200,
            duration: 0.5
          }}
          className="w-full max-w-lg relative"
          onClick={(e) => e.stopPropagation()}
        >
          {/* 装飾的なゴールドボーダー */}
          <div 
            className="absolute inset-0 rounded-2xl opacity-30"
            style={{
              background: COLORS.goldGradient,
              padding: '1px',
            }}
          />
          
          {/* メインコンテナ */}
          <div
            className="relative rounded-2xl overflow-hidden"
            style={{
              background: COLORS.luxuryGradient,
              boxShadow: `
                0 50px 100px rgba(0, 0, 0, 0.5),
                0 0 0 1px rgba(201, 168, 108, 0.15),
                inset 0 1px 0 rgba(255, 255, 255, 0.05)
              `,
            }}
          >
            {/* 大理石風テクスチャオーバーレイ */}
            <div 
              className="absolute inset-0 opacity-50 pointer-events-none"
              style={{ background: COLORS.marbleTexture }}
            />

            {/* ヘッダー */}
            <div className="relative px-8 pt-8 pb-4">
              {/* クローズボタン */}
              <motion.button
                whileHover={{ scale: 1.1, opacity: 1 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleClose}
                className="absolute top-6 right-6 p-2 rounded-full transition-colors"
                style={{ 
                  color: COLORS.warmGray,
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                }}
              >
                <X className="w-5 h-5" />
              </motion.button>

              {/* タイトル */}
              <div className="text-center pr-8">
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <LuxuryIcon 
                    className="w-6 h-6 mx-auto mb-3"
                    style={{ color: COLORS.champagneGold }}
                  />
                  <h2 
                    className="text-xl tracking-widest font-light"
                    style={{ 
                      color: COLORS.ivory,
                      fontFamily: '"Cormorant Garamond", "Noto Serif JP", serif',
                    }}
                  >
                    {t('concierge.title')}
                  </h2>
                  <p 
                    className="text-xs tracking-wider mt-1 uppercase"
                    style={{ color: COLORS.champagneGold }}
                  >
                    {t('concierge.subtitle')}
                  </p>
                </motion.div>
              </div>

              <GoldDivider />

              {/* プログレスインジケーター */}
              {!showResults && !isCompleting && (
                <div className="mt-2">
                  <div className="flex justify-between items-center mb-2">
                    <span 
                      className="text-xs tracking-wider"
                      style={{ color: COLORS.warmGray }}
                    >
                      {t('concierge.question')}
                    </span>
                    <span 
                      className="text-xs tracking-wider"
                      style={{ color: COLORS.champagneGold }}
                    >
                      {currentQuestionIndex + 1} / {questions.length}
                    </span>
                  </div>
                  <div 
                    className="h-0.5 rounded-full overflow-hidden"
                    style={{ backgroundColor: 'rgba(201, 168, 108, 0.2)' }}
                  >
                    <motion.div
                      className="h-full rounded-full"
                      style={{ backgroundColor: COLORS.champagneGold }}
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      transition={{ duration: 0.5, ease: 'easeOut' }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* コンテンツエリア */}
            <div className="relative px-8 pb-8">
              {isCompleting ? (
                // ローディングアニメーション
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="py-16 text-center"
                >
                  <motion.div
                    animate={{ 
                      rotate: 360,
                      scale: [1, 1.1, 1],
                    }}
                    transition={{ 
                      rotate: { duration: 3, repeat: Infinity, ease: 'linear' },
                      scale: { duration: 1.5, repeat: Infinity, ease: 'easeInOut' },
                    }}
                    className="w-16 h-16 mx-auto mb-8"
                  >
                    <LuxuryIcon 
                      className="w-full h-full"
                      style={{ color: COLORS.champagneGold }}
                    />
                  </motion.div>
                  <p 
                    className="text-lg tracking-wide font-light"
                    style={{ 
                      color: COLORS.ivory,
                      fontFamily: '"Cormorant Garamond", "Noto Serif JP", serif',
                    }}
                  >
                    {t('concierge.loading_title')}
                  </p>
                  <p 
                    className="text-lg tracking-wide font-light mt-1"
                    style={{ 
                      color: COLORS.ivory,
                      fontFamily: '"Cormorant Garamond", "Noto Serif JP", serif',
                    }}
                  >
                    {t('concierge.loading_subtitle')}
                  </p>
                </motion.div>
              ) : showResults ? (
                // 結果表示
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                  className="py-6"
                >
                  <div className="text-center mb-8">
                    <LuxuryIcon 
                      className="w-8 h-8 mx-auto mb-4"
                      style={{ color: COLORS.champagneGold }}
                    />
                    <h3 
                      className="text-xl tracking-wide font-light mb-2"
                      style={{ 
                        color: COLORS.ivory,
                        fontFamily: '"Cormorant Garamond", "Noto Serif JP", serif',
                      }}
                    >
                      {t('concierge.result_title')}
                    </h3>
                    <p 
                      className="text-sm leading-relaxed"
                      style={{ color: COLORS.warmGray }}
                    >
                      {t('concierge.result_intro')}<br />
                      <span style={{ color: COLORS.champagneGold }}>{t('concierge.result_highlight')}</span>
                      {t('concierge.result_outro')}
                    </p>
                  </div>

                  {/* 選択されたプリファレンスサマリー */}
                  <div 
                    className="rounded-xl p-5 mb-8"
                    style={{ 
                      backgroundColor: 'rgba(201, 168, 108, 0.08)',
                      border: '1px solid rgba(201, 168, 108, 0.15)',
                    }}
                  >
                    <p 
                      className="text-xs tracking-wider uppercase mb-3"
                      style={{ color: COLORS.champagneGold }}
                    >
                      {t('concierge.your_preferences')}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {Object.values(answers).slice(0, 4).map((answer, idx) => (
                        <span 
                          key={idx}
                          className="text-xs px-3 py-1.5 rounded-full"
                          style={{ 
                            backgroundColor: 'rgba(255, 255, 255, 0.05)',
                            color: COLORS.paleGold,
                            border: '1px solid rgba(201, 168, 108, 0.2)',
                          }}
                        >
                          {answer.label}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* 確定ボタン */}
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleConfirmResults}
                    className="w-full py-4 rounded-xl font-medium tracking-wider transition-all"
                    style={{
                      background: COLORS.goldGradient,
                      color: COLORS.deepNavy,
                      boxShadow: '0 10px 30px rgba(201, 168, 108, 0.3)',
                    }}
                  >
                    {t('concierge.view_stores')}
                  </motion.button>

                  <button
                    onClick={resetModal}
                    className="w-full mt-4 py-3 text-sm tracking-wider transition-colors"
                    style={{ color: COLORS.warmGray }}
                  >
                    {t('concierge.restart')}
                  </button>
                </motion.div>
              ) : (
                // 質問表示
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentQuestion.id}
                    initial={{ opacity: 0, x: 30 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -30 }}
                    transition={{ duration: 0.3 }}
                    className="py-4"
                  >
                    {/* 質問テキスト */}
                    <div className="text-center mb-8">
                      <h3 
                        className="text-2xl tracking-wide font-light mb-2"
                        style={{ 
                          color: COLORS.ivory,
                          fontFamily: '"Cormorant Garamond", "Noto Serif JP", serif',
                        }}
                      >
                        {currentQuestion.question}
                      </h3>
                      {currentQuestion.subtext && (
                        <p 
                          className="text-sm"
                          style={{ color: COLORS.warmGray }}
                        >
                          {currentQuestion.subtext}
                        </p>
                      )}
                    </div>

                    {/* 選択肢 */}
                    <div className="space-y-4">
                      {currentQuestion.options.map((option) => (
                        <motion.button
                          key={option.value}
                          whileHover={{ 
                            scale: 1.02,
                            backgroundColor: 'rgba(201, 168, 108, 0.12)',
                          }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => handleAnswer(option)}
                          className="w-full p-5 rounded-xl text-left transition-all group"
                          style={{ 
                            backgroundColor: answers[currentQuestion.id]?.value === option.value
                              ? 'rgba(201, 168, 108, 0.15)'
                              : 'rgba(255, 255, 255, 0.03)',
                            border: answers[currentQuestion.id]?.value === option.value
                              ? `1px solid ${COLORS.champagneGold}`
                              : '1px solid rgba(255, 255, 255, 0.08)',
                          }}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <span 
                                className="text-lg font-light tracking-wide block"
                                style={{ 
                                  color: COLORS.ivory,
                                  fontFamily: '"Cormorant Garamond", "Noto Serif JP", serif',
                                }}
                              >
                                {option.label}
                              </span>
                              {option.description && (
                                <span 
                                  className="text-xs mt-1 block"
                                  style={{ color: COLORS.warmGray }}
                                >
                                  {option.description}
                                </span>
                              )}
                            </div>
                            <ChevronRight 
                              className="w-5 h-5 opacity-0 group-hover:opacity-100 transition-opacity"
                              style={{ color: COLORS.champagneGold }}
                            />
                          </div>
                        </motion.button>
                      ))}
                    </div>
                  </motion.div>
                </AnimatePresence>
              )}
            </div>

            {/* フッターナビゲーション */}
            {!isCompleting && !showResults && (
              <div 
                className="relative px-8 py-5 flex items-center justify-between"
                style={{ 
                  borderTop: '1px solid rgba(201, 168, 108, 0.1)',
                  backgroundColor: 'rgba(0, 0, 0, 0.2)',
                }}
              >
                <motion.button
                  whileHover={{ x: -2 }}
                  onClick={handleBack}
                  disabled={currentQuestionIndex === 0}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg transition-colors disabled:opacity-30"
                  style={{ color: COLORS.warmGray }}
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span className="text-sm tracking-wider">{t('concierge.back')}</span>
                </motion.button>

                <motion.button
                  whileHover={{ rotate: -180 }}
                  transition={{ duration: 0.3 }}
                  onClick={resetModal}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg transition-colors"
                  style={{ color: COLORS.warmGray }}
                >
                  <RotateCcw className="w-4 h-4" />
                  <span className="text-sm tracking-wider">{t('concierge.from_start')}</span>
                </motion.button>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}