'use client';

/**
 * ============================================
 * ファイルパス: components/reservation/ArrivalToggleButton.tsx
 * 来店チェック用トグルボタンコンポーネント
 * - 高級感のあるアンバーゴールド基調のデザイン
 * - 楽観的UI更新（Optimistic Updates）対応
 * ============================================
 */

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Loader2, UserCheck, UserX } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'sonner';
import type { Database } from '@/lib/supabase/types';

type QuickReservation = Database['public']['Tables']['quick_reservations']['Row'];

interface ArrivalToggleButtonProps {
  reservation: QuickReservation;
  onUpdate: (updatedReservation: QuickReservation) => void;
}

/**
 * 来店チェック用トグルボタン
 * - arrived_at が NULL = 未来店（OFF）
 * - arrived_at に値がある = 来店済み（ON）
 */
export function ArrivalToggleButton({ reservation, onUpdate }: ArrivalToggleButtonProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [localArrived, setLocalArrived] = useState<boolean>(!!reservation.arrived_at);
  
  const isArrived = localArrived;
  
  const handleToggle = useCallback(async () => {
    if (isUpdating) return;
    
    // 予約ステータスが承認済み（confirmed）でない場合は警告
    if (reservation.status !== 'confirmed' && !isArrived) {
      toast.warning('承認済みの予約のみ来店確認できます', {
        position: 'top-center',
        duration: 3000,
      });
      return;
    }
    
    const newArrivedState = !isArrived;
    const previousState = isArrived;
    
    // 楽観的UI更新
    setLocalArrived(newArrivedState);
    setIsUpdating(true);
    
    try {
      const now = new Date().toISOString();
      
      // 更新データの構築
      const updateData: Database['public']['Tables']['quick_reservations']['Update'] = {
        updated_at: now,
      };
      
      if (newArrivedState) {
        // 来店ON: arrived_at に現在時刻をセット、no_show_at をリセット
        updateData.arrived_at = now;
        updateData.no_show_at = null;
      } else {
        // 来店OFF: arrived_at をリセット
        updateData.arrived_at = null;
      }
      
      const { data, error } = await supabase
        .from('quick_reservations')
        // @ts-ignore - Supabaseの型推論の問題を回避
        .update(updateData)
        .eq('id', reservation.id)
        .select()
        .single();
      
      if (error) throw error;
      
      // 親コンポーネントに更新を通知
      if (data) {
        onUpdate(data as QuickReservation);
      }
      
      toast.success(
        newArrivedState ? '来店を確認しました' : '来店確認を取り消しました',
        {
          position: 'top-center',
          duration: 2000,
          className: 'bg-gray-100',
        }
      );
    } catch (error) {
      console.error('Error updating arrival status:', error);
      
      // エラー時はロールバック
      setLocalArrived(previousState);
      
      toast.error('更新に失敗しました', {
        position: 'top-center',
        duration: 3000,
        className: 'bg-gray-100',
      });
    } finally {
      setIsUpdating(false);
    }
  }, [isArrived, isUpdating, reservation, onUpdate]);
  
  // 予約が承認済みでない場合は非活性状態で表示
  const isDisabled = reservation.status !== 'confirmed' && !isArrived;
  
  return (
    <motion.button
      type="button"
      onClick={handleToggle}
      disabled={isUpdating || isDisabled}
      className={`
        relative flex items-center gap-2 px-4 py-2.5 rounded-lg
        font-bold text-sm transition-all duration-300
        border-2 shadow-sm
        ${isDisabled 
          ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed opacity-60'
          : isArrived
            ? 'bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-400 text-amber-800 hover:from-amber-100 hover:to-yellow-100 hover:border-amber-500'
            : 'bg-gray-50 border-gray-300 text-gray-600 hover:bg-gray-100 hover:border-gray-400'
        }
        focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2
        disabled:opacity-70 disabled:cursor-not-allowed
      `}
      whileTap={{ scale: isUpdating || isDisabled ? 1 : 0.95 }}
      aria-label={isArrived ? '来店確認済み - クリックで取り消し' : '来店確認 - クリックで確認'}
    >
      {/* ローディングインジケーター */}
      <AnimatePresence mode="wait">
        {isUpdating ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
          >
            <Loader2 className="w-4 h-4 animate-spin text-amber-600" />
          </motion.div>
        ) : isArrived ? (
          <motion.div
            key="arrived"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
          >
            <UserCheck className="w-4 h-4" style={{ color: '#D4AF37' }} />
          </motion.div>
        ) : (
          <motion.div
            key="not-arrived"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
          >
            <UserX className="w-4 h-4" />
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* ラベル */}
      <span className="whitespace-nowrap">
        {isUpdating ? '更新中...' : isArrived ? '来店済' : '来店確認'}
      </span>
      
      {/* アクセントインジケーター */}
      {isArrived && !isUpdating && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute -top-1 -right-1 w-3 h-3 rounded-full"
          style={{ backgroundColor: '#D4AF37' }}
        >
          <Check className="w-3 h-3 text-white p-0.5" />
        </motion.div>
      )}
    </motion.button>
  );
}

/**
 * 来店ステータスバッジ（表示専用）
 */
interface ArrivalStatusBadgeProps {
  arrivedAt: string | null;
  noShowAt: string | null;
}

export function ArrivalStatusBadge({ arrivedAt, noShowAt }: ArrivalStatusBadgeProps) {
  if (arrivedAt) {
    const arrivedDate = new Date(arrivedAt);
    return (
      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-300">
        <UserCheck className="w-3.5 h-3.5" style={{ color: '#D4AF37' }} />
        <span className="text-xs font-bold text-amber-800">
          来店済 {arrivedDate.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    );
  }
  
  if (noShowAt) {
    return (
      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50 border border-red-200">
        <UserX className="w-3.5 h-3.5 text-red-600" />
        <span className="text-xs font-bold text-red-700">無断キャンセル</span>
      </div>
    );
  }
  
  return (
    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-50 border border-gray-200">
      <UserX className="w-3.5 h-3.5 text-gray-500" />
      <span className="text-xs font-bold text-gray-600">未来店</span>
    </div>
  );
}