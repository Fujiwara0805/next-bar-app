'use client';

import { motion } from 'framer-motion';
import { Edit, LogOut, Building, Calendar, Key } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/lib/auth/context';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';

export default function ProfilePage() {
  const router = useRouter();
  const { user, profile, signOut, accountType, store: userStore } = useAuth();

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
  }, [accountType, userStore, router]);

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success('ログアウトしました', {
        position: 'top-center',
        duration: 1000,
        className: 'bg-gray-100'
      });
      router.push('/login');
    } catch (error) {
      toast.error('ログアウトに失敗しました', {
        position: 'top-center',
        duration: 3000,
        className: 'bg-gray-100'
      });
    }
  };

  if (!user || !profile) {
    return (
      <div className="flex items-center justify-center h-screen" style={{ backgroundColor: '#1C1E26' }}>
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-sm text-white font-bold">読み込み中...</p>
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
                    {user.email}
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

          <div className="mt-6 space-y-2">
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => router.push('/profile/change-password')}
            >
              <Key className="w-4 h-4 mr-2" />
              パスワード変更
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
