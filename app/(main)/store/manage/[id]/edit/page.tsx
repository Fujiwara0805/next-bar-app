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
  Upload,
  Sparkles,
  Image as ImageIcon,
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

// クーポン関連のインポート
import { StoreCouponForm } from '@/components/store/StoreCouponForm';
import {
  CouponFormValues,
  CouponData,
  getDefaultCouponFormValues,
  couponFormToDbData,
  dbDataToCouponForm,
  couponFormSchema,
} from '@/lib/types/coupon';

// キャンペーン関連のインポート
import {
  StoreCampaignForm,
  CampaignFormValues,
  getDefaultCampaignFormValues,
  campaignFormToDbData,
  dbDataToCampaignForm,
} from '@/components/store/StoreCampaignForm';

// おごり酒関連のインポート
import { StoreOgoriForm } from '@/components/store/StoreOgoriForm';
import {
  OgoriFormValues,
  getDefaultOgoriFormValues,
  ogoriFormToDbData,
  OGORI_FIXED_AMOUNT,
} from '@/lib/types/ogori';

// 構造化営業時間モーダル
import { BusinessHoursModal } from '@/components/store/BusinessHoursModal';
import type { BusinessHours } from '@/lib/supabase/types';

type Store = Database['public']['Tables']['stores']['Row'];

// Store型を拡張してクーポンフィールドを追加
type StoreWithCoupon = Store & Partial<CouponData>;

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

export default function StoreEditPage() {
  const router = useRouter();
  const params = useParams();
  const { user, accountType } = useAuth();
  const [loading, setLoading] = useState(false);
  const [fetchingStore, setFetchingStore] = useState(true);
  const [geocoding, setGeocoding] = useState(false);

  // 認証チェック完了フラグ
  const [authChecked, setAuthChecked] = useState(false);

  // フォームステート
  const [storeCategory, setStoreCategory] = useState<'bar' | 'cafe' | 'both'>('bar');
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
  const [structuredBusinessHours, setStructuredBusinessHours] = useState<BusinessHours | null>(null);
  const [showBusinessHoursModal, setShowBusinessHoursModal] = useState(false);
  const [budgetMin, setBudgetMin] = useState<number>(0);
  const [budgetMax, setBudgetMax] = useState<number>(0);
  const [paymentMethods, setPaymentMethods] = useState<string[]>([]);
  const [facilities, setFacilities] = useState<string[]>([]);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [mainImageIndex, setMainImageIndex] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // クーポン関連のステート
  const [couponValues, setCouponValues] = useState<CouponFormValues>(getDefaultCouponFormValues());
  const [couponErrors, setCouponErrors] = useState<Record<string, string>>({});
  const [couponCurrentUses, setCouponCurrentUses] = useState(0);

  // キャンペーン関連のステート
  const [campaignValues, setCampaignValues] = useState<CampaignFormValues>(getDefaultCampaignFormValues());

  // おごり酒関連のステート
  const [ogoriValues, setOgoriValues] = useState<OgoriFormValues>(getDefaultOgoriFormValues());

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

  const geocoderRef = useRef<google.maps.Geocoder | null>(null);
  const [mapsLoaded, setMapsLoaded] = useState(false);

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
        const storeData = data as StoreWithCoupon;
        
        // 店舗アカウントの場合、emailで認証ユーザーと店舗を紐づけ確認
        if (accountType === 'store') {
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
        
        setStoreCategory((storeData as any).store_category || 'bar');
        setName(storeData.name);
        setDescription(storeData.description || '');
        setAddress(storeData.address);
        setPhone(storeData.phone || '');
        setWebsiteUrl(storeData.website_url || '');
        setEmail(storeData.email);
        setBusinessHours(storeData.business_hours as string || '');
        setRegularHoliday(storeData.regular_holiday || '');
        setStructuredBusinessHours(storeData.structured_business_hours as BusinessHours | null);
        setBudgetMin(storeData.budget_min || 0);
        setBudgetMax(storeData.budget_max || 0);
        setPaymentMethods(storeData.payment_methods || []);
        setFacilities(storeData.facilities || []);
        setImageUrls(storeData.image_urls || []);
        setLatitude(String(storeData.latitude || ''));
        setLongitude(String(storeData.longitude || ''));

        // クーポンデータの読み込み
        setCouponValues(dbDataToCouponForm(storeData));
        setCouponCurrentUses(storeData.coupon_current_uses || 0);
        
        // キャンペーンデータの読み込み
        setCampaignValues(dbDataToCampaignForm(storeData));

        // おごり酒データの読み込み
        setOgoriValues(prev => ({ ...prev, isEnabled: storeData.ogori_enabled ?? false }));
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

  // Google Maps APIの初期化とsessionStorageからのデータ読み込み
  useEffect(() => {
    if (!authChecked) return;

    // sessionStorageからデータを読み込む（高速化のため）
    try {
      const cachedStore = sessionStorage.getItem(`store_${params.id}`);
      if (cachedStore) {
        const storeData = JSON.parse(cachedStore) as StoreWithCoupon;
        
        // 店舗アカウントの場合、emailチェック
        if (accountType === 'store' && storeData.email !== user?.email) {
          // emailが一致しない場合はキャッシュを使用せず、fetchStoreで再確認
          console.warn('Cached store email does not match user email, will fetch fresh data');
        } else {
          setName(storeData.name);
          setDescription(storeData.description || '');
          setAddress(storeData.address);
          setPhone(storeData.phone || '');
          setWebsiteUrl(storeData.website_url || '');
          setEmail(storeData.email);
          setBusinessHours(storeData.business_hours as string || '');
          setRegularHoliday(storeData.regular_holiday || '');
          setStructuredBusinessHours(storeData.structured_business_hours as BusinessHours | null);
          setBudgetMin(storeData.budget_min || 0);
          setBudgetMax(storeData.budget_max || 0);
          setPaymentMethods(storeData.payment_methods || []);
          setFacilities(storeData.facilities || []);
          setImageUrls(storeData.image_urls || []);
          setLatitude(String(storeData.latitude || ''));
          setLongitude(String(storeData.longitude || ''));

          // クーポンデータの読み込み
          setCouponValues(dbDataToCouponForm(storeData));
          setCouponCurrentUses(storeData.coupon_current_uses || 0);
          
          // キャンペーンデータの読み込み
          setCampaignValues(dbDataToCampaignForm(storeData));

          // おごり酒データの読み込み
          setOgoriValues(prev => ({ ...prev, isEnabled: storeData.ogori_enabled ?? false }));

          setFetchingStore(false);
        }
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
  }, [authChecked, accountType, user?.email, params.id]);

  // 認証チェック完了後にデータを取得（sessionStorageにデータがない場合）
  useEffect(() => {
    if (!authChecked || !user || !accountType || !params.id) {
      return;
    }

    // アカウントタイプが有効で、まだデータを取得していない場合
    if ((accountType === 'platform' || accountType === 'store') && fetchingStore) {
      // sessionStorageにデータがない場合のみfetchStoreを実行
      const cachedStore = sessionStorage.getItem(`store_${params.id}`);
      if (!cachedStore) {
        fetchStore();
      }
    }
  }, [authChecked, user, accountType, params.id, fetchStore, fetchingStore]);

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
        
        if (file.size > 10 * 1024 * 1024) {
          toast.error(`${file.name}は10MBを超えています`, { 
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
      // クーポンデータをDB形式に変換
      const couponDbData = couponFormToDbData(couponValues);

      // キャンペーンデータをDB形式に変換
      const campaignDbData = campaignFormToDbData(campaignValues);

      // おごり酒データをDB形式に変換
      const ogoriDbData = ogoriFormToDbData(ogoriValues);

      let query = (supabase.from('stores') as any)
        .update({
          store_category: storeCategory,
          name: name.trim(),
          description: description.trim() || null,
          address: address.trim(),
          phone: phone.trim() || null,
          website_url: websiteUrl.trim() || null,
          business_hours: businessHours,
          regular_holiday: regularHoliday.trim() || null,
          structured_business_hours: structuredBusinessHours,
          budget_min: budgetMin || null,
          budget_max: budgetMax || null,
          payment_methods: paymentMethods,
          facilities: facilities,
          image_urls: imageUrls,
          latitude: parseFloat(latitude),
          longitude: parseFloat(longitude),
          updated_at: new Date().toISOString(),
          // クーポン関連カラム
          ...couponDbData,
          // キャンペーン関連カラム
          ...campaignDbData,
          // おごり酒関連カラム
          ...ogoriDbData,
        })
        .eq('id', params.id as string);

      if (accountType === 'platform') {
        query = query.eq('owner_id', user.id);
      }
      // 店舗アカウントの場合、emailでの追加チェックは行わない
      // （すでにfetchStoreでアクセス権限を確認済み）

      const { error } = await query;

      if (error) throw error;

      // おごり酒ドリンクメニューを更新（既存を削除して再挿入）
      const storeId = params.id as string;
      if (ogoriValues.isEnabled) {
        // 既存ドリンクを削除
        await (supabase.from('ogori_drinks') as any)
          .delete()
          .eq('store_id', storeId);

        // 新しいドリンクを挿入
        if (ogoriValues.drinks.length > 0) {
          const drinksToInsert = ogoriValues.drinks
            .filter(d => d.name.trim())
            .map((drink, index) => ({
              store_id: storeId,
              name: drink.name.trim(),
              price: OGORI_FIXED_AMOUNT,
              is_active: drink.isActive,
              sort_order: index,
            }));
          if (drinksToInsert.length > 0) {
            await supabase.from('ogori_drinks').insert(drinksToInsert as any);
          }
        }
      } else {
        // おごり酒が無効の場合、ドリンクを削除
        await (supabase.from('ogori_drinks') as any)
          .delete()
          .eq('store_id', storeId);
      }

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
              店舗編集画面
            </h1>
          </div>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => router.push(`/store/manage/${params.id}/update`)}
            className="rounded-full absolute right-4"
            style={{ color: COLORS.warmGray }}
          >
            <X className="w-5 h-5" />
          </Button>
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
                description="店舗の基本的な情報を編集してください"
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
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  disabled={loading}
                  placeholder="例: Bar NIKENME"
                  className={getInputClassName(loading)}
                  style={{ fontSize: '16px' }}
                />
              </div>

              {/* 店舗カテゴリ */}
              <div className="space-y-2 mb-5">
                <Label className="text-sm font-bold flex items-center gap-2" style={{ color: COLORS.deepNavy }}>
                  <StoreIcon className="w-4 h-4" style={{ color: COLORS.champagneGold }} />
                  店舗カテゴリ <span style={{ color: COLORS.champagneGold }}>*</span>
                </Label>
                <div className="flex gap-3">
                  {([['bar', 'バー・スナック'], ['cafe', 'カフェ'], ['both', '両方']] as const).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setStoreCategory(value)}
                      className="flex-1 py-2.5 px-3 rounded-xl text-sm font-medium transition-all duration-200 border-2"
                      style={{
                        borderColor: storeCategory === value ? COLORS.champagneGold : COLORS.platinum,
                        backgroundColor: storeCategory === value ? `${COLORS.champagneGold}15` : 'white',
                        color: storeCategory === value ? COLORS.deepNavy : COLORS.warmGray,
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
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
                    onClick={handleGeocodeAddress}
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
              <div className="space-y-2 mb-5">
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

              {/* メールアドレス（読み取り専用） */}
              <div className="space-y-2">
                <Label 
                  htmlFor="email" 
                  className="text-sm font-bold flex items-center gap-2"
                  style={{ color: COLORS.deepNavy }}
                >
                  <Mail className="w-4 h-4" style={{ color: COLORS.champagneGold }} />
                  ログイン用メールアドレス
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  disabled
                  className="w-full px-4 py-3 rounded-xl bg-gray-100 border-2 border-gray-200 font-medium cursor-not-allowed"
                  style={{ fontSize: '16px', color: COLORS.warmGray }}
                />
                <p className="text-xs" style={{ color: COLORS.warmGray }}>
                  ログイン用のメールアドレスは変更できません
                </p>
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
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowBusinessHoursModal(true)}
                  disabled={loading}
                  className="mt-2"
                  style={{
                    borderColor: COLORS.champagneGold,
                    backgroundColor: 'rgba(201, 168, 108, 0.15)',
                    color: COLORS.deepNavy,
                  }}
                >
                  <Clock className="w-4 h-4 mr-1" style={{ color: COLORS.champagneGold }} />
                  詳細を記述する
                </Button>
                {structuredBusinessHours && (
                  <p className="text-xs mt-1" style={{ color: COLORS.champagneGold }}>
                    構造化営業時間が設定されています
                  </p>
                )}
                <BusinessHoursModal
                  isOpen={showBusinessHoursModal}
                  onClose={() => setShowBusinessHoursModal(false)}
                  value={structuredBusinessHours}
                  onChange={(hours) => {
                    setStructuredBusinessHours(hours);
                    setShowBusinessHoursModal(false);
                  }}
                  disabled={loading}
                />
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

            {/* ========== 店舗画像セクション ========== */}
            <Card 
              className="p-6 rounded-2xl shadow-lg"
              style={{ 
                background: '#FFFFFF',
                border: `1px solid rgba(201, 168, 108, 0.15)`,
              }}
            >
              <SectionHeader 
                icon={ImageIcon} 
                title="店舗画像" 
                description="最大5枚まで画像をアップロードできます（1枚あたり最大10MB）"
              />

              <div className="grid grid-cols-3 gap-4 mb-4">
                {imageUrls.map((url, index) => (
                  <motion.div
                    key={url}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="relative aspect-square rounded-xl overflow-hidden group"
                    style={{ border: `2px solid ${index === mainImageIndex ? COLORS.champagneGold : 'rgba(201, 168, 108, 0.2)'}` }}
                  >
                    <img
                      src={url}
                      alt={`店舗画像 ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                    
                    {index === mainImageIndex && (
                      <div 
                        className="absolute top-2 left-2 px-2 py-1 rounded-lg text-xs font-bold"
                        style={{ 
                          background: COLORS.goldGradient,
                          color: COLORS.deepNavy,
                        }}
                      >
                        メイン
                      </div>
                    )}

                    <div 
                      className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2"
                      style={{ backgroundColor: 'rgba(10, 22, 40, 0.7)' }}
                    >
                      {index !== mainImageIndex && (
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => setMainImageIndex(index)}
                          disabled={uploadingImage}
                          className="font-bold text-xs rounded-lg"
                          style={{ 
                            background: COLORS.goldGradient,
                            color: COLORS.deepNavy,
                          }}
                        >
                          メインに設定
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
                        className="font-bold text-xs rounded-lg"
                      >
                        <X className="w-3 h-3 mr-1" />
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
                      className="aspect-square rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all duration-200"
                      style={{ 
                        backgroundColor: 'rgba(201, 168, 108, 0.05)',
                        border: `2px dashed rgba(201, 168, 108, 0.3)`,
                      }}
                    >
                      {uploadingImage ? (
                        <Loader2 className="w-8 h-8 animate-spin" style={{ color: COLORS.champagneGold }} />
                      ) : (
                        <>
                          <Upload className="w-8 h-8 mb-2" style={{ color: COLORS.champagneGold }} />
                          <span className="text-xs font-bold" style={{ color: COLORS.warmGray }}>
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
                <div 
                  className="text-center py-8 rounded-xl"
                  style={{ 
                    backgroundColor: 'rgba(0, 0, 0, 0.02)',
                    border: '1px solid rgba(0, 0, 0, 0.05)',
                  }}
                >
                  <ImageIcon className="w-12 h-12 mx-auto mb-3" style={{ color: COLORS.warmGray }} />
                  <p className="text-sm font-medium" style={{ color: COLORS.warmGray }}>
                    画像がアップロードされていません
                  </p>
                  <p className="text-xs mt-1" style={{ color: COLORS.warmGray }}>
                    上のボタンから画像を追加してください
                  </p>
                </div>
              )}
            </Card>

            {/* ========== NIKENME+が提供するサービス セクション ========== */}
            <Card
              className="p-6 rounded-2xl shadow-lg"
              style={{
                background: '#FFFFFF',
                border: `1px solid rgba(201, 168, 108, 0.15)`,
              }}
            >
              <SectionHeader
                icon={Sparkles}
                title="NIKENME+が提供するサービス"
                description="キャンペーン・おごり酒・クーポンの設定ができます"
              />

              <div className="space-y-4">
                {/* キャンペーン設定 */}
                <Card
                  className="rounded-xl overflow-hidden"
                  style={{ border: `1px solid rgba(201, 168, 108, 0.15)` }}
                >
                  <StoreCampaignForm
                    values={campaignValues}
                    onChange={handleCampaignChange}
                    disabled={loading}
                  />
                </Card>

                {/* おごり酒設定 */}
                <Card
                  className="rounded-xl overflow-hidden"
                  style={{ border: `1px solid rgba(31, 64, 104, 0.2)` }}
                >
                  <StoreOgoriForm
                    values={ogoriValues}
                    onChange={setOgoriValues}
                    storeId={params.id as string}
                    disabled={loading}
                  />
                </Card>

                {/* クーポン設定 */}
                <Card
                  className="rounded-xl overflow-hidden"
                  style={{ border: `1px solid rgba(201, 168, 108, 0.15)` }}
                >
                  <StoreCouponForm
                    values={couponValues}
                    onChange={setCouponValues}
                    disabled={loading}
                    errors={couponErrors}
                    currentUses={couponCurrentUses}
                  />
                </Card>
              </div>
            </Card>

            {/* ========== 送信ボタン ========== */}
            <div className="flex gap-3 pt-2">
              <motion.div className="flex-1" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full py-4 rounded-xl font-bold text-base"
                  onClick={() => router.push(`/store/manage/${params.id}/update`)}
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
                      更新中...
                    </>
                  ) : (
                    <>
                      <Save className="w-5 h-5 mr-2" />
                      更新
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