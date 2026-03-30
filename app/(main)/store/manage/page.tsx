'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Store as StoreIcon, Edit, Trash2, Loader2, LogOut, Mail,
  PartyPopper, Megaphone, ClipboardList, LayoutDashboard, ChevronRight,
  Activity,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { CustomModal } from '@/components/ui/custom-modal';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth/context';
import { useAdminTheme } from '@/lib/admin-theme-context';
import { AdminThemeToggle } from '@/components/admin/admin-theme-toggle';
import { toast } from 'sonner';
import type { Database } from '@/lib/supabase/types';

type Store = Database['public']['Tables']['stores']['Row'];

export default function StoreManagePage() {
  const { colors: C, isDark } = useAdminTheme();
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

    fetchStores();
  }, [accountType, store, router]);

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
      const { error } = await supabase
        .from('stores')
        .delete()
        .eq('id', storeToDelete.id)
        .eq('owner_id', user.id);

      if (error) throw error;

      toast.success('店舗を削除しました', {
        description: `${storeToDelete.name}の情報を削除しました`,
        position: 'top-center',
        duration: 1000,
      });

      setStores(stores.filter((s) => s.id !== storeToDelete.id));
      setDeleteDialogOpen(false);
      setStoreToDelete(null);
    } catch (error) {
      console.error('Error deleting store:', error);
      toast.error('店舗の削除に失敗しました', {
        position: 'top-center',
        duration: 3000,
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
        description: `${storeToResetPassword.email} にメールを送信しました。`,
        position: 'top-center',
        duration: 1000,
      });

      setResetPasswordModalOpen(false);
      setStoreToResetPassword(null);
    } catch (error) {
      console.error('Error sending reset email:', error);
      toast.error('メールの送信に失敗しました', {
        description: error instanceof Error ? error.message : '不明なエラーが発生しました',
        position: 'top-center',
        duration: 3000,
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
      });
      router.push('/login');
    } catch {
      toast.error('ログアウトに失敗しました', {
        position: 'top-center',
        duration: 3000,
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen" style={{ background: C.bg }}>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center gap-3"
        >
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: C.accent }} />
          <p className="text-xs tracking-wider" style={{ color: C.textSubtle }}>Loading...</p>
        </motion.div>
      </div>
    );
  }

  const quickActions = [
    { href: '/store/manage/new', icon: Plus, label: '店舗を追加', desc: '新しい店舗を登録', color: C.accent },
    { href: '/store/manage/campaigns', icon: PartyPopper, label: 'キャンペーン', desc: 'キャンペーンの管理', color: '#EC4899' },
    { href: '/store/manage/applications', icon: ClipboardList, label: '申し込み管理', desc: '申し込みの確認', color: C.info },
    { href: '/store/manage/sponsors', icon: Megaphone, label: 'スポンサー', desc: 'スポンサーの管理', color: '#8B5CF6' },
  ];

  const latestStore = stores[0];

  return (
    <div className="min-h-screen" style={{ background: C.bg }}>
      {/* ゴールドアクセントライン */}
      <motion.div
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        className="h-[1px]"
        style={{ background: `linear-gradient(90deg, transparent, ${C.accent}, transparent)` }}
      />

      {/* ヘッダー */}
      <header
        className="sticky top-0 z-30 backdrop-blur-xl"
        style={{
          background: C.bg + 'ee',
          borderBottom: `1px solid ${C.border}`,
          boxShadow: isDark ? '0 1px 3px rgba(0,0,0,0.2)' : '0 1px 3px rgba(0,0,0,0.04)',
        }}
      >
        <div className="max-w-7xl mx-auto px-6 md:px-8 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3.5">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: C.accentBg, boxShadow: `0 0 0 1px ${C.border}` }}
              >
                <LayoutDashboard className="w-[18px] h-[18px]" style={{ color: C.accent }} />
              </div>
              <div>
                <h1 className="text-xl font-semibold tracking-tight" style={{ color: C.text }}>
                  Dashboard
                </h1>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <div className="w-1.5 h-1.5 rounded-full" style={{ background: C.accent }} />
                  <p className="text-[11px] tracking-wide" style={{ color: C.textSubtle }}>
                    {stores.length} stores registered
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <AdminThemeToggle />
              <button
                onClick={handleSignOut}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all hover:opacity-80"
                style={{ color: C.textSubtle }}
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">ログアウト</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 md:px-8 py-8 space-y-8">
        {/* エグゼクティブサマリー */}
        <section>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              {
                label: '登録店舗数',
                value: String(stores.length),
                accentColor: C.accent,
              },
              {
                label: '最新登録',
                value: latestStore?.name ?? '--',
                accentColor: C.info,
              },
              {
                label: 'ステータス',
                value: '稼働中',
                accentColor: C.success,
                pulse: true,
              },
            ].map((kpi, i) => (
              <motion.div
                key={kpi.label}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08, duration: 0.4 }}
                className="p-5 rounded-xl"
                style={{
                  background: C.bgCard,
                  border: `1px solid ${C.border}`,
                  borderLeft: `3px solid ${kpi.accentColor}`,
                }}
              >
                <p
                  className="text-[10px] font-semibold uppercase tracking-[0.15em] mb-2"
                  style={{ color: C.textSubtle }}
                >
                  {kpi.label}
                </p>
                <div className="flex items-center gap-2">
                  {kpi.pulse && (
                    <span className="relative flex h-2 w-2">
                      <span
                        className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
                        style={{ backgroundColor: kpi.accentColor }}
                      />
                      <span
                        className="relative inline-flex rounded-full h-2 w-2"
                        style={{ backgroundColor: kpi.accentColor }}
                      />
                    </span>
                  )}
                  <p
                    className="text-2xl font-semibold tracking-tight truncate"
                    style={{ color: C.text }}
                  >
                    {kpi.value}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* クイックアクション */}
        <section>
          <div className="flex items-center gap-3 mb-5">
            <p
              className="text-[10px] font-semibold uppercase tracking-[0.15em]"
              style={{ color: C.textSubtle }}
            >
              Quick Actions
            </p>
            <div className="flex-1 h-px" style={{ background: C.borderSubtle }} />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {quickActions.map((action, i) => (
              <Link key={action.href} href={action.href}>
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 + i * 0.05 }}
                  whileHover={{ y: -2 }}
                  whileTap={{ y: 0 }}
                  className="group p-5 rounded-xl cursor-pointer transition-colors relative"
                  style={{
                    background: C.bgCard,
                    border: `1px solid ${C.border}`,
                  }}
                >
                  <ChevronRight
                    className="w-3.5 h-3.5 absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ color: C.textSubtle }}
                  />
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
                    style={{ background: action.color + '10' }}
                  >
                    <action.icon className="w-[18px] h-[18px]" style={{ color: action.color }} />
                  </div>
                  <p className="text-[13px] font-medium" style={{ color: C.text }}>
                    {action.label}
                  </p>
                  <p className="text-[11px] mt-0.5" style={{ color: C.textSubtle }}>
                    {action.desc}
                  </p>
                </motion.div>
              </Link>
            ))}
          </div>
        </section>

        {/* 店舗一覧 */}
        <section>
          <div className="flex items-center gap-3 mb-5">
            <div className="flex items-center gap-2">
              <p
                className="text-[10px] font-semibold uppercase tracking-[0.15em]"
                style={{ color: C.textSubtle }}
              >
                Stores
              </p>
              {stores.length > 0 && (
                <span
                  className="px-2 py-0.5 rounded-full text-[10px] font-medium"
                  style={{ background: C.accentBg, color: C.accent }}
                >
                  {stores.length}
                </span>
              )}
            </div>
            <div className="flex-1 h-px" style={{ background: C.borderSubtle }} />
          </div>

          {stores.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-16 text-center rounded-xl"
              style={{
                background: C.bgCard,
                border: `1px dashed ${C.border}`,
              }}
            >
              <StoreIcon className="w-16 h-16 mx-auto mb-4" style={{ color: C.textSubtle }} />
              <h3 className="text-base font-semibold mb-1.5" style={{ color: C.text }}>
                まだ店舗が登録されていません
              </h3>
              <p className="text-sm mb-6" style={{ color: C.textMuted }}>
                最初の店舗を登録して、情報を共有しましょう
              </p>
              <Link href="/store/manage/new">
                <Button
                  className="rounded-lg font-semibold text-sm px-6"
                  style={{ background: C.accent, color: '#fff' }}
                >
                  <Plus className="w-4 h-4 mr-1.5" />
                  店舗を登録
                </Button>
              </Link>
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <AnimatePresence mode="popLayout">
                {stores.map((s, index) => (
                  <motion.div
                    key={s.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: index * 0.03 }}
                    className="rounded-xl overflow-hidden transition-all"
                    style={{
                      background: C.bgCard,
                      border: `1px solid ${C.border}`,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = C.accent + '40';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = C.border;
                    }}
                  >
                    <div className="p-5">
                      <div className="flex items-start gap-3 mb-3">
                        {/* モノグラムアバター */}
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                          style={{ background: C.accentBg }}
                        >
                          <span className="text-sm font-bold" style={{ color: C.accent }}>
                            {s.name.charAt(0)}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-sm tracking-tight truncate" style={{ color: C.text }}>
                            {s.name}
                          </h3>
                          <div className="flex items-center gap-1 mt-1">
                            <Mail className="w-3 h-3 flex-shrink-0" style={{ color: C.textSubtle }} />
                            <p className="text-[11px] truncate" style={{ color: C.textSubtle }}>
                              {s.email}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div
                        className="flex items-center gap-1.5 pt-3 mt-1"
                        style={{ borderTop: `1px solid ${C.borderSubtle}` }}
                      >
                        <button
                          onClick={() => router.push(`/store/manage/${s.id}/update`)}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all"
                          style={{ color: C.accent }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = C.accentBg;
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'transparent';
                          }}
                          title="店舗情報を編集"
                        >
                          <Edit className="w-3 h-3" />
                          編集
                        </button>
                        <button
                          onClick={() => handlePasswordResetClick(s)}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all"
                          style={{ color: C.info }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = C.infoBg;
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'transparent';
                          }}
                          title="パスワードをリセット"
                        >
                          <Mail className="w-3 h-3" />
                          PW
                        </button>
                        <button
                          onClick={() => handleDeleteClick(s)}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all"
                          style={{ color: C.danger }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = C.dangerBg;
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'transparent';
                          }}
                          title="店舗を削除"
                        >
                          <Trash2 className="w-3 h-3" />
                          削除
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </section>
      </main>

      {/* 削除確認ダイアログ */}
      <CustomModal
        isOpen={deleteDialogOpen}
        onClose={() => !deleting && setDeleteDialogOpen(false)}
        title=""
        showCloseButton={!deleting}
      >
        <div className="space-y-4">
          <div className="text-center">
            <div
              className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center"
              style={{ background: C.dangerBg }}
            >
              <Trash2 className="w-6 h-6" style={{ color: C.danger }} />
            </div>
            <h3 className="text-lg font-bold" style={{ color: C.text }}>
              店舗を削除しますか？
            </h3>
          </div>
          {storeToDelete && (
            <p className="text-sm text-center" style={{ color: C.textMuted }}>
              <span className="font-bold" style={{ color: C.text }}>{storeToDelete.name}</span>
              を削除します。この操作は取り消せません。
            </p>
          )}
          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              className="flex-1 font-semibold rounded-lg"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={deleting}
              style={{
                borderColor: C.border,
                color: C.textMuted,
              }}
            >
              キャンセル
            </Button>
            <Button
              className="flex-1 font-semibold rounded-lg"
              onClick={handleDeleteConfirm}
              disabled={deleting}
              style={{ background: C.danger, color: '#fff' }}
            >
              {deleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  削除中...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  削除
                </>
              )}
            </Button>
          </div>
        </div>
      </CustomModal>

      {/* パスワードリセット確認モーダル */}
      <CustomModal
        isOpen={resetPasswordModalOpen}
        onClose={() => setResetPasswordModalOpen(false)}
        title="パスワードリセット"
      >
        {storeToResetPassword && (
          <div className="space-y-4">
            <div className="text-center py-4">
              <p className="text-lg font-bold" style={{ color: C.text }}>
                {storeToResetPassword.name}
              </p>
              <p className="text-sm mt-1" style={{ color: C.textMuted }}>
                {storeToResetPassword.email}
              </p>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1 font-semibold rounded-lg"
                onClick={() => setResetPasswordModalOpen(false)}
                disabled={sendingResetEmail}
                style={{
                  borderColor: C.border,
                  color: C.textMuted,
                }}
              >
                キャンセル
              </Button>
              <Button
                className="flex-1 font-semibold rounded-lg"
                onClick={handlePasswordResetConfirm}
                disabled={sendingResetEmail}
                style={{ background: C.info, color: '#fff' }}
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
