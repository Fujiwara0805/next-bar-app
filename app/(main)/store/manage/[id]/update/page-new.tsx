'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Save,
  Loader2,
  CircleDot,
  MessageSquare,
  LogOut,
  Key,
  Info,
  Image as ImageIcon,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Slider } from '@/components/ui/slider';
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
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-200',
  },
] as const;

export default function StoreUpdatePage() {
  const router = useRouter();
  const params = useParams();
  const { user, profile, store: userStore, accountType, signOut } = useAuth();
  const [loading, setLoading] = useState(false);
  const [fetchingStore, setFetchingStore] = useState(true);
  const [store, setStore] = useState<Store | null>(null);

  // 基本情報フォーム
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [email, setEmail] = useState('');

  // 店舗状況フォーム
  const [vacancyStatus, setVacancyStatus] = useState<'vacant' | 'moderate' | 'full' | 'closed'>('closed');
  const [statusMessage, setStatusMessage] = useState('');
  const [maleRatio, setMaleRatio] = useState(50);
  const [femaleRatio, setFemaleRatio] = useState(50);

  useEffect(() => {
    // 運営会社アカウントまたは店舗アカウントのみアクセス可能
    if (!accountType || (accountType !== 'platform' && accountType !== 'store')) {
      router.push('/login');
      return;
    }

    fetchStore();
  }, [accountType, router]);

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
          toast.error('アクセス権限がありません');
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
        setName(storeData.name);
        setDescription(storeData.description || '');
        setAddress(storeData.address);
        setPhone(storeData.phone || '');
        setWebsiteUrl(storeData.website_url || '');
        setEmail(storeData.email);
        setVacancyStatus(storeData.vacancy_status as 'vacant' | 'moderate' | 'full' | 'closed');
        setStatusMessage(storeData.status_message || '');
        setMaleRatio(storeData.male_ratio);
        setFemaleRatio(storeData.female_ratio);
      }
    } catch (error) {
      console.error('Error fetching store:', error);
      toast.error('店舗情報の取得に失敗しました');
      router.push('/store/manage');
    } finally {
      setFetchingStore(false);
    }
  };

  const handleBasicInfoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user || !params.id) {
      toast.error('エラーが発生しました');
      return;
    }

    setLoading(true);

    try {
      let query = (supabase.from('stores') as any)
        .update({
          name: name.trim(),
          description: description.trim() || null,
          address: address.trim(),
          phone: phone.trim() || null,
          website_url: websiteUrl.trim() || null,
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
          toast.error('アクセス権限がありません');
          return;
        }
      }

      const { error } = await query;

      if (error) throw error;

      toast.success('基本情報を更新しました');
      fetchStore();
    } catch (error) {
      console.error('Error:', error);
      toast.error('更新に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user || !params.id) {
      toast.error('エラーが発生しました');
      return;
    }

    setLoading(true);

    try {
      let query = (supabase.from('stores') as any)
        .update({
          vacancy_status: vacancyStatus,
          status_message: statusMessage.trim() || null,
          is_open: vacancyStatus !== 'closed',
          male_ratio: maleRatio,
          female_ratio: femaleRatio,
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
          toast.error('アクセス権限がありません');
          return;
        }
      }

      const { error } = await query;

      if (error) throw error;

      toast.success('店舗状況を更新しました');
      
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
      toast.error('更新に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleMaleRatioChange = (value: number[]) => {
    setMaleRatio(value[0]);
    setFemaleRatio(100 - value[0]);
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success('ログアウトしました');
      router.push('/login');
    } catch (error) {
      toast.error('ログアウトに失敗しました');
    }
  };

  if (fetchingStore) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">読み込み中...</p>
        </div>
      </div>
    );
  }

  if (!store) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b safe-top">
        <div className="flex items-center gap-3 p-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-bold">店舗ページ管理</h1>
            <p className="text-sm text-muted-foreground">{store.name}</p>
          </div>
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
              {store.image_url ? (
                <img
                  src={store.image_url}
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
                <p className="text-sm text-muted-foreground mb-2">{store.address}</p>
                {accountType === 'store' && (
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => router.push(`/store/manage/${store.id}/change-password`)}
                    >
                      <Key className="w-4 h-4 mr-2" />
                      パスワード変更
                    </Button>
                  </div>
                )}
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
              <TabsTrigger value="status">店舗状況</TabsTrigger>
              <TabsTrigger value="basic">基本情報設定</TabsTrigger>
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
                              : 'bg-background border-border'
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
                            <div className="text-sm text-muted-foreground">
                              {option.description}
                            </div>
                          </div>
                        </Label>
                      </motion.div>
                    ))}
                  </RadioGroup>
                </Card>

                <Card className="p-6">
                  <h2 className="text-lg font-bold mb-4">男女比</h2>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">男性: {maleRatio}%</span>
                      <span className="text-sm font-medium">女性: {femaleRatio}%</span>
                    </div>
                    <Slider
                      value={[maleRatio]}
                      onValueChange={handleMaleRatioChange}
                      max={100}
                      step={5}
                      className="w-full"
                    />
                    <div className="flex gap-2 h-4">
                      <div
                        className="bg-blue-500 rounded transition-all"
                        style={{ width: `${maleRatio}%` }}
                      />
                      <div
                        className="bg-pink-500 rounded transition-all"
                        style={{ width: `${femaleRatio}%` }}
                      />
                    </div>
                  </div>
                </Card>

                <Card className="p-6">
                  <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <MessageSquare className="w-5 h-5" />
                    一言メッセージ
                  </h2>

                  <div className="space-y-2">
                    <Label htmlFor="message">お客様へのメッセージ（任意）</Label>
                    <Textarea
                      id="message"
                      value={statusMessage}
                      onChange={(e) => setStatusMessage(e.target.value)}
                      placeholder="例: 本日のおすすめは生ビール半額です！"
                      rows={4}
                      maxLength={200}
                    />
                    <p className="text-xs text-muted-foreground text-right">
                      {statusMessage.length} / 200文字
                    </p>
                  </div>
                </Card>

                <Button
                  type="submit"
                  className="w-full"
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

            {/* 基本情報設定タブ */}
            <TabsContent value="basic">
              <form onSubmit={handleBasicInfoSubmit} className="space-y-6">
                <Card className="p-6">
                  <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <Info className="w-5 h-5" />
                    基本情報
                  </h2>

                  <div className="space-y-4">
                    {/* 店舗名 */}
                    <div className="space-y-2">
                      <Label htmlFor="name">
                        店舗名 <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="店舗名を入力"
                        required
                        disabled={loading}
                      />
                    </div>

                    {/* 説明 */}
                    <div className="space-y-2">
                      <Label htmlFor="description">店舗説明</Label>
                      <Textarea
                        id="description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="店舗の特徴や雰囲気を入力"
                        rows={3}
                        disabled={loading}
                      />
                    </div>

                    {/* 住所 */}
                    <div className="space-y-2">
                      <Label htmlFor="address">
                        住所 <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="address"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder="住所を入力"
                        required
                        disabled={loading}
                      />
                    </div>

                    {/* 電話番号 */}
                    <div className="space-y-2">
                      <Label htmlFor="phone">電話番号</Label>
                      <Input
                        id="phone"
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="03-1234-5678"
                        disabled={loading}
                      />
                    </div>

                    {/* ウェブサイト */}
                    <div className="space-y-2">
                      <Label htmlFor="website">ウェブサイトURL</Label>
                      <div className="flex gap-2">
                        <Input
                          id="website"
                          type="url"
                          value={websiteUrl}
                          onChange={(e) => setWebsiteUrl(e.target.value)}
                          placeholder="https://example.com"
                          disabled={loading}
                          className="flex-1"
                        />
                        {websiteUrl && (
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() => window.open(websiteUrl, '_blank')}
                          >
                            <ExternalLink className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* メールアドレス（読み取り専用） */}
                    <div className="space-y-2">
                      <Label htmlFor="email">ログイン用メールアドレス</Label>
                      <Input
                        id="email"
                        type="email"
                        value={email}
                        disabled
                        className="bg-muted"
                      />
                      <p className="text-xs text-muted-foreground">
                        ログイン用のメールアドレスは変更できません
                      </p>
                    </div>
                  </div>
                </Card>

                <Card className="p-6">
                  <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <ImageIcon className="w-5 h-5" />
                    店舗画像
                  </h2>
                  <p className="text-sm text-muted-foreground mb-4">
                    画像アップロード機能は今後実装予定です
                  </p>
                  <div className="grid grid-cols-3 gap-4">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div
                        key={i}
                        className="aspect-square rounded-lg border-2 border-dashed border-muted-foreground/25 flex items-center justify-center bg-muted/50"
                      >
                        <ImageIcon className="w-8 h-8 text-muted-foreground/50" />
                      </div>
                    ))}
                  </div>
                </Card>

                <Button
                  type="submit"
                  className="w-full"
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
                      基本情報を更新
                    </>
                  )}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </motion.div>

        {/* 店舗アカウント用のログアウトボタン */}
        {accountType === 'store' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-6"
          >
            <Button
              type="button"
              variant="outline"
              className="w-full text-destructive"
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

