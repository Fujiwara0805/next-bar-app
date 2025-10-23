'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  MapPin, 
  Store as StoreIcon, 
  Phone, 
  ArrowLeft,
  Loader2,
  Search,
  Mail,
  Lock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth/context';
import { toast } from 'sonner';

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

export default function NewStorePage() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [mapsLoaded, setMapsLoaded] = useState(false);

  // フォームステート
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // 店舗名候補
  const [suggestions, setSuggestions] = useState<google.maps.places.AutocompletePrediction[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchingName, setSearchingName] = useState(false);

  const autocompleteServiceRef = useRef<google.maps.places.AutocompleteService | null>(null);
  const placesServiceRef = useRef<google.maps.places.PlacesService | null>(null);
  const geocoderRef = useRef<google.maps.Geocoder | null>(null);

  // Google Maps API初期化（スクリプト自動ロード + フォールバック）
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

    if (initMaps()) return; // 既に読み込み済み

    // 未読み込みの場合はスクリプトを挿入
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
      toast.error('Google Mapsの読み込みに失敗しました');
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
        fields: ['name', 'formatted_address', 'geometry', 'formatted_phone_number'],
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
          
          setSuggestions([]);
          setShowSuggestions(false);
          toast.success('店舗情報を取得しました');
        } else {
          toast.error('店舗情報の取得に失敗しました');
        }
      }
    );
  };

  // 住所から位置情報を取得（同期/RESTフォールバック対応）
  const handleGeocodeAddress = async (): Promise<boolean> => {
    if (!address.trim()) {
      toast.error('住所を入力してください');
      return false;
    }

    // Google Maps APIが未初期化なら初期化待機
    if (!geocoderRef.current && !mapsLoaded) {
      // 軽く待ってみる
      await new Promise((r) => setTimeout(r, 400));
    }

    setGeocoding(true);

    // 1) Geocoderが使える場合
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
          toast.success('位置情報を取得しました');
          setGeocoding(false);
          return true;
        }
      } catch (e) {
        // 続行してフォールバックへ
      }
    }

    // 2) REST APIフォールバック（フロントでの直接呼び出し）
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
        toast.success('位置情報を取得しました');
        setGeocoding(false);
        return true;
      }
    } catch (err) {
      console.error('Geocode REST error:', err);
    }

    setGeocoding(false);
    toast.error('位置情報を取得できませんでした');
    return false;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error('ログインが必要です');
      return;
    }

    if (!name.trim()) {
      toast.error('店舗名を入力してください');
      return;
    }

    if (!address.trim()) {
      toast.error('住所を入力してください');
      return;
    }

    if (!email.trim()) {
      toast.error('店舗用のメールアドレスを入力してください');
      return;
    }

    if (!password || password.length < 6) {
      toast.error('パスワードは6文字以上で入力してください');
      return;
    }

    if (!latitude || !longitude) {
      const ok = await handleGeocodeAddress();
      if (!ok) {
        toast.error('位置情報を取得してください');
        return;
      }
    }

    setLoading(true);

    try {
      // 1. 店舗用のSupabase認証アカウントを作成
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
        throw new Error(`認証アカウントの作成に失敗: ${authError.message}`);
      }

      if (!authData.user) {
        throw new Error('認証アカウントの作成に失敗しました');
      }

      // 2. storesテーブルに店舗情報を登録（idは認証アカウントのIDを使用）
      const { error: storeError } = await supabase
        .from('stores')
        .insert({
          id: authData.user.id, // 店舗アカウントのIDを使用
          owner_id: user.id, // 運営会社のID
          email: email.trim(),
          name: name.trim(),
          description: description.trim() || null,
          address: address.trim(),
          latitude: parseFloat(latitude),
          longitude: parseFloat(longitude),
          phone: phone.trim() || null,
          is_open: false,
          vacancy_status: 'vacant',
          male_ratio: 50,
          female_ratio: 50,
        } as any);

      if (storeError) {
        console.error('Store error:', storeError);
        // 店舗登録に失敗した場合、作成した認証アカウントは残るが問題ない
        throw new Error(`店舗情報の登録に失敗: ${storeError.message}`);
      }

      toast.success('店舗を登録しました', {
        description: `ログイン用メールアドレス: ${email}`,
      });
      router.push('/store/manage');
    } catch (error) {
      console.error('Error:', error);
      const errorMsg = error instanceof Error ? error.message : '店舗の登録に失敗しました';
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b safe-top">
        <div className="flex items-center gap-3 p-4">
          <Button size="icon" variant="ghost" onClick={() => router.back()}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold">新規店舗登録</h1>
            <p className="text-xs text-muted-foreground">店舗情報を入力してください</p>
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto p-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* 店舗名 */}
              <div className="space-y-2">
                <Label htmlFor="name">
                  <StoreIcon className="w-4 h-4 inline mr-2" />
                  店舗名 <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                    placeholder="店舗名を入力"
                    required
                    disabled={loading}
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
                          <div className="font-medium text-sm">
                            {pred.structured_formatting?.main_text || pred.description}
                          </div>
                          <div className="text-xs text-gray-500">
                            {pred.structured_formatting?.secondary_text || ''}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {searchingName && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    候補を検索中...
                  </p>
                )}
              </div>

              {/* 説明 */}
              <div className="space-y-2">
                <Label htmlFor="description">店舗説明</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="店舗の特徴や雰囲気"
                  rows={3}
                  disabled={loading}
                />
              </div>

              {/* 住所 */}
              <div className="space-y-2">
                <Label htmlFor="address">
                  <MapPin className="w-4 h-4 inline mr-2" />
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
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={async () => { await handleGeocodeAddress(); }}
                  disabled={loading || geocoding || !address.trim()}
                  className="w-full"
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
                  <p className="text-sm text-green-800">
                    ✓ 位置情報取得済み: 緯度 {parseFloat(latitude).toFixed(6)}, 経度 {parseFloat(longitude).toFixed(6)}
                  </p>
                </div>
              )}

              {/* 電話番号 */}
              <div className="space-y-2">
                <Label htmlFor="phone">
                  <Phone className="w-4 h-4 inline mr-2" />
                  電話番号
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="03-1234-5678"
                  disabled={loading}
                />
              </div>

              {/* セパレーター */}
              <div className="border-t pt-6">
                <h3 className="font-bold text-lg mb-2">店舗ログイン情報</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  店舗側がログインして情報を更新するためのアカウントを作成します
                </p>
              </div>

              {/* 店舗用メールアドレス */}
              <div className="space-y-2">
                <Label htmlFor="email">
                  <Mail className="w-4 h-4 inline mr-2" />
                  店舗用メールアドレス <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="store@example.com"
                  required
                  disabled={loading}
                />
                <p className="text-xs text-muted-foreground">
                  店舗側がログインする際に使用します
                </p>
              </div>

              {/* 店舗用パスワード */}
              <div className="space-y-2">
                <Label htmlFor="password">
                  <Lock className="w-4 h-4 inline mr-2" />
                  店舗用パスワード <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="6文字以上"
                  required
                  minLength={6}
                  disabled={loading}
                />
                <p className="text-xs text-muted-foreground">
                  最低6文字、数字と記号を含めることを推奨
                </p>
              </div>

              {/* 送信ボタン */}
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => router.back()}
                  disabled={loading}
                >
                  キャンセル
                </Button>
                <Button type="submit" className="flex-1" disabled={loading || geocoding}>
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