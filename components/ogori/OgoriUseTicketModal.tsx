/**
 * ============================================
 * おごり酒 チケット利用モーダル
 *
 * Flow:
 *  1. 年齢確認（OgoriAgeCheckModal）
 *  2. ドリンク選択（OgoriDrinkList）
 *  3. 提示画面（スタッフに見せる）→ 確定
 *  4. 完了（紙吹雪風アニメーション）
 *
 * カラー: アプリ既存カラーパレット
 * ============================================
 */
'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Wine,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle,
  Check,
  PartyPopper,
  Ticket,
} from 'lucide-react';
import { CustomModal } from '@/components/ui/custom-modal';
import { Button } from '@/components/ui/button';
import { OgoriDrinkList, type OgoriDrinkRow } from './OgoriDrinkList';
import { OgoriAgeCheckModal } from './OgoriAgeCheckModal';
import { useLanguage } from '@/lib/i18n/context';

// アプリ共通カラー
const COLORS = {
  deepNavy: '#0A1628',
  midnightBlue: '#162447',
  royalNavy: '#1F4068',
  champagneGold: '#C9A86C',
  charcoal: '#2D3436',
  warmGray: '#636E72',
  ivory: '#FDFBF7',
  goldGradient: 'linear-gradient(135deg, #C9A86C 0%, #E8D5B7 50%, #B8956E 100%)',
  luxuryGradient: 'linear-gradient(165deg, #0A1628 0%, #162447 50%, #1F4068 100%)',
};

type UseTicketStep = 'age-check' | 'drink' | 'present' | 'success';

interface ConfettiParticle {
  id: number;
  x: number;
  delay: number;
  color: string;
  rotation: number;
}

interface OgoriUseTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  storeId: string;
  storeName: string;
  onTicketUsed: () => void;
}

/** 紙吹雪アニメーション（ゴールド系） */
function ConfettiAnimation() {
  const particles: ConfettiParticle[] = Array.from({ length: 24 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    delay: Math.random() * 0.5,
    color: ['#C9A86C', '#E8D5B7', '#B8956E', '#DFC98A', '#F5E6C8'][Math.floor(Math.random() * 5)],
    rotation: Math.random() * 360,
  }));

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute w-2 h-2 rounded-sm"
          style={{ left: `${p.x}%`, top: '-10px', backgroundColor: p.color }}
          initial={{ y: -10, rotate: p.rotation, opacity: 1 }}
          animate={{
            y: 400,
            rotate: p.rotation + 720,
            opacity: 0,
            x: [0, (Math.random() - 0.5) * 60, (Math.random() - 0.5) * 40],
          }}
          transition={{ duration: 2 + Math.random() * 1.5, delay: p.delay, ease: 'easeOut' }}
        />
      ))}
    </div>
  );
}

export function OgoriUseTicketModal({
  isOpen,
  onClose,
  storeId,
  storeName,
  onTicketUsed,
}: OgoriUseTicketModalProps) {
  const { t } = useLanguage();
  const [step, setStep] = useState<UseTicketStep>('age-check');
  const [drinks, setDrinks] = useState<OgoriDrinkRow[]>([]);
  const [selectedDrinkId, setSelectedDrinkId] = useState<string | null>(null);
  const [drinksLoading, setDrinksLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDrinks = useCallback(async () => {
    setDrinksLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/ogori/drinks/${storeId}`);
      if (!res.ok) throw new Error(t('store_detail.ogori_error_fetch_drinks'));
      const data = await res.json();
      setDrinks(data.drinks ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('store_detail.ogori_error_fetch_drinks'));
    } finally {
      setDrinksLoading(false);
    }
  }, [storeId, t]);

  useEffect(() => {
    if (isOpen) {
      setStep('age-check');
      setSelectedDrinkId(null);
      setError(null);
    }
  }, [isOpen]);

  useEffect(() => {
    if (step === 'drink') fetchDrinks();
  }, [step, fetchDrinks]);

  const selectedDrink = drinks.find((d) => d.id === selectedDrinkId);
  const handleAgeConfirm = () => setStep('drink');
  const handleAgeCancel = () => onClose();

  const handleUseTicket = async () => {
    if (!selectedDrinkId || !selectedDrink) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/ogori/use-ticket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storeId, drinkId: selectedDrinkId, drinkName: selectedDrink.name }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || t('store_detail.ogori_error_use_ticket'));
      }
      setStep('success');
      onTicketUsed();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('store_detail.ogori_error_use_ticket'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (step === 'age-check') {
    return <OgoriAgeCheckModal isOpen={isOpen} onConfirm={handleAgeConfirm} onCancel={handleAgeCancel} />;
  }

  return (
    <CustomModal
      isOpen={isOpen}
      onClose={onClose}
      title=""
      showCloseButton={step !== 'success'}
    >
      <motion.div
        className="space-y-4"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {/* ヘッダー（成功時は非表示） */}
        {step !== 'success' && (
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Ticket className="w-5 h-5" style={{ color: COLORS.champagneGold }} />
              <h3 className="text-lg font-bold" style={{ color: COLORS.deepNavy }}>
                {t('store_detail.ogori_use_ticket_title')}
              </h3>
            </div>
            <p className="text-xs" style={{ color: COLORS.warmGray }}>{storeName}</p>
          </div>
        )}

        {/* エラー表示 */}
        <AnimatePresence mode="wait">
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="p-3 rounded-xl flex items-center gap-2 text-sm"
              style={{ background: 'rgba(220, 53, 69, 0.08)', color: '#dc3545' }}
            >
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {/* Step: ドリンク選択 */}
          {step === 'drink' && (
            <motion.div
              key="drink"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              <p className="text-sm font-bold" style={{ color: COLORS.charcoal }}>
                {t('store_detail.ogori_select_drink')}
              </p>

              {drinksLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin" style={{ color: COLORS.champagneGold }} />
                </div>
              ) : (
                <OgoriDrinkList drinks={drinks} selectedDrinkId={selectedDrinkId} onSelect={setSelectedDrinkId} />
              )}

              <Button
                onClick={() => setStep('present')}
                disabled={selectedDrinkId === null}
                className="w-full rounded-xl font-bold h-11 border-0"
                style={{
                  background: selectedDrinkId !== null ? COLORS.goldGradient : 'rgba(99, 110, 114, 0.1)',
                  color: selectedDrinkId !== null ? COLORS.deepNavy : COLORS.warmGray,
                  boxShadow: selectedDrinkId !== null ? '0 4px 15px rgba(201, 168, 108, 0.3)' : 'none',
                }}
              >
                {t('store_detail.ogori_next')}
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </motion.div>
          )}

          {/* Step: 提示画面（スタッフに見せる） */}
          {step === 'present' && (
            <motion.div
              key="present"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              <div
                className="rounded-2xl p-6 text-center space-y-4"
                style={{
                  background: COLORS.luxuryGradient,
                  border: '1px solid rgba(201, 168, 108, 0.3)',
                  boxShadow: '0 10px 30px rgba(10, 22, 40, 0.3)',
                }}
              >
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.1, type: 'spring' }}
                  className="inline-flex items-center gap-2 rounded-full px-4 py-1.5"
                  style={{ background: 'rgba(201, 168, 108, 0.2)', border: '1px solid rgba(201, 168, 108, 0.4)' }}
                >
                  <Ticket className="w-4 h-4" style={{ color: COLORS.champagneGold }} />
                  <span className="text-sm font-bold" style={{ color: COLORS.champagneGold }}>
                    {t('store_detail.ogori_ticket_usage')}
                  </span>
                </motion.div>

                <p className="text-sm" style={{ color: 'rgba(253, 251, 247, 0.7)' }}>{storeName}</p>

                <motion.p
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="text-2xl font-bold"
                  style={{ color: COLORS.ivory }}
                >
                  {selectedDrink?.name ?? ''}
                </motion.p>

                <div className="flex items-center justify-center gap-3">
                  <div className="h-[1px] w-12" style={{ background: 'linear-gradient(to right, transparent, rgba(201, 168, 108, 0.6))' }} />
                  <Wine className="w-4 h-4" style={{ color: 'rgba(201, 168, 108, 0.5)' }} />
                  <div className="h-[1px] w-12" style={{ background: 'linear-gradient(to left, transparent, rgba(201, 168, 108, 0.6))' }} />
                </div>

                <p className="text-xs italic" style={{ color: 'rgba(201, 168, 108, 0.8)' }}>
                  {t('store_detail.ogori_show_to_staff')}
                </p>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={() => setStep('drink')}
                  variant="outline"
                  className="flex-1 rounded-xl font-bold h-11"
                  style={{ borderColor: COLORS.champagneGold, color: COLORS.deepNavy }}
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  {t('store_detail.ogori_back')}
                </Button>
                <Button
                  onClick={handleUseTicket}
                  disabled={isSubmitting}
                  className="flex-1 rounded-xl font-bold h-11 border-0"
                  style={{
                    background: COLORS.goldGradient,
                    color: COLORS.deepNavy,
                    boxShadow: '0 4px 15px rgba(201, 168, 108, 0.3)',
                  }}
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Check className="w-4 h-4 mr-1" />}
                  {t('store_detail.ogori_confirm_use')}
                </Button>
              </div>
            </motion.div>
          )}

          {/* Step: 成功 */}
          {step === 'success' && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, type: 'spring' }}
              className="relative py-8 text-center space-y-4"
            >
              <ConfettiAnimation />

              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring', stiffness: 300 }}
                className="w-20 h-20 rounded-full flex items-center justify-center mx-auto"
                style={{
                  background: 'linear-gradient(135deg, rgba(201, 168, 108, 0.15) 0%, rgba(232, 213, 183, 0.2) 100%)',
                  border: '2px solid rgba(201, 168, 108, 0.5)',
                }}
              >
                <PartyPopper className="w-10 h-10" style={{ color: COLORS.champagneGold }} />
              </motion.div>

              <motion.div
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
              >
                <h3 className="text-xl font-bold mb-2" style={{ color: COLORS.deepNavy }}>
                  {t('store_detail.ogori_success_title')}
                </h3>
                <p className="text-sm" style={{ color: COLORS.warmGray }}>
                  {t('store_detail.ogori_ticket_used').replace('{drink}', selectedDrink?.name ?? '')}
                </p>
              </motion.div>

              <motion.div
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="pt-4"
              >
                <Button
                  onClick={onClose}
                  className="rounded-xl font-bold h-11 px-8 border-0"
                  style={{
                    background: COLORS.goldGradient,
                    color: COLORS.deepNavy,
                    boxShadow: '0 4px 15px rgba(201, 168, 108, 0.3)',
                  }}
                >
                  {t('store_detail.ogori_close')}
                </Button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </CustomModal>
  );
}
