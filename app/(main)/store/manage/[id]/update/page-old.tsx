'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Save,
  Loader2,
  CircleDot,
  Users,
  MessageSquare,
  LogOut,
  Key,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
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

export default function StoreStatusUpdatePage() {
  const router = useRouter();
  const params = useParams();
  const { user, profile, store: userStore, accountType, signOut } = useAuth();
  const [loading, setLoading] = useState(false);
  const [fetchingStore, setFetchingStore] = useState(true);
  const [store, setStore] = useState<Store | null>(null);

  const [vacancyStatus, setVacancyStatus] = useState<'vacant' | 'moderate' | 'full' | 'closed'>('closed');
  const [statusMessage, setStatusMessage] = useState('');

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
        setVacancyStatus(storeData.vacancy_status as 'vacant' | 'moderate' | 'full' | 'closed');
        setStatusMessage(storeData.status_message || '');
      }
    } catch (error) {
      console.error('Error fetching store:', error);
      toast.error('店舗情報の取得に失敗しました');
      router.push('/store/manage');
    } finally {
      setFetchingStore(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
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
          <div>
            <h1 className="text-xl font-bold">店舗状況更新</h1>
            <p className="text-sm text-muted-foreground">{store.name}</p>
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto p-4">
        <motion.form
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          onSubmit={handleSubmit}
          className="space-y-6"
        >
          {/* 店舗情報カード（店舗アカウント用） */}
          {accountType === 'store' && (
            <Card className="p-6 bg-gradient-to-br from-primary/5 to-primary/10">
              <div className="flex items-start justify-between mb-4">
                <h2 className="text-lg font-bold">店舗情報</h2>
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
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground">店舗名</p>
                  <p className="font-medium">{store.name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">住所</p>
                  <p className="text-sm">{store.address}</p>
                </div>
                {store.phone && (
                  <div>
                    <p className="text-sm text-muted-foreground">電話番号</p>
                    <p className="text-sm">{store.phone}</p>
                  </div>
                )}
                {store.email && (
                  <div>
                    <p className="text-sm text-muted-foreground">ログインメール</p>
                    <p className="text-sm">{store.email}</p>
                  </div>
                )}
              </div>
            </Card>
          )}

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
                更新
              </>
            )}
          </Button>

          {/* 店舗アカウント用のログアウトボタン */}
          {accountType === 'store' && (
            <Button
              type="button"
              variant="outline"
              className="w-full text-destructive"
              onClick={handleSignOut}
            >
              <LogOut className="w-4 h-4 mr-2" />
              ログアウト
            </Button>
          )}
        </motion.form>
      </div>
    </div>
  );
}
