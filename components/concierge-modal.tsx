/**
 * ============================================
 * ファイルパス: components/concierge-modal.tsx
 * 
 * 機能: コンシェルジュによる店舗提案モーダル
 *       6〜8問の2択質問でユーザーの好みを特定し、
 *       facilitiesベースで店舗をフィルタリング
 * ============================================
 */

'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight, ChevronLeft, Sparkles, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';

// 質問と回答の型定義
interface QuestionOption {
  label: string;
  value: string;
  facilities: string[];
  icon?: string;
}

interface Question {
  id: string;
  question: string;
  subtext?: string;
  options: [QuestionOption, QuestionOption];
}

// 質問データ
const questions: Question[] = [
  {
    id: 'gender',
    question: 'あなたの性別は？',
    subtext: '性別に合わせたおすすめをご案内します',
    options: [
      { 
        label: '男性', 
        value: 'male', 
        facilities: [],
        icon: '👨'
      },
      { 
        label: '女性', 
        value: 'female', 
        facilities: ['女性客多め', '女性一人でも安心', '女性スタッフ在籍', 'レディースデー有'],
        icon: '👩'
      },
    ]
  },
  {
    id: 'visit_type',
    question: 'どちらからお越しですか？',
    subtext: '地域に合わせた情報をご案内します',
    options: [
      { 
        label: '地元・県内', 
        value: 'local', 
        facilities: [],
        icon: '🏠'
      },
      { 
        label: '県外・観光', 
        value: 'tourist', 
        facilities: ['観光客歓迎', '地元の味', '方言OK'],
        icon: '✈️'
      },
    ]
  },
  {
    id: 'party_size',
    question: '何人で来店されますか？',
    subtext: '人数に合った席をご案内します',
    options: [
      { 
        label: 'おひとり', 
        value: 'solo', 
        facilities: ['一人客歓迎', 'おひとり様大歓迎', 'カウンター充実'],
        icon: '🧍'
      },
      { 
        label: '複数人', 
        value: 'group', 
        facilities: ['グループ歓迎', '個室あり', 'テーブル席あり'],
        icon: '👥'
      },
    ]
  },
  {
    id: 'experience',
    question: 'バーへの来店経験は？',
    subtext: '初心者の方も安心してお選びいただけます',
    options: [
      { 
        label: '初めて・あまりない', 
        value: 'beginner', 
        facilities: ['初めての方歓迎', '常連さんが優しい', 'スタッフが親切'],
        icon: '🌱'
      },
      { 
        label: 'よく行く', 
        value: 'experienced', 
        facilities: [],
        icon: '🍸'
      },
    ]
  },
  {
    id: 'budget',
    question: '料金体系の好みは？',
    subtext: '予算に合わせてご案内します',
    options: [
      { 
        label: 'チャージなしがいい', 
        value: 'no_charge', 
        facilities: ['チャージなし', '席料なし', 'お通しなし', '明朗会計'],
        icon: '💰'
      },
      { 
        label: 'チャージありでもOK', 
        value: 'charge_ok', 
        facilities: [],
        icon: '💳'
      },
    ]
  },
  {
    id: 'atmosphere',
    question: 'どんな雰囲気がお好みですか？',
    subtext: '理想の空間をお探しします',
    options: [
      { 
        label: '落ち着いた・静か', 
        value: 'quiet', 
        facilities: ['落ち着いた雰囲気', '静か', '大人の空間', 'ジャズが流れる'],
        icon: '🌙'
      },
      { 
        label: '賑やか・活気がある', 
        value: 'lively', 
        facilities: ['賑やか', 'スポーツ観戦可', 'カラオケあり', 'ダーツあり'],
        icon: '🎉'
      },
    ]
  },
  {
    id: 'drink_preference',
    question: 'お酒の好みは？',
    subtext: 'お好みのドリンクでお店を絞り込みます',
    options: [
      { 
        label: 'カクテル・洋酒', 
        value: 'cocktail', 
        facilities: ['カクテル充実', 'ウイスキー豊富', 'ワイン充実', 'オーセンティックバー'],
        icon: '🍹'
      },
      { 
        label: '日本酒・焼酎', 
        value: 'japanese', 
        facilities: ['日本酒豊富', '焼酎豊富', '地酒あり', '和風'],
        icon: '🍶'
      },
    ]
  },
];

interface ConciergeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (selectedFacilities: string[]) => void;
}

export function ConciergeModal({ isOpen, onClose, onComplete }: ConciergeModalProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, QuestionOption>>({});
  const [isCompleting, setIsCompleting] = useState(false);

  const currentQuestion = questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;

  const handleAnswer = useCallback((option: QuestionOption) => {
    setAnswers(prev => ({
      ...prev,
      [currentQuestion.id]: option
    }));

    // 最後の質問の場合
    if (currentQuestionIndex === questions.length - 1) {
      setIsCompleting(true);
      
      // 選択されたfacilitiesを収集
      const allFacilities = Object.values({
        ...answers,
        [currentQuestion.id]: option
      }).flatMap(a => a.facilities);
      
      // ユニークなfacilitiesのみ
      const uniqueFacilities = Array.from(new Set(allFacilities));
      
      // 少し遅延を入れて演出
      setTimeout(() => {
        onComplete(uniqueFacilities);
        resetModal();
      }, 1500);
    } else {
      // 次の質問へ
      setTimeout(() => {
        setCurrentQuestionIndex(prev => prev + 1);
      }, 300);
    }
  }, [currentQuestion, currentQuestionIndex, answers, onComplete]);

  const handleBack = useCallback(() => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  }, [currentQuestionIndex]);

  const resetModal = useCallback(() => {
    setCurrentQuestionIndex(0);
    setAnswers({});
    setIsCompleting(false);
  }, []);

  const handleClose = useCallback(() => {
    resetModal();
    onClose();
  }, [onClose, resetModal]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ backgroundColor: 'rgba(0, 0, 0, 0.8)' }}
        onClick={handleClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="w-full max-w-md"
          onClick={(e) => e.stopPropagation()}
        >
          <div
            className="rounded-2xl overflow-hidden"
            style={{
              background: 'linear-gradient(145deg, #1a1a1a 0%, #0d0d0d 100%)',
              border: '1px solid rgba(245, 158, 11, 0.2)',
              boxShadow: '0 25px 50px rgba(0, 0, 0, 0.5), 0 0 40px rgba(245, 158, 11, 0.1)',
            }}
          >
            {/* ヘッダー */}
            <div className="relative p-4 border-b border-white/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-amber-500" />
                  <h2 className="text-lg font-bold text-white">コンシェルジュ</h2>
                </div>
                <button
                  onClick={handleClose}
                  className="p-2 rounded-full hover:bg-white/10 transition-colors"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>
              
              {/* プログレスバー */}
              <div className="mt-3 h-1 bg-white/10 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-amber-500 to-amber-400"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-2">
                {currentQuestionIndex + 1} / {questions.length}
              </p>
            </div>

            {/* コンテンツ */}
            <div className="p-6">
              {isCompleting ? (
                // 完了アニメーション
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-8"
                >
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    className="w-16 h-16 mx-auto mb-4"
                  >
                    <Sparkles className="w-full h-full text-amber-500" />
                  </motion.div>
                  <p className="text-white font-bold text-lg">
                    あなたにぴったりのお店を探しています...
                  </p>
                </motion.div>
              ) : (
                // 質問
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentQuestion.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                  >
                    <h3 className="text-xl font-bold text-white mb-2">
                      {currentQuestion.question}
                    </h3>
                    {currentQuestion.subtext && (
                      <p className="text-sm text-gray-400 mb-6">
                        {currentQuestion.subtext}
                      </p>
                    )}

                    {/* 選択肢 */}
                    <div className="space-y-3">
                      {currentQuestion.options.map((option, index) => (
                        <motion.button
                          key={option.value}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => handleAnswer(option)}
                          className={`w-full p-4 rounded-xl text-left transition-all flex items-center gap-4 ${
                            answers[currentQuestion.id]?.value === option.value
                              ? 'bg-amber-500/20 border-amber-500'
                              : 'bg-white/5 border-white/10 hover:bg-white/10'
                          }`}
                          style={{ border: '1px solid' }}
                        >
                          <span className="text-3xl">{option.icon}</span>
                          <span className="text-white font-bold text-lg">
                            {option.label}
                          </span>
                          <ChevronRight className="w-5 h-5 text-gray-500 ml-auto" />
                        </motion.button>
                      ))}
                    </div>
                  </motion.div>
                </AnimatePresence>
              )}
            </div>

            {/* フッター */}
            {!isCompleting && (
              <div className="p-4 border-t border-white/10 flex items-center justify-between">
                <Button
                  variant="ghost"
                  onClick={handleBack}
                  disabled={currentQuestionIndex === 0}
                  className="text-gray-400 hover:text-white"
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  戻る
                </Button>
                
                <Button
                  variant="ghost"
                  onClick={resetModal}
                  className="text-gray-400 hover:text-white"
                >
                  <RotateCcw className="w-4 h-4 mr-1" />
                  最初から
                </Button>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}