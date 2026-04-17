'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText,
  Download,
  Store,
  Mail,
  MapPin,
  Phone,
  Clock,
  ChevronRight,
  Loader2,
  Trash2,
  ClipboardList,
  CalendarDays,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth/context';
import { toast } from 'sonner';
import { CustomModal } from '@/components/ui/custom-modal';
import type { StoreApplication } from '@/lib/types/store-application';
import { APPLICATION_STATUS_MAP } from '@/lib/types/store-application';
import { useAdminTheme } from '@/lib/admin-theme-context';
import { AdminKpiCard, AdminKpiGrid, getKpiGradient } from '@/components/admin/admin-kpi-card';
import { AdminDataTable, type AdminColumn } from '@/components/admin/admin-data-table';
import { AdminStatusBadge } from '@/components/admin/admin-status-badge';

export default function ApplicationsManagePage() {
  const { colors: C } = useAdminTheme();
  const router = useRouter();
  const { user, profile, accountType } = useAuth();

  const [applications, setApplications] = useState<StoreApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [completeModalOpen, setCompleteModalOpen] = useState(false);
  const [applicationToComplete, setApplicationToComplete] =
    useState<StoreApplication | null>(null);
  const [completing, setCompleting] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [applicationToReject, setApplicationToReject] =
    useState<StoreApplication | null>(null);
  const [rejecting, setRejecting] = useState(false);

  // KPI集計
  const thisMonthCount = useMemo(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    return applications.filter(
      (a) => a.created_at && new Date(a.created_at) >= startOfMonth
    ).length;
  }, [applications]);

  useEffect(() => {
    if (user === null) {
      router.push('/login');
      return;
    }
    if (profile && (profile.role !== 'admin' || accountType !== 'platform')) {
      router.push('/login');
      return;
    }
  }, [user, profile, accountType, router]);

  useEffect(() => {
    if (!user || accountType !== 'platform') return;
    fetchApplications();
  }, [user, accountType]);

  const fetchApplications = async () => {
    try {
      const { data, error } = await supabase
        .from('store_applications')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setApplications(data || []);
    } catch (error) {
      console.error('Error fetching applications:', error);
      toast.error('申し込みデータの取得に失敗しました', { position: 'top-center' });
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteClick = (application: StoreApplication) => {
    setApplicationToComplete(application);
    setCompleteModalOpen(true);
  };

  const handleCompleteConfirm = async () => {
    if (!applicationToComplete || !user) return;
    setCompleting(true);
    try {
      const { error } = await supabase
        .from('store_applications')
        .delete()
        .eq('id', applicationToComplete.id);
      if (error) throw error;
      toast.success('登録完了済みにしました', {
        description: `${applicationToComplete.store_name}の申し込みを登録完了済みにしました`,
        position: 'top-center',
        duration: 1500,
      });
      setApplications((prev) => prev.filter((app) => app.id !== applicationToComplete.id));
      setCompleteModalOpen(false);
      setApplicationToComplete(null);
    } catch (error) {
      console.error('Error completing application:', error);
      toast.error('登録完了処理に失敗しました', { position: 'top-center' });
    } finally {
      setCompleting(false);
    }
  };

  const handleRejectClick = (application: StoreApplication) => {
    setApplicationToReject(application);
    setRejectModalOpen(true);
  };

  const handleRejectConfirm = async () => {
    if (!applicationToReject || !user) return;
    setRejecting(true);
    try {
      const { error } = await supabase
        .from('store_applications')
        .delete()
        .eq('id', applicationToReject.id);
      if (error) throw error;
      toast.success('申し込みを却下しました', {
        description: `${applicationToReject.store_name}の申し込みを削除しました`,
        position: 'top-center',
        duration: 1500,
      });
      setApplications((prev) => prev.filter((app) => app.id !== applicationToReject.id));
      setRejectModalOpen(false);
      setApplicationToReject(null);
    } catch (error) {
      console.error('Error rejecting application:', error);
      toast.error('却下処理に失敗しました', { position: 'top-center' });
    } finally {
      setRejecting(false);
    }
  };

  const handleExportCSV = () => {
    window.open('/api/store-applications/export', '_blank');
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ja-JP', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const truncateAddress = (address: string, maxLength = 30) => {
    if (address.length <= maxLength) return address;
    return address.slice(0, maxLength) + '...';
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

  return (
    <div className="min-h-screen" style={{ background: C.bg }}>
      <div className="max-w-6xl mx-auto px-6 md:px-8 py-8 space-y-8">
        {/* Page Title */}
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight" style={{ color: C.text }}>申し込み管理</h1>
            <p className="text-sm mt-1" style={{ color: C.textSubtle }}>パートナー申請の審査・管理を行います</p>
          </div>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
            style={{ background: C.accent, color: '#fff' }}
          >
            <Download className="w-3.5 h-3.5" />
            CSV出力
          </motion.button>
        </motion.div>

        {/* KPI Cards - LINE Harness style */}
        <AdminKpiGrid>
          <AdminKpiCard icon={ClipboardList} label="審査待ち" value={applications.length} subLabel="未処理の申込" gradient={getKpiGradient('amber')} index={0} badge={applications.length > 0 ? 'NEW' : undefined} />
          <AdminKpiCard icon={CalendarDays} label="今月の申請" value={thisMonthCount} subLabel="今月受付分" gradient={getKpiGradient('blue')} index={1} />
          <AdminKpiCard icon={Store} label="累計" value={applications.length} subLabel="全申込数" gradient={getKpiGradient('teal')} index={2} />
        </AdminKpiGrid>

        {/* Applications Table */}
        <section>
          <div className="flex items-center gap-3 mb-5">
            <p className="text-sm font-bold" style={{ color: C.text }}>申込一覧</p>
            {applications.length > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-medium" style={{ background: C.accentBg, color: C.accent }}>
                {applications.length}件
              </span>
            )}
            <div className="flex-1" />
          </div>

          <AdminDataTable
            columns={[
              {
                key: 'name',
                header: '店舗名',
                width: '2fr',
                render: (a: StoreApplication) => (
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center" style={{ background: C.accentBg }}>
                      <Store className="w-4 h-4" style={{ color: C.accent }} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate" style={{ color: C.text }}>{a.store_name}</p>
                      <p className="text-xs truncate" style={{ color: C.textSubtle }}>{a.contact_email}</p>
                    </div>
                  </div>
                ),
              },
              {
                key: 'status',
                header: 'ステータス',
                width: '100px',
                render: () => <AdminStatusBadge label="審査待ち" variant="warning" dot />,
              },
              {
                key: 'phone',
                header: '電話番号',
                width: '130px',
                hideOnMobile: true,
                render: (a: StoreApplication) => (
                  <span className="text-xs" style={{ color: C.textMuted }}>{a.phone || '—'}</span>
                ),
              },
              {
                key: 'date',
                header: '申込日',
                width: '100px',
                hideOnMobile: true,
                render: (a: StoreApplication) => (
                  <span className="text-xs" style={{ color: C.textSubtle }}>{formatDate(a.created_at ?? '')}</span>
                ),
              },
              {
                key: 'actions',
                header: '',
                width: '180px',
                render: (a: StoreApplication) => (
                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    <Link href={`/store/manage/new?application_id=${a.id}`}>
                      <button className="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold" style={{ background: C.accent, color: '#fff' }}>
                        <ChevronRight className="w-3 h-3" /> 審査
                      </button>
                    </Link>
                    <button onClick={() => handleCompleteClick(a)} className="p-1.5 rounded-md transition-colors" style={{ color: C.success }}
                      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = C.successBg; }}
                      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}>
                      <FileText className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => handleRejectClick(a)} className="p-1.5 rounded-md transition-colors" style={{ color: C.danger }}
                      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = C.dangerBg; }}
                      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ),
              },
            ] as AdminColumn<StoreApplication>[]}
            data={applications}
            keyExtractor={(a) => a.id}
            emptyIcon={<Store className="w-12 h-12" style={{ color: C.textSubtle }} />}
            emptyTitle="まだ申し込みがありません"
            emptyDescription="新しい申し込みが届くとここに表示されます"
          />
        </section>
      </div>

      {/* Reject Modal */}
      <CustomModal
        isOpen={rejectModalOpen}
        onClose={() => !rejecting && setRejectModalOpen(false)}
        title=""
        showCloseButton={!rejecting}
      >
        <div className="space-y-4">
          <div className="text-center">
            <div className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center" style={{ background: C.dangerBg }}>
              <Trash2 className="w-6 h-6" style={{ color: C.danger }} />
            </div>
            <h3 className="text-lg font-bold" style={{ color: C.text }}>この申し込みを却下しますか？</h3>
          </div>
          {applicationToReject && (
            <p className="text-sm text-center" style={{ color: C.textMuted }}>
              <span className="font-bold" style={{ color: C.text }}>{applicationToReject.store_name}</span>
              の申し込みを完全に削除します。この操作は取り消せません。
            </p>
          )}
          <div className="flex gap-3 pt-2">
            <Button variant="outline" className="flex-1 font-semibold rounded-lg" onClick={() => setRejectModalOpen(false)} disabled={rejecting}
              style={{ borderColor: C.border, color: C.textMuted }}>
              キャンセル
            </Button>
            <Button className="flex-1 font-semibold rounded-lg" onClick={handleRejectConfirm} disabled={rejecting}
              style={{ background: C.danger, color: '#fff' }}>
              {rejecting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />処理中...</> : '却下・削除する'}
            </Button>
          </div>
        </div>
      </CustomModal>

      {/* Complete Modal */}
      <CustomModal
        isOpen={completeModalOpen}
        onClose={() => !completing && setCompleteModalOpen(false)}
        title=""
        showCloseButton={!completing}
      >
        <div className="space-y-4">
          <div className="text-center">
            <div className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center" style={{ background: C.successBg || 'rgba(34,197,94,0.1)' }}>
              <FileText className="w-6 h-6" style={{ color: C.success }} />
            </div>
            <h3 className="text-lg font-bold" style={{ color: C.text }}>登録完了済みにしますか？</h3>
          </div>
          {applicationToComplete && (
            <p className="text-sm text-center" style={{ color: C.textMuted }}>
              <span className="font-bold" style={{ color: C.text }}>{applicationToComplete.store_name}</span>
              の申し込みを登録完了済みにします。一覧から非表示になります。
            </p>
          )}
          <div className="flex gap-3 pt-2">
            <Button variant="outline" className="flex-1 font-semibold rounded-lg" onClick={() => setCompleteModalOpen(false)} disabled={completing}
              style={{ borderColor: C.border, color: C.textMuted }}>
              キャンセル
            </Button>
            <Button className="flex-1 font-semibold rounded-lg" onClick={handleCompleteConfirm} disabled={completing}
              style={{ background: C.success, color: '#fff' }}>
              {completing ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />処理中...</> : '登録完了済みにする'}
            </Button>
          </div>
        </div>
      </CustomModal>
    </div>
  );
}
