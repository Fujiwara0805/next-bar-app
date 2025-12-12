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

  const getStatusIcon = () => {
    if (loading) return <Loader2 className="w-12 h-12 animate-spin text-blue-500" />;
    
    switch (status?.status) {
      case 'confirmed':
        return <CheckCircle className="w-12 h-12 text-green-500" />;
      case 'rejected':
      case 'cancelled':
        return <XCircle className="w-12 h-12 text-red-500" />;
      case 'pending':
        return <Phone className="w-12 h-12 text-blue-500 animate-pulse" />;
      case 'expired':
        return <Clock className="w-12 h-12 text-orange-500" />;
      default:
        return <Clock className="w-12 h-12 text-gray-400" />;
    }
  };

  const getStatusText = () => {
    if (loading) return '予約状況を確認中...';
    
    switch (status?.status) {
      case 'confirmed':
        return '✅ 予約が確定しました！';
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
          <h3 className="text-lg font-bold text-gray-900">
            {getStatusText()}
          </h3>
          <p className="text-sm text-gray-600 whitespace-pre-line">
            {getStatusDescription()}
          </p>
        </motion.div>

        {/* エラー表示 */}
        <AnimatePresence>
          {error && (
            <motion.div
              className="bg-red-50 border border-red-200 rounded-lg p-4"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              <p className="text-sm text-red-800">
                ⚠️ {error}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 予約情報カード（pending時のみ表示） */}
        <AnimatePresence>
          {status?.status === 'pending' && (
            <motion.div
              className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ delay: 0.2 }}
            >
              <div className="text-sm font-semibold text-blue-900">予約内容</div>
              <div className="text-xs text-blue-800 space-y-1">
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
            className="w-full bg-gray-800 hover:bg-gray-700"
            disabled={loading}
          >
            閉じる
          </Button>
        </motion.div>
      </motion.div>
    </CustomModal>
  );
}