'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  MapPin, 
  Store as StoreIcon, 
  Phone, 
  Loader2,
  Search,
  Mail,
  Link,
  Lock,
  Clock,
  DollarSign,
  Building2,
  FileText,
  Globe,
  Calendar,
  CreditCard,
  Settings,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth/context';
import { toast } from 'sonner';

// クーポン関連のインポート
import { StoreCouponForm } from '@/components/store/StoreCouponForm';
import {
  CouponFormValues,
  getDefaultCouponFormValues,
  couponFormToDbData,
  couponFormSchema,
} from '@/lib/types/coupon';

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

export default function NewStorePage() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [mapsLoaded, setMapsLoaded] = useState(false);

  // フォームステート - 基本情報
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [phone, setPhone] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // 営業時間をテキスト形式に変更
  const [businessHours, setBusinessHours] = useState('');
  const [regularHoliday, setRegularHoliday] = useState('');
  const [budgetMin, setBudgetMin] = useState<number>(0);
  const [budgetMax, setBudgetMax] = useState<number>(0);
  const [paymentMethods, setPaymentMethods] = useState<string[]>([]);
  const [facilities, setFacilities] = useState<string[]>([]);

  // クーポン関連のステート
  const [couponValues, setCouponValues] = useState<CouponFormValues>(getDefaultCouponFormValues());
  const [couponErrors, setCouponErrors] = useState<Record<string, string>>({});

  // 店舗名候補
  const [suggestions, setSuggestions] = useState<google.maps.places.AutocompletePrediction[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchingName, setSearchingName] = useState(false);

  // Google評価データ
  const [googlePlaceId, setGooglePlaceId] = useState<string | null>(null);
  const [googleRating, setGoogleRating] = useState<number | null>(null);
  const [googleReviewsCount, setGoogleReviewsCount] = useState<number | null>(null);

  const autocompleteServiceRef = useRef<google.maps.places.AutocompleteService | null>(null);
  const placesServiceRef = useRef<google.maps.places.PlacesService | null>(null);
  const geocoderRef = useRef<google.maps.Geocoder | null>(null);

  // Google Maps API初期化
  useEffect(() => {
    const initMaps = () => {
      if (window.google?.maps?.places) {
        autocompleteServiceRef.current = new google.maps.places.AutocompleteService();
        geocoderRef.current = new google.maps.Geocoder();
        const div = document.createElement('div');
        placesServiceRef.current = new google.maps.places.PlacesService(div);
        setMapsLoaded(true);
        console.log('Google Maps API loaded successfully');
        return true;
      }
      return false;
    };

    if (initMaps()) return;

    const existing = document.querySelector<HTMLScriptElement>('script[data-gmaps-loader="true"]');
    if (existing) {
      existing.addEventListener('load', () => initMaps());
      return;
    }

    if (!GOOGLE_MAPS_API_KEY) {
      console.error('NEXT_PUBLIC_GOOGLE_MAPS_API_KEY が未設定です');
      return;
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places&language=ja`;
    script.async = true;
    script.defer = true;
    script.setAttribute('data-gmaps-loader', 'true');
    script.onload = () => initMaps();
    script.onerror = () => {
      console.error('Google Maps API スクリプトの読み込みに失敗しました');
      toast.error('Google Mapsの読み込みに失敗しました', { 
        position: 'top-center',
        duration: 3000,
        className: 'bg-gray-100'
      });
    };
    document.head.appendChild(script);
  }, []);

  // 店舗名入力時の候補検索
  useEffect(() => {
    if (!mapsLoaded || !autocompleteServiceRef.current || name.length < 2) {
      setSuggestions([]);
      return;
    }

    setSearchingName(true);

    const timer = setTimeout(() => {
      autocompleteServiceRef.current?.getPlacePredictions(
        {
          input: name,
          componentRestrictions: { country: 'jp' },
        } as any,
        (predictions, status) => {
          setSearchingName(false);
          if (status === google.maps.places.PlacesServiceStatus.OK && predictions) {
            setSuggestions(predictions);
            setShowSuggestions(true);
          } else {
            setSuggestions([]);
          }
        }
      );
    }, 500);

    return () => clearTimeout(timer);
  }, [name, mapsLoaded]);

  // 候補を選択
  const handleSelectSuggestion = (prediction: google.maps.places.AutocompletePrediction) => {
    if (!placesServiceRef.current) return;

    setGeocoding(true);
    placesServiceRef.current.getDetails(
      {
        placeId: prediction.place_id!,
        fields: [
          'name',
          'formatted_address',
          'geometry',
          'formatted_phone_number',
          'place_id',
          'rating',
          'user_ratings_total',
        ],
      } as any,
      (place: any, status: any) => {
        setGeocoding(false);
        
        if (status === google.maps.places.PlacesServiceStatus.OK && place) {
          setName(place.name || '');
          setAddress(place.formatted_address || '');
          setPhone(place.formatted_phone_number || '');
          
          if (place.geometry?.location) {
            const lat = typeof place.geometry.location.lat === 'function' 
              ? place.geometry.location.lat() 
              : place.geometry.location.lat;
            const lng = typeof place.geometry.location.lng === 'function' 
              ? place.geometry.location.lng() 
              : place.geometry.location.lng;
            
            setLatitude(String(lat));
            setLongitude(String(lng));
          }

          // Google評価データを保存
          setGooglePlaceId(place.place_id || null);
          setGoogleRating(place.rating || null);
          setGoogleReviewsCount(place.user_ratings_total || null);
          
          setSuggestions([]);
          setShowSuggestions(false);
          
          const ratingText = place.rating ? ` (Google評価: ⭐${place.rating})` : '';
          toast.success(`店舗情報を取得しました${ratingText}`, { 
            position: 'top-center',
            duration: 2000,
            className: 'bg-gray-100'
          });
        } else {
          toast.error('店舗情報の取得に失敗しました', { 
            position: 'top-center',
            duration: 3000,
            className: 'bg-gray-100'
          });
        }
      }
    );
  };

  // 住所から位置情報を取得
  const handleGeocodeAddress = async (): Promise<boolean> => {
    if (!address.trim()) {
      toast.error('住所を入力してください', { 
        position: 'top-center',
        duration: 3000,
        className: 'bg-gray-100'
      });
      return false;
    }

    if (!geocoderRef.current && !mapsLoaded) {
      await new Promise((r) => setTimeout(r, 400));
    }

    setGeocoding(true);

    if (geocoderRef.current) {
      try {
        const res = await new Promise<google.maps.GeocoderResult[] | null>((resolve) => {
          geocoderRef.current!.geocode({ address: address, region: 'jp' }, (results, status) => {
            if (status === 'OK' && results && results[0]) resolve(results);
            else resolve(null);
          });
        });
        if (res && res[0]) {
          const location = res[0].geometry.location;
          const lat = typeof location.lat === 'function' ? location.lat() : (location as any).lat;
          const lng = typeof location.lng === 'function' ? location.lng() : (location as any).lng;
          setLatitude(String(lat));
          setLongitude(String(lng));
          toast.success('位置情報を取得しました', { 
            position: 'top-center',
            duration: 1000,
            className: 'bg-gray-100'
          });
          setGeocoding(false);
          return true;
        }
      } catch (e) {
        // フォールバック
      }
    }

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

  // 支払い方法のトグル
  const handlePaymentMethodToggle = (method: string) => {
    setPaymentMethods(prev => 
      prev.includes(method) 
        ? prev.filter(m => m !== method)
        : [...prev, method]
    );
  };

  // 設備のトグル
  const handleFacilityToggle = (facility: string) => {
    setFacilities(prev => 
      prev.includes(facility) 
        ? prev.filter(f => f !== facility)
        : [...prev, facility]
    );
  };

  // クーポンバリデーション
  const validateCoupon = (): boolean => {
    const result = couponFormSchema.safeParse(couponValues);
    if (!result.success) {
      const errors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) {
          errors[err.path[0] as string] = err.message;
        }
      });
      setCouponErrors(errors);
      return false;
    }
    setCouponErrors({});
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error('ログインが必要です', { 
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

    if (!email.trim()) {
      toast.error('店舗用のメールアドレスを入力してください', { 
        position: 'top-center',
        duration: 3000,
        className: 'bg-gray-100'
      });
      return;
    }

    if (!password || password.length < 6) {
      toast.error('パスワードは6文字以上で入力してください', { 
        position: 'top-center',
        duration: 3000,
        className: 'bg-gray-100'
      });
      return;
    }

    // クーポンバリデーション
    if (!validateCoupon()) {
      toast.error('クーポン設定に誤りがあります', { 
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
      const { data: { session: currentSession } } = await supabase.auth.getSession();

      if (!currentSession) {
        throw new Error('セッションが見つかりません。再度ログインしてください。');
      }

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            store_name: name.trim(),
            account_type: 'store',
          }
        }
      });

      if (authError) {
        console.error('Auth error:', authError);
        
        if (authError.message.includes('already registered') || authError.message.includes('User already registered')) {
          throw new Error(`このメールアドレス（${email}）は既に使用されています。別のメールアドレスを使用してください。`);
        }
        
        throw new Error(`認証アカウントの作成に失敗: ${authError.message}`);
      }

      if (!authData.user) {
        throw new Error('認証アカウントの作成に失敗しました');
      }

      const newStoreUserId = authData.user.id;

      if (currentSession) {
        await supabase.auth.setSession({
          access_token: currentSession.access_token,
          refresh_token: currentSession.refresh_token,
        });
      }

      // クーポンデータをDB形式に変換
      const couponDbData = couponFormToDbData(couponValues);

      const { error: storeError } = await supabase
        .from('stores')
        .insert({
          id: newStoreUserId,
          owner_id: user.id,
          email: email.trim(),
          name: name.trim(),
          description: description.trim() || null,
          address: address.trim(),
          latitude: parseFloat(latitude),
          longitude: parseFloat(longitude),
          phone: phone.trim() || null,
          website_url: websiteUrl.trim() || null,
          business_hours: businessHours,
          regular_holiday: regularHoliday.trim() || null,
          budget_min: budgetMin || null,
          budget_max: budgetMax || null,
          payment_methods: paymentMethods,
          facilities: facilities,
          is_open: false,
          vacancy_status: 'vacant',
          male_ratio: 0,
          female_ratio: 0,
          google_place_id: googlePlaceId,
          google_rating: googleRating,
          google_reviews_count: googleReviewsCount,
          // クーポン関連カラム
          ...couponDbData,
        } as any);

      if (storeError) {
        console.error('Store error:', storeError);
        throw new Error(`店舗情報の登録に失敗: ${storeError.message}`);
      }

      toast.success('店舗を登録しました', {
        description: `ログイン用メールアドレス: ${email}`,
        position: 'top-center',
        duration: 1000,
        className: 'bg-gray-100'
      });
      router.push('/store/manage');
    } catch (error) {
      console.error('Error:', error);
      const errorMsg = error instanceof Error ? error.message : '店舗の登録に失敗しました';
      toast.error(errorMsg, { 
        position: 'top-center',
        duration: 3000,
        className: 'bg-gray-100'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-10 bg-background border-b safe-top">
        <div className="flex items-center justify-center p-4">
          <h1 className="text-xl font-bold">新規店舗登録</h1>
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
                <div className="relative">
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                    required
                    disabled={loading}
                    className="font-bold bg-white text-gray-700 border-2 border-gray-300"
                    style={{ fontSize: '16px' }}
                  />
                  {showSuggestions && suggestions.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-64 overflow-auto">
                      {suggestions.map((pred, idx) => (
                        <button
                          key={idx}
                          type="button"
                          className="w-full text-left px-4 py-2 hover:bg-gray-100"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            handleSelectSuggestion(pred);
                          }}
                        >
                          <div className="font-bold text-sm">
                            {pred.structured_formatting?.main_text || pred.description}
                          </div>
                          <div className="text-xs text-gray-500 font-bold">
                            {pred.structured_formatting?.secondary_text || ''}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {searchingName && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1 font-bold">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    候補を検索中...
                  </p>
                )}
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
                  onClick={async () => { await handleGeocodeAddress(); }}
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
                      <Search className="w-4 h-4 mr-2" />
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

              {/* ウェブサイト */}
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

              {/* 営業時間 - テキスト形式に変更 */}
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

              {/* 定休日（補足） */}
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

              {/* クーポン設定セクション */}
              <div className="pt-4">
                <StoreCouponForm
                  values={couponValues}
                  onChange={setCouponValues}
                  disabled={loading}
                  errors={couponErrors}
                />
              </div>

              {/* セパレーター */}
              <div className="border-t pt-6">
                <h3 className="font-bold text-lg mb-2">店舗ログイン情報</h3>
                <p className="text-sm text-muted-foreground mb-4 font-bold">
                  店舗側がログインして情報を更新するためのアカウントを作成します
                </p>
              </div>

              {/* 店舗用メールアドレス */}
              <div className="space-y-2">
                <Label htmlFor="email" className="font-bold flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  店舗用メールアドレス <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                  className="font-bold bg-white text-gray-700 border-2 border-gray-300"
                  style={{ fontSize: '16px' }}
                />
                <p className="text-xs text-muted-foreground font-bold">
                  店舗側がログインする際に使用します
                </p>
              </div>

              {/* 店舗用パスワード */}
              <div className="space-y-2">
                <Label htmlFor="password" className="font-bold flex items-center gap-2">
                  <Lock className="w-4 h-4" />
                  店舗用パスワード <span className="text-red-500">*</span>
                </Label>
                <PasswordInput
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  disabled={loading}
                  className="font-bold bg-white text-gray-700 border-2 border-gray-300"
                  style={{ fontSize: '16px' }}
                />
                <p className="text-xs text-muted-foreground font-bold">
                  最低6文字、数字と記号を含めることを推奨
                </p>
              </div>

              {/* 送信ボタン */}
              <div className="flex gap-3">
                <Button
                  type="button"
                  className="flex-1 font-bold"
                  onClick={() => router.back()}
                  disabled={loading}
                >
                  キャンセル
                </Button>
                <Button type="submit" className="flex-1 font-bold" disabled={loading || geocoding}>
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      登録中...
                    </>
                  ) : (
                    '店舗を登録'
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
