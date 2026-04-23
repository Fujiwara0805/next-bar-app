'use client';

/**
 * 店舗クーポン消込画面（Phase 10-5）
 *
 * 顧客が LIFF に表示する 6桁コードを手入力 → サーバー検証 → 消込
 * InputOTP で視覚的にコード入力を補助。
 */

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Loader2,
  ScanLine,
  CheckCircle2,
  XCircle,
  Sparkles,
  RefreshCw,
  Tag,
  Info,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CloseCircleButton } from '@/components/ui/close-circle-button';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from '@/components/ui/input-otp';
import { useAuth } from '@/lib/auth/context';
import { supabase } from '@/lib/supabase/client';
import { useAppMode } from '@/lib/app-mode-context';
import { toast } from 'sonner';
import { REDEEM_CODE_LENGTH } from '@/lib/coupons/signature';

type RedeemResult = {
  couponTitle: string;
  discountType: 'percent' | 'amount' | 'free_item' | 'other';
  discountValue: number | null;
  redeemedAt: string;
};

const ERROR_LABELS: Record<string, string> = {
  invalid_code: '6桁の数字で入力してください',
  code_not_found: 'コードが見つかりません。もう一度ご確認ください',
  already_redeemed: 'このクーポンは既に使用済みです',
  coupon_inactive: 'このクーポンは無効化されています',
  coupon_not_started: 'クーポンの有効期間前です',
  coupon_expired: 'クーポンの有効期限が切れています',
  coupon_not_found: 'クーポンが見つかりません',
  forbidden: 'この店舗のクーポンを消し込む権限がありません',
  unauthorized: 'ログインが切れています。再度ログインしてください',
};

const SectionHeader = ({
  icon: Icon,
  title,
}: {
  icon: React.ElementType;
  title: string;
}) => {
  const { colorsB: COLORS } = useAppMode();
  return (
    <div className="flex items-center gap-3 mb-4">
      <div
        className="p-2 rounded-lg"
        style={{
          background: COLORS.goldGradient,
          boxShadow: '0 2px 8px rgba(201, 168, 108, 0.25)',
        }}
      >
        <Icon className="w-4 h-4" style={{ color: COLORS.deepNavy }} />
      </div>
      <h2 className="text-lg font-bold" style={{ color: COLORS.deepNavy }}>
        {title}
      </h2>
    </div>
  );
};

function StoreRedeemPageInner() {
  const params = useParams();
  const router = useRouter();
  const storeId = Array.isArray(params.id) ? params.id[0] : (params.id as string);
  const { user, accountType, store, loading: authLoading } = useAuth();
  const { colorsB: COLORS } = useAppMode();

  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<RedeemResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const root = document.documentElement;
    const docBody = document.body;
    const prevRoot = root.style.background;
    const prevBody = docBody.style.background;
    const bg = COLORS.cardGradient;
    root.style.background = bg;
    docBody.style.background = bg;
    return () => {
      root.style.background = prevRoot;
      docBody.style.background = prevBody;
    };
  }, [COLORS.cardGradient]);

  const isAuthorized = useMemo(() => {
    if (authLoading || !user) return false;
    if (accountType === 'platform') return true;
    if (accountType === 'store' && store?.id === storeId) return true;
    return false;
  }, [authLoading, user, accountType, store, storeId]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace('/login/store');
      return;
    }
    if (!isAuthorized) {
      router.replace('/store/manage');
    }
  }, [authLoading, user, isAuthorized, router]);

  const handleSubmit = async () => {
    setErrorMsg(null);
    if (code.length !== REDEEM_CODE_LENGTH) {
      setErrorMsg(ERROR_LABELS.invalid_code);
      return;
    }
    setSubmitting(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) {
        setErrorMsg(ERROR_LABELS.unauthorized);
        return;
      }
      const res = await fetch(`/api/stores/${storeId}/coupons/redeem`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ code }),
      });
      const json = await res.json();
      if (!res.ok) {
        setErrorMsg(ERROR_LABELS[json?.error] ?? '消込に失敗しました');
        return;
      }
      setResult({
        couponTitle: json.couponTitle,
        discountType: json.discountType,
        discountValue: json.discountValue,
        redeemedAt: json.redeemedAt,
      });
      toast.success('消込が完了しました');
    } catch (err) {
      console.error('[redeem] error', err);
      setErrorMsg('通信エラーが発生しました');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setCode('');
    setResult(null);
    setErrorMsg(null);
  };

  if (authLoading || !user || !isAuthorized) {
    return (
      <div
        className="min-h-[100dvh] flex items-center justify-center"
        style={{ background: COLORS.cardGradient }}
      >
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
        >
          <Sparkles className="w-10 h-10" style={{ color: COLORS.champagneGold }} />
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] pb-20" style={{ background: COLORS.cardGradient }}>
      <header
        className="sticky top-0 z-20 safe-top"
        style={{
          background: COLORS.luxuryGradient,
          borderBottom: `1px solid rgba(201, 168, 108, 0.2)`,
        }}
      >
        <div className="flex items-center justify-center p-4 relative">
          <h1
            className="text-lg font-light tracking-widest"
            style={{ color: COLORS.ivory }}
          >
            クーポン消込
          </h1>
          <CloseCircleButton
            type="button"
            size="lg"
            onClick={() => router.push(`/store/manage/${storeId}/update`)}
            className="absolute right-4"
            aria-label="閉じる"
          />
        </div>
      </header>

      <div className="max-w-md mx-auto px-4 pt-8">
        {result ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <Card
              className="p-6 rounded-2xl shadow-lg text-center"
              style={{
                background: '#FFFFFF',
                border: `2px solid rgba(34, 197, 94, 0.3)`,
              }}
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
                className="inline-flex mb-3"
              >
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center"
                  style={{ background: 'rgba(34, 197, 94, 0.12)' }}
                >
                  <CheckCircle2 className="w-10 h-10" style={{ color: '#16a34a' }} />
                </div>
              </motion.div>
              <h2
                className="text-xl font-bold mb-2"
                style={{ color: COLORS.deepNavy }}
              >
                消込完了
              </h2>
              <p
                className="text-base font-semibold mb-3"
                style={{ color: COLORS.deepNavy }}
              >
                {result.couponTitle}
              </p>
              {result.discountValue != null && (
                <div
                  className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold mb-3"
                  style={{
                    background: 'rgba(201, 168, 108, 0.12)',
                    color: COLORS.deepNavy,
                  }}
                >
                  <Tag className="w-3 h-3" />
                  {result.discountType === 'percent'
                    ? `${result.discountValue}% OFF`
                    : result.discountType === 'amount'
                    ? `¥${result.discountValue} OFF`
                    : result.discountValue}
                </div>
              )}
              <p className="text-xs" style={{ color: COLORS.warmGray }}>
                {new Date(result.redeemedAt).toLocaleString('ja-JP')}
              </p>
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="mt-6"
              >
                <Button
                  type="button"
                  onClick={handleReset}
                  className="w-full rounded-xl font-bold"
                  style={{
                    background: COLORS.goldGradient,
                    color: COLORS.deepNavy,
                  }}
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  続けて消込
                </Button>
              </motion.div>
            </Card>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card
              className="p-6 rounded-2xl shadow-lg"
              style={{
                background: '#FFFFFF',
                border: `1px solid rgba(201, 168, 108, 0.15)`,
              }}
            >
              <SectionHeader icon={ScanLine} title="6桁コードを入力" />
              <p
                className="text-xs mb-5 leading-relaxed"
                style={{ color: COLORS.warmGray }}
              >
                お客様の LINE トークに届いたクーポン画面に表示される
                <br />
                6桁のコードを入力してください。
              </p>

              <div className="flex justify-center mb-4">
                <InputOTP
                  maxLength={REDEEM_CODE_LENGTH}
                  value={code}
                  onChange={(v) => {
                    setCode(v.replace(/\D/g, ''));
                    setErrorMsg(null);
                  }}
                  autoFocus
                  inputMode="numeric"
                >
                  <InputOTPGroup>
                    {Array.from({ length: REDEEM_CODE_LENGTH }).map((_, i) => (
                      <InputOTPSlot
                        key={i}
                        index={i}
                        className="w-11 h-14 text-xl font-bold"
                        style={
                          {
                            borderColor: 'rgba(201, 168, 108, 0.35)',
                            color: COLORS.deepNavy,
                          } as React.CSSProperties
                        }
                      />
                    ))}
                  </InputOTPGroup>
                </InputOTP>
              </div>

              {errorMsg && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 p-3 rounded-xl text-xs mb-4"
                  style={{
                    background: 'rgba(239, 68, 68, 0.08)',
                    border: '1px solid rgba(239, 68, 68, 0.25)',
                    color: '#B91C1C',
                  }}
                >
                  <XCircle className="w-4 h-4 flex-shrink-0" />
                  <p className="font-medium">{errorMsg}</p>
                </motion.div>
              )}

              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button
                  type="button"
                  onClick={handleSubmit}
                  disabled={submitting || code.length !== REDEEM_CODE_LENGTH}
                  className="w-full py-4 rounded-xl font-bold text-base shadow-lg"
                  size="lg"
                  style={{
                    background: COLORS.goldGradient,
                    color: COLORS.deepNavy,
                    boxShadow: '0 8px 25px rgba(201, 168, 108, 0.35)',
                  }}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      確認中...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-5 h-5 mr-2" />
                      消込する
                    </>
                  )}
                </Button>
              </motion.div>

              <div
                className="flex items-start gap-2 mt-5 p-3 rounded-xl text-xs"
                style={{
                  background: 'rgba(201, 168, 108, 0.08)',
                  border: '1px solid rgba(201, 168, 108, 0.2)',
                  color: COLORS.charcoal,
                }}
              >
                <Info
                  className="w-4 h-4 flex-shrink-0 mt-0.5"
                  style={{ color: COLORS.champagneGold }}
                />
                <p>
                  消込後は「使用済」として記録され、同じコードは再使用できません。
                </p>
              </div>
            </Card>
          </motion.div>
        )}
      </div>
    </div>
  );
}

function Fallback() {
  const { colorsB: COLORS } = useAppMode();
  return (
    <div
      className="min-h-[100dvh] flex items-center justify-center"
      style={{ background: COLORS.cardGradient }}
    >
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
      >
        <Sparkles className="w-10 h-10" style={{ color: COLORS.champagneGold }} />
      </motion.div>
    </div>
  );
}

export default function StoreRedeemPage() {
  return (
    <Suspense fallback={<Fallback />}>
      <StoreRedeemPageInner />
    </Suspense>
  );
}
