'use client';

import { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Store as StoreIcon, Edit, Trash2, Loader2, Mail,
  Search, ChevronLeft, ChevronRight, Activity, Image as ImageIcon,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { CustomModal } from '@/components/ui/custom-modal';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth/context';
import { useAdminTheme } from '@/lib/admin-theme-context';
import { toast } from 'sonner';
import type { Database } from '@/lib/supabase/types';

type Store = Database['public']['Tables']['stores']['Row'];

const ITEMS_PER_PAGE = 10;

export default function StoreManagePage() {
  const { colors: C, isDark } = useAdminTheme();
  const router = useRouter();
  const { user, profile, accountType, store, signOut } = useAuth();
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [storeToDelete, setStoreToDelete] = useState<Store | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [navigatingId, setNavigatingId] = useState<string | null>(null);

  // 検索・ページネーション
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // パスワードリセット用
  const [resetPasswordModalOpen, setResetPasswordModalOpen] = useState(false);
  const [storeToResetPassword, setStoreToResetPassword] = useState<Store | null>(null);
  const [sendingResetEmail, setSendingResetEmail] = useState(false);

  useEffect(() => {
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

  // フィルタリング＆ページネーション
  const filtered = useMemo(() => {
    if (!searchQuery) return stores;
    const q = searchQuery.toLowerCase();
    return stores.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q)
    );
  }, [stores, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paginated = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  useEffect(() => { setCurrentPage(1); }, [searchQuery]);

  const handleStoreClick = (storeId: string) => {
    setNavigatingId(storeId);
    router.push(`/store/manage/${storeId}/update`);
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
      toast.error('店舗の削除に失敗しました', { position: 'top-center', duration: 3000 });
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
        { redirectTo: `${window.location.origin}/auth/reset-password` }
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen" style={{ background: C.bg }}>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: C.accent }} />
          <p className="text-xs tracking-wider" style={{ color: C.textSubtle }}>Loading...</p>
        </motion.div>
      </div>
    );
  }

  const latestStore = stores[0];

  return (
    <div className="min-h-screen" style={{ background: C.bg }}>
      <div className="max-w-6xl mx-auto px-6 md:px-8 py-8 space-y-8">
        {/* Page Title */}
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl font-semibold tracking-tight" style={{ color: C.text }}>
            Dashboard
          </h1>
          <p className="text-sm mt-1" style={{ color: C.textSubtle }}>
            店舗の管理・運営をここから行えます
          </p>
        </motion.div>

        {/* KPI Cards */}
        <section>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { label: '登録店舗数', value: String(stores.length), color: C.accent },
              { label: '最新登録', value: latestStore?.name ?? '--', color: C.info },
              { label: 'ステータス', value: '稼働中', color: C.success, pulse: true },
            ].map((kpi, i) => (
              <motion.div
                key={kpi.label}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                className="p-5 rounded-xl"
                style={{
                  background: C.bgCard,
                  border: `1px solid ${C.border}`,
                  borderLeft: `3px solid ${kpi.color}`,
                }}
              >
                <p className="text-[10px] font-semibold uppercase tracking-[0.15em] mb-2" style={{ color: C.textSubtle }}>
                  {kpi.label}
                </p>
                <div className="flex items-center gap-2">
                  {kpi.pulse && (
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor: kpi.color }} />
                      <span className="relative inline-flex rounded-full h-2 w-2" style={{ backgroundColor: kpi.color }} />
                    </span>
                  )}
                  <p className="text-2xl font-semibold tracking-tight truncate" style={{ color: C.text }}>
                    {kpi.value}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Store Section */}
        <section>
          <div className="flex items-center gap-3 mb-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.15em]" style={{ color: C.textSubtle }}>
              Stores
            </p>
            {stores.length > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-medium" style={{ background: C.accentBg, color: C.accent }}>
                {filtered.length}
              </span>
            )}
            <div className="flex-1 h-px" style={{ background: C.borderSubtle }} />
            <Link href="/store/manage/new">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
                style={{ background: C.accent, color: '#fff' }}
              >
                <Plus className="w-3.5 h-3.5" />
                店舗を追加
              </motion.button>
            </Link>
          </div>

          {/* Search */}
          {stores.length > 0 && (
            <div className="relative mb-4 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: C.textSubtle }} />
              <input
                type="text"
                placeholder="店舗名で検索..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-lg text-sm outline-none transition-colors"
                style={{ background: C.bgInput, border: `1px solid ${C.border}`, color: C.text }}
              />
            </div>
          )}

          {/* Store Cards */}
          {stores.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-16 text-center rounded-xl"
              style={{ background: C.bgCard, border: `1px dashed ${C.border}` }}
            >
              <StoreIcon className="w-16 h-16 mx-auto mb-4" style={{ color: C.textSubtle }} />
              <h3 className="text-base font-semibold mb-1.5" style={{ color: C.text }}>
                まだ店舗が登録されていません
              </h3>
              <p className="text-sm mb-6" style={{ color: C.textMuted }}>
                最初の店舗を登録して、情報を共有しましょう
              </p>
              <Link href="/store/manage/new">
                <Button className="rounded-lg font-semibold text-sm px-6" style={{ background: C.accent, color: '#fff' }}>
                  <Plus className="w-4 h-4 mr-1.5" />
                  店舗を登録
                </Button>
              </Link>
            </motion.div>
          ) : paginated.length === 0 ? (
            <div className="text-center py-16">
              <Search className="w-10 h-10 mx-auto mb-3" style={{ color: C.textSubtle }} />
              <p className="text-sm" style={{ color: C.textMuted }}>
                「{searchQuery}」に一致する店舗がありません
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <AnimatePresence mode="popLayout">
                  {paginated.map((s, index) => {
                    const imageUrl = (s.image_urls as string[] | null)?.[0];
                    const isNavigating = navigatingId === s.id;
                    return (
                      <motion.div
                        key={s.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ delay: index * 0.03 }}
                        className="rounded-xl overflow-hidden transition-all cursor-pointer relative"
                        style={{ background: C.bgCard, border: `1px solid ${C.border}` }}
                        onClick={() => handleStoreClick(s.id)}
                        onMouseEnter={(e) => { e.currentTarget.style.borderColor = C.accent + '40'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.borderColor = C.border; }}
                      >
                        {/* Loading Overlay */}
                        {isNavigating && (
                          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl" style={{ background: isDark ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.7)' }}>
                            <Loader2 className="w-6 h-6 animate-spin" style={{ color: C.accent }} />
                          </div>
                        )}
                        <div className="flex">
                          {/* Store Image */}
                          <div
                            className="w-24 h-24 md:w-28 md:h-28 flex-shrink-0 flex items-center justify-center"
                            style={{ background: imageUrl ? 'transparent' : C.accentBg }}
                          >
                            {imageUrl ? (
                              <img
                                src={imageUrl}
                                alt={s.name}
                                className="w-full h-full object-cover"
                                loading="lazy"
                              />
                            ) : (
                              <span className="text-xl font-bold" style={{ color: C.accent }}>
                                {s.name.charAt(0)}
                              </span>
                            )}
                          </div>
                          {/* Info */}
                          <div className="flex-1 p-4 min-w-0 flex flex-col justify-between">
                            <div>
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
                            <div className="flex items-center gap-1.5 mt-2" onClick={(e) => e.stopPropagation()}>
                              <button
                                onClick={() => handleStoreClick(s.id)}
                                className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium transition-all"
                                style={{ color: C.accent }}
                                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = C.accentBg; }}
                                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                              >
                                <Edit className="w-3 h-3" />
                                編集
                              </button>
                              <button
                                onClick={() => handlePasswordResetClick(s)}
                                className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium transition-all"
                                style={{ color: C.info }}
                                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = C.infoBg; }}
                                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                              >
                                <Mail className="w-3 h-3" />
                                PW
                              </button>
                              <button
                                onClick={() => handleDeleteClick(s)}
                                className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium transition-all"
                                style={{ color: C.danger }}
                                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = C.dangerBg; }}
                                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                              >
                                <Trash2 className="w-3 h-3" />
                                削除
                              </button>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-6 px-1">
                  <p className="text-xs" style={{ color: C.textSubtle }}>
                    {filtered.length}件中 {(currentPage - 1) * ITEMS_PER_PAGE + 1}-
                    {Math.min(currentPage * ITEMS_PER_PAGE, filtered.length)}件
                  </p>
                  <div className="flex items-center gap-1">
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="p-1.5 rounded-lg transition-colors disabled:opacity-30"
                      style={{ color: C.textMuted }}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </motion.button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                      <motion.button
                        key={p}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => setCurrentPage(p)}
                        className="w-7 h-7 rounded-lg text-xs font-medium transition-colors"
                        style={{
                          background: currentPage === p ? C.accent : 'transparent',
                          color: currentPage === p ? '#fff' : C.textMuted,
                        }}
                      >
                        {p}
                      </motion.button>
                    ))}
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="p-1.5 rounded-lg transition-colors disabled:opacity-30"
                      style={{ color: C.textMuted }}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </motion.button>
                  </div>
                </div>
              )}
            </>
          )}
        </section>
      </div>

      {/* 削除確認ダイアログ */}
      <CustomModal
        isOpen={deleteDialogOpen}
        onClose={() => !deleting && setDeleteDialogOpen(false)}
        title=""
        showCloseButton={!deleting}
      >
        <div className="space-y-4">
          <div className="text-center">
            <div className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center" style={{ background: C.dangerBg }}>
              <Trash2 className="w-6 h-6" style={{ color: C.danger }} />
            </div>
            <h3 className="text-lg font-bold" style={{ color: C.text }}>店舗を削除しますか？</h3>
          </div>
          {storeToDelete && (
            <p className="text-sm text-center" style={{ color: C.textMuted }}>
              <span className="font-bold" style={{ color: C.text }}>{storeToDelete.name}</span>
              を削除します。この操作は取り消せません。
            </p>
          )}
          <div className="flex gap-3 pt-2">
            <Button variant="outline" className="flex-1 font-semibold rounded-lg" onClick={() => setDeleteDialogOpen(false)} disabled={deleting}
              style={{ borderColor: C.border, color: C.textMuted }}>
              キャンセル
            </Button>
            <Button className="flex-1 font-semibold rounded-lg" onClick={handleDeleteConfirm} disabled={deleting}
              style={{ background: C.danger, color: '#fff' }}>
              {deleting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />削除中...</> : <><Trash2 className="w-4 h-4 mr-2" />削除</>}
            </Button>
          </div>
        </div>
      </CustomModal>

      {/* パスワードリセットモーダル */}
      <CustomModal
        isOpen={resetPasswordModalOpen}
        onClose={() => setResetPasswordModalOpen(false)}
        title="パスワードリセット"
      >
        {storeToResetPassword && (
          <div className="space-y-4">
            <div className="text-center py-4">
              <p className="text-lg font-bold" style={{ color: C.text }}>{storeToResetPassword.name}</p>
              <p className="text-sm mt-1" style={{ color: C.textMuted }}>{storeToResetPassword.email}</p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1 font-semibold rounded-lg" onClick={() => setResetPasswordModalOpen(false)}
                disabled={sendingResetEmail} style={{ borderColor: C.border, color: C.textMuted }}>
                キャンセル
              </Button>
              <Button className="flex-1 font-semibold rounded-lg" onClick={handlePasswordResetConfirm}
                disabled={sendingResetEmail} style={{ background: C.info, color: '#fff' }}>
                {sendingResetEmail ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />送信中...</> : <><Mail className="w-4 h-4 mr-2" />送信</>}
              </Button>
            </div>
          </div>
        )}
      </CustomModal>
    </div>
  );
}
