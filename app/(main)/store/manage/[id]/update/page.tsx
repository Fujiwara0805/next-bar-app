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
  CircleDot,
  MessageSquare,
  LogOut,
  Key,
  Info,
  Image as ImageIcon,
  Edit,
  Trash2,
  ChevronDown,
  ChevronUp,
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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useAuth } from '@/lib/auth/context';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { ArrivalToggleButton, ArrivalStatusBadge } from '@/components/reservation/ArrivalToggleButton';
import type { Database } from '@/lib/supabase/types';

type Store = Database['public']['Tables']['stores']['Row'];
type StoreUpdate = Database['public']['Tables']['stores']['Update'];
type QuickReservation = Database['public']['Tables']['quick_reservations']['Row'];

// ============================================
// カラーパレット定義（店舗詳細画面準拠）
// ============================================
const COLORS = {
  // プライマリ
  deepNavy: '#0A1628',
  midnightBlue: '#162447',
  royalNavy: '#1F4068',
  
  // アクセント
  champagneGold: '#C9A86C',
  paleGold: '#E8D5B7',
  antiqueGold: '#B8956E',
  
  // ニュートラル
  charcoal: '#2D3436',
  warmGray: '#636E72',
  platinum: '#DFE6E9',
  ivory: '#FDFBF7',
  
  // グラデーション
  luxuryGradient: 'linear-gradient(165deg, #0A1628 0%, #162447 50%, #1F4068 100%)',
  goldGradient: 'linear-gradient(135deg, #C9A86C 0%, #E8D5B7 50%, #B8956E 100%)',
  cardGradient: 'linear-gradient(145deg, #FDFBF7 0%, #F5F1EB 100%)',
};

/**
 * 空席状況の選択肢
 */
const VACANCY_OPTIONS = [
  {
    value: 'vacant',
    label: '空席あり',
    description: 'すぐに入店できます',
    color: '#16a34a',
    bgColor: 'rgba(34, 197, 94, 0.08)',
    borderColor: 'rgba(34, 197, 94, 0.3)',
    icon: CheckCircle2,
  },
  {
    value: 'full',
    label: '満席',
    description: '現在満席です',
    color: '#dc2626',
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
    description: '営業時間外または臨時休業（12時間後に自動解除）',
    color: COLORS.warmGray,
    bgColor: 'rgba(99, 110, 114, 0.08)',
    borderColor: 'rgba(99, 110, 114, 0.3)',
    icon: PauseCircle,
  },
] as const;

/**
 * セクションヘッダーコンポーネント
 */
const SectionHeader = ({ icon: Icon, title }: { icon: React.ElementType; title: string }) => (
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

/**
 * ゴールド装飾ディバイダー
 */
const GoldDivider = () => (
  <div className="flex items-center justify-center gap-3 my-4">
    <div 
      className="h-px flex-1"
      style={{ background: `linear-gradient(90deg, transparent, ${COLORS.champagneGold}40)` }}
    />
    <div 
      className="w-1.5 h-1.5 rotate-45"
      style={{ backgroundColor: COLORS.champagneGold }}
    />
    <div 
      className="h-px flex-1"
      style={{ background: `linear-gradient(90deg, ${COLORS.champagneGold}40, transparent)` }}
    />
  </div>
);

export default function StoreUpdatePage() {
  const router = useRouter();
  const params = useParams();
  const { user, accountType, signOut } = useAuth();
  const [loading, setLoading] = useState(false);
  const [fetchingStore, setFetchingStore] = useState(true);
  const [store, setStore] = useState<Store | null>(null);
  
  // 認証チェック完了フラグ
  const [authChecked, setAuthChecked] = useState(false);
  
  // 店舗状況フォーム
  const [vacancyStatus, setVacancyStatus] = useState<'vacant' | 'open' | 'full' | 'closed'>('closed');
  const [statusMessage, setStatusMessage] = useState('');
  const [maleCount, setMaleCount] = useState(0);
  const [femaleCount, setFemaleCount] = useState(0);

  // 画像関連のstate
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [mainImageIndex, setMainImageIndex] = useState(0);

  // 予約管理関連のstate
  const [reservations, setReservations] = useState<QuickReservation[]>([]);
  const [loadingReservations, setLoadingReservations] = useState(false);
  const [activeTab, setActiveTab] = useState('status');
  
  // 男女数トグルのstate
  const [isGenderCountOpen, setIsGenderCountOpen] = useState(false);

  // 臨時休業中かどうかを表示するためのstate
  const [isManualClosed, setIsManualClosed] = useState(false);

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
          setIsManualClosed(true);
        } else {
          setVacancyStatus(storeData.vacancy_status as 'vacant' | 'open' | 'full' | 'closed');
          setIsManualClosed(false);
        }
        
        setStatusMessage(storeData.status_message || '');
        setMaleCount(storeData.male_ratio ?? 0);
        setFemaleCount(storeData.female_ratio ?? 0);

        // 画像URLの設定
        setImageUrls(storeData.image_urls || []);

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
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setReservations((data || []) as QuickReservation[]);
    } catch (error) {
      console.error('Error fetching reservations:', error);
      toast.error('予約データの取得に失敗しました', { 
        position: 'top-center',
        duration: 3000,
        className: 'bg-gray-100'
      });
    } finally {
      setLoadingReservations(false);
    }
  }, [params.id]);

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
    }
  }, [authChecked, user, accountType, params.id, fetchStore, fetchReservations]);

  const handleStatusSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user || !params.id) {
      toast.error('エラーが発生しました', { 
        position: 'top-center',
        duration: 3000,
        className: 'bg-gray-100'
      });
      return;
    }

    setLoading(true);

    try {
      const isClosed = vacancyStatus === 'closed';
      const now = new Date().toISOString();
      
      /**
       * 更新データの構築
       * ここで明示的に closed_reason を制御します。
       */
      const updateData: StoreUpdate = {
        vacancy_status: vacancyStatus,
        status_message: statusMessage.trim() || null,
        is_open: !isClosed,
        male_ratio: maleCount,
        female_ratio: femaleCount,
        last_updated: now,
        updated_at: now,
        manual_closed: isClosed, // 閉店ならtrue, それ以外はfalse
      };

      if (isClosed) {
        // --- 閉店（臨時休業）にする場合 ---
        updateData.closed_reason = 'manual';
        updateData.manual_closed_at = now;
      } else {
        // --- 営業再開（空席あり/混雑/満席）にする場合 ---
        // 【重要】closed_reasonをnullにする
        updateData.closed_reason = null;
        updateData.manual_closed_at = null;
        
        // API同期のキャッシュを無効化し、次回同期で正確な情報を取得させる
        updateData.last_is_open_check_at = null;
      }

      let query = supabase
        .from('stores')
        // @ts-ignore - Supabaseの型推論の問題を回避
        .update(updateData)
        .eq('id', params.id as string);

      // セキュリティチェック（念のため）
      if (accountType === 'platform') {
        query = query.eq('owner_id', user.id);
      }
      // 店舗アカウントの場合、emailでの追加チェックは行わない
      // （すでにfetchStoreでアクセス権限を確認済み）

      const { error } = await query;

      if (error) throw error;

      // 成功メッセージ
      let successMessage = '更新が完了しました';
      if (isClosed) {
        successMessage = '閉店を設定しました';
      } else if (isManualClosed) {
        // 臨時休業中から営業中に変更した場合
        successMessage = '営業を再開しました';
      }

      toast.success(successMessage, { 
        position: 'top-center',
        duration: 2000,
        className: 'bg-gray-100'
      });
      
      // 状態を更新
      setIsManualClosed(isClosed);
      
      if (accountType === 'store') {
        fetchStore();
      } else {
        router.push('/store/manage');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('更新に失敗しました', { 
        position: 'top-center',
        duration: 3000,
        className: 'bg-gray-100'
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

  const handleDeleteReservation = (reservationId: string) => {
    setReservations(prev => prev.filter(r => r.id !== reservationId));
    toast.success('予約カードを削除しました', { 
      position: 'top-center',
      duration: 2000,
      className: 'bg-gray-100'
    });
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
        const createdAt = new Date(reservation.created_at);
        const arrivalTime = new Date(reservation.arrival_time);
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
        className: 'bg-gray-100'
      });
    } catch (error) {
      console.error('Error exporting CSV:', error);
      toast.error('CSV出力に失敗しました', {
        position: 'top-center',
        duration: 3000,
        className: 'bg-gray-100'
      });
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success('ログアウトしました', { 
        position: 'top-center',
        duration: 1000,
        className: 'bg-gray-100'
      });
      router.push('/login');
    } catch (error) {
      toast.error('ログアウトに失敗しました', { 
        position: 'top-center',
        duration: 3000,
        className: 'bg-gray-100'
      });
    }
  };

  // 認証チェック中またはデータ取得中のローディング表示
  if (!authChecked || fetchingStore) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center"
        style={{ background: COLORS.luxuryGradient }}
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
      className="min-h-screen pb-20"
      style={{ background: COLORS.cardGradient }}
    >
      {/* ヘッダー */}
      <header 
        className="sticky top-0 z-10 safe-top"
        style={{ 
          background: COLORS.luxuryGradient,
          borderBottom: `1px solid rgba(201, 168, 108, 0.2)`,
        }}
      >
        <div className="flex items-center justify-center p-4">
          <div className="flex items-center gap-2">
            <h1 
              className="text-lg font-light tracking-widest"
              style={{ color: COLORS.ivory }}
            >
              店舗管理画面
            </h1>
          </div>
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
            <div className="flex items-start gap-4">
              {imageUrls.length > 0 ? (
                <img
                  src={imageUrls[mainImageIndex]}
                  alt={store.name}
                  className="w-24 h-24 rounded-xl object-cover shadow-md"
                  style={{ border: `2px solid rgba(201, 168, 108, 0.2)` }}
                />
              ) : (
                <div 
                  className="w-24 h-24 rounded-xl flex items-center justify-center"
                  style={{ 
                    background: 'rgba(201, 168, 108, 0.1)',
                    border: `2px solid rgba(201, 168, 108, 0.2)`,
                  }}
                >
                  <ImageIcon className="w-8 h-8" style={{ color: COLORS.champagneGold }} />
                </div>
              )}
              <div className="flex-1">
                <h2 
                  className="text-2xl font-bold mb-1"
                  style={{ color: COLORS.deepNavy }}
                >
                  {store.name}
                </h2>
                <p 
                  className="text-sm font-medium mb-3"
                  style={{ color: COLORS.warmGray }}
                >
                  {store.address}
                </p>
                <div className="flex gap-2 flex-wrap">
                  <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => router.push(`/store/manage/${store.id}/edit`)}
                      className="rounded-xl font-bold shadow-md"
                      style={{ 
                        background: COLORS.goldGradient,
                        color: COLORS.deepNavy,
                      }}
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      編集
                    </Button>
                  </motion.div>
                  {accountType === 'store' && (
                    <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => router.push(`/store/manage/${store.id}/change-password`)}
                        className="rounded-xl font-bold"
                        style={{ 
                          borderColor: 'rgba(201, 168, 108, 0.3)',
                          color: COLORS.charcoal,
                        }}
                      >
                        <Key className="w-4 h-4 mr-2" />
                        パスワード変更
                      </Button>
                    </motion.div>
                  )}
                </div>
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
                    border: `1px solid rgba(201, 168, 108, 0.15)`,
                  }}
                >
                  <SectionHeader icon={CircleDot} title="空席状況" />

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
                              <div 
                                className="text-sm font-medium"
                                style={{ color: COLORS.warmGray }}
                              >
                                {option.description}
                              </div>
                            </div>
                          </Label>
                        </motion.div>
                      );
                    })}
                  </RadioGroup>

                  {/* 閉店選択時の注意書き */}
                  {vacancyStatus === 'closed' && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="mt-4 p-4 rounded-xl"
                      style={{ 
                        backgroundColor: 'rgba(201, 168, 108, 0.08)',
                        border: `1px solid rgba(201, 168, 108, 0.2)`,
                      }}
                    >
                      <div className="flex items-start gap-2">
                        <Info className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: COLORS.champagneGold }} />
                        <div className="text-sm">
                          <p className="font-bold mb-1" style={{ color: COLORS.deepNavy }}>閉店について</p>
                          <ul className="list-disc list-inside space-y-1" style={{ color: COLORS.charcoal }}>
                            <li>12時間後に自動的に解除されます</li>
                            <li>営業を再開するには、他のステータスを選択してください</li>
                          </ul>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </Card>

                <Card 
                  className="p-6 rounded-2xl shadow-lg"
                  style={{ 
                    background: '#FFFFFF',
                    border: `1px solid rgba(201, 168, 108, 0.15)`,
                  }}
                >
                  <Collapsible open={isGenderCountOpen} onOpenChange={setIsGenderCountOpen}>
                    <CollapsibleTrigger className="w-full">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div 
                            className="p-2 rounded-lg"
                            style={{ 
                              background: COLORS.goldGradient,
                              boxShadow: '0 2px 8px rgba(201, 168, 108, 0.25)',
                            }}
                          >
                            <Users className="w-4 h-4" style={{ color: COLORS.deepNavy }} />
                          </div>
                          <h2 className="text-lg font-bold" style={{ color: COLORS.deepNavy }}>
                            男女数
                          </h2>
                        </div>
                        {isGenderCountOpen ? (
                          <ChevronUp className="w-5 h-5" style={{ color: COLORS.warmGray }} />
                        ) : (
                          <ChevronDown className="w-5 h-5" style={{ color: COLORS.warmGray }} />
                        )}
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="space-y-4 mt-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label 
                              htmlFor="maleCount" 
                              className="font-bold text-sm"
                              style={{ color: COLORS.deepNavy }}
                            >
                              男性数
                            </Label>
                            <Input
                              id="maleCount"
                              type="text"
                              value={maleCount}
                              onChange={(e) => setMaleCount(parseInt(e.target.value) || 0)}
                              placeholder="0"
                              disabled={loading}
                              className="rounded-xl border-2 font-medium transition-all duration-200 focus:border-[#C9A86C] focus:ring-2 focus:ring-[#C9A86C]/20"
                              style={{ 
                                fontSize: '16px',
                                borderColor: 'rgba(201, 168, 108, 0.3)',
                                backgroundColor: '#ffffff',
                              }}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label 
                              htmlFor="femaleCount" 
                              className="font-bold text-sm"
                              style={{ color: COLORS.deepNavy }}
                            >
                              女性数
                            </Label>
                            <Input
                              id="femaleCount"
                              type="text"
                              value={femaleCount}
                              onChange={(e) => setFemaleCount(parseInt(e.target.value) || 0)}
                              placeholder="0"
                              disabled={loading}
                              className="rounded-xl border-2 font-medium transition-all duration-200 focus:border-[#C9A86C] focus:ring-2 focus:ring-[#C9A86C]/20"
                              style={{ 
                                fontSize: '16px',
                                borderColor: 'rgba(201, 168, 108, 0.3)',
                                backgroundColor: '#ffffff',
                              }}
                            />
                          </div>
                        </div>
                        <div 
                          className="flex items-center justify-between p-4 rounded-xl"
                          style={{ 
                            backgroundColor: 'rgba(201, 168, 108, 0.08)',
                            border: `1px solid rgba(201, 168, 108, 0.2)`,
                          }}
                        >
                          <span className="text-sm font-bold" style={{ color: COLORS.charcoal }}>合計人数</span>
                          <span className="text-xl font-bold" style={{ color: COLORS.deepNavy }}>
                            {maleCount + femaleCount}人
                          </span>
                        </div>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                </Card>

                <Card 
                  className="p-6 rounded-2xl shadow-lg"
                  style={{ 
                    background: '#FFFFFF',
                    border: `1px solid rgba(201, 168, 108, 0.15)`,
                  }}
                >
                  <SectionHeader icon={MessageSquare} title="一言メッセージ" />

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
                      className="rounded-xl border-2 font-medium transition-all duration-200 focus:border-[#C9A86C] focus:ring-2 focus:ring-[#C9A86C]/20"
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
                      const createdAt = new Date(reservation.created_at);
                      const arrivalTime = new Date(reservation.arrival_time);
                      const statusLabels: Record<string, { label: string; color: string; bgColor: string; icon: React.ReactNode }> = {
                        pending: { 
                          label: '保留中', 
                          color: COLORS.champagneGold, 
                          bgColor: 'rgba(201, 168, 108, 0.08)', 
                          icon: <Clock className="w-4 h-4" /> 
                        },
                        confirmed: { 
                          label: '承認', 
                          color: '#16a34a', 
                          bgColor: 'rgba(34, 197, 94, 0.08)', 
                          icon: <CheckCircle2 className="w-4 h-4" /> 
                        },
                        rejected: { 
                          label: '拒否', 
                          color: '#dc2626', 
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
                              className="absolute top-4 right-4 rounded-lg hover:bg-red-50"
                              onClick={() => handleDeleteReservation(reservation.id)}
                              title="削除"
                              style={{ color: '#dc2626' }}
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
                  borderColor: '#dc2626',
                  color: '#dc2626',
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