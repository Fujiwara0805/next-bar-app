'use client';

import { useState, useEffect, useRef } from 'react';
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
  ExternalLink,
  X,
  Upload,
  Building2,
  FileText,
  MapPin,
  Phone,
  Globe,
  Mail,
  Clock,
  Calendar,
  DollarSign,
  CreditCard,
  Settings,
  Edit,
  ChevronDown,
  Trash2,
  ChevronUp,
  User,
  Users,
  CheckCircle2,
  XCircle,
  Download,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useAuth } from '@/lib/auth/context';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'sonner';
import type { Database } from '@/lib/supabase/types';

type Store = Database['public']['Tables']['stores']['Row'];

const VACANCY_OPTIONS = [
  {
    value: 'vacant',
    label: '空席あり',
    description: 'すぐに入店できます',
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
  },
  {
    value: 'moderate',
    label: 'やや混雑',
    description: '席は空いていますが混んでいます',
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
  },
  {
    value: 'full',
    label: '満席',
    description: '現在満席です',
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
  },
  {
    value: 'closed',
    label: '閉店',
    description: '営業時間外または休業中',
    color: 'text-gray-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
  },
] as const;

export default function StoreUpdatePage() {
  const router = useRouter();
  const params = useParams();
  const { user, profile, store: userStore, accountType, signOut } = useAuth();
  const [loading, setLoading] = useState(false);
  const [fetchingStore, setFetchingStore] = useState(true);
  const [store, setStore] = useState<Store | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 店舗状況フォーム
  const [vacancyStatus, setVacancyStatus] = useState<'vacant' | 'moderate' | 'full' | 'closed'>('closed');
  const [statusMessage, setStatusMessage] = useState('');
  const [maleCount, setMaleCount] = useState(0);
  const [femaleCount, setFemaleCount] = useState(0);

  // 画像関連のstate
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [mainImageIndex, setMainImageIndex] = useState(0);

  // 予約管理関連のstate
  const [reservations, setReservations] = useState<Database['public']['Tables']['quick_reservations']['Row'][]>([]);
  const [loadingReservations, setLoadingReservations] = useState(false);
  
  // 男女数トグルのstate
  const [isGenderCountOpen, setIsGenderCountOpen] = useState(false);

  useEffect(() => {
    // 運営会社アカウントまたは店舗アカウントのみアクセス可能
    if (!accountType || (accountType !== 'platform' && accountType !== 'store')) {
      router.push('/login');
      return;
    }

    fetchStore();
    fetchReservations();
  }, [accountType, router, params.id]);

  const fetchStore = async () => {
    if (!user || !params.id) return;

    try {
      let query = supabase
        .from('stores')
        .select('*')
        .eq('id', params.id as string);

      // 運営会社アカウントの場合はowner_idでフィルタ
      // 店舗アカウントの場合は自分のIDでフィルタ
      if (accountType === 'platform') {
        query = query.eq('owner_id', user.id);
      } else if (accountType === 'store') {
        // 店舗アカウントは自分の店舗のみアクセス可能
        if (params.id !== user.id) {
          toast.error('アクセス権限がありません', { position: 'top-center' });
          router.push('/login');
          return;
        }
      }

      const { data, error } = await query.single();

      if (error) throw error;

      if (data) {
        const storeData = data as Store;
        setStore(storeData);
        
        // フォームに値を設定
        setVacancyStatus(storeData.vacancy_status as 'vacant' | 'moderate' | 'full' | 'closed');
        setStatusMessage(storeData.status_message || '');
        setMaleCount(storeData.male_ratio);
        setFemaleCount(storeData.female_ratio);

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
      router.push('/store/manage');
    } finally {
      setFetchingStore(false);
    }
  };

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
      let query = (supabase.from('stores') as any)
        .update({
          vacancy_status: vacancyStatus,
          status_message: statusMessage.trim() || null,
          is_open: vacancyStatus !== 'closed',
          male_ratio: maleCount,
          female_ratio: femaleCount,
          last_updated: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', params.id as string);

      // 運営会社アカウントの場合はowner_idでフィルタ
      if (accountType === 'platform') {
        query = query.eq('owner_id', user.id);
      }
      // 店舗アカウントの場合は自分のIDであることを確認
      else if (accountType === 'store') {
        if (params.id !== user.id) {
          toast.error('アクセス権限がありません', { 
            position: 'top-center',
            duration: 3000,
            className: 'bg-gray-100'
          });
          return;
        }
      }

      const { error } = await query;

      if (error) throw error;

      toast.success('更新が完了しました', { 
        position: 'top-center',
        duration: 1000,
        className: 'bg-gray-100'
      });
      
      // アカウントタイプによってリダイレクト先を変更
      if (accountType === 'store') {
        // 店舗アカウントは同じページに留まる
        fetchStore();
      } else {
        // 運営会社アカウントは店舗管理画面へ
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

  const fetchReservations = async () => {
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
      setReservations(data || []);
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
  };

  // 予約を画面上から削除（データベースには影響しない）
  const handleDeleteReservation = (reservationId: string) => {
    setReservations(prev => prev.filter(r => r.id !== reservationId));
    toast.success('予約カードを削除しました', { 
      position: 'top-center',
      duration: 2000,
      className: 'bg-gray-100'
    });
  };

  // 当月の予約データをCSVで出力
  const handleExportCSV = async () => {
    if (!params.id || !store) return;

    try {
      // 当月の開始日と終了日を計算
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth();
      const startDate = new Date(year, month, 1);
      const endDate = new Date(year, month + 1, 0, 23, 59, 59);

      // quick_reservationsテーブルから当月の予約データを取得
      const { data: monthlyReservations, error } = await supabase
        .from('quick_reservations')
        .select('*')
        .eq('store_id', params.id as string)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;

      // 型を明示的に指定
      const reservations: Database['public']['Tables']['quick_reservations']['Row'][] = monthlyReservations || [];

      // CSVデータの準備
      const statusLabels: Record<string, string> = {
        pending: '保留中',
        confirmed: '承認',
        rejected: '拒否',
        cancelled: 'キャンセル',
        expired: '期限切れ',
      };

      // CSVヘッダー
      const headers = ['No', '受付時刻', '名前', '電話番号', '人数', '到着予定', 'ステータス'];
      
      // CSVデータ行
      const csvRows = reservations.map((reservation, index) => {
        const createdAt = new Date(reservation.created_at);
        const arrivalTime = new Date(reservation.arrival_time);
        
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
        ];
      });

      // CSV形式に変換（値にカンマや改行が含まれる場合はダブルクォートで囲む）
      const escapeCSV = (value: string): string => {
        if (value.includes(',') || value.includes('"') || value.includes('\n')) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      };

      // CSVコンテンツを生成
      const csvContent = [
        headers.map(escapeCSV).join(','),
        ...csvRows.map(row => row.map(escapeCSV).join(','))
      ].join('\n');

      // BOMを追加してExcelで正しく開けるようにする
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

  if (fetchingStore) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-sm text-muted-foreground font-bold">読み込み中...</p>
        </div>
      </div>
    );
  }

  if (!store) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-10 bg-background border-b safe-top">
        <div className="flex items-center justify-center p-4">
          <h1 className="text-xl font-bold">店舗管理画面</h1>
        </div>
      </header>

      <div className="max-w-4xl mx-auto p-4">
        {/* 店舗カード */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="p-6 mb-6">
            <div className="flex items-start gap-4">
              {imageUrls.length > 0 ? (
                <img
                  src={imageUrls[mainImageIndex]}
                  alt={store.name}
                  className="w-24 h-24 rounded-lg object-cover"
                />
              ) : (
                <div className="w-24 h-24 rounded-lg bg-muted flex items-center justify-center">
                  <ImageIcon className="w-8 h-8 text-muted-foreground" />
                </div>
              )}
              <div className="flex-1">
                <h2 className="text-2xl font-bold mb-1">{store.name}</h2>
                <p className="text-sm text-muted-foreground font-bold mb-2">{store.address}</p>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="default"
                    size="sm"
                    onClick={() => router.push(`/store/manage/${store.id}/edit`)}
                    className="bg-blue-500 hover:bg-blue-600 text-white"
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    <span className="font-bold">編集</span>
                  </Button>
                  {accountType === 'store' && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => router.push(`/store/manage/${store.id}/change-password`)}
                      className="bg-gray-100 border-2 border-gray-300"
                    >
                      <Key className="w-4 h-4 mr-2" />
                      <span className="font-bold">変更</span>
                    </Button>
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
          <Tabs defaultValue="status" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="status" className="font-bold">店舗状況</TabsTrigger>
              <TabsTrigger value="reservations" className="font-bold">予約管理</TabsTrigger>
            </TabsList>

            {/* 店舗状況タブ */}
            <TabsContent value="status">
              <form onSubmit={handleStatusSubmit} className="space-y-6">
                <Card className="p-6">
                  <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <CircleDot className="w-5 h-5" />
                    空席状況
                  </h2>

                  <RadioGroup
                    value={vacancyStatus}
                    onValueChange={(value) => setVacancyStatus(value as typeof vacancyStatus)}
                    className="space-y-3"
                  >
                    {VACANCY_OPTIONS.map((option) => (
                      <motion.div
                        key={option.value}
                        whileTap={{ scale: 0.98 }}
                      >
                        <Label
                          htmlFor={option.value}
                          className={`flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                            vacancyStatus === option.value
                              ? `${option.bgColor} ${option.borderColor}`
                              : 'bg-gray-100 border-2 border-gray-300'
                          }`}
                        >
                          <RadioGroupItem
                            value={option.value}
                            id={option.value}
                            className="mt-1"
                          />
                          <div className="flex-1">
                            <div className={`font-bold mb-1 ${option.color}`}>
                              {option.label}
                            </div>
                            <div className="text-sm text-muted-foreground font-bold">
                              {option.description}
                            </div>
                          </div>
                        </Label>
                      </motion.div>
                    ))}
                  </RadioGroup>
                </Card>

                <Card className="p-6">
                  <Collapsible open={isGenderCountOpen} onOpenChange={setIsGenderCountOpen}>
                    <CollapsibleTrigger className="w-full">
                      <div className="flex items-center justify-between">
                        <h2 className="text-lg font-bold">男女数</h2>
                        {isGenderCountOpen ? (
                          <ChevronUp className="w-5 h-5" />
                        ) : (
                          <ChevronDown className="w-5 h-5" />
                        )}
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="space-y-4 mt-4">
                        <div className="grid grid-cols-2 gap-4">
                          {/* 男性数入力 */}
                          <div className="space-y-2">
                            <Label htmlFor="maleCount" className="font-bold">男性数</Label>
                            <Input
                              id="maleCount"
                              type="text"
                              value={maleCount}
                              onChange={(e) => setMaleCount(parseInt(e.target.value) || 0)}
                              placeholder="0"
                              disabled={loading}
                              className="font-bold bg-white text-gray-700 border-2 border-gray-300"
                              style={{ fontSize: '16px' }}
                            />
                          </div>
                          
                          {/* 女性数入力 */}
                          <div className="space-y-2">
                            <Label htmlFor="femaleCount" className="font-bold">女性数</Label>
                            <Input
                              id="femaleCount"
                              type="text"
                              value={femaleCount}
                              onChange={(e) => setFemaleCount(parseInt(e.target.value) || 0)}
                              placeholder="0"
                              disabled={loading}
                              className="font-bold bg-white text-gray-700 border-2 border-gray-300"
                              style={{ fontSize: '16px' }}
                            />
                          </div>
                        </div>
                        
                        {/* 合計表示 */}
                        <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                          <span className="text-sm font-bold">合計人数</span>
                          <span className="text-lg font-bold">{maleCount + femaleCount}人</span>
                        </div>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                </Card>

                <Card className="p-6">
                  <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <MessageSquare className="w-5 h-5" />
                    一言メッセージ
                  </h2>

                  <div className="space-y-2">
                    <Label htmlFor="message" className="font-bold">お客様へのメッセージ（任意）</Label>
                    <Textarea
                      id="message"
                      value={statusMessage}
                      onChange={(e) => setStatusMessage(e.target.value)}
                      placeholder="例: 本日のおすすめは生ビール半額です！"
                      rows={4}
                      maxLength={200}
                      className="font-bold bg-white text-gray-700 border-2 border-gray-300"
                      style={{ fontSize: '16px' }}
                    />
                    <p className="text-xs text-muted-foreground text-right font-bold">
                      {statusMessage.length} / 200文字
                    </p>
                  </div>
                </Card>

                <Button
                  type="submit"
                  className="w-full font-bold"
                  disabled={loading}
                  size="lg"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      更新中...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      店舗状況を更新
                    </>
                  )}
                </Button>
              </form>
            </TabsContent>

            {/* 予約管理タブ */}
            <TabsContent value="reservations">
              <div className="space-y-4">
                {loadingReservations ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                  </div>
                ) : reservations.length === 0 ? (
                  <Card className="p-6">
                    <p className="text-center text-muted-foreground font-bold">
                      予約データがありません
                    </p>
                  </Card>
                ) : (
                  <div className="space-y-4">
                    {reservations.map((reservation) => {
                      const createdAt = new Date(reservation.created_at);
                      const arrivalTime = new Date(reservation.arrival_time);
                      const statusLabels: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
                        pending: { label: '保留中', color: 'text-yellow-600 bg-yellow-50 border-yellow-200', icon: <Clock className="w-4 h-4" /> },
                        confirmed: { label: '承認', color: 'text-green-600 bg-green-50 border-green-200', icon: <CheckCircle2 className="w-4 h-4" /> },
                        rejected: { label: '拒否', color: 'text-red-600 bg-red-50 border-red-200', icon: <XCircle className="w-4 h-4" /> },
                        cancelled: { label: 'キャンセル', color: 'text-gray-600 bg-gray-50 border-gray-200', icon: <X className="w-4 h-4" /> },
                        expired: { label: '期限切れ', color: 'text-gray-600 bg-gray-50 border-gray-200', icon: <Clock className="w-4 h-4" /> },
                      };
                      const statusInfo = statusLabels[reservation.status] || statusLabels.pending;

                      return (
                        <motion.div
                          key={reservation.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                        >
                          <Card className="p-6 relative">
                            {/* 削除ボタン */}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="absolute top-4 right-4 text-red-600 hover:text-red-700"
                              onClick={() => handleDeleteReservation(reservation.id)}
                              title="削除"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                            <div className="space-y-3">
                              {/* 1行目: ステータスバッジ + 電話がかかってきた時間 */}
                              <div className="flex items-center justify-between pr-10">
                                <div className={`flex items-center gap-2 px-3 py-1 rounded-full border ${statusInfo.color}`}>
                                  {statusInfo.icon}
                                  <span className="text-sm font-bold">{statusInfo.label}</span>
                                </div>
                                <div className="text-right">
                                  <p className="text-xs text-muted-foreground font-bold">電話受付時刻</p>
                                  <p className="text-sm font-bold">
                                    {createdAt.toLocaleString('ja-JP', {
                                      month: '2-digit',
                                      day: '2-digit',
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })}
                                  </p>
                                </div>
                              </div>

                              {/* 2行目: 名前 + 電話番号 */}
                              <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <div className="flex items-center gap-2">
                                    <User className="w-4 h-4 text-muted-foreground" />
                                    <span className="text-sm font-bold text-muted-foreground">名前</span>
                                  </div>
                                  <p className="text-base font-bold">{reservation.caller_name || '未入力'}</p>
                                </div>

                                <div className="space-y-2">
                                  <div className="flex items-center gap-2">
                                    <Phone className="w-4 h-4 text-muted-foreground" />
                                    <span className="text-sm font-bold text-muted-foreground">電話番号</span>
                                  </div>
                                  <p className="text-base font-bold">{reservation.caller_phone}</p>
                                </div>
                              </div>

                              {/* 3行目: 人数 + 到着予定時刻 */}
                              <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <div className="flex items-center gap-2">
                                    <Users className="w-4 h-4 text-muted-foreground" />
                                    <span className="text-sm font-bold text-muted-foreground">人数</span>
                                  </div>
                                  <p className="text-base font-bold">{reservation.party_size}名</p>
                                </div>

                                <div className="space-y-2">
                                  <div className="flex items-center gap-2">
                                    <Clock className="w-4 h-4 text-muted-foreground" />
                                    <span className="text-sm font-bold text-muted-foreground">到着予定時刻</span>
                                  </div>
                                  <p className="text-base font-bold">
                                    {arrivalTime.toLocaleString('ja-JP', {
                                      month: '2-digit',
                                      day: '2-digit',
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })}
                                  </p>
                                </div>
                              </div>

                              {/* 拒否理由 */}
                              {reservation.status === 'rejected' && reservation.rejection_reason && (
                                <div className="pt-2 border-t">
                                  <p className="text-sm text-muted-foreground font-bold">拒否理由</p>
                                  <p className="text-sm font-bold mt-1">{reservation.rejection_reason}</p>
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
            <Button
              type="button"
              className="w-full font-bold text-white hover:opacity-90"
              style={{ backgroundColor: '#2c5c6e' }}
              onClick={handleExportCSV}
            >
              <Download className="w-4 h-4 mr-2" />
              データ出力（CSV）
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full text-destructive font-bold bg-gray-100"
              onClick={handleSignOut}
            >
              <LogOut className="w-4 h-4 mr-2" />
              ログアウト
            </Button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
