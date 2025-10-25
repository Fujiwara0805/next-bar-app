'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Store as StoreIcon, Edit, TrendingUp, Trash2, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth/context';
import { toast } from 'sonner';
import type { Database } from '@/lib/supabase/types';

type Store = Database['public']['Tables']['stores']['Row'];

export default function StoreManagePage() {
  const router = useRouter();
  const { user, profile, accountType, store } = useAuth();
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [storeToDelete, setStoreToDelete] = useState<Store | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    // 店舗アカウントの場合は自分の更新画面にリダイレクト
    if (accountType === 'store' && store) {
      router.push(`/store/manage/${store.id}/update`);
      return;
    }

    // 運営会社アカウントのみこの画面にアクセス可能
    if (!profile?.is_business || accountType !== 'platform') {
      router.push('/login');
      return;
    }

    fetchStores();
  }, [profile, accountType, store, router]);

  const fetchStores = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('stores')
        .select('*')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setStores(data || []);
    } catch (error) {
      console.error('Error fetching stores:', error);
    } finally {
      setLoading(false);
    }
  };

  const getVacancyLabel = (status: string) => {
    switch (status) {
      case 'vacant':
        return '空席あり';
      case 'moderate':
        return 'やや混雑';
      case 'full':
        return '満席';
      case 'closed':
        return '閉店';
      default:
        return '不明';
    }
  };

  const getVacancyColor = (status: string) => {
    switch (status) {
      case 'vacant':
        return 'bg-green-500';
      case 'moderate':
        return 'bg-yellow-500';
      case 'full':
        return 'bg-red-500';
      case 'closed':
        return 'bg-gray-500';
      default:
        return 'bg-gray-500';
    }
  };

  const handleDeleteClick = (store: Store) => {
    setStoreToDelete(store);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!storeToDelete || !user) return;

    setDeleting(true);

    try {
      // storesテーブルから削除
      const { error } = await supabase
        .from('stores')
        .delete()
        .eq('id', storeToDelete.id)
        .eq('owner_id', user.id);

      if (error) throw error;

      toast.success('店舗を削除しました', {
        description: `${storeToDelete.name}の情報を削除しました`,
      });

      // リストから削除
      setStores(stores.filter((s) => s.id !== storeToDelete.id));
      setDeleteDialogOpen(false);
      setStoreToDelete(null);
    } catch (error) {
      console.error('Error deleting store:', error);
      toast.error('店舗の削除に失敗しました');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
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
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#1C1E26' }}>
      {/* ヘッダー */}
      <header className="sticky top-0 z-10 bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <h1 className="text-xl font-bold text-card-foreground text-center">管理者画面</h1>
          <p className="text-sm text-card-foreground/70 mt-2 font-bold text-center">
            {stores.length}件の店舗
          </p>
        </div>
      </header>

      {/* 店舗リスト */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-6">
        {stores.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="p-12 text-center bg-white">
              <StoreIcon className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <h2 className="text-xl font-bold mb-2 text-card-foreground">
                まだ店舗が登録されていません
              </h2>
              <p className="text-card-foreground/70 mb-6 font-bold">
                最初の店舗を登録して、情報を共有しましょう
              </p>
              <Link href="/store/manage/new">
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  店舗を登録
                </Button>
              </Link>
            </Card>
          </motion.div>
        ) : (
          <>
            {/* 新規追加ボタン */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6"
            >
              <Link href="/store/manage/new">
                <Button className="w-full sm:w-auto">
                  <Plus className="w-4 h-4 mr-2" />
                  新しい店舗を追加
                </Button>
              </Link>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <AnimatePresence mode="popLayout">
                {stores.map((store, index) => (
                  <motion.div
                    key={store.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card className="overflow-hidden bg-white">
                      {store.image_urls && store.image_urls.length > 0 && (
                        <motion.div 
                          className="h-40 overflow-hidden"
                          whileHover={{ scale: 1.05 }}
                        >
                          <img
                            src={store.image_urls[0]}
                            alt={store.name}
                            className="w-full h-full object-cover"
                          />
                        </motion.div>
                      )}
                      <div className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <h3 className="font-bold text-lg mb-1 text-card-foreground">
                              {store.name}
                            </h3>
                            <p className="text-sm text-card-foreground/70 font-bold">
                              {store.address}
                            </p>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => router.push(`/store/manage/${store.id}/update`)}
                              title="店舗情報を表示"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleDeleteClick(store)}
                              className="text-destructive hover:text-destructive"
                              title="店舗を削除"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>

                        <div className="flex gap-2 mb-3">
                          <Badge
                            variant="secondary"
                            className={`${getVacancyColor(store.vacancy_status)} text-white`}
                          >
                            {getVacancyLabel(store.vacancy_status)}
                          </Badge>
                          <Badge variant="outline">
                            {store.is_open ? '営業中' : '閉店'}
                          </Badge>
                        </div>

                        <div className="flex items-center justify-between text-sm">
                          <span className="text-card-foreground/70 font-bold">
                            男性 {store.male_ratio}% / 女性 {store.female_ratio}%
                          </span>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => router.push(`/store/manage/${store.id}/update`)}
                          >
                            <TrendingUp className="w-4 h-4 mr-1" />
                            状況更新
                          </Button>
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </>
        )}
      </main>

      {/* 削除確認ダイアログ */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>店舗を削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              {storeToDelete && (
                <>
                  <span className="font-bold">{storeToDelete.name}</span>
                  を削除します。この操作は取り消せません。
                  <br />
                  <br />
                  店舗のログインアカウントも削除されますが、Supabase Authからは手動で削除する必要があります。
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>キャンセル</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  削除中...
                </>
              ) : (
                '削除'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
