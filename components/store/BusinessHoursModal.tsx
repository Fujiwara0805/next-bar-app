'use client';

import { useState, useEffect } from 'react';
import { CustomModal } from '@/components/ui/custom-modal';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import type { BusinessHours } from '@/lib/supabase/types';

// ============================================
// 定数
// ============================================

const COLORS = {
  deepNavy: '#0A1628',
  champagneGold: '#C9A86C',
  warmGray: '#636E72',
};

const DAYS: Array<{ key: keyof Required<BusinessHours>; label: string }> = [
  { key: 'monday', label: '月曜日' },
  { key: 'tuesday', label: '火曜日' },
  { key: 'wednesday', label: '水曜日' },
  { key: 'thursday', label: '木曜日' },
  { key: 'friday', label: '金曜日' },
  { key: 'saturday', label: '土曜日' },
  { key: 'sunday', label: '日曜日' },
];

/** 30分刻みの時間オプション */
const TIME_OPTIONS: string[] = [];
for (let h = 0; h < 24; h++) {
  for (let m = 0; m < 60; m += 30) {
    TIME_OPTIONS.push(
      `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
    );
  }
}

// ============================================
// 型定義
// ============================================

interface DayHours {
  open: string;
  close: string;
  closed: boolean;
}

interface BusinessHoursModalProps {
  isOpen: boolean;
  onClose: () => void;
  value: BusinessHours | null;
  onChange: (hours: BusinessHours) => void;
  disabled?: boolean;
}

// ============================================
// デフォルト値
// ============================================

function getDefaultDayHours(): DayHours {
  return { open: '18:00', close: '00:00', closed: false };
}

function initFromValue(value: BusinessHours | null): Record<string, DayHours> {
  const result: Record<string, DayHours> = {};
  for (const { key } of DAYS) {
    const v = value?.[key];
    result[key] = v
      ? {
          open: v.open || '18:00',
          close: v.close || '00:00',
          closed: v.closed ?? false,
        }
      : getDefaultDayHours();
  }
  return result;
}

// ============================================
// コンポーネント
// ============================================

export function BusinessHoursModal({
  isOpen,
  onClose,
  value,
  onChange,
  disabled = false,
}: BusinessHoursModalProps) {
  const [hours, setHours] = useState<Record<string, DayHours>>(() =>
    initFromValue(value)
  );

  // モーダルが開くたびにpropsの値でリセット
  useEffect(() => {
    if (isOpen) {
      setHours(initFromValue(value));
    }
  }, [isOpen, value]);

  const updateDay = (
    key: string,
    field: keyof DayHours,
    val: string | boolean
  ) => {
    setHours((prev) => ({
      ...prev,
      [key]: { ...prev[key], [field]: val },
    }));
  };

  const handleSave = () => {
    const result: BusinessHours = {};
    for (const { key } of DAYS) {
      const h = hours[key];
      result[key] = {
        open: h.closed ? '' : h.open,
        close: h.closed ? '' : h.close,
        closed: h.closed,
      };
    }
    onChange(result);
  };

  const handleApplyAll = () => {
    const mondayHours = hours['monday'];
    if (!mondayHours) return;
    setHours((prev) => {
      const next = { ...prev };
      for (const { key } of DAYS) {
        next[key] = { ...mondayHours };
      }
      return next;
    });
  };

  const handleApplyWeekdays = () => {
    const mondayHours = hours['monday'];
    if (!mondayHours) return;
    const weekdays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
    setHours((prev) => {
      const next = { ...prev };
      for (const key of weekdays) {
        next[key] = { ...mondayHours };
      }
      return next;
    });
  };

  return (
    <CustomModal
      isOpen={isOpen}
      onClose={onClose}
      title=""
      description="曜日ごとの営業時間を設定してください"
    >
      <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
        {DAYS.map(({ key, label }) => {
          const day = hours[key];
          return (
            <div
              key={key}
              className="flex items-center gap-2 py-2 border-b border-gray-100 last:border-0"
            >
              {/* 曜日ラベル */}
              <div className="w-16 shrink-0">
                <span
                  className="text-sm font-bold"
                  style={{ color: COLORS.deepNavy }}
                >
                  {label}
                </span>
              </div>

              {/* 定休日チェック */}
              <div className="flex items-center gap-1 shrink-0">
                <Checkbox
                  id={`closed-${key}`}
                  checked={day.closed}
                  onCheckedChange={(checked) =>
                    updateDay(key, 'closed', !!checked)
                  }
                  disabled={disabled}
                />
                <Label
                  htmlFor={`closed-${key}`}
                  className="text-xs cursor-pointer"
                  style={{ color: COLORS.warmGray }}
                >
                  休
                </Label>
              </div>

              {/* 時間選択 */}
              {day.closed ? (
                <div className="flex-1 text-center">
                  <span
                    className="text-sm"
                    style={{ color: COLORS.warmGray }}
                  >
                    定休日
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-1 flex-1">
                  <select
                    value={day.open}
                    onChange={(e) => updateDay(key, 'open', e.target.value)}
                    disabled={disabled}
                    className="flex-1 text-sm px-2 py-1.5 rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-amber-200"
                    style={{ fontSize: '14px' }}
                  >
                    {TIME_OPTIONS.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                  <span
                    className="text-sm shrink-0"
                    style={{ color: COLORS.warmGray }}
                  >
                    〜
                  </span>
                  <select
                    value={day.close}
                    onChange={(e) => updateDay(key, 'close', e.target.value)}
                    disabled={disabled}
                    className="flex-1 text-sm px-2 py-1.5 rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-amber-200"
                    style={{ fontSize: '14px' }}
                  >
                    {TIME_OPTIONS.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 一括設定ボタン */}
      <div className="flex gap-2 mt-4 overflow-x-auto">
        <button
          type="button"
          onClick={handleApplyAll}
          disabled={disabled}
          className="text-xs px-3 py-1.5 rounded-full border whitespace-nowrap"
          style={{
            borderColor: COLORS.champagneGold,
            color: COLORS.deepNavy,
          }}
        >
          月曜を全日に適用
        </button>
        <button
          type="button"
          onClick={handleApplyWeekdays}
          disabled={disabled}
          className="text-xs px-3 py-1.5 rounded-full border whitespace-nowrap"
          style={{
            borderColor: COLORS.champagneGold,
            color: COLORS.deepNavy,
          }}
        >
          月曜を平日に適用
        </button>
      </div>

      {/* アクションボタン */}
      <div className="flex gap-3 mt-5">
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          disabled={disabled}
          className="flex-1 rounded-xl"
          style={{
            backgroundColor: 'rgba(201, 168, 108, 0.15)',
            borderColor: COLORS.champagneGold,
            color: COLORS.deepNavy,
          }}
        >
          キャンセル
        </Button>
        <Button
          type="button"
          onClick={handleSave}
          disabled={disabled}
          className="flex-1 rounded-xl text-white"
          style={{
            background: `linear-gradient(135deg, ${COLORS.champagneGold}, #B8956E)`,
          }}
        >
          保存
        </Button>
      </div>
    </CustomModal>
  );
}
