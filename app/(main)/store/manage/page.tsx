'use client';

import { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Store as StoreIcon, Edit, Trash2, Loader2, Mail,
  Search, ChevronLeft, ChevronRight, Users, Armchair,
  LayoutDashboard, FileText, Handshake, BarChart3, RefreshCw,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { CustomModal } from '@/components/ui/custom-modal';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth/context';
import { useLanguage } from '@/lib/i18n/context';
import { useAdminTheme } from '@/lib/admin-theme-context';
import { toast } from 'sonner';
import { AdminKpiCard, AdminKpiGrid, AdminQuickAction, getKpiGradient } from '@/components/admin/admin-kpi-card';
import { AdminDataTable, type AdminColumn } from '@/components/admin/admin-data-table';
import { AdminStatusBadge } from '@/components/admin/admin-status-badge';
import type { Database } from '@/lib/supabase/types';

type Store = Database['public']['Tables']['stores']['Row'];

const ITEMS_PER_PAGE = 10;

/** Google formatted_address 等から都道府県名＋市区町村名のみを返す */
const JP_PREFECTURES_DESC = [
  '北海道', '青森県', '岩手県', '宮城県', '秋田県', '山形県', '福島県', '茨城県', '栃木県', '群馬県', '埼玉県', '千葉県', '東京都', '神奈川県',
  '新潟県', '富山県', '石川県', '福井県', '山梨県', '長野県', '岐阜県', '静岡県', '愛知県', '三重県', '滋賀県', '京都府', '大阪府', '兵庫県',
  '奈良県', '和歌山県', '鳥取県', '島根県', '岡山県', '広島県', '山口県', '徳島県', '香川県', '愛媛県', '高知県', '福岡県', '佐賀県', '長崎県',
  '熊本県', '大分県', '宮崎県', '鹿児島県', '沖縄県',
].sort((a, b) => b.length - a.length);

function formatStoreAreaLabel(address: string | null | undefined): string {
  if (!address?.trim()) return '—';
  let s = address
    .trim()
    .replace(/^日本[、,]\s*/, '')
    .replace(/^Japan[、,]?\s*/i, '')
    .replace(/〒\s*[\d０-９]{3}[-－‐−][\d０-９]{4}\s*/, '')
    .replace(/\b\d{3}-\d{4}\b/, '');

  let pref = '';
  for (const p of JP_PREFECTURES_DESC) {
    const idx = s.indexOf(p);
    if (idx !== -1) {
      pref = p;
      s = s.slice(idx + p.length).trim();
      break;
    }
  }
  if (!pref) {
    const first = s.split(/[\s、,]+/).find((t) => t && !/^〒/.test(t));
    return first || '—';
  }

  const m = s.match(/^(.+?[市区町村])/);
  const muni = m?.[1]?.trim();
  return muni ? `${pref} ${muni}` : pref;
}

export default function StoreManagePage() {
  const { colors: C, isDark } = useAdminTheme();
  const router = useRouter();
  const { user, profile, accountType, store, signOut } = useAuth();
  const { t } = useLanguage();
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [storeToDelete, setStoreToDelete] = useState<Store | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [navigatingId, setNavigatingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [resetPasswordModalOpen, setResetPasswordModalOpen] = useState(false);
  const [storeToResetPassword, setStoreToResetPassword] = useState<Store | null>(null);
  const [sendingResetEmail, setSendingResetEmail] = useState(false);
  const [customerCount, setCustomerCount] = useState(0);
  const [sponsorCount, setSponsorCount] = useState(0);
  const [pendingApps, setPendingApps] = useState(0);

  useEffect(() => {
    if (accountType === 'store' && store) {
      router.push(`/store/manage/${store.id}/update`);
      return;
    }
    fetchStores();
    fetchDashboardCounts();
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

  const fetchDashboardCounts = async () => {
    try {
      const [customerRes, sponsorRes, appRes] = await Promise.all([
        supabase.from('users').select('id', { count: 'exact', head: true }).eq('role', 'customer'),
        supabase.from('sponsors').select('id', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('store_applications').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      ]);
      setCustomerCount(customerRes.count || 0);
      setSponsorCount(sponsorRes.count || 0);
      setPendingApps(appRes.count || 0);
    } catch {}
  };

  const filtered = useMemo(() => {
    if (!searchQuery) return stores;
    const q = searchQuery.toLowerCase();
    return stores.filter(
      (s) => s.name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q)
    );
  }, [stores, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paginated = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  useEffect(() => { setCurrentPage(1); }, [searchQuery]);

  const handleStoreClick = (storeId: string) => {
    setNavigatingId(storeId);
    router.push(`/store/manage/${storeId}/update`);
  };

  const handleDeleteClick = (s: Store) => {
    setStoreToDelete(s);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!storeToDelete || !user) return;
    setDeleting(true);
    try {
      const { error } = await supabase.from('stores').delete().eq('id', storeToDelete.id).eq('owner_id', user.id);
      if (error) throw error;
      toast.success('店舗を削除しました', { description: `${storeToDelete.name}の情報を削除しました`, position: 'top-center', duration: 1000 });
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

  const handlePasswordResetClick = (s: Store) => {
    setStoreToResetPassword(s);
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
      toast.success('パスワードリセットメールを送信しました', { description: `${storeToResetPassword.email} にメールを送信しました。`, position: 'top-center', duration: 1000 });
      setResetPasswordModalOpen(false);
      setStoreToResetPassword(null);
    } catch (error) {
      console.error('Error sending reset email:', error);
      toast.error('メールの送信に失敗しました', { description: error instanceof Error ? error.message : '不明なエラーが発生しました', position: 'top-center', duration: 3000 });
    } finally {
      setSendingResetEmail(false);
    }
  };

  const vacancyCounts = useMemo(() => {
    const counts = { open: 0, closed: 0, vacant: 0, full: 0 };
    for (const s of stores) {
      if (s.is_open === false || s.vacancy_status === 'closed') counts.closed++;
      else if (s.vacancy_status === 'vacant') counts.vacant++;
      else if (s.vacancy_status === 'full') counts.full++;
      else counts.open++;
    }
    return counts;
  }, [stores]);

  const getVacancyBadge = (s: Store) => {
    if (s.is_open === false || s.vacancy_status === 'closed')
      return { label: '閉店', variant: 'neutral' as const };
    if (s.vacancy_status === 'vacant')
      return { label: '空席あり', variant: 'success' as const };
    if (s.vacancy_status === 'full')
      return { label: '満席', variant: 'danger' as const };
    return { label: '開店', variant: 'info' as const };
  };

  const storeColumns: AdminColumn<Store>[] = [
    {
      key: 'name',
      header: '店舗名',
      width: '2fr',
      render: (s) => {
        const imageUrl = (s.image_urls as string[] | null)?.[0];
        return (
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-lg flex-shrink-0 flex items-center justify-center overflow-hidden"
              style={{ background: imageUrl ? 'transparent' : C.accentBg }}
            >
              {imageUrl ? (
                <img src={imageUrl} alt={s.name} className="w-full h-full object-cover" loading="lazy" />
              ) : (
                <span className="text-sm font-bold" style={{ color: C.accent }}>{s.name.charAt(0)}</span>
              )}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate" style={{ color: C.text }}>{s.name}</p>
              <p className="text-xs truncate" style={{ color: C.textSubtle }}>{s.email}</p>
            </div>
          </div>
        );
      },
    },
    {
      key: 'status',
      header: 'ステータス',
      width: '120px',
      render: (s) => {
        const b = getVacancyBadge(s);
        return <AdminStatusBadge label={b.label} variant={b.variant} dot />;
      },
    },
    {
      key: 'area',
      header: 'エリア',
      width: 'minmax(140px, 1.2fr)',
      hideOnMobile: true,
      render: (s) => (
        <span className="text-sm line-clamp-2 break-all" style={{ color: C.textMuted }} title={formatStoreAreaLabel(s.address)}>
          {formatStoreAreaLabel(s.address)}
        </span>
      ),
    },
    {
      key: 'created',
      header: '作成日',
      width: '100px',
      hideOnMobile: true,
      render: (s) => (
        <span className="text-xs" style={{ color: C.textSubtle }}>
          {s.created_at ? new Date(s.created_at).toLocaleDateString('ja-JP') : '—'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      width: '120px',
      render: (s) => (
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => handleStoreClick(s.id)}
            className="p-1.5 rounded-md transition-colors"
            style={{ color: C.accent }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = C.accentBg; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
          >
            <Edit className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => handlePasswordResetClick(s)}
            className="p-1.5 rounded-md transition-colors"
            style={{ color: C.info }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = C.infoBg; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
          >
            <Mail className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => handleDeleteClick(s)}
            className="p-1.5 rounded-md transition-colors"
            style={{ color: C.danger }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = C.dangerBg; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ),
    },
  ];

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

  return (
    <div className="min-h-screen" style={{ background: C.bg }}>
      <div className="max-w-6xl mx-auto px-4 md:px-8 py-8 space-y-8">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight" style={{ color: C.text }}>
              ダッシュボード
            </h1>
            <p className="text-sm mt-1" style={{ color: C.textSubtle }}>
              NIKENME+ 管理画面
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full" style={{ background: C.successBg, color: C.success }}>
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor: C.success }} />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5" style={{ backgroundColor: C.success }} />
              </span>
              システム稼働中
            </span>
          </div>
        </motion.div>

        {/* KPI Cards - LINE Harness style */}
        <AdminKpiGrid>
          <AdminKpiCard icon={StoreIcon} label="店舗数" value={stores.length} subLabel="登録済み店舗" gradient={getKpiGradient('gold')} href="/store/manage" index={0} />
          <AdminKpiCard icon={Users} label="顧客数" value={customerCount} subLabel="登録ユーザー" gradient={getKpiGradient('teal')} href="/store/manage/customers" index={1} />
          <AdminKpiCard icon={Handshake} label="スポンサー数" value={sponsorCount} subLabel="アクティブ契約" gradient={getKpiGradient('purple')} href="/store/manage/sponsors" index={2} />
          <AdminKpiCard icon={FileText} label="申込" value={pendingApps} subLabel="未処理の申込" gradient={getKpiGradient('rose')} href="/store/manage/applications" index={3} badge={pendingApps > 0 ? 'NEW' : undefined} />
        </AdminKpiGrid>

        {/* Quick Actions */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold tracking-wide" style={{ color: C.text }}>
              クイックアクション
            </h2>
            <span className="text-xs" style={{ color: C.textSubtle }}>6件のアクション</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <AdminQuickAction icon={StoreIcon} label="店舗管理" subLabel="店舗の一覧・編集" href="/store/manage" index={0} />
            <AdminQuickAction icon={Users} label="顧客管理" subLabel="登録ユーザーの一覧" href="/store/manage/customers" index={1} />
            <AdminQuickAction icon={FileText} label="申込管理" subLabel="加盟店申込の管理" href="/store/manage/applications" index={2} />
            <AdminQuickAction icon={Handshake} label="スポンサー管理" subLabel="スポンサー契約の管理" href="/store/manage/sponsors" index={3} />
            <AdminQuickAction icon={BarChart3} label="レポート" subLabel="広告パフォーマンス分析" href="/store/manage/sponsors" index={4} />
            <AdminQuickAction icon={RefreshCw} label="集計実行" subLabel="日次レポート集計" href="/store/manage/sponsors" index={5} />
          </div>
        </section>

        {/* Vacancy breakdown */}
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: '開店', count: vacancyCounts.open, color: C.success },
            { label: '閉店', count: vacancyCounts.closed, color: C.textSubtle },
            { label: '空席あり', count: vacancyCounts.vacant, color: C.warning || '#f59e0b' },
            { label: '満席', count: vacancyCounts.full, color: C.danger },
          ].map((s) => (
            <div
              key={s.label}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs"
              style={{ background: C.bgCard, border: `1px solid ${C.border}` }}
            >
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
              <span style={{ color: C.textMuted }}>{s.label}</span>
              <span className="ml-auto font-semibold" style={{ color: C.text }}>{s.count}</span>
            </div>
          ))}
        </div>

        {/* Store List */}
        <section>
          <div className="flex items-center gap-3 mb-5">
            <p className="text-sm font-bold" style={{ color: C.text }}>店舗一覧</p>
            {stores.length > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-medium" style={{ background: C.accentBg, color: C.accent }}>
                {filtered.length}件
              </span>
            )}
            <div className="flex-1" />
            <Link href="/store/manage/new">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
                style={{ background: C.accent, color: C.accentForeground }}
              >
                <Plus className="w-3.5 h-3.5" />
                店舗を追加
              </motion.button>
            </Link>
          </div>

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

          <AdminDataTable
            columns={storeColumns}
            data={paginated}
            keyExtractor={(s) => s.id}
            onRowClick={(s) => handleStoreClick(s.id)}
            emptyIcon={<StoreIcon className="w-12 h-12" style={{ color: C.textSubtle }} />}
            emptyTitle="まだ店舗が登録されていません"
            emptyDescription="最初の店舗を登録して、情報を共有しましょう"
            mobileCardRender={(s) => {
              const imageUrl = (s.image_urls as string[] | null)?.[0];
              const badge = getVacancyBadge(s);
              const isNavigating = navigatingId === s.id;
              return (
                <div className="relative">
                  {isNavigating && (
                    <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl" style={{ background: isDark ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.7)' }}>
                      <Loader2 className="w-6 h-6 animate-spin" style={{ color: C.accent }} />
                    </div>
                  )}
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-lg flex-shrink-0 flex items-center justify-center overflow-hidden"
                      style={{ background: imageUrl ? 'transparent' : C.accentBg }}
                    >
                      {imageUrl ? (
                        <img src={imageUrl} alt={s.name} className="w-full h-full object-cover" loading="lazy" />
                      ) : (
                        <span className="text-sm font-bold" style={{ color: C.accent }}>{s.name.charAt(0)}</span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold truncate" style={{ color: C.text }}>{s.name}</p>
                      <p className="text-xs truncate" style={{ color: C.textSubtle }}>{s.email}</p>
                    </div>
                    <AdminStatusBadge label={badge.label} variant={badge.variant} dot />
                  </div>
                  <div className="flex items-center gap-2 mt-3 pt-3" style={{ borderTop: `1px solid ${C.border}` }} onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => handleStoreClick(s.id)} className="flex items-center gap-1 px-2 py-1 rounded-md text-xs" style={{ color: C.accent }}>
                      <Edit className="w-3 h-3" /> 編集
                    </button>
                    <button onClick={() => handlePasswordResetClick(s)} className="flex items-center gap-1 px-2 py-1 rounded-md text-xs" style={{ color: C.info }}>
                      <Mail className="w-3 h-3" /> PW
                    </button>
                    <button onClick={() => handleDeleteClick(s)} className="flex items-center gap-1 px-2 py-1 rounded-md text-xs ml-auto" style={{ color: C.danger }}>
                      <Trash2 className="w-3 h-3" /> 削除
                    </button>
                  </div>
                </div>
              );
            }}
          />

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6 px-1">
              <p className="text-xs" style={{ color: C.textSubtle }}>
                {filtered.length}件中 {(currentPage - 1) * ITEMS_PER_PAGE + 1}-{Math.min(currentPage * ITEMS_PER_PAGE, filtered.length)}件
              </p>
              <div className="flex items-center gap-1">
                <motion.button whileTap={{ scale: 0.9 }} onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-1.5 rounded-lg transition-colors disabled:opacity-30" style={{ color: C.textMuted }}>
                  <ChevronLeft className="w-4 h-4" />
                </motion.button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <motion.button key={p} whileTap={{ scale: 0.9 }} onClick={() => setCurrentPage(p)} className="w-7 h-7 rounded-lg text-xs font-medium transition-colors" style={{ background: currentPage === p ? C.accent : 'transparent', color: currentPage === p ? '#fff' : C.textMuted }}>
                    {p}
                  </motion.button>
                ))}
                <motion.button whileTap={{ scale: 0.9 }} onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="p-1.5 rounded-lg transition-colors disabled:opacity-30" style={{ color: C.textMuted }}>
                  <ChevronRight className="w-4 h-4" />
                </motion.button>
              </div>
            </div>
          )}
        </section>
      </div>

      {/* Delete Modal: CustomModal は bg-white 固定のため文字色は常にブルワーズネイビー固定 */}
      <CustomModal isOpen={deleteDialogOpen} onClose={() => !deleting && setDeleteDialogOpen(false)} title="" showCloseButton={!deleting}>
        <div className="space-y-4">
          <div className="text-center">
            <div className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center" style={{ background: C.dangerBg }}>
              <Trash2 className="w-6 h-6" style={{ color: C.danger }} />
            </div>
            <h3 className="text-lg font-bold" style={{ color: '#13294b' }}>{t('store_manage.delete_confirm_title')}</h3>
          </div>
          {storeToDelete && (
            <p className="text-sm text-center" style={{ color: 'rgba(19, 41, 75, 0.7)' }}>
              {t('store_manage.delete_confirm_with_name').split('{name}').map((part, i, arr) => (
                <span key={i}>
                  {part}
                  {i < arr.length - 1 && (
                    <span className="font-bold" style={{ color: '#13294b' }}>{storeToDelete.name}</span>
                  )}
                </span>
              ))}
            </p>
          )}
          <div className="flex gap-3 pt-2">
            <Button variant="outline" className="flex-1 font-semibold rounded-lg" onClick={() => setDeleteDialogOpen(false)} disabled={deleting} style={{ borderColor: 'rgba(19, 41, 75, 0.2)', color: '#13294b' }}>{t('common.cancel')}</Button>
            <Button className="flex-1 font-semibold rounded-lg" onClick={handleDeleteConfirm} disabled={deleting} style={{ background: C.danger, color: '#fff' }}>
              {deleting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{t('store_manage.deleting')}</> : <><Trash2 className="w-4 h-4 mr-2" />{t('common.delete')}</>}
            </Button>
          </div>
        </div>
      </CustomModal>

      {/* Password Reset Modal: 同様にナビ色固定 */}
      <CustomModal isOpen={resetPasswordModalOpen} onClose={() => setResetPasswordModalOpen(false)} title={t('store_manage.reset_password')}>
        {storeToResetPassword && (
          <div className="space-y-4">
            <div className="text-center py-4">
              <p className="text-lg font-bold" style={{ color: '#13294b' }}>{storeToResetPassword.name}</p>
              <p className="text-sm mt-1" style={{ color: 'rgba(19, 41, 75, 0.7)' }}>{storeToResetPassword.email}</p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1 font-semibold rounded-lg" onClick={() => setResetPasswordModalOpen(false)} disabled={sendingResetEmail} style={{ borderColor: 'rgba(19, 41, 75, 0.2)', color: '#13294b' }}>{t('common.cancel')}</Button>
              <Button className="flex-1 font-semibold rounded-lg" onClick={handlePasswordResetConfirm} disabled={sendingResetEmail} style={{ background: C.info, color: '#fff' }}>
                {sendingResetEmail ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />送信中...</> : <><Mail className="w-4 h-4 mr-2" />送信</>}
              </Button>
            </div>
          </div>
        )}
      </CustomModal>
    </div>
  );
}
