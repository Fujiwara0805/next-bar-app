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
  Sparkles,
  ChevronRight,
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

// キャンペーン関連のインポート
import {
  StoreCampaignForm,
  CampaignFormValues,
  getDefaultCampaignFormValues,
  campaignFormToDbData,
} from '@/components/store/StoreCampaignForm';

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

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
 * セクションヘッダーコンポーネント
 */
const SectionHeader = ({ icon: Icon, title, description }: { 
  icon: React.ElementType; 
  title: string; 
  description?: string;
}) => (
  <div className="flex items-start gap-3 mb-6">
    <div 
      className="p-2.5 rounded-xl shrink-0"
      style={{ 
        background: COLORS.goldGradient,
        boxShadow: '0 4px 12px rgba(201, 168, 108, 0.25)',
      }}
    >
      <Icon className="w-5 h-5" style={{ color: COLORS.deepNavy }} />
    </div>
    <div>
      <h3 
        className="text-lg font-bold"
        style={{ color: COLORS.deepNavy }}
      >
        {title}
      </h3>
      {description && (
        <p className="text-sm mt-0.5" style={{ color: COLORS.warmGray }}>
          {description}
        </p>
      )}
    </div>
  </div>
);

/**
 * ゴールド装飾ディバイダー
 */
const GoldDivider = () => (
  <div className="flex items-center justify-center gap-3 my-6">
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

/**
 * カスタム入力フィールドスタイル
 */
const inputStyles = {
  base: `
    w-full px-4 py-3 rounded-xl
    bg-white border-2 
    transition-all duration-200
    font-medium
    placeholder:text-gray-400
    focus:outline-none
  `,
  focus: `
    focus:border-[#C9A86C] 
    focus:ring-2 
    focus:ring-[#C9A86C]/20
  `,
  default: 'border-gray-200 hover:border-gray-300',
};

const getInputClassName = (disabled?: boolean) => 
  `${inputStyles.base} ${inputStyles.focus} ${inputStyles.default} ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`;

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

  // キャンペーン関連のステート
  const [campaignValues, setCampaignValues] = useState<CampaignFormValues>(getDefaultCampaignFormValues());

  // キャンペーン値変更時にクーポンのisCampaignフラグと開始日・有効期限を連動させる
  const handleCampaignChange = (newCampaignValues: CampaignFormValues) => {
    setCampaignValues(newCampaignValues);
    // キャンペーンがONの場合、クーポンをキャンペーン用に設定し、開始日・有効期限をキャンペーン日付で反映
    // キャンペーンがOFFの場合、クーポンを通常に戻す
    setCouponValues(prev => ({
      ...prev,
      isCampaign: newCampaignValues.hasCampaign,
      ...(newCampaignValues.hasCampaign && newCampaignValues.campaignStartDate && newCampaignValues.campaignEndDate
        ? {
            startDate: newCampaignValues.campaignStartDate,
            expiryDate: newCampaignValues.campaignEndDate,
          }
        : {}),
    }));
  };

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
  const sessionTokenRef = useRef<google.maps.places.AutocompleteSessionToken | null>(null);

  // Google Maps API初期化
  useEffect(() => {
    const initMaps = () => {
      if (window.google?.maps?.places) {
        autocompleteServiceRef.current = new google.maps.places.AutocompleteService();
        geocoderRef.current = new google.maps.Geocoder();
        const div = document.createElement('div');
        placesServiceRef.current = new google.maps.places.PlacesService(div);
        sessionTokenRef.current = new google.maps.places.AutocompleteSessionToken();
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
          sessionToken: sessionTokenRef.current,
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
        sessionToken: sessionTokenRef.current,
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

          // セッショントークンをリセット（次回検索用に新しいセッションを開始）
          sessionTokenRef.current = new google.maps.places.AutocompleteSessionToken();

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

    // サーバーサイドAPIルート経由でGeocoding（APIキーを隠蔽）
    try {
      const resp = await fetch(`/api/geocode?address=${encodeURIComponent(address)}`);
      const data = await resp.json();
      if (data.lat && data.lng) {
        setLatitude(String(data.lat));
        setLongitude(String(data.lng));
        toast.success('位置情報を取得しました', {
          position: 'top-center',
          duration: 1000,
          className: 'bg-gray-100'
        });
        setGeocoding(false);
        return true;
      }
    } catch (err) {
      console.error('Geocode API error:', err);
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

  // クーポンバリデーション（クーポン設定OFFの場合はスキップ）
  const validateCoupon = (): boolean => {
    if (!couponValues.isActive) {
      setCouponErrors({});
      return true;
    }
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
      
      // キャンペーンデータをDB形式に変換
      const campaignDbData = campaignFormToDbData(campaignValues);

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
          google_place_id: googlePlaceId,
          google_rating: googleRating,
          google_reviews_count: googleReviewsCount,
          // クーポン関連カラム
          ...couponDbData,
          // キャンペーン関連カラム
          ...campaignDbData,
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

  // 設備カテゴリ
  const facilityCategories = {
    newcomer: {
      title: '✨ 新規・一人客向け',
      items: ['一人客歓迎', 'おひとり様大歓迎', 'カウンター充実', '常連さんが優しい'],
      bgColor: 'rgba(31, 64, 104, 0.05)',
      borderColor: 'rgba(31, 64, 104, 0.15)',
    },
    women: {
      title: '💕 女性向け',
      items: ['女性客多め', '女性一人でも安心', '女性スタッフ在籍', 'レディースデー有'],
      bgColor: 'rgba(201, 168, 108, 0.05)',
      borderColor: 'rgba(201, 168, 108, 0.15)',
    },
    pricing: {
      title: '💰 料金関連',
      items: ['チャージなし', '席料なし', 'お通しなし', '明朗会計', '価格表示あり', '予算相談OK'],
      bgColor: 'rgba(34, 197, 94, 0.05)',
      borderColor: 'rgba(34, 197, 94, 0.15)',
    },
  };

  const otherFacilities = [
    'Wi-Fi', '喫煙可', '分煙', '禁煙', '駐車場', 'カウンター席', '個室', 'テラス席', 'ソファ席',
    'カラオケ完備', 'ダーツ', 'ビリヤード', 'ボードゲーム', '生演奏', 'DJ', 'スポーツ観戦可',
    '日本酒充実', 'ウイスキー充実', 'ワイン充実', 'カクテル豊富', 'クラフトビール', '焼酎充実',
    'フード充実', 'おつまみ豊富', '英語対応可', '外国語メニューあり', '観光客歓迎', 'ホテル近く',
    '駅近', '深夜営業', '朝まで営業', 'ボトルキープ可', 'セット料金あり', '静かな雰囲気',
    'ワイワイ系', 'オーセンティック', 'カジュアル', '隠れ家的', '大人の雰囲気', '昭和レトロ',
    'スタイリッシュ', 'アットホーム', 'ママ・マスター人気', '美味しいお酒', 'こだわりの一杯',
  ];

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
        <div className="flex items-center justify-center p-4 relative">
          <div className="flex items-center gap-2">
            <h1 
              className="text-lg font-light tracking-widest"
              style={{ color: COLORS.ivory }}
            >
              新規店舗登録画面
            </h1>
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto p-4 space-y-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* ========== 基本情報セクション ========== */}
            <Card 
              className="p-6 rounded-2xl shadow-lg"
              style={{ 
                background: '#FFFFFF',
                border: `1px solid rgba(201, 168, 108, 0.15)`,
              }}
            >
              <SectionHeader 
                icon={Building2} 
                title="基本情報" 
                description="店舗の基本的な情報を入力してください"
              />
              
              {/* 店舗名 */}
              <div className="space-y-2 mb-5">
                <Label 
                  htmlFor="name" 
                  className="text-sm font-bold flex items-center gap-2"
                  style={{ color: COLORS.deepNavy }}
                >
                  店舗名 <span style={{ color: COLORS.champagneGold }}>*</span>
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
                    placeholder="例: Bar NIKENME"
                    className={getInputClassName(loading)}
                    style={{ fontSize: '16px' }}
                  />
                  {showSuggestions && suggestions.length > 0 && (
                    <div 
                      className="absolute z-50 w-full mt-2 bg-white rounded-xl shadow-xl max-h-64 overflow-auto"
                      style={{ border: `1px solid rgba(201, 168, 108, 0.2)` }}
                    >
                      {suggestions.map((pred, idx) => (
                        <button
                          key={idx}
                          type="button"
                          className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors first:rounded-t-xl last:rounded-b-xl"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            handleSelectSuggestion(pred);
                          }}
                        >
                          <div className="font-bold text-sm" style={{ color: COLORS.deepNavy }}>
                            {pred.structured_formatting?.main_text || pred.description}
                          </div>
                          <div className="text-xs mt-0.5" style={{ color: COLORS.warmGray }}>
                            {pred.structured_formatting?.secondary_text || ''}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {searchingName && (
                  <p className="text-xs flex items-center gap-1" style={{ color: COLORS.warmGray }}>
                    <Loader2 className="w-3 h-3 animate-spin" />
                    候補を検索中...
                  </p>
                )}
                <p className="text-xs" style={{ color: COLORS.warmGray }}>
                  Google Mapsから店舗情報を自動取得できます
                </p>
              </div>

              {/* 説明 */}
              <div className="space-y-2 mb-5">
                <Label 
                  htmlFor="description" 
                  className="text-sm font-bold flex items-center gap-2"
                  style={{ color: COLORS.deepNavy }}
                >
                  <FileText className="w-4 h-4" style={{ color: COLORS.champagneGold }} />
                  店舗説明
                </Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  disabled={loading}
                  placeholder="お店の特徴、雰囲気、おすすめポイントなどを自由にご記入ください"
                  className={getInputClassName(loading)}
                  style={{ fontSize: '16px', minHeight: '120px', resize: 'vertical' }}
                />
              </div>

              <GoldDivider />

              {/* 住所 */}
              <div className="space-y-2 mb-5">
                <Label 
                  htmlFor="address" 
                  className="text-sm font-bold flex items-center gap-2"
                  style={{ color: COLORS.deepNavy }}
                >
                  <MapPin className="w-4 h-4" style={{ color: COLORS.champagneGold }} />
                  住所 <span style={{ color: COLORS.champagneGold }}>*</span>
                </Label>
                <Input
                  id="address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  required
                  disabled={loading}
                  placeholder="例: 大分県大分市都町1-2-3"
                  className={getInputClassName(loading)}
                  style={{ fontSize: '16px' }}
                />
                <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={async () => { await handleGeocodeAddress(); }}
                    disabled={loading || geocoding || !address.trim()}
                    className="w-full mt-2 rounded-xl font-bold py-3"
                    style={{ 
                      borderColor: COLORS.champagneGold,
                      backgroundColor: 'rgba(201, 168, 108, 0.15)',
                      color: COLORS.deepNavy,
                    }}
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
                </motion.div>
              </div>

              {/* 電話番号 */}
              <div className="space-y-2 mb-5">
                <Label 
                  htmlFor="phone" 
                  className="text-sm font-bold flex items-center gap-2"
                  style={{ color: COLORS.deepNavy }}
                >
                  <Phone className="w-4 h-4" style={{ color: COLORS.champagneGold }} />
                  電話番号
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  disabled={loading}
                  placeholder="例: 097-123-4567"
                  className={getInputClassName(loading)}
                  style={{ fontSize: '16px' }}
                />
              </div>

              {/* ウェブサイト */}
              <div className="space-y-2">
                <Label 
                  htmlFor="website" 
                  className="text-sm font-bold flex items-center gap-2"
                  style={{ color: COLORS.deepNavy }}
                >
                  <Globe className="w-4 h-4" style={{ color: COLORS.champagneGold }} />
                  メディア情報
                </Label>
                <Input
                  id="website"
                  type="url"
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                  disabled={loading}
                  placeholder="公式サイト、Instagram、Twitterなど"
                  className={getInputClassName(loading)}
                  style={{ fontSize: '16px' }}
                />
              </div>
            </Card>

            {/* ========== 営業情報セクション ========== */}
            <Card 
              className="p-6 rounded-2xl shadow-lg"
              style={{ 
                background: '#FFFFFF',
                border: `1px solid rgba(201, 168, 108, 0.15)`,
              }}
            >
              <SectionHeader 
                icon={Clock} 
                title="営業情報" 
                description="営業時間や予算などを設定してください"
              />

              {/* 営業時間 */}
              <div className="space-y-2 mb-5">
                <Label 
                  htmlFor="businessHours" 
                  className="text-sm font-bold"
                  style={{ color: COLORS.deepNavy }}
                >
                  営業時間
                </Label>
                <Textarea
                  id="businessHours"
                  value={businessHours}
                  onChange={(e) => setBusinessHours(e.target.value)}
                  rows={3}
                  disabled={loading}
                  placeholder="例: 月〜木 18:00〜翌2:00、金土 18:00〜翌4:00"
                  className={getInputClassName(loading)}
                  style={{ fontSize: '16px', minHeight: '100px', resize: 'vertical' }}
                />
                <p className="text-xs" style={{ color: COLORS.warmGray }}>
                  営業時間を自由な形式で入力してください
                </p>
              </div>

              {/* 定休日 */}
              <div className="space-y-2 mb-5">
                <Label 
                  htmlFor="regularHoliday" 
                  className="text-sm font-bold flex items-center gap-2"
                  style={{ color: COLORS.deepNavy }}
                >
                  <Calendar className="w-4 h-4" style={{ color: COLORS.champagneGold }} />
                  定休日
                </Label>
                <Input
                  id="regularHoliday"
                  value={regularHoliday}
                  onChange={(e) => setRegularHoliday(e.target.value)}
                  disabled={loading}
                  placeholder="例: 日曜日、祝日"
                  className={getInputClassName(loading)}
                  style={{ fontSize: '16px' }}
                />
              </div>

              <GoldDivider />

              {/* 予算 */}
              <div className="space-y-2 mb-5">
                <Label 
                  className="text-sm font-bold flex items-center gap-2"
                  style={{ color: COLORS.deepNavy }}
                >
                  <DollarSign className="w-4 h-4" style={{ color: COLORS.champagneGold }} />
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
                      className={getInputClassName(loading)}
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
                      className={getInputClassName(loading)}
                      style={{ fontSize: '16px' }}
                    />
                  </div>
                </div>
                {budgetMin > 0 && budgetMax > 0 && (
                  <p className="text-sm mt-2" style={{ color: COLORS.warmGray }}>
                    予算目安: ¥{budgetMin.toLocaleString()} 〜 ¥{budgetMax.toLocaleString()}
                  </p>
                )}
              </div>

              {/* 支払い方法 */}
              <div className="space-y-3">
                <Label 
                  className="text-sm font-bold flex items-center gap-2"
                  style={{ color: COLORS.deepNavy }}
                >
                  <CreditCard className="w-4 h-4" style={{ color: COLORS.champagneGold }} />
                  支払い方法
                </Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {['現金', 'クレジットカード', '電子マネー', 'QRコード決済', 'デビットカード', '交通系IC'].map((method) => (
                    <label 
                      key={method} 
                      className="flex items-center space-x-2 cursor-pointer p-3 rounded-xl transition-all duration-200"
                      style={{ 
                        backgroundColor: paymentMethods.includes(method) 
                          ? 'rgba(201, 168, 108, 0.1)' 
                          : 'rgba(0, 0, 0, 0.02)',
                        border: paymentMethods.includes(method)
                          ? `1px solid ${COLORS.champagneGold}`
                          : '1px solid rgba(0, 0, 0, 0.05)',
                      }}
                    >
                      <Checkbox
                        id={`payment-${method}`}
                        checked={paymentMethods.includes(method)}
                        onCheckedChange={() => handlePaymentMethodToggle(method)}
                      />
                      <span className="text-sm font-medium" style={{ color: COLORS.charcoal }}>
                        {method}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </Card>

            {/* ========== 設備・サービスセクション ========== */}
            <Card 
              className="p-6 rounded-2xl shadow-lg"
              style={{ 
                background: '#FFFFFF',
                border: `1px solid rgba(201, 168, 108, 0.15)`,
              }}
            >
              <SectionHeader 
                icon={Settings} 
                title="設備・サービス" 
                description="お店の特徴をアピールしましょう"
              />

              {/* カテゴリ別設備 */}
              {Object.entries(facilityCategories).map(([key, category]) => (
                <div 
                  key={key}
                  className="mb-4 p-4 rounded-xl"
                  style={{ 
                    backgroundColor: category.bgColor,
                    border: `1px solid ${category.borderColor}`,
                  }}
                >
                  <p className="text-sm font-bold mb-3" style={{ color: COLORS.charcoal }}>
                    {category.title}
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {category.items.map((facility) => (
                      <label 
                        key={facility} 
                        className="flex items-center space-x-2 cursor-pointer p-2 rounded-lg transition-all duration-200 hover:bg-white/50"
                      >
                        <Checkbox
                          id={`facility-${facility}`}
                          checked={facilities.includes(facility)}
                          onCheckedChange={() => handleFacilityToggle(facility)}
                        />
                        <span className="text-sm font-medium" style={{ color: COLORS.charcoal }}>
                          {facility}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}

              {/* その他の設備 */}
              <div className="mt-4">
                <p className="text-sm font-bold mb-3" style={{ color: COLORS.charcoal }}>
                  🏢 その他の設備・特徴
                </p>
                <div 
                  className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-64 overflow-y-auto p-3 rounded-xl"
                  style={{ 
                    backgroundColor: 'rgba(0, 0, 0, 0.02)',
                    border: '1px solid rgba(0, 0, 0, 0.05)',
                  }}
                >
                  {otherFacilities.map((facility) => (
                    <label 
                      key={facility} 
                      className="flex items-center space-x-2 cursor-pointer p-2 rounded-lg transition-all duration-200 hover:bg-white"
                    >
                      <Checkbox
                        id={`facility-${facility}`}
                        checked={facilities.includes(facility)}
                        onCheckedChange={() => handleFacilityToggle(facility)}
                      />
                      <span className="text-sm font-medium" style={{ color: COLORS.charcoal }}>
                        {facility}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </Card>

            {/* ========== キャンペーンセクション ========== */}
            <Card 
              className="p-6 rounded-2xl shadow-lg"
              style={{ 
                background: '#FFFFFF',
                border: `1px solid rgba(201, 168, 108, 0.15)`,
              }}
            >
              <StoreCampaignForm
                values={campaignValues}
                onChange={handleCampaignChange}
                disabled={loading}
              />
            </Card>

            {/* ========== クーポン設定セクション ========== */}
            <Card 
              className="p-6 rounded-2xl shadow-lg"
              style={{ 
                background: '#FFFFFF',
                border: `1px solid rgba(201, 168, 108, 0.15)`,
              }}
            >
              <StoreCouponForm
                values={couponValues}
                onChange={setCouponValues}
                disabled={loading}
                errors={couponErrors}
              />
            </Card>

            {/* ========== ログイン情報セクション ========== */}
            <Card 
              className="p-6 rounded-2xl shadow-lg"
              style={{ 
                background: COLORS.luxuryGradient,
                border: `1px solid rgba(201, 168, 108, 0.3)`,
              }}
            >
              <div className="flex items-start gap-3 mb-6">
                <div 
                  className="p-2.5 rounded-xl shrink-0"
                  style={{ 
                    backgroundColor: 'rgba(201, 168, 108, 0.2)',
                    border: `1px solid rgba(201, 168, 108, 0.3)`,
                  }}
                >
                  <Lock className="w-5 h-5" style={{ color: COLORS.paleGold }} />
                </div>
                <div>
                  <h3 
                    className="text-lg font-bold"
                    style={{ color: COLORS.ivory }}
                  >
                    店舗ログイン情報
                  </h3>
                  <p className="text-sm mt-0.5" style={{ color: COLORS.platinum }}>
                    店舗側がログインして情報を更新するためのアカウント
                  </p>
                </div>
              </div>

              {/* 店舗用メールアドレス */}
              <div className="space-y-2 mb-5">
                <Label 
                  htmlFor="email" 
                  className="text-sm font-bold flex items-center gap-2"
                  style={{ color: COLORS.paleGold }}
                >
                  <Mail className="w-4 h-4" />
                  店舗用メールアドレス <span style={{ color: COLORS.champagneGold }}>*</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                  placeholder="store@example.com"
                  className="w-full px-4 py-3 rounded-xl bg-white/10 border-2 border-white/20 text-white placeholder:text-white/40 focus:border-[#C9A86C] focus:ring-2 focus:ring-[#C9A86C]/20 transition-all duration-200"
                  style={{ fontSize: '16px' }}
                />
                <p className="text-xs" style={{ color: COLORS.platinum }}>
                  店舗側がログインする際に使用します
                </p>
              </div>

              {/* 店舗用パスワード */}
              <div className="space-y-2">
                <Label 
                  htmlFor="password" 
                  className="text-sm font-bold flex items-center gap-2"
                  style={{ color: COLORS.paleGold }}
                >
                  <Lock className="w-4 h-4" />
                  店舗用パスワード <span style={{ color: COLORS.champagneGold }}>*</span>
                </Label>
                <PasswordInput
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  disabled={loading}
                  className="w-full px-4 py-3 rounded-xl bg-white/10 border-2 border-white/20 text-white placeholder:text-white/40 focus:border-[#C9A86C] focus:ring-2 focus:ring-[#C9A86C]/20 transition-all duration-200"
                  style={{ fontSize: '16px' }}
                />
                <p className="text-xs" style={{ color: COLORS.platinum }}>
                  最低6文字、数字と記号を含めることを推奨
                </p>
              </div>
            </Card>

            {/* ========== 送信ボタン ========== */}
            <div className="flex gap-3 pt-2">
              <motion.div className="flex-1" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full py-4 rounded-xl font-bold text-base"
                  onClick={() => router.back()}
                  disabled={loading}
                  style={{ 
                    borderColor: COLORS.warmGray,
                    backgroundColor: 'rgba(99, 110, 114, 0.15)',
                    color: COLORS.charcoal,
                  }}
                >
                  キャンセル
                </Button>
              </motion.div>
              <motion.div className="flex-1" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button 
                  type="submit" 
                  className="w-full py-4 rounded-xl font-bold text-base shadow-lg"
                  disabled={loading || geocoding}
                  style={{ 
                    background: COLORS.goldGradient,
                    color: COLORS.deepNavy,
                    boxShadow: '0 8px 25px rgba(201, 168, 108, 0.35)',
                  }}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      登録中...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5 mr-2" />
                      店舗を登録
                    </>
                  )}
                </Button>
              </motion.div>
            </div>
          </form>
        </motion.div>
      </div>
    </div>
  );
}