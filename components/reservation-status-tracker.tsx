'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, Clock, Phone, Loader2 } from 'lucide-react';
import { CustomModal } from '@/components/ui/custom-modal';
import { Button } from '@/components/ui/button';

interface ReservationStatus {
  id: string;
  status: 'pending' | 'confirmed' | 'rejected' | 'cancelled' | 'expired';
  storeName: string;
  storeAddress: string;
  callerName: string;
  partySize: number;
  arrivalTime: string;
  confirmedAt?: string;
  rejectionReason?: string;
  expiresAt: string;
}

interface ReservationStatusTrackerProps {
  reservationId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function ReservationStatusTracker({
  reservationId,
  isOpen,
  onClose,
}: ReservationStatusTrackerProps) {
  const [status, setStatus] = useState<ReservationStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);

  useEffect(() => {
    if (!reservationId || !isOpen) return;

    let isMounted = true;
    let intervalId: NodeJS.Timeout;

    const fetchStatus = async () => {
      try {
        // キャッシュバスター：タイムスタンプをクエリパラメータに追加
        const cacheBuster = Date.now();
        const response = await fetch(
          `/api/reservations/status/${reservationId}?t=${cacheBuster}`,
          {
            method: 'GET',
            headers: {
              'Cache-Control': 'no-cache, no-store, must-revalidate',
              'Pragma': 'no-cache',
            },
            cache: 'no-store',
          }
        );
        
        if (!response.ok) {
          throw new Error('Failed to fetch status');
        }

        const data = await response.json();
        
        if (isMounted) {
          setStatus(data);
          setLoading(false);
          
          // 確定、拒否、キャンセル、または期限切れになったらポーリングを停止
          if (
            data.status === 'confirmed' ||
            data.status === 'rejected' ||
            data.status === 'cancelled' ||
            data.status === 'expired'
          ) {
            clearInterval(intervalId);
          }
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : '不明なエラー');
          setLoading(false);
        }
      }
    };

    // 初回フェッチ
    fetchStatus();

    // 2秒ごとにポーリング
    intervalId = setInterval(fetchStatus, 2000);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [reservationId, isOpen]);

  // カウントダウンタイマー
  useEffect(() => {
    if (!status?.expiresAt || status.status !== 'pending') {
      setRemainingSeconds(null);
      return;
    }

    const updateRemaining = () => {
      const now = Date.now();
      const expiresAt = new Date(status.expiresAt).getTime();
      const diff = Math.max(0, Math.ceil((expiresAt - now) / 1000));
      setRemainingSeconds(diff);
    };

    updateRemaining();
    const timerId = setInterval(updateRemaining, 1000);

    return () => clearInterval(timerId);
  }, [status?.expiresAt, status?.status]);

  const getStatusIcon = () => {
    if (loading) return <Loader2 className="w-12 h-12 animate-spin text-info" />;

    switch (status?.status) {
      case 'confirmed':
        return <CheckCircle className="w-12 h-12 text-success" />;
      case 'rejected':
      case 'cancelled':
        return <XCircle className="w-12 h-12 text-destructive" />;
      case 'pending':
        return <Phone className="w-12 h-12 text-info animate-pulse" />;
      case 'expired':
        return <Clock className="w-12 h-12 text-warning" />;
      default:
        return <Clock className="w-12 h-12 text-muted-foreground" />;
    }
  };

  const getStatusText = () => {
    if (loading) return '予約状況を確認中...';
    
    switch (status?.status) {
      case 'confirmed':
        return '✅ 予約が確定しました！\n 画面をスクリーンショットで保存してください。';
      case 'rejected':
        return '❌ 予約をお受けできませんでした';
      case 'cancelled':
        return '予約がキャンセルされました';
      case 'pending':
        return '📞 店舗に確認中...';
      case 'expired':
        return '店舗からの応答がありませんでした';
      default:
        return '不明なステータス';
    }
  };

  const getStatusDescription = () => {
    if (loading) return '少々お待ちください';
    
    switch (status?.status) {
      case 'confirmed':
        const arrivalTime = new Date(status.arrivalTime).toLocaleTimeString('ja-JP', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        });
        return `${status.storeName}に${arrivalTime}頃のご来店をお待ちしております！`;
      case 'rejected':
        return status.rejectionReason || '現在満席のため、ご予約をお受けできません。またのご利用をお待ちしております。';
      case 'pending':
        return '店舗に自動音声で確認中です。画面を開いたままにしてください。';
      case 'cancelled':
        // 電話に出なかった場合（no-answer, busy, failed, canceled）
        return '店舗との通話ができませんでした。\n時間を空けて再度お試しください。';
      case 'expired':
        // 電話を切ってしまった場合（電話に出たが、承認/拒否のボタンを押さずに電話を切った場合）
        return '店舗からの応答がありませんでした。\n時間をあけて再度お試しください。';
      default:
        return '';
    }
  };

  return (
    <CustomModal
      isOpen={isOpen}
      onClose={onClose}
      title="予約ステータス"
      description={status ? `${status.storeName} - ${status.partySize}名様` : ''}
    >
      <motion.div
        className="space-y-6 py-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        {/* ステータスアイコン */}
        <motion.div
          className="flex justify-center"
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          {getStatusIcon()}
        </motion.div>

        {/* ステータステキスト */}
        <motion.div
          className="text-center space-y-2"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <h3 className="text-lg font-bold text-foreground">
            {getStatusText()}
          </h3>
          <p className="text-sm text-muted-foreground whitespace-pre-line">
            {getStatusDescription()}
          </p>
        </motion.div>

        {/* エラー表示 */}
        <AnimatePresence>
          {error && (
            <motion.div
              className="bg-destructive/10 border border-destructive/30 rounded-lg p-4"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              <p className="text-sm text-destructive">
                ⚠️ {error}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 予約情報カード（pending時のみ表示） */}
        <AnimatePresence>
          {status?.status === 'pending' && (
            <motion.div
              className="bg-info/10 border border-info/30 rounded-lg p-4 space-y-2"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ delay: 0.2 }}
            >
              {/* カウントダウンタイマー */}
              {remainingSeconds !== null && (
                <div className="flex items-center justify-center gap-2 mb-2">
                  <div className="relative w-full bg-info/20 rounded-full h-2 overflow-hidden">
                    <motion.div
                      className={`absolute left-0 top-0 h-full rounded-full ${remainingSeconds <= 15 ? 'bg-destructive' : 'bg-info'}`}
                      initial={{ width: '100%' }}
                      animate={{ width: `${(remainingSeconds / 60) * 100}%` }}
                      transition={{ duration: 1, ease: 'linear' }}
                    />
                  </div>
                  <span className={`text-sm font-bold tabular-nums min-w-[40px] text-right ${remainingSeconds <= 15 ? 'text-destructive' : 'text-info'}`}>
                    {remainingSeconds}秒
                  </span>
                </div>
              )}
              <div className="text-sm font-semibold text-info">予約内容</div>
              <div className="text-xs text-info/80 space-y-1">
                <div>👤 {status.callerName}様</div>
                <div>👥 {status.partySize}名</div>
                <div>🕐 {new Date(status.arrivalTime).toLocaleTimeString('ja-JP', {
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: false
                })}頃到着予定</div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 閉じるボタン */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <Button
            onClick={onClose}
            className="w-full bg-primary hover:bg-primary/90"
            disabled={loading}
          >
            閉じる
          </Button>
        </motion.div>
      </motion.div>
    </CustomModal>
  );
}