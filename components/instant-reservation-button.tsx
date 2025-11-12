'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Clock, Users, Loader2, Phone, User, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CustomModal } from '@/components/ui/custom-modal';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { ReservationStatusTracker } from '@/components/reservation-status-tracker';

interface InstantReservationButtonProps {
  storeId: string;
  storeName: string;
}

export function InstantReservationButton({
  storeId,
  storeName,
}: InstantReservationButtonProps) {
  const [showDialog, setShowDialog] = useState(false);
  const [partySize, setPartySize] = useState('2');
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [requesting, setRequesting] = useState(false);
  const [reservationId, setReservationId] = useState<string | null>(null);
  const [showStatusTracker, setShowStatusTracker] = useState(false);

  const handleRequest = async () => {
    // バリデーション
    if (!guestName.trim()) {
      toast.error('名前を入力してください', {
        position: 'top-center',
        className: 'bg-gray-100'
      });
      return;
    }

    if (!guestPhone.trim()) {
      toast.error('電話番号を入力してください', {
        position: 'top-center',
        className: 'bg-gray-100'
      });
      return;
    }

    // 電話番号の簡易バリデーション（日本の携帯番号）
    const phonePattern = /^0[789]0-?\d{4}-?\d{4}$/;
    if (!phonePattern.test(guestPhone.replace(/\s/g, ''))) {
      toast.error('正しい電話番号を入力してください', {
        description: '例: 090-1234-5678',
        position: 'top-center',
        className: 'bg-gray-100'
      });
      return;
    }

    setRequesting(true);

    try {
      const response = await fetch('/api/reservations/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeId,
          userName: guestName.trim(),
          userPhone: guestPhone.replace(/\s/g, ''),
          partySize: parseInt(partySize),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to send request');
      }

      const result = await response.json();
      
      setRequesting(false);
      setShowDialog(false);
      
      // 予約IDを保存
      setReservationId(result.reservationId);
      
      // フォームをリセット
      setGuestName('');
      setGuestPhone('');
      setPartySize('2');

      // 成功メッセージ
      toast.success('📞 予約リクエストを送信しました！', {
        description: '40秒間、画面を開いたままにしてください',
        duration: 5000,
        position: 'top-center',
        className: 'bg-gray-100'
      });

      // ステータストラッカーを表示
      setShowStatusTracker(true);

    } catch (error) {
      console.error('Error:', error);
      toast.error('予約リクエストの送信に失敗しました', {
        description: error instanceof Error ? error.message : '不明なエラー',
        position: 'top-center',
        className: 'bg-gray-100'
      });
      setRequesting(false);
    }
  };

  const handleCancel = () => {
    setShowDialog(false);
    setPartySize('2');
    setGuestName('');
    setGuestPhone('');
  };

  return (
    <>
      <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
        <Button
          onClick={() => setShowDialog(true)}
          className="bg-blue-500 hover:bg-blue-600 text-white font-bold"
          size="default"
        >
          <Clock className="w-3 h-3 mr-2" />
          10分後に来店予約
        </Button>
      </motion.div>

      <CustomModal
        isOpen={showDialog}
        onClose={handleCancel}
        title="⏰ 10分後に来店"
        description={`${storeName}に10分後の来店予約をリクエスト。`}
      >
        <motion.div 
          className="space-y-4"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* 人数選択 */}
          <div>
            <Label className="text-sm font-bold flex items-center gap-2 mb-2" style={{ color: '#2c5c6e' }}>
              <Users className="w-4 h-4" />
              人数
            </Label>
            <Select value={partySize} onValueChange={setPartySize}>
              <SelectTrigger className="bg-white border-[#2c5c6e]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-white">
                {[1, 2, 3, 4, 5, 6, 7, 8].map(num => (
                  <SelectItem key={num} value={num.toString()}className="text-base">
                    <span className="text-base">{num}名</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 名前入力 */}
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Label className="text-sm font-bold flex items-center gap-2 mb-2" style={{ color: '#2c5c6e' }}>
              <User className="w-4 h-4" />
              お名前
            </Label>
            <Input
              type="text"
              placeholder="例：山田 太郎"
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              disabled={requesting}
              className="font-bold bg-white border-[#2c5c6e]"
              style={{ fontSize: '16px' }}
            />
          </motion.div>

          {/* 電話番号入力 */}
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Label className="text-sm font-bold flex items-center gap-2 mb-2" style={{ color: '#2c5c6e' }}>
              <Phone className="w-4 h-4" />
              電話番号
            </Label>
            <Input
              type="tel"
              placeholder="例：090-1234-5678"
              value={guestPhone}
              onChange={(e) => setGuestPhone(e.target.value)}
              disabled={requesting}
              className="font-bold bg-white border-[#2c5c6e]"
              style={{ fontSize: '16px' }}
            />
          </motion.div>

          {/* 予約の流れ */}
          <motion.div 
            className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
          >
            <div className="font-bold text-blue-900 text-sm">
              📱 予約の流れ
            </div>
            <ol className="text-xs text-blue-800 space-y-1 list-decimal list-inside">
              <li>店舗に自動音声電話で通知</li>
              <li>店舗が電話ボタンで承認/拒否</li>
              <li>40秒間、画面を開いたままにしてください</li>
            </ol>
          </motion.div>

          <div className="text-xs text-muted-foreground">
            ※ 入力いただいた電話番号は予約通知のみに使用します
          </div>

          {/* ボタン */}
          <motion.div 
            className="flex gap-3 pt-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            <Button
              variant="outline"
              onClick={handleCancel}
              disabled={requesting}
              className="flex-1 bg-[#fceaea] hover:bg-[#fad6d5] border-[#fceaea]"
            >
              <X className="w-4 h-4 mr-2" />
              キャンセル
            </Button>
            <Button
              onClick={handleRequest}
              disabled={requesting}
              className="flex-1 bg-blue-500 hover:bg-blue-600"
            >
              {requesting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  送信中...
                </>
              ) : (
                <>
                  <Clock className="w-4 h-4 mr-2" />
                  予約リクエスト
                </>
              )}
            </Button>
          </motion.div>
        </motion.div>
      </CustomModal>

      {/* 予約ステータストラッカー */}
      {reservationId && (
        <ReservationStatusTracker
          reservationId={reservationId}
          isOpen={showStatusTracker}
          onClose={() => setShowStatusTracker(false)}
        />
      )}
    </>
  );
}

