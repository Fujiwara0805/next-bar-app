'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  MapPin, 
  Store as StoreIcon, 
  Phone, 
  Loader2,
  Save,
  Mail,
  Clock,
  DollarSign,
  Building2,
  FileText,
  Globe,
  Calendar,
  CreditCard,
  Settings,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth/context';
import { toast } from 'sonner';
import type { Database } from '@/lib/supabase/types';
import { Upload } from 'lucide-react';

type Store = Database['public']['Tables']['stores']['Row'];

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

export default function StoreEditPage() {
  const router = useRouter();
  const params = useParams();
  const { user, accountType } = useAuth();
  const [loading, setLoading] = useState(false);
  const [fetchingStore, setFetchingStore] = useState(true);
  const [geocoding, setGeocoding] = useState(false);

  // フォームステート
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [phone, setPhone] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [email, setEmail] = useState('');
  const [businessHours, setBusinessHours] = useState('');
  const [regularHoliday, setRegularHoliday] = useState('');
  const [budgetMin, setBudgetMin] = useState<number>(0);
  const [budgetMax, setBudgetMax] = useState<number>(0);
  const [paymentMethods, setPaymentMethods] = useState<string[]>([]);
  const [facilities, setFacilities] = useState<string[]>([]);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [mainImageIndex, setMainImageIndex] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const geocoderRef = useRef<google.maps.Geocoder | null>(null);
  const [mapsLoaded, setMapsLoaded] = useState(false);

  const fetchStore = useCallback(async () => {
    if (!user || !params.id) return;

    try {
      let query = supabase
        .from('stores')
        .select('*')
        .eq('id', params.id as string);

      if (accountType === 'platform') {
        query = query.eq('owner_id', user.id);
      } else if (accountType === 'store') {
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
        setName(storeData.name);
        setDescription(storeData.description || '');
        setAddress(storeData.address);
        setPhone(storeData.phone || '');
        setWebsiteUrl(storeData.website_url || '');
        setEmail(storeData.email);
        setBusinessHours(storeData.business_hours as string || '');
        setRegularHoliday(storeData.regular_holiday || '');
        setBudgetMin(storeData.budget_min || 0);
        setBudgetMax(storeData.budget_max || 0);
        setPaymentMethods(storeData.payment_methods || []);
        setFacilities(storeData.facilities || []);
        setImageUrls(storeData.image_urls || []);
        setLatitude(String(storeData.latitude || ''));
        setLongitude(String(storeData.longitude || ''));
      }
    } catch (error) {
      console.error('Error fetching store:', error);
      toast.error('店舗情報の取得に失敗しました', { position: 'top-center' });
      router.push('/store/manage');
    } finally {
      setFetchingStore(false);
    }
  }, [user, params.id, accountType, router]);

  useEffect(() => {
    if (!accountType || (accountType !== 'platform' && accountType !== 'store')) {
      router.push('/login');
      return;
    }

    // sessionStorageからデータを読み込む（高速化のため）
    try {
      const cachedStore = sessionStorage.getItem(`store_${params.id}`);
      if (cachedStore) {
        const storeData = JSON.parse(cachedStore) as Store;
        setName(storeData.name);
        setDescription(storeData.description || '');
        setAddress(storeData.address);
        setPhone(storeData.phone || '');
        setWebsiteUrl(storeData.website_url || '');
        setEmail(storeData.email);
        setBusinessHours(storeData.business_hours as string || '');
        setRegularHoliday(storeData.regular_holiday || '');
        setBudgetMin(storeData.budget_min || 0);
        setBudgetMax(storeData.budget_max || 0);
        setPaymentMethods(storeData.payment_methods || []);
        setFacilities(storeData.facilities || []);
        setImageUrls(storeData.image_urls || []);
        setLatitude(String(storeData.latitude || ''));
        setLongitude(String(storeData.longitude || ''));
        setFetchingStore(false);
      }
    } catch (e) {
      console.error('Failed to load store data from sessionStorage:', e);
    }

    if (GOOGLE_MAPS_API_KEY) {
      const initMaps = () => {
        if (window.google?.maps) {
          geocoderRef.current = new google.maps.Geocoder();
          setMapsLoaded(true);
          return true;
        }
        return false;
      };

      if (initMaps()) return;

      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places&language=ja`;
      script.async = true;
      script.defer = true;
      script.onload = () => initMaps();
      document.head.appendChild(script);
    }

    // sessionStorageにデータがない場合のみfetchStoreを実行
    if (!sessionStorage.getItem(`store_${params.id}`)) {
      fetchStore();
    }
  }, [accountType, router, params.id, fetchStore]);

  const handleGeocodeAddress = async (): Promise<boolean> => {
    if (!address.trim()) {
      toast.error('住所を入力してください', { 
        position: 'top-center',
        duration: 3000,
        className: 'bg-gray-100'
      });
      return false;
    }

    setGeocoding(true);

    try {
      if (!GOOGLE_MAPS_API_KEY) throw new Error('APIキー未設定');
      const resp = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${GOOGLE_MAPS_API_KEY}&language=ja&region=JP`
      );
      const data = await resp.json();
      if (data.status === 'OK' && data.results && data.results[0]) {
        const loc = data.results[0].geometry.location;
        setLatitude(String(loc.lat));
        setLongitude(String(loc.lng));
        toast.success('位置情報を取得しました', { 
          position: 'top-center',
          duration: 1000,
          className: 'bg-gray-100'
        });
        setGeocoding(false);
        return true;
      }
    } catch (err) {
      console.error('Geocode REST error:', err);
    }

    setGeocoding(false);
    toast.error('位置情報を取得できませんでした', { 
      position: 'top-center',
      duration: 3000,
      className: 'bg-gray-100'
    });
    return false;
  };

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

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    if (imageUrls.length + files.length > 5) {
      toast.error('画像は最大5枚までアップロードできます', { 
        position: 'top-center',
        duration: 3000,
        className: 'bg-gray-100'
      });
      return;
    }

    setUploadingImage(true);

    try {
      const uploadedUrls: string[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        if (file.size > 5 * 1024 * 1024) {
          toast.error(`${file.name}は5MBを超えています`, { 
            position: 'top-center',
            duration: 3000,
            className: 'bg-gray-100'
          });
          continue;
        }

        const fileExt = file.name.split('.').pop();
        const fileName = `${params.id}/${Date.now()}_${i}.${fileExt}`;

        const { data, error } = await supabase.storage
          .from('store-images')
          .upload(fileName, file, {
            cacheControl: '3600',
            upsert: false
          });

        if (error) throw error;

        const { data: { publicUrl } } = supabase.storage
          .from('store-images')
          .getPublicUrl(fileName);

        uploadedUrls.push(publicUrl);
      }

      const newImageUrls = [...imageUrls, ...uploadedUrls];
      setImageUrls(newImageUrls);

      toast.success('画像をアップロードしました', { 
        position: 'top-center',
        duration: 1000,
        className: 'bg-gray-100'
      });
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('画像のアップロードに失敗しました', { 
        position: 'top-center',
        duration: 3000,
        className: 'bg-gray-100'
      });
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleImageDelete = async (urlToDelete: string, index: number) => {
    setUploadingImage(true);

    try {
      const url = new URL(urlToDelete);
      const pathParts = url.pathname.split('/store-images/');
      if (pathParts.length < 2) {
        throw new Error('Invalid image URL');
      }
      const filePath = pathParts[1];

      const { error: deleteError } = await supabase.storage
        .from('store-images')
        .remove([filePath]);

      if (deleteError) throw deleteError;

      const newImageUrls = imageUrls.filter((_, i) => i !== index);
      setImageUrls(newImageUrls);

      if (index === mainImageIndex && newImageUrls.length > 0) {
        setMainImageIndex(0);
      } else if (index < mainImageIndex) {
        setMainImageIndex(mainImageIndex - 1);
      }

      toast.success('画像を削除しました', { 
        position: 'top-center',
        duration: 1000,
        className: 'bg-gray-100'
      });
    } catch (error) {
      console.error('Error deleting image:', error);
      toast.error('画像の削除に失敗しました', { 
        position: 'top-center',
        duration: 3000,
        className: 'bg-gray-100'
      });
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || !params.id) {
      toast.error('エラーが発生しました', { 
        position: 'top-center',
        duration: 3000,
        className: 'bg-gray-100'
      });
      return;
    }

    if (!name.trim()) {
      toast.error('店舗名を入力してください', { 
        position: 'top-center',
        duration: 3000,
        className: 'bg-gray-100'
      });
      return;
    }

    if (!address.trim()) {
      toast.error('住所を入力してください', { 
        position: 'top-center',
        duration: 3000,
        className: 'bg-gray-100'
      });
      return;
    }

    if (!latitude || !longitude) {
      const ok = await handleGeocodeAddress();
      if (!ok) {
        toast.error('位置情報を取得してください', { 
          position: 'top-center',
          duration: 3000,
          className: 'bg-gray-100'
        });
        return;
      }
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
          business_hours: businessHours,
          regular_holiday: regularHoliday.trim() || null,
          budget_min: budgetMin || null,
          budget_max: budgetMax || null,
          payment_methods: paymentMethods,
          facilities: facilities,
          image_urls: imageUrls,
          latitude: parseFloat(latitude),
          longitude: parseFloat(longitude),
          updated_at: new Date().toISOString(),
        })
        .eq('id', params.id as string);

      if (accountType === 'platform') {
        query = query.eq('owner_id', user.id);
      } else if (accountType === 'store') {
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

      // 更新後のデータを取得してsessionStorageを更新
      const { data: updatedData } = await supabase
        .from('stores')
        .select('*')
        .eq('id', params.id as string)
        .single();

      if (updatedData) {
        try {
          sessionStorage.setItem(`store_${params.id}`, JSON.stringify(updatedData));
        } catch (e) {
          console.error('Failed to update store data in sessionStorage:', e);
        }
      }

      toast.success('更新が完了しました', { 
        position: 'top-center',
        duration: 1000,
        className: 'bg-gray-100'
      });
      router.push(`/store/manage/${params.id}/update`);
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

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-10 bg-background border-b safe-top">
        <div className="flex items-center justify-center p-4 relative">
          <h1 className="text-xl font-bold">店舗編集画面</h1>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => router.push(`/store/manage/${params.id}/update`)}
            className="rounded-full absolute right-4"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>
      </header>

      <div className="max-w-2xl mx-auto p-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* 店舗名 */}
              <div className="space-y-2">
                <Label htmlFor="name" className="font-bold flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  店舗名 <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  disabled={loading}
                  className="font-bold bg-white text-gray-700 border-2 border-gray-300"
                  style={{ fontSize: '16px' }}
                />
              </div>

              {/* 説明 */}
              <div className="space-y-2">
                <Label htmlFor="description" className="font-bold flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  店舗説明
                </Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  disabled={loading}
                  className="font-bold bg-white text-gray-700 border-2 border-gray-300"
                  style={{ fontSize: '16px' }}
                />
              </div>

              {/* 住所 */}
              <div className="space-y-2">
                <Label htmlFor="address" className="font-bold flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  住所 <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  required
                  disabled={loading}
                  className="font-bold bg-white text-gray-700 border-2 border-gray-300"
                  style={{ fontSize: '16px' }}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleGeocodeAddress}
                  disabled={loading || geocoding || !address.trim()}
                  className="w-full font-bold"
                >
                  {geocoding ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      取得中...
                    </>
                  ) : (
                    <>
                      住所から位置情報を取得
                    </>
                  )}
                </Button>
              </div>

              {/* 位置情報表示 */}
              {latitude && longitude && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm text-green-800 font-bold">
                    ✓ 位置情報取得済み
                  </p>
                </div>
              )}

              {/* 電話番号 */}
              <div className="space-y-2">
                <Label htmlFor="phone" className="font-bold flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  電話番号
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  disabled={loading}
                  className="font-bold bg-white text-gray-700 border-2 border-gray-300"
                  style={{ fontSize: '16px' }}
                />
              </div>

              {/* URL */}
              <div className="space-y-2">
                <Label htmlFor="website" className="font-bold flex items-center gap-2">
                  <Globe className="w-4 h-4" />
                  メディア情報（公式サイト、Instagram、Twitterなど）
                </Label>
                <Input
                  id="website"
                  type="url"
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                  disabled={loading}
                  className="font-bold bg-white text-gray-700 border-2 border-gray-300"
                  style={{ fontSize: '16px' }}
                />
              </div>

              {/* メールアドレス（読み取り専用） */}
              <div className="space-y-2">
                <Label htmlFor="email" className="font-bold flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  ログイン用メールアドレス
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  disabled
                  className="bg-muted font-bold border-2 border-gray-300"
                  style={{ fontSize: '16px' }}
                />
                <p className="text-xs text-muted-foreground font-bold">
                  ログイン用のメールアドレスは変更できません
                </p>
              </div>

              {/* 営業時間 */}
              <div className="space-y-2">
                <Label htmlFor="businessHours" className="font-bold flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  営業時間
                </Label>
                <Textarea
                  id="businessHours"
                  value={businessHours}
                  onChange={(e) => setBusinessHours(e.target.value)}
                  rows={3}
                  disabled={loading}
                  className="font-bold bg-white text-gray-700 border-2 border-gray-300"
                  style={{ fontSize: '16px' }}
                />
                <p className="text-xs text-muted-foreground font-bold">
                  営業時間を自由な形式で入力してください
                </p>
              </div>

              {/* 定休日 */}
              <div className="space-y-2">
                <Label htmlFor="regularHoliday" className="font-bold flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  定休日
                </Label>
                <Input
                  id="regularHoliday"
                  value={regularHoliday}
                  onChange={(e) => setRegularHoliday(e.target.value)}
                  disabled={loading}
                  className="font-bold bg-white text-gray-700 border-2 border-gray-300"
                  style={{ fontSize: '16px' }}
                />
                <p className="text-xs text-muted-foreground font-bold">
                  定休日や特別な休業日などを記載
                </p>
              </div>

              {/* 予算 */}
              <div className="space-y-2">
                <Label className="font-bold flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  予算（円）
                </Label>
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
                      className="font-bold bg-white text-gray-700 border-2 border-gray-300"
                      style={{ fontSize: '16px' }}
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
                      className="font-bold bg-white text-gray-700 border-2 border-gray-300"
                      style={{ fontSize: '16px' }}
                    />
                  </div>
                </div>
                {budgetMin > 0 && budgetMax > 0 && (
                  <p className="text-sm text-muted-foreground font-bold">
                    予算目安: ¥{budgetMin.toLocaleString()} 〜 ¥{budgetMax.toLocaleString()}
                  </p>
                )}
              </div>

              {/* 支払い方法 */}
              <div className="space-y-2">
                <Label className="font-bold flex items-center gap-2">
                  <CreditCard className="w-4 h-4" />
                  支払い方法
                </Label>
                <div className="grid grid-cols-2 gap-3">
                  {['現金', 'クレジットカード', '電子マネー', 'QRコード決済', 'デビットカード', '交通系IC'].map((method) => (
                    <div key={method} className="flex items-center space-x-2">
                      <Checkbox
                        id={`payment-${method}`}
                        checked={paymentMethods.includes(method)}
                        onCheckedChange={() => handlePaymentMethodToggle(method)}
                      />
                      <Label htmlFor={`payment-${method}`} className="text-sm font-bold">
                        {method}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              {/* 設備 */}
              <div className="space-y-2">
                <Label className="font-bold flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  設備・サービス
                </Label>
                <div className="grid grid-cols-2 gap-3 max-h-96 overflow-y-auto p-2 border rounded-lg">
                  {[
                    'Wi-Fi',
                    '喫煙可',
                    '分煙',
                    '禁煙',
                    '駐車場',
                    'カウンター席',
                    '個室',
                    'テラス席',
                    'ソファ席',
                    '一人客歓迎',
                    'おひとり様大歓迎',
                    'カウンター充実',
                    '常連さんが優しい',
                    '女性客多め',
                    '女性一人でも安心',
                    '女性スタッフ在籍',
                    'レディースデー有',
                    'カラオケ完備',
                    'ダーツ',
                    'ビリヤード',
                    'ボードゲーム',
                    '生演奏',
                    'DJ',
                    'スポーツ観戦可',
                    '日本酒充実',
                    'ウイスキー充実',
                    'ワイン充実',
                    'カクテル豊富',
                    'クラフトビール',
                    '焼酎充実',
                    'フード充実',
                    'おつまみ豊富',
                    '英語対応可',
                    '外国語メニューあり',
                    '観光客歓迎',
                    'ホテル近く',
                    '駅近',
                    '深夜営業',
                    '朝まで営業',
                    'チャージなし',
                    '席料なし',
                    'お通しなし',
                    '明朗会計',
                    '価格表示あり',
                    '予算相談OK',
                    'ボトルキープ可',
                    'セット料金あり',
                    '静かな雰囲気',
                    'ワイワイ系',
                    'オーセンティック',
                    'カジュアル',
                    '隠れ家的',
                    '大人の雰囲気',
                    '昭和レトロ',
                    'スタイリッシュ',
                    'アットホーム',
                    'ママ・マスター人気',
                    '美味しいお酒',
                    'こだわりの一杯',
                  ].map((facility) => (
                    <div key={facility} className="flex items-center space-x-2">
                      <Checkbox
                        id={`facility-${facility}`}
                        checked={facilities.includes(facility)}
                        onCheckedChange={() => handleFacilityToggle(facility)}
                      />
                      <Label htmlFor={`facility-${facility}`} className="text-sm font-bold">
                        {facility}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              {/* 店舗画像 */}
              <div className="space-y-2">
                <Label className="font-bold flex items-center gap-2">
                  店舗画像
                </Label>
                <p className="text-sm text-muted-foreground font-bold mb-4">
                  最大5枚まで画像をアップロードできます（1枚あたり最大5MB）
                </p>

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
                      
                      {index === mainImageIndex && (
                        <div className="absolute top-2 left-2 bg-primary text-primary-foreground px-2 py-1 rounded text-xs font-bold">
                          メイン
                        </div>
                      )}

                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                        {index !== mainImageIndex && (
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            onClick={() => setMainImageIndex(index)}
                            disabled={uploadingImage}
                            className="font-bold"
                          >
                            メイン
                          </Button>
                        )}
                        <Button
                          type="button"
                          size="sm"
                          variant="destructive"
                          onClick={() => {
                            if (confirm('この画像を削除しますか？')) {
                              handleImageDelete(url, index);
                            }
                          }}
                          disabled={uploadingImage}
                          className="font-bold"
                        >
                          <X className="w-4 h-4 mr-1" />
                          削除
                        </Button>
                      </div>
                    </motion.div>
                  ))}

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
                            <span className="text-xs text-muted-foreground font-bold">
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
                  <p className="text-center text-sm text-muted-foreground font-bold py-8">
                    画像がアップロードされていません
                  </p>
                )}
              </div>

              {/* 送信ボタン */}
              <div className="flex gap-3">
                <Button
                  type="button"
                  className="flex-1 font-bold"
                  onClick={() => router.push(`/store/manage/${params.id}/update`)}
                  disabled={loading}
                >
                  キャンセル
                </Button>
                <Button type="submit" className="flex-1 font-bold" disabled={loading || geocoding}>
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      更新中...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      更新
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}

