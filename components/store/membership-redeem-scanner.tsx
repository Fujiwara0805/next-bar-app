'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, ScanLine, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { CloseCircleButton } from '@/components/ui/close-circle-button';
import { Button } from '@/components/ui/button';

const SCANNER_REGION_ID = 'membership-redeem-scanner-region';

const NAVY = '#13294b';
const BRASS = '#ffc82c';

type RedeemCustomer = {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
};

type RedeemSuccess = {
  customer: RedeemCustomer;
  perUser: boolean;
};

const ERROR_MESSAGES: Record<string, string> = {
  already_redeemed: 'この会員はすでに当該イベントの特典を記録済みです。',
  not_participating: 'このイベントに参加していません。',
  token_expired: 'QRの有効期限が切れています。お客様に再表示してもらってください。',
  invalid_token: '会員証QRが正しくありません。',
  invalid_payload: '会員証QRを読み取れませんでした。',
  customer_not_found: '会員情報が見つかりませんでした。',
  customer_only: '会員アカウントのQRではありません。',
  table_missing: '特典記録テーブルが未作成です。管理者にお問い合わせください。',
  unauthorized: 'セッションが切れています。再ログインしてください。',
  unknown: '特典の記録に失敗しました。',
};

/**
 * 会員証QRをスキャンしてイベント特典を per-user で記録するモーダル。
 * 成功時は対象会員名を表示し、運営のイベント管理に顧客×特典記録が残る。
 */
export function MembershipRedeemScanner({
  storeId,
  eventId,
  eventTitle,
  onClose,
  onRedeemed,
}: {
  storeId: string;
  eventId: string;
  eventTitle: string;
  onClose: () => void;
  onRedeemed?: () => void;
}) {
  const [state, setState] = useState<'starting' | 'scanning' | 'submitting' | 'done' | 'error'>(
    'starting'
  );
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [success, setSuccess] = useState<RedeemSuccess | null>(null);
  const [alreadyCustomer, setAlreadyCustomer] = useState<RedeemCustomer | null>(null);
  const scannerRef = useRef<any>(null);
  const lockRef = useRef(false);

  const stopScanner = useCallback(async () => {
    const scanner = scannerRef.current;
    if (!scanner) return;
    try {
      if (scanner.getState && scanner.getState() === 2) {
        await scanner.stop();
      }
      await scanner.clear();
    } catch {
      /* noop */
    }
    scannerRef.current = null;
  }, []);

  const submit = useCallback(
    async (payload: { u: string; t: number; s: string; d?: string }) => {
      setState('submitting');
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData.session?.access_token;
        if (!token) {
          setErrorMsg(ERROR_MESSAGES.unauthorized);
          setState('error');
          return;
        }
        const res = await fetch(
          `/api/stores/${storeId}/events/${eventId}/scan-redeem`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(payload),
          }
        );
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          const code = json?.error ?? 'unknown';
          if (code === 'already_redeemed' && json?.customer) {
            setAlreadyCustomer(json.customer as RedeemCustomer);
          }
          setErrorMsg(ERROR_MESSAGES[code] ?? ERROR_MESSAGES.unknown);
          setState('error');
          return;
        }
        setSuccess({ customer: json.customer as RedeemCustomer, perUser: !!json.per_user });
        setState('done');
        onRedeemed?.();
      } catch (err) {
        console.error('[membership-redeem] submit error', err);
        setErrorMsg(ERROR_MESSAGES.unknown);
        setState('error');
      }
    },
    [storeId, eventId, onRedeemed]
  );

  const handleDecoded = useCallback(
    (decoded: string) => {
      if (lockRef.current) return;
      try {
        const url = new URL(decoded, window.location.origin);
        if (!url.pathname.replace(/\/$/, '').endsWith('/c')) {
          return;
        }
        const u = url.searchParams.get('u');
        const tParam = url.searchParams.get('t');
        const s = url.searchParams.get('s');
        const d = url.searchParams.get('d') ?? undefined;
        if (!u || !tParam || !s || !/^\d+$/.test(tParam)) return;
        lockRef.current = true;
        stopScanner();
        submit({ u, t: Number(tParam), s, d });
      } catch {
        /* 非対象QRは無視して読み取り継続 */
      }
    },
    [stopScanner, submit]
  );

  const startScanner = useCallback(async () => {
    if (scannerRef.current) return;
    setState('starting');
    setErrorMsg('');
    try {
      const mod = await import('html5-qrcode');
      const Html5Qrcode = mod.Html5Qrcode;
      const scanner = new Html5Qrcode(SCANNER_REGION_ID);
      scannerRef.current = scanner;
      const config = { fps: 10, qrbox: { width: 240, height: 240 }, aspectRatio: 1.0 };
      try {
        await scanner.start(
          { facingMode: { exact: 'environment' } } as MediaTrackConstraints,
          config,
          handleDecoded,
          () => {}
        );
      } catch {
        await scanner.start({ facingMode: 'environment' }, config, handleDecoded, () => {});
      }
      setState('scanning');
    } catch (err) {
      console.error('[membership-redeem] scanner start error', err);
      setErrorMsg('カメラを起動できませんでした。権限をご確認ください。');
      setState('error');
    }
  }, [handleDecoded]);

  const retry = useCallback(async () => {
    await stopScanner();
    lockRef.current = false;
    setSuccess(null);
    setAlreadyCustomer(null);
    startScanner();
  }, [stopScanner, startScanner]);

  useEffect(() => {
    lockRef.current = false;
    startScanner();
    return () => {
      stopScanner();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const close = useCallback(async () => {
    await stopScanner();
    onClose();
  }, [stopScanner, onClose]);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-4"
        onClick={close}
      >
        <motion.div
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 40, opacity: 0 }}
          transition={{ type: 'spring', damping: 26, stiffness: 300 }}
          className="w-full max-w-md rounded-3xl overflow-hidden relative"
          style={{ background: NAVY }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-5 pt-5 pb-3">
            <div className="flex items-center gap-2 min-w-0">
              <ScanLine className="w-5 h-5 shrink-0" style={{ color: BRASS }} />
              <div className="min-w-0">
                <p className="text-sm font-bold truncate" style={{ color: '#F7F3E9' }}>
                  会員証QRで特典を記録
                </p>
                <p className="text-[11px] truncate" style={{ color: 'rgba(247,243,233,0.6)' }}>
                  {eventTitle}
                </p>
              </div>
            </div>
            <CloseCircleButton type="button" size="md" aria-label="閉じる" onClick={close} />
          </div>

          <div className="px-5 pb-6">
            {(state === 'starting' || state === 'scanning' || state === 'submitting') && (
              <div>
                <div
                  id={SCANNER_REGION_ID}
                  className="w-full aspect-square rounded-2xl overflow-hidden bg-black"
                />
                <p className="text-center text-xs mt-3" style={{ color: 'rgba(247,243,233,0.7)' }}>
                  {state === 'submitting'
                    ? '特典を記録しています…'
                    : 'お客様の会員証QRを枠内に合わせてください'}
                </p>
                {state === 'submitting' && (
                  <div className="flex justify-center mt-2">
                    <Loader2 className="w-5 h-5 animate-spin" style={{ color: BRASS }} />
                  </div>
                )}
              </div>
            )}

            {state === 'done' && success && (
              <div className="text-center py-4">
                <CheckCircle2 className="w-14 h-14 mx-auto mb-3" style={{ color: '#4ade80' }} />
                <p className="text-base font-bold mb-1" style={{ color: '#F7F3E9' }}>
                  特典を記録しました
                </p>
                <p className="text-sm" style={{ color: BRASS }}>
                  {success.customer.display_name} 様
                </p>
                {!success.perUser && (
                  <p className="text-[11px] mt-2" style={{ color: 'rgba(247,243,233,0.6)' }}>
                    ※会員紐付けは未適用環境のため件数のみ記録しました
                  </p>
                )}
                <div className="flex gap-2 mt-5">
                  <Button
                    type="button"
                    onClick={retry}
                    className="flex-1 rounded-xl font-bold"
                    style={{ background: BRASS, color: NAVY }}
                  >
                    <RefreshCw className="w-4 h-4 mr-1.5" />
                    続けて記録
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={close}
                    className="flex-1 rounded-xl font-bold"
                    style={{ borderColor: 'rgba(247,243,233,0.4)', color: '#F7F3E9', background: 'transparent' }}
                  >
                    閉じる
                  </Button>
                </div>
              </div>
            )}

            {state === 'error' && (
              <div className="text-center py-4">
                <AlertCircle className="w-12 h-12 mx-auto mb-3" style={{ color: '#fca5a5' }} />
                <p className="text-sm font-bold mb-1" style={{ color: '#F7F3E9' }}>
                  {errorMsg}
                </p>
                {alreadyCustomer && (
                  <p className="text-sm mt-1" style={{ color: BRASS }}>
                    {alreadyCustomer.display_name} 様
                  </p>
                )}
                <div className="flex gap-2 mt-5">
                  <Button
                    type="button"
                    onClick={retry}
                    className="flex-1 rounded-xl font-bold"
                    style={{ background: BRASS, color: NAVY }}
                  >
                    <RefreshCw className="w-4 h-4 mr-1.5" />
                    もう一度
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={close}
                    className="flex-1 rounded-xl font-bold"
                    style={{ borderColor: 'rgba(247,243,233,0.4)', color: '#F7F3E9', background: 'transparent' }}
                  >
                    閉じる
                  </Button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
