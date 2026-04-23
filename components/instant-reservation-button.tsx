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
import { useLanguage } from '@/lib/i18n/context';
import { sendGAEvent } from '@/lib/analytics';

interface InstantReservationButtonProps {
  storeId: string;
  storeName: string;
  externalOpen?: boolean;
  onExternalOpenChange?: (open: boolean) => void;
  hideButton?: boolean;
}

export function InstantReservationButton({
  storeId,
  storeName,
  externalOpen,
  onExternalOpenChange,
  hideButton,
}: InstantReservationButtonProps) {
  const { t } = useLanguage();
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = externalOpen !== undefined;
  const showDialog = isControlled ? externalOpen : internalOpen;
  const setShowDialog = (open: boolean) => {
    if (isControlled) {
      onExternalOpenChange?.(open);
    } else {
      setInternalOpen(open);
    }
  };
  const [partySize, setPartySize] = useState('2');
  const [arrivalMinutes, setArrivalMinutes] = useState('10');
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [requesting, setRequesting] = useState(false);
  const [reservationId, setReservationId] = useState<string | null>(null);
  const [showStatusTracker, setShowStatusTracker] = useState(false);

  const handleRequest = async () => {
    // バリデーション
    if (!guestName.trim()) {
      toast.error(t('reservation.error_name_required'), {
        position: 'top-center',
        className: 'bg-gray-100'
      });
      return;
    }

    if (!guestPhone.trim()) {
      toast.error(t('reservation.error_phone_required'), {
        position: 'top-center',
        className: 'bg-gray-100'
      });
      return;
    }

    // 電話番号の簡易バリデーション（日本の携帯番号）
    const phonePattern = /^0[789]0-?\d{4}-?\d{4}$/;
    if (!phonePattern.test(guestPhone.replace(/\s/g, ''))) {
      toast.error(t('reservation.error_phone_invalid'), {
        description: t('reservation.error_phone_example'),
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
          arrivalMinutes: parseInt(arrivalMinutes),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || t('reservation.error_failed'));
      }

      const result = await response.json();

      // GA4: 自動音声予約（席キープ）イベント
      sendGAEvent('tel_click', {
        store_id: storeId,
        store_name: storeName,
        party_size: parseInt(partySize),
      });

      setRequesting(false);
      setShowDialog(false);

      // 予約IDを保存
      setReservationId(result.reservationId);
      
      // フォームをリセット
      setGuestName('');
      setGuestPhone('');
      setPartySize('2');
      setArrivalMinutes('10');

      // 成功メッセージ
      toast.success(`📞 ${t('reservation.success_message')}`, {
        description: t('reservation.success_description'),
        duration: 5000,
        position: 'top-center',
        className: 'bg-gray-100'
      });

      // ステータストラッカーを表示
      setShowStatusTracker(true);

    } catch (error) {
      console.error('Error:', error);
      toast.error(t('reservation.error_failed'), {
        description: error instanceof Error ? error.message : t('common.unknown_error'),
        position: 'top-center',
        className: 'bg-gray-100'
      });
      setRequesting(false);
    }
  };

  const handleCancel = () => {
    setShowDialog(false);
    setPartySize('2');
    setArrivalMinutes('10');
    setGuestName('');
    setGuestPhone('');
  };

  return (
    <>
      {!hideButton && (
        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
          <Button
            onClick={() => setShowDialog(true)}
            className="font-bold bg-brewer-900 text-cream-50 hover:bg-brewer-800 rounded-xl shadow-md"
            size="default"
          >
            <Clock className="w-3 h-3 mr-2" />
            {t('store_detail.reservation_button')}
          </Button>
        </motion.div>
      )}

      <CustomModal
        isOpen={showDialog}
        onClose={handleCancel}
        title={storeName}
        description={t('reservation.description_short')}
      >
        <motion.div 
          className="space-y-4"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* 来店までの時間選択 */}
          <div>
            <Label className="text-sm font-bold flex items-center gap-2 mb-2 text-primary">
              <Clock className="w-4 h-4" />
              {t('reservation.arrival_time')}
            </Label>
            <Select value={arrivalMinutes} onValueChange={setArrivalMinutes}>
              <SelectTrigger className="bg-popover border-brass-500/40 text-popover-foreground font-bold">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-white">
                {[10, 20, 30].map(minutes => (
                  <SelectItem key={minutes} value={minutes.toString()} className="text-base">
                    <span className="text-base">{t('reservation.minutes_later').replace('{minutes}', String(minutes))}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 人数選択 */}
          <div>
            <Label className="text-sm font-bold flex items-center gap-2 mb-2 text-primary">
              <Users className="w-4 h-4" />
              {t('reservation.party_size')}
            </Label>
            <Select value={partySize} onValueChange={setPartySize}>
              <SelectTrigger className="bg-popover border-brass-500/40 text-popover-foreground font-bold">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-white">
                {[1, 2, 3, 4, 5, 6, 7, 8].map(num => (
                  <SelectItem key={num} value={num.toString()} className="text-base">
                    <span className="text-base">{t('reservation.people_count').replace('{count}', String(num))}</span>
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
            <Label className="text-sm font-bold flex items-center gap-2 mb-2 text-primary">
              <User className="w-4 h-4" />
              {t('reservation.guest_name')}
            </Label>
            <Input
              type="text"
              placeholder={t('reservation.guest_name_placeholder')}
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              disabled={requesting}
              className="font-bold bg-popover border-brass-500/40 text-popover-foreground placeholder:text-muted-foreground placeholder:font-normal"
              style={{ fontSize: '16px' }}
            />
          </motion.div>

          {/* 電話番号入力 */}
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Label className="text-sm font-bold flex items-center gap-2 mb-2 text-primary">
              <Phone className="w-4 h-4" />
              {t('reservation.guest_phone')}
            </Label>
            <Input
              type="tel"
              placeholder={t('reservation.guest_phone_placeholder')}
              value={guestPhone}
              onChange={(e) => setGuestPhone(e.target.value)}
              disabled={requesting}
              className="font-bold bg-popover border-brass-500/40 text-popover-foreground placeholder:text-muted-foreground placeholder:font-normal"
              style={{ fontSize: '16px' }}
            />
          </motion.div>

          {/* 予約の流れ */}
          <motion.div
            className="bg-info/10 border border-info/30 rounded-lg p-4 space-y-2"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
          >
            <div className="font-bold text-info text-sm">
              📱 {t('reservation.flow_title')}
            </div>
            <ol className="text-xs text-info/80 space-y-1 list-decimal list-inside">
              <li>{t('reservation.flow_step1')}</li>
              <li>{t('reservation.flow_step2')}</li>
              <li>{t('reservation.flow_step3')}</li>
            </ol>
          </motion.div>

          <div className="text-xs text-muted-foreground">
            {t('reservation.phone_usage_note')}
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
              className="flex-1 rounded-xl bg-brass-500/15 border-brass-500 text-brewer-900 hover:bg-brass-500/25"
            >
              <X className="w-4 h-4 mr-2" />
              {t('reservation.cancel')}
            </Button>
            <Button
              onClick={handleRequest}
              disabled={requesting}
              className="flex-1 font-bold bg-brewer-900 text-cream-50 hover:bg-brewer-800 rounded-xl"
            >
              {requesting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {t('reservation.sending')}
                </>
              ) : (
                <>
                  <Clock className="w-4 h-4 mr-2" />
                  {t('reservation.request_button')}
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
