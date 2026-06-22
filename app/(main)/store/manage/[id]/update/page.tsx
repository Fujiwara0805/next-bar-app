'use client';

/**
 * ============================================
 * ファイルパス: app/store/manage/[id]/page.tsx
 * 店舗管理ページ（来店チェック機能付き）
 * ラグジュアリーデザイン版
 * ============================================
 */

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Save,
  Loader2,
  Armchair,
  MessageCircle,
  LogOut,
  Key,
  Edit,
  Trash2,
  User,
  Users,
  CheckCircle2,
  XCircle,
  Download,
  PauseCircle,
  Clock,
  X,
  Phone,
  UserCheck,
  Sparkles,
  Store as StoreIcon,
  Utensils,
  Megaphone,
  QrCode,
  CalendarDays,
  Map,
  FileText,
  PartyPopper,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CloseCircleButton } from '@/components/ui/close-circle-button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useAuth } from '@/lib/auth/context';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { ArrivalToggleButton, ArrivalStatusBadge } from '@/components/reservation/ArrivalToggleButton';
import { PushNotificationManager } from '@/components/push-notification-manager';
import { useAppMode } from '@/lib/app-mode-context';
import { useLanguage } from '@/lib/i18n/context';
import type { Database } from '@/lib/supabase/types';
import type { StoreEventParticipation, StoreEventRow } from '@/lib/types/platform-event';

type Store = Database['public']['Tables']['stores']['Row'];
type StoreUpdate = Database['public']['Tables']['stores']['Update'];
type QuickReservation = Database['public']['Tables']['quick_reservations']['Row'];

/**
 * セクションヘッダーコンポーネント
 */
const SectionHeader = ({ icon: Icon, title }: { icon: React.ElementType; title: string }) => {
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

/**
 * ゴールド装飾ディバイダー
 */
const GoldDivider = () => {
  const { colorsB: COLORS } = useAppMode();
  return (
  <div className="flex items-center justify-center gap-3 my-4">
    <div className="h-px flex-1" style={{ backgroundColor: `${COLORS.champagneGold}40` }} />
    <div className="w-1.5 h-1.5 rotate-45" style={{ backgroundColor: COLORS.champagneGold }} />
    <div className="h-px flex-1" style={{ backgroundColor: `${COLORS.champagneGold}40` }} />
  </div>
  );
};

function fmtEventDate(iso: string | null): string {
  if (!iso) return '未設定';
  const date = new Date(iso);
  if (!Number.isFinite(date.getTime())) return '未設定';
  return date.toLocaleDateString('ja-JP', {
    timeZone: 'Asia/Tokyo',
    month: '2-digit',
    day: '2-digit',
  });
}

export default function StoreUpdatePage() {
  const { colorsB: COLORS } = useAppMode();

  /**
   * 空席状況の選択肢
   */
  const VACANCY_OPTIONS = [
    {
      value: 'vacant',
      label: '空席有',
      description: 'すぐに入店できます',
      color: '#3E8E6B',
      bgColor: 'rgba(34, 197, 94, 0.08)',
      borderColor: 'rgba(34, 197, 94, 0.3)',
      icon: CheckCircle2,
    },
    {
      value: 'full',
      label: '満席',
      description: '現在満席です',
      color: '#B3453F',
      bgColor: 'rgba(239, 68, 68, 0.08)',
      borderColor: 'rgba(239, 68, 68, 0.3)',
      icon: XCircle,
    },
    {
      value: 'open',
      label: '営業中',
      description: '営業中です。',
      color: COLORS.champagneGold,
      bgColor: 'rgba(201, 168, 108, 0.08)',
      borderColor: 'rgba(201, 168, 108, 0.3)',
      icon: StoreIcon,
    },
    {
      value: 'closed',
      label: '閉店',
      description: '臨時休業',
      color: COLORS.warmGray,
      bgColor: 'rgba(99, 110, 114, 0.08)',
      borderColor: 'rgba(99, 110, 114, 0.3)',
      icon: PauseCircle,
    },
  ] as const;
  const router = useRouter();
  const params = useParams();
  const { user, accountType, session, signOut } = useAuth();
  const { t } = useLanguage();

  // ルートの body 背景が透ける（オーバースクロール等）とき、カードエリアと同色に揃える
  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;
    const prevRoot = root.style.background;
    const prevBody = body.style.background;
    const bg = COLORS.cardGradient;
    root.style.background = bg;
    body.style.background = bg;
    return () => {
      root.style.background = prevRoot;
      body.style.background = prevBody;
    };
  }, [COLORS.cardGradient]);

  const [loading, setLoading] = useState(false);
  const [fetchingStore, setFetchingStore] = useState(true);
  const [store, setStore] = useState<Store | null>(null);
  
  // 認証チェック完了フラグ
  const [authChecked, setAuthChecked] = useState(false);
  
  // 店舗状況フォーム
  const [vacancyStatus, setVacancyStatus] = useState<'vacant' | 'open' | 'full' | 'closed'>('closed');
  const [statusMessage, setStatusMessage] = useState('');
  const [vacantSeats, setVacantSeats] = useState<number | null>(null);

  // 予約管理関連のstate
  const [reservations, setReservations] = useState<QuickReservation[]>([]);
  const [loadingReservations, setLoadingReservations] = useState(false);
  const [activeTab, setActiveTab] = useState('status');
  const [storeEvents, setStoreEvents] = useState<StoreEventRow[]>([]);
  const [loadingStoreEvents, setLoadingStoreEvents] = useState(false);
  const [savingEventId, setSavingEventId] = useState<string | null>(null);
  // 特典内容のドラフト（イベントID別）。保存はデバウンス
  const [benefitDrafts, setBenefitDrafts] = useState<Record<string, string>>({});
  const [savingBenefitEventId, setSavingBenefitEventId] = useState<string | null>(null);
  
  // 臨時休業中かどうかを表示するためのstate
  const [isManualClosed, setIsManualClosed] = useState(false);
  // 読み込み時点の空席ステータス（更新時に「能動的に閉店へ変更したか」を判定するため）
  const [initialVacancyStatus, setInitialVacancyStatus] = useState<'vacant' | 'open' | 'full' | 'closed'>('closed');

  const fetchStore = useCallback(async () => {
    // 認証情報が揃っていない場合は早期リターン
    if (!user || !params.id || !accountType) {
      return;
    }

    try {
      let query = supabase
        .from('stores')
        .select('*')
        .eq('id', params.id as string);

      // 運営会社アカウントの場合はowner_idでフィルタ
      if (accountType === 'platform') {
        query = query.eq('owner_id', user.id);
      }
      // 店舗アカウントの場合は、クエリ後にemailで認証チェックを行う

      const { data, error } = await query.single();

      if (error) {
        console.error('Error fetching store:', error);
        throw error;
      }

      if (data) {
        const storeData = data as Store;
        
        // 店舗アカウントの場合、emailで認証ユーザーと店舗を紐づけ確認
        if (accountType === 'store') {
          // emailが一致しない場合はアクセス権限なし
          if (storeData.email !== user.email) {
            console.error('Access denied: email mismatch', {
              storeEmail: storeData.email,
              userEmail: user.email,
            });
            toast.error('アクセス権限がありません', { position: 'top-center' });
            router.push('/login');
            return;
          }
        }
        
        setStore(storeData);
        
        // フォームに値を設定
        // 臨時休業中（manual_closed: true）の場合は 'closed' を選択状態に
        if (storeData.manual_closed) {
          setVacancyStatus('closed');
          setInitialVacancyStatus('closed');
          setIsManualClosed(true);
        } else {
          const loaded = storeData.vacancy_status as 'vacant' | 'open' | 'full' | 'closed';
          setVacancyStatus(loaded);
          setInitialVacancyStatus(loaded);
          setIsManualClosed(false);
        }
        
        setStatusMessage(storeData.status_message || '');
        setVacantSeats(storeData.vacant_seats ?? null);

        // 画像URLの設定

        // sessionStorageに保存（店舗編集画面で使用）
        try {
          sessionStorage.setItem(`store_${params.id}`, JSON.stringify(storeData));
        } catch (e) {
          console.error('Failed to save store data to sessionStorage:', e);
        }
      }
    } catch (error) {
      console.error('Error fetching store:', error);
      toast.error('店舗情報の取得に失敗しました', { position: 'top-center' });
      if (accountType === 'platform') {
        router.push('/store/manage');
      } else {
        router.push('/login');
      }
    } finally {
      setFetchingStore(false);
    }
  }, [user, params.id, accountType, router]);

  const fetchReservations = useCallback(async () => {
    if (!params.id) return;

    setLoadingReservations(true);
    try {
      const { data, error } = await supabase
        .from('quick_reservations')
        .select('*')
        .eq('store_id', params.id as string)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setReservations((data || []) as QuickReservation[]);
    } catch (error) {
      console.error('Error fetching reservations:', error);
      toast.error('予約データの取得に失敗しました', { 
        position: 'top-center',
        duration: 3000,
        className: 'bg-muted'
      });
    } finally {
      setLoadingReservations(false);
    }
  }, [params.id]);

  const fetchStoreEvents = useCallback(async () => {
    if (!params.id) return;
    setLoadingStoreEvents(true);
    try {
      const token = session?.access_token;
      if (!token) return;
      const res = await fetch(`/api/stores/${params.id}/events`, {
        cache: 'no-store',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const json = await res.json();
      const rows = (json.events ?? []) as StoreEventRow[];
      setStoreEvents(rows);
      // 特典ドラフトを既存値で初期化
      setBenefitDrafts((prev) => {
        const next = { ...prev };
        rows.forEach((row) => {
          if (next[row.id] === undefined) {
            next[row.id] = row.participation?.benefit_text ?? '';
          }
        });
        return next;
      });
    } catch (error) {
      console.warn('[store/update] fetch events warning', error);
      setStoreEvents([]);
    } finally {
      setLoadingStoreEvents(false);
    }
  }, [params.id, session?.access_token]);

  // 認証状態のチェック
  useEffect(() => {
    // accountTypeがまだ未確定（undefined）の場合は待機
    if (accountType === undefined) {
      return;
    }

    // 認証状態が確定した
    setAuthChecked(true);

    // 未ログインまたは不正なアカウントタイプの場合はリダイレクト
    if (!accountType || (accountType !== 'platform' && accountType !== 'store')) {
      router.push('/login');
      return;
    }
  }, [accountType, router]);

  // 認証チェック完了後にデータを取得
  useEffect(() => {
    // 認証チェックが完了し、ユーザー情報が揃っている場合のみ実行
    if (!authChecked || !user || !accountType || !params.id) {
      return;
    }

    // アカウントタイプが有効な場合のみデータ取得
    if (accountType === 'platform' || accountType === 'store') {
      fetchStore();
      fetchReservations();
      fetchStoreEvents();
    }
  }, [authChecked, user, accountType, params.id, fetchStore, fetchReservations, fetchStoreEvents]);

  const updateEventParticipation = async (
    eventId: string,
    isParticipating: boolean
  ) => {
    if (!params.id) return;
    setSavingEventId(eventId);
    try {
      const token = session?.access_token;
      if (!token) throw new Error('session_missing');
      const res = await fetch(`/api/stores/${params.id}/events`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          event_id: eventId,
          is_participating: isParticipating,
          notes: null,
          benefit_text: benefitDrafts[eventId] ?? null,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (json?.error === 'table_missing') {
          toast.error('イベント参加設定用テーブルが未作成です', {
            description: 'docs/database-events-and-customer-notes.sql を適用してください',
            position: 'top-center',
          });
          return;
        }
        throw new Error(json?.error ?? `save_failed:${res.status}`);
      }
      const participation = json.participation as StoreEventParticipation;
      setStoreEvents((prev) =>
        prev.map((event) =>
          event.id === eventId ? { ...event, participation } : event
        )
      );
      toast.success(isParticipating ? 'イベント参加をONにしました' : 'イベント参加をOFFにしました', {
        position: 'top-center',
        duration: 1200,
      });
    } catch (error) {
      console.error('[store/update] save event participation error', error);
      toast.error('イベント参加設定の保存に失敗しました', { position: 'top-center' });
    } finally {
      setSavingEventId(null);
    }
  };

  // 特典テキストのデバウンス保存（800ms）
  const persistBenefitText = useCallback(
    async (eventId: string, isParticipating: boolean, value: string) => {
      if (!params.id) return;
      setSavingBenefitEventId(eventId);
      try {
        const token = session?.access_token;
        if (!token) throw new Error('session_missing');
        const res = await fetch(`/api/stores/${params.id}/events`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            event_id: eventId,
            is_participating: isParticipating,
            notes: null,
            benefit_text: value.trim() ? value.trim() : null,
          }),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json?.error ?? `save_failed:${res.status}`);
        const participation = json.participation as StoreEventParticipation;
        setStoreEvents((prev) =>
          prev.map((event) =>
            event.id === eventId ? { ...event, participation } : event
          )
        );
      } catch (error) {
        console.error('[store/update] save benefit error', error);
        toast.error('特典内容の保存に失敗しました', { position: 'top-center' });
      } finally {
        setSavingBenefitEventId(null);
      }
    },
    [params.id, session?.access_token]
  );

  // debounce timer per event id
  useEffect(() => {
    const timers: number[] = [];
    Object.entries(benefitDrafts).forEach(([eventId, value]) => {
      const event = storeEvents.find((e) => e.id === eventId);
      if (!event || !event.participation?.is_participating) return;
      const current = event.participation.benefit_text ?? '';
      if ((value ?? '').trim() === current.trim()) return;
      const timerId = window.setTimeout(() => {
        persistBenefitText(eventId, true, value);
      }, 800);
      timers.push(timerId);
    });
    return () => {
      timers.forEach((t) => window.clearTimeout(t));
    };
  }, [benefitDrafts, storeEvents, persistBenefitText]);

  const handleStatusSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user || !params.id) {
      toast.error('エラーが発生しました', { 
        position: 'top-center',
        duration: 3000,
        className: 'bg-muted'
      });
      return;
    }

    setLoading(true);

    try {
      const token = session?.access_token;
      if (!token) {
        toast.error('セッションが切れています', {
          position: 'top-center',
          duration: 3000,
          className: 'bg-muted'
        });
        return;
      }

      const isClosed = vacancyStatus === 'closed';
      const now = new Date().toISOString();

      // 「閉店」状態のまま更新ボタンを押しただけで意図せず臨時休業にならないようにする。
      // 臨時休業（manual_closed）にするのは、
      //   ① 元々臨時休業だった（その状態を維持して更新する）
      //   ② このセッションで能動的に他ステータスから「閉店」へ変更した
      // のいずれかの場合のみ。自動的に閉店表示になっていた店をそのまま更新した場合は維持しない。
      const changedToClosed = isClosed && initialVacancyStatus !== 'closed';
      const shouldManualClose = isClosed && (isManualClosed || changedToClosed);

      /**
       * 更新データの構築
       * ここで明示的に closed_reason を制御します。
       */
      const updateData: StoreUpdate = {
        vacancy_status: vacancyStatus,
        status_message: statusMessage.trim() || null,
        is_open: !isClosed,
        vacant_seats: vacancyStatus === 'vacant' && vacantSeats !== null ? vacantSeats : null,
        last_updated: now,
        updated_at: now,
        manual_closed: shouldManualClose,
      };

      if (shouldManualClose) {
        // --- 閉店（臨時休業）にする場合 ---
        updateData.closed_reason = 'manual';
        updateData.manual_closed_at = now;
      } else {
        // --- 臨時休業フラグを立てない場合（営業再開／自動閉店の維持） ---
        // 【重要】closed_reasonをnullにする
        updateData.closed_reason = null;
        updateData.manual_closed_at = null;

        // API同期のキャッシュを無効化し、次回同期で正確な情報を取得させる
        updateData.last_is_open_check_at = null;
      }

      const response = await fetch(`/api/stores/${params.id}/vacancy-status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Update failed');
      }

      // 成功メッセージ
      let successMessage = '更新が完了しました';
      if (shouldManualClose) {
        successMessage = '臨時休業を設定しました';
      } else if (isManualClosed && !isClosed) {
        // 臨時休業中から営業中に変更した場合
        successMessage = '営業を再開しました';
      }

      toast.success(successMessage, { 
        position: 'top-center',
        duration: 2000,
        className: 'bg-muted'
      });
      
      // 状態を更新
      setIsManualClosed(shouldManualClose);
      setInitialVacancyStatus(vacancyStatus);
      
      if (accountType === 'store') {
        fetchStore();
        // 状況更新後に LP（ランディング）へ遷移
        setTimeout(() => {
          router.push('/landing');
        }, 1500);
      } else {
        router.push('/store/manage');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('更新に失敗しました', { 
        position: 'top-center',
        duration: 3000,
        className: 'bg-muted'
      });
    } finally {
      setLoading(false);
    }
  };

  /**
   * 予約の来店ステータス更新ハンドラー
   * ArrivalToggleButton からのコールバック
   */
  const handleReservationUpdate = useCallback((updatedReservation: QuickReservation) => {
    setReservations(prev => 
      prev.map(r => r.id === updatedReservation.id ? updatedReservation : r)
    );
  }, []);

  const handleDeleteReservation = async (reservationId: string) => {
    try {
      const updateData: Database['public']['Tables']['quick_reservations']['Update'] = {
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      const { error } = await supabase
        .from('quick_reservations')
        // @ts-ignore - Supabaseの型推論の問題を回避
        .update(updateData)
        .eq('id', reservationId);

      if (error) throw error;

      setReservations(prev => prev.filter(r => r.id !== reservationId));
      toast.success('予約カードを削除しました', {
        position: 'top-center',
        duration: 2000,
        className: 'bg-muted'
      });
    } catch (error) {
      console.error('Error deleting reservation:', error);
      toast.error('削除に失敗しました', { position: 'top-center' });
    }
  };

  const handleExportCSV = async () => {
    if (!params.id || !store) return;

    try {
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth();
      const startDate = new Date(year, month, 1);
      const endDate = new Date(year, month + 1, 0, 23, 59, 59);

      const { data: monthlyReservations, error } = await supabase
        .from('quick_reservations')
        .select('*')
        .eq('store_id', params.id as string)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;

      const reservationsData = (monthlyReservations || []) as QuickReservation[];

      const statusLabels: Record<string, string> = {
        pending: '保留中',
        confirmed: '承認',
        rejected: '拒否',
        cancelled: 'キャンセル',
        expired: '期限切れ',
      };

      // CSV ヘッダーに来店状況を追加
      const headers = ['No', '受付時刻', '名前', '電話番号', '人数', '到着予定', 'ステータス', '来店状況', '来店時刻'];
      
      const csvRows = reservationsData.map((reservation, index) => {
        const createdAt = new Date(reservation.created_at ?? Date.now());
        const arrivalTime = new Date(reservation.arrival_time ?? Date.now());
        const arrivedAt = reservation.arrived_at ? new Date(reservation.arrived_at) : null;
        
        // 来店状況の判定
        let arrivalStatus = '未来店';
        if (reservation.arrived_at) {
          arrivalStatus = '来店済';
        } else if (reservation.no_show_at) {
          arrivalStatus = '無断キャンセル';
        }
        
        return [
          (index + 1).toString(),
          createdAt.toLocaleString('ja-JP', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
          }),
          reservation.caller_name || '未入力',
          reservation.caller_phone,
          `${reservation.party_size}名`,
          arrivalTime.toLocaleString('ja-JP', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
          }),
          statusLabels[reservation.status] || reservation.status,
          arrivalStatus,
          arrivedAt ? arrivedAt.toLocaleString('ja-JP', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
          }) : '-',
        ];
      });

      const escapeCSV = (value: string): string => {
        if (value.includes(',') || value.includes('"') || value.includes('\n')) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      };

      const csvContent = [
        headers.map(escapeCSV).join(','),
        ...csvRows.map(row => row.map(escapeCSV).join(','))
      ].join('\n');

      const BOM = '\uFEFF';
      const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${store.name}_${year}年${month + 1}月_予約データ.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success('CSVファイルを出力しました', {
        position: 'top-center',
        duration: 2000,
        className: 'bg-muted'
      });
    } catch (error) {
      console.error('Error exporting CSV:', error);
      toast.error('CSV出力に失敗しました', {
        position: 'top-center',
        duration: 3000,
        className: 'bg-muted'
      });
    }
  };

  const handleSignOut = async () => {
    try {
      // signOut() が /login へフルリロード遷移する
      await signOut();
    } catch (error) {
      toast.error('ログアウトに失敗しました', {
        position: 'top-center',
        duration: 3000,
        className: 'bg-muted'
      });
    }
  };

  // 認証チェック中またはデータ取得中のローディング表示
  if (!authChecked || fetchingStore) {
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

  if (!store) {
    return null;
  }

  return (
    <div 
      className="min-h-[100dvh] pb-20"
      style={{ background: COLORS.cardGradient }}
    >
      <PushNotificationManager />
      {/* ヘッダー */}
      <header 
        className="sticky top-0 z-20 safe-top"
        style={{ 
          background: COLORS.luxuryGradient,
          borderBottom: `1px solid rgba(201, 168, 108, 0.2)`,
        }}
      >
        <div className="flex items-center justify-center p-4 relative">
          <div className="flex items-center gap-2">
            <h1 
              className="text-lg font-light tracking-widest"
              style={{ color: COLORS.ivory }}
            >
              店舗管理画面
            </h1>
          </div>
          <CloseCircleButton
            type="button"
            size="lg"
            onClick={() => router.push('/store-list')}
            className="absolute right-4"
            aria-label="閉じる"
          />
        </div>
      </header>

      <div className="max-w-4xl mx-auto p-4">
        {/* 店舗カード */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card
            className="p-6 mb-6 rounded-2xl shadow-lg"
            style={{
              background: '#FFFFFF',
              border: `1px solid rgba(201, 168, 108, 0.15)`,
            }}
          >
            <div className="flex gap-4 mb-4">
              {store.image_urls && store.image_urls.length > 0 ? (
                <img
                  src={store.image_urls[0]}
                  alt={store.name}
                  className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl object-cover flex-shrink-0"
                  style={{ border: `1px solid rgba(201, 168, 108, 0.25)` }}
                />
              ) : (
                <div
                  className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{
                    background: 'rgba(201, 168, 108, 0.08)',
                    border: `1px solid rgba(201, 168, 108, 0.2)`,
                  }}
                >
                  <Utensils className="w-8 h-8" style={{ color: COLORS.warmGray }} />
                </div>
              )}
              <div className="flex-1 min-w-0 flex flex-col justify-center">
                <h2
                  className="text-xl sm:text-2xl font-bold leading-tight line-clamp-2"
                  style={{ color: COLORS.deepNavy }}
                >
                  {store.name}
                </h2>
                <div className="flex items-center gap-3 mt-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => router.push(`/store/manage/${store.id}/qr`)}
                    className="inline-flex items-center gap-2 text-sm font-semibold transition-opacity hover:opacity-80"
                    style={{ color: COLORS.deepNavy }}
                  >
                    <QrCode className="w-4 h-4 shrink-0" />
                    会員証の読取・QR提示
                  </button>
                </div>
              </div>
            </div>
            <div>
              <div className="grid grid-cols-3 gap-2">
                <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => router.push(`/store/manage/${store.id}/edit`)}
                    className="w-full rounded-xl font-bold shadow-md border-0 hover:opacity-95 [&_svg]:stroke-[currentColor]"
                    style={{
                      background: COLORS.goldGradient,
                      color: COLORS.deepNavy,
                    }}
                  >
                    <Edit className="w-4 h-4 mr-1.5 shrink-0" strokeWidth={2} />
                    編集
                  </Button>
                </motion.div>
                <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => router.push(`/store/manage/${store.id}/change-password`)}
                    className="w-full rounded-xl font-bold shadow-md border-0 hover:opacity-95 [&_svg]:stroke-[currentColor]"
                    style={{
                      background: COLORS.goldGradient,
                      color: COLORS.deepNavy,
                    }}
                  >
                    <Key className="w-4 h-4 mr-1.5 shrink-0" strokeWidth={2} />
                    変更
                  </Button>
                </motion.div>
                <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => router.push(`/store/manage/${store.id}/engagement`)}
                    className="w-full rounded-xl font-bold shadow-md border-0 hover:opacity-95 [&_svg]:stroke-[currentColor]"
                    style={{
                      background: COLORS.goldGradient,
                      color: COLORS.deepNavy,
                    }}
                  >
                    <Megaphone className="w-4 h-4 mr-1.5 shrink-0" strokeWidth={2} />
                    集客設定
                  </Button>
                </motion.div>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* タブ */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList 
              className="grid w-full grid-cols-2 rounded-xl p-1 mb-6"
              style={{ 
                background: 'rgba(10, 22, 40, 0.05)',
                border: `1px solid rgba(201, 168, 108, 0.15)`,
              }}
            >
              <TabsTrigger 
                value="status" 
                className="rounded-lg font-bold transition-all duration-200 data-[state=active]:!bg-[rgba(201,168,108,0.15)] data-[state=active]:shadow-md"
                style={{ 
                  color: activeTab === 'status' ? COLORS.deepNavy : COLORS.warmGray,
                }}
              >
                店舗状況
              </TabsTrigger>
              <TabsTrigger 
                value="reservations" 
                className="rounded-lg font-bold transition-all duration-200 data-[state=active]:!bg-[rgba(201,168,108,0.15)] data-[state=active]:shadow-md"
                style={{ 
                  color: activeTab === 'reservations' ? COLORS.deepNavy : COLORS.warmGray,
                }}
              >
                予約管理
              </TabsTrigger>
            </TabsList>

            {/* 店舗状況タブ */}
            <TabsContent value="status">
              <form onSubmit={handleStatusSubmit} className="space-y-6">
                <Card
                  className="p-6 rounded-2xl shadow-lg"
                  style={{
                    background: '#FFFFFF',
                    border: `1px solid rgba(19, 41, 75, 0.12)`,
                  }}
                >
                  <div className="mb-4 flex items-center gap-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="p-2 rounded-lg"
                        style={{
                          background: COLORS.goldGradient,
                          boxShadow: '0 2px 8px rgba(255, 200, 44, 0.22)',
                        }}
                      >
                        <CalendarDays className="w-4 h-4" style={{ color: COLORS.deepNavy }} />
                      </div>
                      <h2 className="text-lg font-bold" style={{ color: COLORS.deepNavy }}>
                        イベント参加設定
                      </h2>
                    </div>
                  </div>
                  {loadingStoreEvents ? (
                    <div className="flex items-center gap-2 text-sm" style={{ color: COLORS.warmGray }}>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      イベントを確認中...
                    </div>
                  ) : storeEvents.length === 0 ? (
                    <div
                      className="rounded-xl p-4 text-sm font-semibold"
                      style={{
                        background: 'rgba(19, 41, 75, 0.04)',
                        border: '1px solid rgba(19, 41, 75, 0.08)',
                        color: COLORS.warmGray,
                      }}
                    >
                      現在参加設定できるイベントはありません。
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {storeEvents.map((event) => {
                        const participating = !!event.participation?.is_participating;
                        const saving = savingEventId === event.id;
                        return (
                          <div
                            key={event.id}
                            className="rounded-xl p-4"
                            style={{
                              background: participating
                                ? 'rgba(255, 200, 44, 0.12)'
                                : 'rgba(19, 41, 75, 0.03)',
                              border: `1px solid ${
                                participating
                                  ? 'rgba(255, 200, 44, 0.42)'
                                  : 'rgba(19, 41, 75, 0.08)'
                              }`,
                            }}
                          >
                            <div className="flex items-center gap-2">
                              <PartyPopper className="w-5 h-5 shrink-0" style={{ color: '#13294b' }} />
                              <p className="min-w-0 flex-1 text-base font-bold leading-tight" style={{ color: COLORS.deepNavy }}>
                                {event.title}
                              </p>
                              {saving && <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" style={{ color: '#13294b' }} />}
                              <span className="text-[11px] font-bold" style={{ color: COLORS.warmGray }}>
                                参加
                              </span>
                              <button
                                type="button"
                                disabled={saving}
                                onClick={() =>
                                  updateEventParticipation(event.id, !participating)
                                }
                                aria-pressed={participating}
                                aria-label={participating ? 'イベント参加をOFFにする' : 'イベント参加をONにする'}
                                className="relative inline-flex h-6 w-11 shrink-0 items-center rounded-full px-0.5 transition-opacity disabled:cursor-not-allowed disabled:opacity-60"
                                style={{
                                  background: participating ? '#13294b' : '#F7F3E9',
                                  border: `1px solid ${participating ? '#13294b' : 'rgba(19, 41, 75, 0.18)'}`,
                                }}
                              >
                                <span
                                  className="absolute h-5 w-5 rounded-full transition-all"
                                  style={{
                                    background: participating ? '#ffc82c' : '#13294b',
                                    left: participating ? 'calc(100% - 22px)' : '2px',
                                  }}
                                />
                              </button>
                            </div>
                            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm font-semibold" style={{ color: COLORS.warmGray }}>
                              <span className="inline-flex items-center gap-1.5">
                                <CalendarDays className="w-4 h-4 shrink-0" style={{ color: '#13294b' }} />
                                {fmtEventDate(event.start_at)} - {fmtEventDate(event.end_at)}
                              </span>
                              {event.area_label && (
                                <span className="inline-flex items-center gap-1.5">
                                  <Map className="w-4 h-4 shrink-0" style={{ color: '#13294b' }} />
                                  {event.area_label}
                                </span>
                              )}
                            </div>
                            {event.description && (
                              <div className="mt-3 flex items-start gap-2">
                                <FileText className="w-4 h-4 mt-0.5 shrink-0" style={{ color: '#13294b' }} />
                                <p className="text-sm leading-relaxed line-clamp-3" style={{ color: COLORS.charcoal }}>
                                  {event.description}
                                </p>
                              </div>
                            )}
                            {participating && (
                              <div className="mt-4">
                                <div className="flex items-center justify-between mb-1.5">
                                  <Label
                                    htmlFor={`benefit-${event.id}`}
                                    className="text-xs font-bold inline-flex items-center gap-1.5"
                                    style={{ color: COLORS.deepNavy }}
                                  >
                                    <PartyPopper className="w-3.5 h-3.5" style={{ color: '#13294b' }} />
                                    お客様への特典（任意）
                                  </Label>
                                  {savingBenefitEventId === event.id && (
                                    <Loader2 className="w-3 h-3 animate-spin" style={{ color: COLORS.warmGray }} />
                                  )}
                                </div>
                                <Textarea
                                  id={`benefit-${event.id}`}
                                  value={benefitDrafts[event.id] ?? ''}
                                  onChange={(e) =>
                                    setBenefitDrafts((prev) => ({ ...prev, [event.id]: e.target.value }))
                                  }
                                  placeholder="例: ご来店時にスタッフへお声掛けください。生ビール1杯サービス！"
                                  rows={2}
                                  maxLength={200}
                                  className="rounded-lg border-2 font-medium transition-all focus:border-[#335280] focus:ring-2 focus:ring-[#335280]/20"
                                  style={{
                                    fontSize: '14px',
                                    borderColor: 'rgba(19, 41, 75, 0.18)',
                                    backgroundColor: '#ffffff',
                                    minHeight: '60px',
                                    resize: 'vertical',
                                  }}
                                />
                                <p className="text-[11px] text-right mt-0.5 font-medium" style={{ color: COLORS.warmGray }}>
                                  {(benefitDrafts[event.id] ?? '').length} / 200文字　未入力時は特典欄を非表示にします
                                </p>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </Card>

                <Card 
                  className="p-6 rounded-2xl shadow-lg"
                  style={{ 
                    background: '#FFFFFF',
                    border: `1px solid rgba(201, 168, 108, 0.15)`,
                  }}
                >
                  <SectionHeader icon={Armchair} title="空席状況" />

                  <RadioGroup
                    value={vacancyStatus}
                    onValueChange={(value) => setVacancyStatus(value as typeof vacancyStatus)}
                    className="space-y-3"
                  >
                    {VACANCY_OPTIONS.map((option) => {
                      const IconComponent = option.icon;
                      const isSelected = vacancyStatus === option.value;
                      return (
                        <motion.div
                          key={option.value}
                          whileTap={{ scale: 0.98 }}
                        >
                          <Label
                            htmlFor={option.value}
                            className="flex items-start gap-3 p-4 rounded-xl cursor-pointer transition-all duration-200"
                            style={{ 
                              backgroundColor: isSelected ? option.bgColor : 'rgba(0, 0, 0, 0.02)',
                              border: isSelected 
                                ? `2px solid ${option.borderColor.replace('0.3', '0.6')}` 
                                : '2px solid rgba(0, 0, 0, 0.05)',
                            }}
                          >
                            <RadioGroupItem
                              value={option.value}
                              id={option.value}
                              className="mt-1"
                            />
                            <div className="flex-1">
                              <div 
                                className="font-bold mb-1 flex items-center gap-2"
                                style={{ color: option.color }}
                              >
                                {IconComponent && <IconComponent className="w-4 h-4" />}
                                {option.label}
                              </div>
                              {option.description && (
                                <div 
                                  className="text-sm font-medium"
                                  style={{ color: COLORS.warmGray }}
                                >
                                  {option.description}
                                </div>
                              )}
                            </div>
                          </Label>
                        </motion.div>
                      );
                    })}
                  </RadioGroup>

                </Card>

                {/* 空席数入力（空席ありの場合のみ表示） */}
                {vacancyStatus === 'vacant' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                  >
                    <Card
                      className="p-6 rounded-2xl shadow-lg"
                      style={{
                        background: '#FFFFFF',
                        border: `1px solid rgba(201, 168, 108, 0.15)`,
                      }}
                    >
                      <SectionHeader icon={Users} title="空席数" />
                      <div className="space-y-2">
                        <Label
                          htmlFor="vacantSeats"
                          className="font-bold text-sm"
                          style={{ color: COLORS.deepNavy }}
                        >
                          空席数（任意）
                        </Label>
                        <Input
                          id="vacantSeats"
                          type="text"
                          inputMode="numeric"
                          value={vacantSeats !== null ? vacantSeats : ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === '') {
                              setVacantSeats(null);
                            } else {
                              const num = parseInt(val);
                              if (!isNaN(num) && num >= 0) {
                                setVacantSeats(num);
                              }
                            }
                          }}
                          placeholder="例: 5"
                          disabled={loading}
                          className="rounded-xl border-2 font-medium transition-all duration-200 focus:border-[#335280] focus:ring-2 focus:ring-[#335280]/20"
                          style={{
                            fontSize: '16px',
                            borderColor: 'rgba(201, 168, 108, 0.3)',
                            backgroundColor: '#ffffff',
                          }}
                        />
                        <p className="text-xs" style={{ color: COLORS.warmGray }}>
                          空席数を入力すると、お客様に表示されます
                        </p>
                      </div>
                    </Card>
                  </motion.div>
                )}

                <Card 
                  className="p-6 rounded-2xl shadow-lg"
                  style={{ 
                    background: '#FFFFFF',
                    border: `1px solid rgba(201, 168, 108, 0.15)`,
                  }}
                >
                  <SectionHeader icon={MessageCircle} title="一言メッセージ" />

                  <div className="space-y-2">
                    <Label 
                      htmlFor="message" 
                      className="font-bold text-sm"
                      style={{ color: COLORS.deepNavy }}
                    >
                      お客様へのメッセージ（任意）
                    </Label>
                    <Textarea
                      id="message"
                      value={statusMessage}
                      onChange={(e) => setStatusMessage(e.target.value)}
                      placeholder="例: 本日のおすすめは生ビール半額です！"
                      rows={4}
                      maxLength={200}
                      className="rounded-xl border-2 font-medium transition-all duration-200 focus:border-[#335280] focus:ring-2 focus:ring-[#335280]/20"
                      style={{ 
                        fontSize: '16px',
                        borderColor: 'rgba(201, 168, 108, 0.3)',
                        backgroundColor: '#ffffff',
                        minHeight: '100px',
                        resize: 'vertical',
                      }}
                    />
                    <p 
                      className="text-xs text-right font-medium"
                      style={{ color: COLORS.warmGray }}
                    >
                      {statusMessage.length} / 200文字
                    </p>
                  </div>
                </Card>

                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button
                    type="submit"
                    className="w-full py-4 rounded-xl font-bold text-base shadow-lg"
                    disabled={loading}
                    size="lg"
                    style={{ 
                      background: COLORS.goldGradient,
                      color: COLORS.deepNavy,
                      boxShadow: '0 8px 25px rgba(201, 168, 108, 0.35)',
                    }}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        更新中...
                      </>
                    ) : (
                      <>
                        <Save className="w-5 h-5 mr-2" />
                        店舗状況を更新
                      </>
                    )}
                  </Button>
                </motion.div>
              </form>
            </TabsContent>

            {/* 予約管理タブ */}
            <TabsContent value="reservations">
              <div className="space-y-4">
                {/* 来店確認の説明カード */}
                <Card 
                  className="p-4 rounded-xl"
                  style={{ 
                    background: 'rgba(201, 168, 108, 0.08)',
                    border: `1px solid rgba(201, 168, 108, 0.2)`,
                  }}
                >
                  <div className="flex items-start gap-3">
                    <UserCheck className="w-5 h-5 mt-0.5" style={{ color: COLORS.champagneGold }} />
                    <div>
                      <p className="text-sm font-bold" style={{ color: COLORS.deepNavy }}>
                        来店確認機能
                      </p>
                      <p className="text-xs mt-1" style={{ color: COLORS.charcoal }}>
                        承認済みの予約に対して「来店確認」ボタンをタップすると、来店済みとして記録されます。
                      </p>
                    </div>
                  </div>
                </Card>

                {loadingReservations ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin" style={{ color: COLORS.champagneGold }} />
                  </div>
                ) : reservations.length === 0 ? (
                  <Card 
                    className="p-6 rounded-2xl"
                    style={{ 
                      background: '#FFFFFF',
                      border: `1px solid rgba(201, 168, 108, 0.15)`,
                    }}
                  >
                    <p 
                      className="text-center font-bold"
                      style={{ color: COLORS.warmGray }}
                    >
                      予約データがありません
                    </p>
                  </Card>
                ) : (
                  <div className="space-y-4">
                    {reservations.map((reservation) => {
                      const createdAt = new Date(reservation.created_at ?? Date.now());
                      const arrivalTime = new Date(reservation.arrival_time ?? Date.now());
                      const statusLabels: Record<string, { label: string; color: string; bgColor: string; icon: React.ReactNode }> = {
                        pending: { 
                          label: '保留中', 
                          color: COLORS.champagneGold, 
                          bgColor: 'rgba(201, 168, 108, 0.08)', 
                          icon: <Clock className="w-4 h-4" /> 
                        },
                        confirmed: { 
                          label: '承認', 
                          color: '#3E8E6B', 
                          bgColor: 'rgba(34, 197, 94, 0.08)', 
                          icon: <CheckCircle2 className="w-4 h-4" /> 
                        },
                        rejected: { 
                          label: '拒否', 
                          color: '#B3453F', 
                          bgColor: 'rgba(239, 68, 68, 0.08)', 
                          icon: <XCircle className="w-4 h-4" /> 
                        },
                        cancelled: { 
                          label: 'キャンセル', 
                          color: COLORS.warmGray, 
                          bgColor: 'rgba(99, 110, 114, 0.08)', 
                          icon: <X className="w-4 h-4" /> 
                        },
                        expired: { 
                          label: '期限切れ', 
                          color: COLORS.warmGray, 
                          bgColor: 'rgba(99, 110, 114, 0.08)', 
                          icon: <Clock className="w-4 h-4" /> 
                        },
                      };
                      const statusInfo = statusLabels[reservation.status] || statusLabels.pending;

                      return (
                        <motion.div
                          key={reservation.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                        >
                          <Card 
                            className="p-6 relative rounded-2xl shadow-lg"
                            style={{ 
                              background: '#FFFFFF',
                              border: `1px solid rgba(201, 168, 108, 0.15)`,
                            }}
                          >
                            {/* 削除ボタン */}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="absolute top-4 right-4 rounded-lg hover:bg-destructive/10 text-destructive"
                              onClick={() => handleDeleteReservation(reservation.id)}
                              title="削除"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                            <div className="space-y-3">
                              {/* 1行目: ステータスバッジ + 電話受付時刻 */}
                              <div className="flex items-center justify-between pr-10">
                                <div 
                                  className="flex items-center gap-2 px-3 py-1.5 rounded-full"
                                  style={{ 
                                    backgroundColor: statusInfo.bgColor,
                                    color: statusInfo.color,
                                    border: `1px solid ${statusInfo.color}30`,
                                  }}
                                >
                                  {statusInfo.icon}
                                  <span className="text-sm font-bold">{statusInfo.label}</span>
                                </div>
                                <div className="text-right">
                                  <p className="text-xs font-medium" style={{ color: COLORS.warmGray }}>電話受付時刻</p>
                                  <p className="text-sm font-bold" style={{ color: COLORS.deepNavy }}>
                                    {createdAt.toLocaleString('ja-JP', {
                                      month: '2-digit',
                                      day: '2-digit',
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })}
                                  </p>
                                </div>
                              </div>

                              <GoldDivider />

                              {/* 2行目: 名前 + 電話番号 */}
                              <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <User className="w-4 h-4" style={{ color: COLORS.champagneGold }} />
                                    <span className="text-xs font-medium" style={{ color: COLORS.warmGray }}>名前</span>
                                  </div>
                                  <p className="text-base font-bold" style={{ color: COLORS.deepNavy }}>
                                    {reservation.caller_name || '未入力'}
                                  </p>
                                </div>

                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <Phone className="w-4 h-4" style={{ color: COLORS.champagneGold }} />
                                    <span className="text-xs font-medium" style={{ color: COLORS.warmGray }}>電話番号</span>
                                  </div>
                                  <p className="text-base font-bold" style={{ color: COLORS.deepNavy }}>
                                    {reservation.caller_phone}
                                  </p>
                                </div>
                              </div>

                              {/* 3行目: 人数 + 到着予定時刻 */}
                              <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <Users className="w-4 h-4" style={{ color: COLORS.champagneGold }} />
                                    <span className="text-xs font-medium" style={{ color: COLORS.warmGray }}>人数</span>
                                  </div>
                                  <p className="text-base font-bold" style={{ color: COLORS.deepNavy }}>
                                    {reservation.party_size}名
                                  </p>
                                </div>

                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <Clock className="w-4 h-4" style={{ color: COLORS.champagneGold }} />
                                    <span className="text-xs font-medium" style={{ color: COLORS.warmGray }}>到着予定時刻</span>
                                  </div>
                                  <p className="text-base font-bold" style={{ color: COLORS.deepNavy }}>
                                    {arrivalTime.toLocaleString('ja-JP', {
                                      month: '2-digit',
                                      day: '2-digit',
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })}
                                  </p>
                                </div>
                              </div>

                              {/* 来店確認セクション */}
                              <div 
                                className="pt-3 mt-3 rounded-xl p-3"
                                style={{ 
                                  backgroundColor: 'rgba(201, 168, 108, 0.05)',
                                  border: `1px solid rgba(201, 168, 108, 0.1)`,
                                }}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <UserCheck className="w-4 h-4" style={{ color: COLORS.champagneGold }} />
                                    <span className="text-sm font-bold" style={{ color: COLORS.charcoal }}>来店状況</span>
                                  </div>
                                  
                                  {/* 来店チェックトグルボタン */}
                                  <ArrivalToggleButton
                                    reservation={reservation}
                                    onUpdate={handleReservationUpdate}
                                  />
                                </div>
                                
                                {/* 来店済みの場合、来店時刻を表示 */}
                                {reservation.arrived_at && (
                                  <motion.div
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="mt-2 text-right"
                                  >
                                    <span className="text-xs font-bold" style={{ color: COLORS.champagneGold }}>
                                      来店時刻: {new Date(reservation.arrived_at).toLocaleString('ja-JP', {
                                        month: '2-digit',
                                        day: '2-digit',
                                        hour: '2-digit',
                                        minute: '2-digit',
                                      })}
                                    </span>
                                  </motion.div>
                                )}
                              </div>

                              {/* 拒否理由 */}
                              {reservation.status === 'rejected' && reservation.rejection_reason && (
                                <div className="pt-2 border-t" style={{ borderColor: 'rgba(201, 168, 108, 0.2)' }}>
                                  <p className="text-sm font-medium" style={{ color: COLORS.warmGray }}>拒否理由</p>
                                  <p className="text-sm font-bold mt-1" style={{ color: COLORS.charcoal }}>
                                    {reservation.rejection_reason}
                                  </p>
                                </div>
                              )}
                            </div>
                          </Card>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </motion.div>

        {/* 店舗アカウント用のボタン */}
        {accountType === 'store' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-6 space-y-3"
          >
            {activeTab === 'reservations' && (
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button
                  type="button"
                  className="w-full py-4 rounded-xl font-bold text-white shadow-lg"
                  style={{ 
                    background: COLORS.luxuryGradient,
                    boxShadow: '0 4px 15px rgba(10, 22, 40, 0.3)',
                  }}
                  onClick={handleExportCSV}
                >
                  <Download className="w-5 h-5 mr-2" />
                  データ出力（CSV）
                </Button>
              </motion.div>
            )}
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button
                type="button"
                variant="outline"
                className="w-full py-4 rounded-xl font-bold"
                style={{ 
                  borderColor: 'rgba(99, 110, 114, 0.3)',
                  backgroundColor: '#FFFFFF',
                  color: '#B3453F',
                }}
                onClick={handleSignOut}
              >
                <LogOut className="w-5 h-5 mr-2" />
                ログアウト
              </Button>
            </motion.div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
