'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Save,
  Loader2,
  User,
  MapPin,
  Phone,
  Globe,
  Clock,
  Image as ImageIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/lib/auth/context';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'sonner';
import type { Database } from '@/lib/supabase/types';

type Store = Database['public']['Tables']['stores']['Row'];

interface OpeningHours {
  [key: string]: { open: string; close: string; closed: boolean };
}

const WEEKDAYS = ['月', '火', '水', '木', '金', '土', '日'];
const DEFAULT_HOURS = { open: '11:00', close: '23:00', closed: false };

export default function ProfileEditPage() {
  const router = useRouter();
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [store, setStore] = useState<Store | null>(null);
  const [fetchingStore, setFetchingStore] = useState(true);

  // フォームの状態
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [openingHours, setOpeningHours] = useState<OpeningHours>({
    mon: DEFAULT_HOURS,
    tue: DEFAULT_HOURS,
    wed: DEFAULT_HOURS,
    thu: DEFAULT_HOURS,
    fri: DEFAULT_HOURS,
    sat: DEFAULT_HOURS,
    sun: DEFAULT_HOURS,
  });

  useEffect(() => {
    if (!profile?.is_business) {
      router.push('/profile');
      return;
    }

    fetchStore();
  }, [profile, router]);

  const fetchStore = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('stores')
        .select('*')
        .eq('owner_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        const storeData = data as Store;
        setStore(storeData);
        setName(storeData.name);
        setDescription(storeData.description || '');
        setAddress(storeData.address);
        setPhone(storeData.phone || '');
        setWebsiteUrl(storeData.website_url || '');
        
        if (storeData.opening_hours) {
          setOpeningHours(storeData.opening_hours as OpeningHours);
        }
      }
    } catch (error) {
      console.error('Error fetching store:', error);
      toast.error('店舗情報の取得に失敗しました');
    } finally {
      setFetchingStore(false);
    }
  };

  const handleHoursChange = (day: string, field: 'open' | 'close' | 'closed', value: string | boolean) => {
    setOpeningHours((prev) => ({
      ...prev,
      [day]: {
        ...prev[day],
        [field]: value,
      },
    }));
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

    setLoading(true);

    try {
      const storeData: Database['public']['Tables']['stores']['Update'] = {
        owner_id: user.id,
        name: name.trim(),
        description: description.trim() || null,
        address: address.trim(),
        phone: phone.trim() || null,
        website_url: websiteUrl.trim() || null,
        opening_hours: openingHours as any,
        updated_at: new Date().toISOString(),
      };

      if (store) {
        // 既存の店舗を更新
        const { error } = await (supabase.from('stores') as any)
          .update(storeData)
          .eq('id', store.id);

        if (error) throw error;
        toast.success('店舗情報を更新しました');
      } else {
        // 新規店舗を作成（座標は後で設定）
        const { error } = await supabase
          .from('stores')
          .insert({
            ...storeData,
            latitude: 35.6812, // デフォルト値（東京）
            longitude: 139.7671,
            is_open: false,
            vacancy_status: 'closed',
          } as any);

        if (error) throw error;
        toast.success('店舗情報を登録しました');
      }

      router.push('/profile');
    } catch (error) {
      console.error('Error:', error);
      toast.error('保存に失敗しました');
    } finally {
      setLoading(false);
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
          <h1 className="text-xl font-bold">基本情報設定</h1>
        </div>
      </header>

      <div className="max-w-2xl mx-auto p-4">
        <motion.form
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          onSubmit={handleSubmit}
          className="space-y-6"
        >
          <Card className="p-6">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <User className="w-5 h-5" />
              基本情報
            </h2>

            <div className="space-y-4">
              <div>
                <Label htmlFor="name">店舗名 *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="例: 居酒屋 まちのわ"
                  required
                />
              </div>

              <div>
                <Label htmlFor="description">店舗説明</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="店舗の特徴やおすすめポイントを入力"
                  rows={4}
                />
              </div>

              <div>
                <Label htmlFor="address">住所 *</Label>
                <Input
                  id="address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="例: 東京都渋谷区..."
                  required
                />
              </div>

              <div>
                <Label htmlFor="phone">電話番号</Label>
                <div className="flex gap-2">
                  <Phone className="w-5 h-5 text-muted-foreground mt-2" />
                  <Input
                    id="phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="03-1234-5678"
                    type="tel"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="websiteUrl">WebサイトURL</Label>
                <div className="flex gap-2">
                  <Globe className="w-5 h-5 text-muted-foreground mt-2" />
                  <Input
                    id="websiteUrl"
                    value={websiteUrl}
                    onChange={(e) => setWebsiteUrl(e.target.value)}
                    placeholder="https://example.com"
                    type="url"
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  公式サイト、Instagram、Twitterなどのリンク
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5" />
              営業時間
            </h2>

            <div className="space-y-3">
              {Object.entries(openingHours).map(([day, hours], index) => (
                <div key={day} className="flex items-center gap-3">
                  <span className="w-8 font-medium">
                    {WEEKDAYS[index]}
                  </span>
                  <div className="flex-1 flex items-center gap-2">
                    <Input
                      type="time"
                      value={hours.open}
                      onChange={(e) => handleHoursChange(day, 'open', e.target.value)}
                      disabled={hours.closed}
                      className="flex-1"
                    />
                    <span>〜</span>
                    <Input
                      type="time"
                      value={hours.close}
                      onChange={(e) => handleHoursChange(day, 'close', e.target.value)}
                      disabled={hours.closed}
                      className="flex-1"
                    />
                  </div>
                  <Button
                    type="button"
                    variant={hours.closed ? 'secondary' : 'outline'}
                    size="sm"
                    onClick={() => handleHoursChange(day, 'closed', !hours.closed)}
                  >
                    {hours.closed ? '定休日' : '営業'}
                  </Button>
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
                保存中...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                保存
              </>
            )}
          </Button>
        </motion.form>
      </div>
    </div>
  );
}
