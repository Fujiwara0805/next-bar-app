/**
 * ============================================
 * おごり酒 購入モーダル（おごるフロー）
 *
 * Step 1: ドリンク選択
 * Step 2: 確認 → Stripe決済
 *
 * 金額は1,000円固定（OGORI_FIXED_AMOUNT）
 * カラー: アプリ既存カラーパレット
 * ============================================
 */
'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Wine,
  CreditCard,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle,
  Check,
} from 'lucide-react';
import { CustomModal } from '@/components/ui/custom-modal';
import { Button } from '@/components/ui/button';
import { OgoriDrinkList, type OgoriDrinkRow } from './OgoriDrinkList';
import { OGORI_FIXED_AMOUNT } from '@/lib/types/ogori';
import { useLanguage } from '@/lib/i18n/context';

// アプリ共通カラー
const COLORS = {
  deepNavy: '#0A1628',
  champagneGold: '#C9A86C',
  charcoal: '#2D3436',
  warmGray: '#636E72',
  goldGradient: 'linear-gradient(135deg, #C9A86C 0%, #E8D5B7 50%, #B8956E 100%)',
};

type PurchaseStep = 'drink' | 'confirm';

interface OgoriPurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  storeId: string;
  storeName: string;
}

export function OgoriPurchaseModal({ isOpen, onClose, storeId, storeName }: OgoriPurchaseModalProps) {
  const { t } = useLanguage();
  const [step, setStep] = useState<PurchaseStep>('drink');
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
      setStep('drink');
      setSelectedDrinkId(null);
      setError(null);
      fetchDrinks();
    }
  }, [isOpen, fetchDrinks]);

  const selectedDrink = drinks.find((d) => d.id === selectedDrinkId);

  const handleCheckout = async () => {
    if (!selectedDrinkId || !selectedDrink) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/ogori/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeId,
          drinkId: selectedDrinkId,
          drinkName: selectedDrink.name,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || t('store_detail.ogori_error_checkout'));
      }
      const { url } = await res.json();
      if (url) window.location.href = url;
    } catch (err) {
      setError(err instanceof Error ? err.message : t('store_detail.ogori_error_payment'));
      setIsSubmitting(false);
    }
  };

  const steps: { key: PurchaseStep; label: string }[] = [
    { key: 'drink', label: t('store_detail.ogori_step_drink') },
    { key: 'confirm', label: t('store_detail.ogori_step_confirm') },
  ];
  const currentStepIndex = steps.findIndex((s) => s.key === step);

  return (
    <CustomModal
      isOpen={isOpen}
      onClose={onClose}
      title=""
      description={storeName}
    >
      <motion.div
        className="space-y-4"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {/* タイトル */}
        <div className="flex items-center gap-2">
          <Wine className="w-5 h-5" style={{ color: COLORS.champagneGold }} />
          <h3 className="text-lg font-bold" style={{ color: COLORS.deepNavy }}>
            {t('store_detail.ogori_purchase_title')}
          </h3>
        </div>

        {/* ステップインジケーター */}
        <div className="flex items-center gap-2">
          {steps.map((s, i) => (
            <div key={s.key} className="flex items-center gap-2 flex-1">
              <div className="flex items-center gap-1.5 flex-1">
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                  style={{
                    background: i <= currentStepIndex ? COLORS.goldGradient : 'rgba(99, 110, 114, 0.1)',
                    color: i <= currentStepIndex ? COLORS.deepNavy : COLORS.warmGray,
                  }}
                >
                  {i < currentStepIndex ? <Check className="w-3.5 h-3.5" /> : i + 1}
                </div>
                <span
                  className="text-xs font-medium"
                  style={{ color: i <= currentStepIndex ? COLORS.charcoal : COLORS.warmGray }}
                >
                  {s.label}
                </span>
              </div>
              {i < steps.length - 1 && (
                <div
                  className="h-[2px] flex-1 rounded-full"
                  style={{
                    background: i < currentStepIndex ? COLORS.champagneGold : 'rgba(99, 110, 114, 0.15)',
                  }}
                />
              )}
            </div>
          ))}
        </div>

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
          {/* Step 1: ドリンク選択 */}
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
                <OgoriDrinkList
                  drinks={drinks}
                  selectedDrinkId={selectedDrinkId}
                  onSelect={setSelectedDrinkId}
                />
              )}

              <Button
                onClick={() => setStep('confirm')}
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

          {/* Step 2: 確認 & 決済 */}
          {step === 'confirm' && (
            <motion.div
              key="confirm"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              <p className="text-sm font-bold" style={{ color: COLORS.charcoal }}>
                {t('store_detail.ogori_confirm_title')}
              </p>

              {/* サマリーカード */}
              <div
                className="rounded-xl p-4 space-y-3"
                style={{
                  background: 'linear-gradient(145deg, #FDFBF7 0%, #F5F1EB 100%)',
                  border: '1px solid rgba(201, 168, 108, 0.2)',
                }}
              >
                <div className="flex justify-between items-center">
                  <span className="text-xs" style={{ color: COLORS.warmGray }}>
                    {t('store_detail.ogori_store_label')}
                  </span>
                  <span className="text-sm font-semibold" style={{ color: COLORS.charcoal }}>
                    {storeName}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs" style={{ color: COLORS.warmGray }}>
                    {t('store_detail.ogori_drink_label')}
                  </span>
                  <span className="text-sm font-semibold" style={{ color: COLORS.charcoal }}>
                    {selectedDrink?.name ?? t('store_detail.ogori_not_selected')}
                  </span>
                </div>
                <div className="h-[1px]" style={{ background: 'rgba(201, 168, 108, 0.2)' }} />
                <div className="flex justify-between items-center">
                  <span className="text-xs" style={{ color: COLORS.warmGray }}>
                    {t('store_detail.ogori_amount_label')}
                  </span>
                  <span className="text-lg font-bold" style={{ color: COLORS.champagneGold }}>
                    ¥{OGORI_FIXED_AMOUNT.toLocaleString('ja-JP')}{t('store_detail.ogori_amount_fixed')}
                  </span>
                </div>
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
                  onClick={handleCheckout}
                  disabled={isSubmitting}
                  className="flex-1 rounded-xl font-bold h-11 border-0"
                  style={{
                    background: COLORS.goldGradient,
                    color: COLORS.deepNavy,
                    boxShadow: '0 4px 15px rgba(201, 168, 108, 0.3)',
                  }}
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-1" />
                  ) : (
                    <CreditCard className="w-4 h-4 mr-1" />
                  )}
                  {t('store_detail.ogori_pay_stripe')}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </CustomModal>
  );
}
