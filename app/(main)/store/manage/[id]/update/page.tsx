'use client';

import { useState, useEffect, useRef } from 'react';
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
  X,  // ←追加
  Upload,  // ←追加
  Clock, // ←追加
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
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
  
  const fileInputRef = useRef<HTMLInputElement>(null);  // ←追加

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
  const [maleCount, setMaleCount] = useState(0);  // ←変更: maleRatio → maleCount
  const [femaleCount, setFemaleCount] = useState(0);  // ←変更: femaleRatio → femaleCount

  // 基本情報フォーム - 追加
  const [businessHours, setBusinessHours] = useState('');
  const [regularHoliday, setRegularHoliday] = useState('');
  const [budgetMin, setBudgetMin] = useState<number>(0);
  const [budgetMax, setBudgetMax] = useState<number>(0);
  const [paymentMethods, setPaymentMethods] = useState<string[]>([]);
  const [facilities, setFacilities] = useState<string[]>([]);

  // 画像関連のstate
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [mainImageIndex, setMainImageIndex] = useState(0);

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
        setMaleCount(storeData.male_ratio);  // ←変更: male_ratioを人数として使用
        setFemaleCount(storeData.female_ratio);  // ←変更: female_ratioを人数として使用

        // 新規フィールドの設定
        setBusinessHours(storeData.business_hours as string || '');
        setRegularHoliday(storeData.regular_holiday || '');
        setBudgetMin(storeData.budget_min || 0);
        setBudgetMax(storeData.budget_max || 0);
        setPaymentMethods(storeData.payment_methods || []);
        setFacilities(storeData.facilities || []);

        // 画像URLの設定 ←変更: image_url削除
        setImageUrls(storeData.image_urls || []);
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
          business_hours: businessHours,  // ←追加
          regular_holiday: regularHoliday.trim() || null,  // ←追加
          budget_min: budgetMin || null,  // ←追加
          budget_max: budgetMax || null,  // ←追加
          payment_methods: paymentMethods,  // ←追加
          facilities: facilities,  // ←追加
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
          male_ratio: maleCount,  // ←変更: 人数を保存
          female_ratio: femaleCount,  // ←変更: 人数を保存
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

  // handleMaleRatioChange関数を削除 ←削除

  // 支払い方法とチェックボックスのハンドラー
  const handlePaymentMethodToggle = (method: string) => {
    setPaymentMethods(prev => 
      prev.includes(method) 
        ? prev.filter(m => m !== method)
        : [...prev, method]
    );
  };

  const handleFacilityToggle = (facility: string) => {
    setFacilities(prev => 
      prev.includes(facility) 
        ? prev.filter(f => f !== facility)
        : [...prev, facility]
    );
  };

  // 画像アップロード処理 ←追加
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    // 最大5枚まで
    if (imageUrls.length + files.length > 5) {
      toast.error('画像は最大5枚までアップロードできます');
      return;
    }

    setUploadingImage(true);

    try {
      const uploadedUrls: string[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // ファイルサイズチェック（5MB以下）
        if (file.size > 5 * 1024 * 1024) {
          toast.error(`${file.name}は5MBを超えています`);
          continue;
        }

        // ファイル名を生成（ユニーク）
        const fileExt = file.name.split('.').pop();
        const fileName = `${params.id}/${Date.now()}_${i}.${fileExt}`;

        // Supabase Storageにアップロード
        const { data, error } = await supabase.storage
          .from('store-images')
          .upload(fileName, file, {
            cacheControl: '3600',
            upsert: false
          });

        if (error) throw error;

        // パブリックURLを取得
        const { data: { publicUrl } } = supabase.storage
          .from('store-images')
          .getPublicUrl(fileName);

        uploadedUrls.push(publicUrl);
      }

      // 新しい画像URLを追加
      const newImageUrls = [...imageUrls, ...uploadedUrls];
      setImageUrls(newImageUrls);

      // データベースを更新 ←変更: image_url削除
      let query = (supabase.from('stores') as any)
        .update({
          image_urls: newImageUrls,
          updated_at: new Date().toISOString(),
        })
        .eq('id', params.id as string);

      if (accountType === 'platform') {
        query = query.eq('owner_id', user!.id);
      }

      const { error: updateError } = await query;
      if (updateError) throw updateError;

      toast.success('画像をアップロードしました');
      fetchStore();
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('画像のアップロードに失敗しました');
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // 画像削除処理 ←変更: image_url削除
  const handleImageDelete = async (urlToDelete: string, index: number) => {
    if (!confirm('この画像を削除しますか？')) return;

    setUploadingImage(true);

    try {
      // URLからファイルパスを抽出
      const url = new URL(urlToDelete);
      const pathParts = url.pathname.split('/store-images/');
      if (pathParts.length < 2) {
        throw new Error('Invalid image URL');
      }
      const filePath = pathParts[1];

      // Storageから削除
      const { error: deleteError } = await supabase.storage
        .from('store-images')
        .remove([filePath]);

      if (deleteError) throw deleteError;

      // 配列から削除
      const newImageUrls = imageUrls.filter((_, i) => i !== index);
      setImageUrls(newImageUrls);

      // メイン画像のインデックスを調整
      if (index === mainImageIndex && newImageUrls.length > 0) {
        setMainImageIndex(0);
      } else if (index < mainImageIndex) {
        setMainImageIndex(mainImageIndex - 1);
      }

      // データベースを更新 ←変更: image_url削除
      let query = (supabase.from('stores') as any)
        .update({
          image_urls: newImageUrls,
          updated_at: new Date().toISOString(),
        })
        .eq('id', params.id as string);

      if (accountType === 'platform') {
        query = query.eq('owner_id', user!.id);
      }

      const { error: updateError } = await query;
      if (updateError) throw updateError;

      toast.success('画像を削除しました');
      fetchStore();
    } catch (error) {
      console.error('Error deleting image:', error);
      toast.error('画像の削除に失敗しました');
    } finally {
      setUploadingImage(false);
    }
  };

  // メイン画像設定 ←削除（不要になったため）

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
        {/* 店舗カード ←変更 */}
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
                  <h2 className="text-lg font-bold mb-4">男女数</h2>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      {/* 男性数入力 */}
                      <div className="space-y-2">
                        <Label htmlFor="maleCount">男性数</Label>
                        <Input
                          id="maleCount"
                          type="number"
                          min="0"
                          value={maleCount}
                          onChange={(e) => setMaleCount(parseInt(e.target.value) || 0)}
                          placeholder="0"
                          disabled={loading}
                        />
                      </div>
                      
                      {/* 女性数入力 */}
                      <div className="space-y-2">
                        <Label htmlFor="femaleCount">女性数</Label>
                        <Input
                          id="femaleCount"
                          type="number"
                          min="0"
                          value={femaleCount}
                          onChange={(e) => setFemaleCount(parseInt(e.target.value) || 0)}
                          placeholder="0"
                          disabled={loading}
                        />
                      </div>
                    </div>
                    
                    {/* 合計表示 */}
                    <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <span className="text-sm font-medium">合計人数</span>
                      <span className="text-lg font-bold">{maleCount + femaleCount}人</span>
                    </div>
                    
                    {/* ビジュアル表示 */}
                    {(maleCount + femaleCount) > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-blue-600">男性: {maleCount}人 ({Math.round((maleCount / (maleCount + femaleCount)) * 100)}%)</span>
                          <span className="text-pink-600">女性: {femaleCount}人 ({Math.round((femaleCount / (maleCount + femaleCount)) * 100)}%)</span>
                        </div>
                        <div className="flex gap-2 h-4">
                          <div
                            className="bg-blue-500 rounded transition-all"
                            style={{ width: `${(maleCount / (maleCount + femaleCount)) * 100}%` }}
                          />
                          <div
                            className="bg-pink-500 rounded transition-all"
                            style={{ width: `${(femaleCount / (maleCount + femaleCount)) * 100}%` }}
                          />
                        </div>
                      </div>
                    )}
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

                    {/* 営業時間 - テキスト形式に変更 */}
                    <div className="space-y-2">
                      <Label htmlFor="businessHours">営業時間</Label>
                      <Textarea
                        id="businessHours"
                        value={businessHours}
                        onChange={(e) => setBusinessHours(e.target.value)}
                        placeholder="例: 月〜金 18:00-24:00, 土日 17:00-25:00"
                        rows={3}
                        disabled={loading}
                      />
                      <p className="text-xs text-muted-foreground">
                        営業時間を自由な形式で入力してください
                      </p>
                    </div>

                    {/* 定休日 */}
                    <div className="space-y-2">
                      <Label htmlFor="regularHoliday">定休日</Label>
                      <Input
                        id="regularHoliday"
                        value={regularHoliday}
                        onChange={(e) => setRegularHoliday(e.target.value)}
                        placeholder="例: 月曜日、年末年始"
                        disabled={loading}
                      />
                      <p className="text-xs text-muted-foreground">
                        定休日や特別な休業日などを記載
                      </p>
                    </div>

                    {/* 予算 */}
                    <div className="space-y-2">
                      <Label>予算（円）</Label>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Input
                            type="number"
                            min="0"
                            step="100"
                            placeholder="最低予算"
                            value={budgetMin || ''}
                            onChange={(e) => setBudgetMin(parseInt(e.target.value) || 0)}
                            disabled={loading}
                          />
                        </div>
                        <div>
                          <Input
                            type="number"
                            min="0"
                            step="100"
                            placeholder="最高予算"
                            value={budgetMax || ''}
                            onChange={(e) => setBudgetMax(parseInt(e.target.value) || 0)}
                            disabled={loading}
                          />
                        </div>
                      </div>
                      {budgetMin > 0 && budgetMax > 0 && (
                        <p className="text-sm text-muted-foreground">
                          予算目安: ¥{budgetMin.toLocaleString()} 〜 ¥{budgetMax.toLocaleString()}
                        </p>
                      )}
                    </div>

                    {/* 支払い方法 */}
                    <div className="space-y-2">
                      <Label>支払い方法</Label>
                      <div className="grid grid-cols-2 gap-3">
                        {['現金', 'クレジットカード', '電子マネー', 'QRコード決済', 'デビットカード', '交通系IC'].map((method) => (
                          <div key={method} className="flex items-center space-x-2">
                            <Checkbox
                              id={`payment-${method}`}
                              checked={paymentMethods.includes(method)}
                              onCheckedChange={() => handlePaymentMethodToggle(method)}
                            />
                            <Label htmlFor={`payment-${method}`} className="text-sm font-normal">
                              {method}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* 設備 */}
                    <div className="space-y-2">
                      <Label>設備・サービス</Label>
                      <div className="grid grid-cols-2 gap-3">
                        {['Wi-Fi', '喫煙可', '分煙', '禁煙', '駐車場', 'カウンター席', '個室', 'テラス席', 'ペット可', 'バリアフリー'].map((facility) => (
                          <div key={facility} className="flex items-center space-x-2">
                            <Checkbox
                              id={`facility-${facility}`}
                              checked={facilities.includes(facility)}
                              onCheckedChange={() => handleFacilityToggle(facility)}
                            />
                            <Label htmlFor={`facility-${facility}`} className="text-sm font-normal">
                              {facility}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </Card>

                {/* 店舗画像カード ←更新 */}
                <Card className="p-6">
                  <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <ImageIcon className="w-5 h-5" />
                    店舗画像
                  </h2>
                  <p className="text-sm text-muted-foreground mb-4">
                    最大5枚まで画像をアップロードできます（1枚あたり最大5MB）
                  </p>

                  {/* アップロード済み画像 */}
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    {imageUrls.map((url, index) => (
                      <motion.div
                        key={url}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="relative aspect-square rounded-lg overflow-hidden border-2 border-border group"
                      >
                        <img
                          src={url}
                          alt={`店舗画像 ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                        
                        {/* メイン画像バッジ ←変更 */}
                        {index === mainImageIndex && (
                          <div className="absolute top-2 left-2 bg-primary text-primary-foreground px-2 py-1 rounded text-xs font-bold">
                            メイン
                          </div>
                        )}

                        {/* ホバー時のアクション ←変更 */}
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                          {index !== mainImageIndex && (
                            <Button
                              type="button"
                              size="sm"
                              variant="secondary"
                              onClick={() => setMainImageIndex(index)}
                              disabled={uploadingImage}
                            >
                              メイン画像に設定
                            </Button>
                          )}
                          <Button
                            type="button"
                            size="sm"
                            variant="destructive"
                            onClick={() => handleImageDelete(url, index)}
                            disabled={uploadingImage}
                          >
                            <X className="w-4 h-4 mr-1" />
                            削除
                          </Button>
                        </div>
                      </motion.div>
                    ))}

                    {/* アップロードボタン */}
                    {imageUrls.length < 5 && (
                      <motion.div
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <label
                          htmlFor="image-upload"
                          className="aspect-square rounded-lg border-2 border-dashed border-muted-foreground/25 flex flex-col items-center justify-center bg-muted/50 cursor-pointer hover:bg-muted transition-colors"
                        >
                          {uploadingImage ? (
                            <Loader2 className="w-8 h-8 text-muted-foreground animate-spin" />
                          ) : (
                            <>
                              <Upload className="w-8 h-8 text-muted-foreground/50 mb-2" />
                              <span className="text-xs text-muted-foreground">
                                画像を追加
                              </span>
                            </>
                          )}
                        </label>
                        <input
                          ref={fileInputRef}
                          id="image-upload"
                          type="file"
                          accept="image/jpeg,image/jpg,image/png,image/webp"
                          multiple
                          onChange={handleImageUpload}
                          disabled={uploadingImage}
                          className="hidden"
                        />
                      </motion.div>
                    )}
                  </div>

                  {imageUrls.length === 0 && (
                    <p className="text-center text-sm text-muted-foreground py-8">
                      画像がアップロードされていません
                    </p>
                  )}
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

