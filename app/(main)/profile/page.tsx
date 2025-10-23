'use client';

import { motion } from 'framer-motion';
import { Edit, LogOut, Building, Calendar, Settings as SettingsIcon, Info } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/lib/auth/context';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import type { Database } from '@/lib/supabase/types';

type Store = Database['public']['Tables']['stores']['Row'];

export default function ProfilePage() {
  const router = useRouter();
  const { user, profile, signOut, accountType, store: userStore } = useAuth();
  const [store, setStore] = useState<Store | null>(null);
  const [loadingStore, setLoadingStore] = useState(true);

  useEffect(() => {
    // 店舗アカウントの場合は更新画面にリダイレクト
    if (accountType === 'store' && userStore) {
      router.push(`/store/manage/${userStore.id}/update`);
      return;
    }

    // 運営会社アカウントのみこの画面にアクセス可能
    if (accountType !== 'platform') {
      router.push('/login');
      return;
    }

    if (profile?.is_business && user) {
      fetchStore();
    } else {
      setLoadingStore(false);
    }
  }, [profile, user, accountType, userStore, router]);

  const fetchStore = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('stores')
        .select('*')
        .eq('owner_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      setStore(data);
    } catch (error) {
      console.error('Error fetching store:', error);
    } finally {
      setLoadingStore(false);
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

  if (!user || !profile) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">
            プロフィール情報を読み込んでいます...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="bg-primary h-32 safe-top" />

      <div className="max-w-2xl mx-auto px-4 -mt-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="p-6">
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-start gap-4">
                <Avatar className="w-20 h-20 border-4 border-background">
                  <AvatarImage src={profile.avatar_url || undefined} />
                  <AvatarFallback className="text-2xl">
                    {profile.display_name[0]}
                  </AvatarFallback>
                </Avatar>

                <div>
                  <h1 className="text-2xl font-bold mb-1">
                    {profile.display_name}
                  </h1>
                  <p className="text-sm text-muted-foreground mb-2">
                    {profile.email}
                  </p>
                  {profile.is_business && (
                    <Badge variant="secondary">
                      <Building className="w-3 h-3 mr-1" />
                      企業アカウント
                    </Badge>
                  )}
                </div>
              </div>

              <Button
                variant="outline"
                size="icon"
                onClick={() => router.push('/profile/edit')}
              >
                <Edit className="w-4 h-4" />
              </Button>
            </div>

            {profile.bio && (
              <p className="text-sm mb-6 whitespace-pre-wrap">
                {profile.bio}
              </p>
            )}

            <div className="flex items-center gap-4 text-sm text-muted-foreground pb-6 border-b">
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                <span>
                  {format(new Date(profile.created_at), 'yyyy年M月', { locale: ja })}から利用
                </span>
              </div>
            </div>
          </Card>

          {/* 企業アカウント向けの店舗管理セクション */}
          {profile.is_business && !loadingStore && (
            <>
              {store ? (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  <Card className="p-6 mt-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-bold text-lg">店舗管理</h3>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push('/store/manage')}
                      >
                        詳細管理
                      </Button>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <Info className="w-5 h-5 text-primary" />
                          <div>
                            <p className="font-medium">基本情報</p>
                            <p className="text-xs text-muted-foreground">
                              店舗名、住所、営業時間など
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => router.push('/profile/edit')}
                        >
                          編集
                        </Button>
                      </div>

                      <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <Building className="w-5 h-5 text-primary" />
                          <div>
                            <p className="font-medium">空席状況・メッセージ</p>
                            <p className="text-xs text-muted-foreground">
                              リアルタイムの店舗状況を更新
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => router.push(`/store/manage/${store.id}/update`)}
                        >
                          更新
                        </Button>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  <Card className="p-6 mt-4">
                    <div className="text-center">
                      <Building className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
                      <h3 className="font-medium mb-2">店舗未登録</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        まずは店舗の基本情報を登録しましょう
                      </p>
                      <Button onClick={() => router.push('/profile/edit')}>
                        基本情報を登録
                      </Button>
                    </div>
                  </Card>
                </motion.div>
              )}
            </>
          )}

          <div className="mt-6 space-y-2">
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => router.push('/settings')}
            >
              <SettingsIcon className="w-4 h-4 mr-2" />
              設定
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start text-destructive"
              onClick={handleSignOut}
            >
              <LogOut className="w-4 h-4 mr-2" />
              ログアウト
            </Button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
