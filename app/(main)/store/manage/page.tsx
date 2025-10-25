'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Store as StoreIcon, Edit, Trash2, Loader2, LogOut, Mail } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CustomModal } from '@/components/ui/custom-modal';
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
  const { user, profile, accountType, store, signOut } = useAuth();
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [storeToDelete, setStoreToDelete] = useState<Store | null>(null);
  const [deleting, setDeleting] = useState(false);
  
  // パスワードリセット用
  const [resetPasswordModalOpen, setResetPasswordModalOpen] = useState(false);
  const [storeToResetPassword, setStoreToResetPassword] = useState<Store | null>(null);
  const [sendingResetEmail, setSendingResetEmail] = useState(false);

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
        position: 'top-center',
        duration: 2000,
        className: 'bg-gray-100'
      });

      // リストから削除
      setStores(stores.filter((s) => s.id !== storeToDelete.id));
      setDeleteDialogOpen(false);
      setStoreToDelete(null);
    } catch (error) {
      console.error('Error deleting store:', error);
      toast.error('店舗の削除に失敗しました', {
        position: 'top-center',
        duration: 3000,
        className: 'bg-gray-100'
      });
    } finally {
      setDeleting(false);
    }
  };

  const handlePasswordResetClick = (store: Store) => {
    setStoreToResetPassword(store);
    setResetPasswordModalOpen(true);
  };

  const handlePasswordResetConfirm = async () => {
    if (!storeToResetPassword) return;

    setSendingResetEmail(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(
        storeToResetPassword.email,
        {
          redirectTo: `${window.location.origin}/auth/reset-password`,
        }
      );

      if (error) throw error;

      toast.success('パスワードリセットメールを送信しました', {
        description: `${storeToResetPassword.email} にメールを送信しました。店舗に確認を依頼してください。`,
        position: 'top-center',
        duration: 5000,
        className: 'bg-gray-100'
      });

      setResetPasswordModalOpen(false);
      setStoreToResetPassword(null);
    } catch (error) {
      console.error('Error sending reset email:', error);
      toast.error('メールの送信に失敗しました', {
        description: error instanceof Error ? error.message : '不明なエラーが発生しました',
        position: 'top-center',
        duration: 3000,
        className: 'bg-gray-100'
      });
    } finally {
      setSendingResetEmail(false);
    }
  };

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
                            <p className="text-xs text-card-foreground/60 font-bold mt-1">
                              {store.email}
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
                              onClick={() => handlePasswordResetClick(store)}
                              title="パスワードをリセット"
                              className="text-blue-600 hover:text-blue-800"
                            >
                              <Mail className="w-4 h-4" />
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
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </>
        )}

        {/* ログアウトボタン */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-6 max-w-md mx-auto"
        >
          <Button
            type="button"
            variant="outline"
            className="w-full text-destructive font-bold bg-white"
            onClick={handleSignOut}
          >
            <LogOut className="w-4 h-4 mr-2" />
            ログアウト
          </Button>
        </motion.div>
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

      {/* パスワードリセット確認モーダル */}
      <CustomModal
        isOpen={resetPasswordModalOpen}
        onClose={() => setResetPasswordModalOpen(false)}
        title="パスワードリセット"
      >
        {storeToResetPassword && (
          <div className="space-y-4">
            <div className="text-center py-4">
              <p className="text-lg font-bold text-card-foreground mb-2">
                {storeToResetPassword.name}
              </p>
              <p className="text-sm text-card-foreground/70 font-bold">
                {storeToResetPassword.email}
              </p>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1 font-bold"
                onClick={() => setResetPasswordModalOpen(false)}
                disabled={sendingResetEmail}
              >
                キャンセル
              </Button>
              <Button
                className="flex-1 font-bold bg-blue-600 hover:bg-blue-700"
                onClick={handlePasswordResetConfirm}
                disabled={sendingResetEmail}
              >
                {sendingResetEmail ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    送信中...
                  </>
                ) : (
                  <>
                    <Mail className="w-4 h-4 mr-2" />
                    送信
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </CustomModal>
    </div>
  );
}
