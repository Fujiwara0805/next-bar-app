'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText,
  Download,
  ArrowLeft,
  Store,
  Mail,
  MapPin,
  Phone,
  Clock,
  ChevronRight,
  Loader2,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth/context';
import { toast } from 'sonner';
import { CustomModal } from '@/components/ui/custom-modal';
import type { StoreApplication } from '@/lib/types/store-application';
import { APPLICATION_STATUS_MAP } from '@/lib/types/store-application';
import { useAppMode } from '@/lib/app-mode-context';

export default function ApplicationsManagePage() {
  const { colorsB: COLORS } = useAppMode();
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

  // 認証チェック
  useEffect(() => {
    if (user === null) {
      router.push('/login');
      return;
    }
    if (profile && (!profile.is_business || accountType !== 'platform')) {
      router.push('/login');
      return;
    }
  }, [user, profile, accountType, router]);

  // 申し込みデータ取得
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
      toast.error('申し込みデータの取得に失敗しました', {
        position: 'top-center',
        duration: 3000,
        className: 'bg-gray-100',
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredApplications = applications;

  // 登録完了済み処理
  const handleCompleteClick = (application: StoreApplication) => {
    setApplicationToComplete(application);
    setCompleteModalOpen(true);
  };

  const handleCompleteConfirm = async () => {
    if (!applicationToComplete) return;

    setCompleting(true);

    try {
      const res = await fetch(`/api/store-applications/${applicationToComplete.id}`, {
        method: 'DELETE',
      });

      if (!res.ok) throw new Error('Failed to delete');

      toast.success('登録完了済みにしました', {
        description: `${applicationToComplete.store_name}の申し込みを登録完了済みにしました`,
        position: 'top-center',
        duration: 1500,
        className: 'bg-gray-100',
      });

      // ローカル状態から削除（画面から消える）
      setApplications((prev) =>
        prev.filter((app) => app.id !== applicationToComplete.id),
      );

      setCompleteModalOpen(false);
      setApplicationToComplete(null);
    } catch (error) {
      console.error('Error completing application:', error);
      toast.error('登録完了処理に失敗しました', {
        position: 'top-center',
        duration: 3000,
        className: 'bg-gray-100',
      });
    } finally {
      setCompleting(false);
    }
  };

  // 却下（物理削除）処理
  const handleRejectClick = (application: StoreApplication) => {
    setApplicationToReject(application);
    setRejectModalOpen(true);
  };

  const handleRejectConfirm = async () => {
    if (!applicationToReject) return;

    setRejecting(true);

    try {
      const res = await fetch(`/api/store-applications/${applicationToReject.id}`, {
        method: 'DELETE',
      });

      if (!res.ok) throw new Error('Failed to delete');

      toast.success('申し込みを却下しました', {
        description: `${applicationToReject.store_name}の申し込みを削除しました`,
        position: 'top-center',
        duration: 1500,
        className: 'bg-gray-100',
      });

      setApplications((prev) =>
        prev.filter((app) => app.id !== applicationToReject.id),
      );

      setRejectModalOpen(false);
      setApplicationToReject(null);
    } catch (error) {
      console.error('Error rejecting application:', error);
      toast.error('却下処理に失敗しました', {
        position: 'top-center',
        duration: 3000,
        className: 'bg-gray-100',
      });
    } finally {
      setRejecting(false);
    }
  };

  // CSV エクスポート
  const handleExportCSV = () => {
    window.open('/api/store-applications/export', '_blank');
  };

  // 日付フォーマット
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // 住所を短縮表示
  const truncateAddress = (address: string, maxLength = 30) => {
    if (address.length <= maxLength) return address;
    return address.slice(0, maxLength) + '...';
  };

  // ローディング表示
  if (loading) {
    return (
      <div
        className="flex items-center justify-center h-screen"
        style={{ background: COLORS.luxuryGradient }}
      >
        <div className="text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          >
            <Loader2
              className="w-10 h-10 mx-auto mb-2"
              style={{ color: COLORS.champagneGold }}
            />
          </motion.div>
          <p className="text-sm font-bold" style={{ color: COLORS.ivory }}>
            読み込み中...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: COLORS.cardGradient }}
    >
      {/* ヘッダー */}
      <header
        className="sticky top-0 z-20 safe-top"
        style={{
          background: COLORS.luxuryGradient,
          borderBottom: '1px solid rgba(201, 168, 108, 0.2)',
        }}
      >
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push('/store/manage')}
              className="rounded-full hover:bg-white/10"
              style={{ color: COLORS.champagneGold }}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="text-center flex-1">
              <h1
                className="text-xl font-light tracking-widest flex items-center justify-center gap-2"
                style={{ color: COLORS.ivory }}
              >
                <FileText
                  className="w-6 h-6"
                  style={{ color: COLORS.champagneGold }}
                />
                申し込み管理
              </h1>
              <p
                className="text-sm mt-1 font-bold"
                style={{ color: COLORS.platinum }}
              >
                未確認 {applications.length}件
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleExportCSV}
              className="rounded-full hover:bg-white/10"
              style={{ color: COLORS.champagneGold }}
              title="CSV エクスポート"
            >
              <Download className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* フィルタータブは不要（未確認のみ表示） */}

      {/* メインコンテンツ */}
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-6">
        {filteredApplications.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card
              className="p-12 text-center rounded-2xl shadow-lg"
              style={{
                background: '#FFFFFF',
                border: '1px solid rgba(201, 168, 108, 0.15)',
              }}
            >
              <Store
                className="w-16 h-16 mx-auto mb-4"
                style={{ color: COLORS.warmGray }}
              />
              <h2
                className="text-xl font-bold mb-2"
                style={{ color: COLORS.deepNavy }}
              >
                まだ申し込みがありません
              </h2>
              <p className="font-bold" style={{ color: COLORS.warmGray }}>
                新しい申し込みが届くとここに表示されます
              </p>
            </Card>
          </motion.div>
        ) : (
          <div className="space-y-4">
            <AnimatePresence mode="popLayout">
              {filteredApplications.map((application, index) => {
                const statusInfo =
                  APPLICATION_STATUS_MAP[application.status] ??
                  APPLICATION_STATUS_MAP.pending;

                return (
                  <motion.div
                    key={application.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ delay: index * 0.03 }}
                  >
                    <Card
                      className="overflow-hidden rounded-2xl shadow-lg"
                      style={{
                        background: '#FFFFFF',
                        border: '1px solid rgba(201, 168, 108, 0.15)',
                      }}
                    >
                      <div className="p-4">
                        {/* 上部: 店舗名 + ステータス */}
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h3
                                className="font-bold text-lg truncate"
                                style={{ color: COLORS.deepNavy }}
                              >
                                {application.store_name}
                              </h3>
                              <span
                                className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-bold ${statusInfo.bgColor} ${statusInfo.color}`}
                              >
                                {statusInfo.label}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* 詳細情報 */}
                        <div className="space-y-1.5 mb-4">
                          <div
                            className="flex items-center gap-2 text-sm"
                            style={{ color: COLORS.warmGray }}
                          >
                            <Mail
                              className="w-4 h-4 shrink-0"
                              style={{ color: COLORS.champagneGold }}
                            />
                            <span className="truncate">
                              {application.contact_email}
                            </span>
                          </div>

                          {application.address && (
                            <div
                              className="flex items-center gap-2 text-sm"
                              style={{ color: COLORS.warmGray }}
                            >
                              <MapPin
                                className="w-4 h-4 shrink-0"
                                style={{ color: COLORS.champagneGold }}
                              />
                              <span className="truncate">
                                {truncateAddress(application.address)}
                              </span>
                            </div>
                          )}

                          {application.phone && (
                            <div
                              className="flex items-center gap-2 text-sm"
                              style={{ color: COLORS.warmGray }}
                            >
                              <Phone
                                className="w-4 h-4 shrink-0"
                                style={{ color: COLORS.champagneGold }}
                              />
                              <span>{application.phone}</span>
                            </div>
                          )}

                          <div
                            className="flex items-center gap-2 text-sm"
                            style={{ color: COLORS.warmGray }}
                          >
                            <Clock
                              className="w-4 h-4 shrink-0"
                              style={{ color: COLORS.champagneGold }}
                            />
                            <span>{formatDate(application.created_at)}</span>
                          </div>
                        </div>

                        {/* アクションボタン */}
                        <div className="flex gap-2">
                          <Link
                            href={`/store/manage/new?application_id=${application.id}`}
                            className="flex-1"
                          >
                            <Button
                              className="w-full rounded-xl font-bold shadow-md"
                              style={{
                                background: COLORS.goldGradient,
                                color: COLORS.deepNavy,
                                boxShadow:
                                  '0 4px 15px rgba(201, 168, 108, 0.3)',
                              }}
                            >
                              <ChevronRight className="w-4 h-4 mr-1" />
                              審査・登録
                            </Button>
                          </Link>
                          <Button
                            variant="outline"
                            className="rounded-xl font-bold"
                            onClick={() => handleCompleteClick(application)}
                            style={{
                              borderColor: 'rgba(34, 197, 94, 0.3)',
                              backgroundColor: 'rgba(34, 197, 94, 0.05)',
                              color: '#16A34A',
                            }}
                          >
                            登録完了済み
                          </Button>
                          <Button
                            variant="outline"
                            className="rounded-xl font-bold"
                            onClick={() => handleRejectClick(application)}
                            style={{
                              borderColor: 'rgba(239, 68, 68, 0.3)',
                              backgroundColor: 'rgba(239, 68, 68, 0.05)',
                              color: '#DC2626',
                            }}
                          >
                            <Trash2 className="w-4 h-4 mr-1" />
                            却下
                          </Button>
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </main>

      {/* 却下確認モーダル */}
      <CustomModal
        isOpen={rejectModalOpen}
        onClose={() => !rejecting && setRejectModalOpen(false)}
        title=""
        showCloseButton={!rejecting}
      >
        <div className="space-y-4">
          <div className="text-center">
            <div
              className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center"
              style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)' }}
            >
              <Trash2 className="w-6 h-6 text-red-600" />
            </div>
            <h3
              className="text-lg font-bold"
              style={{ color: COLORS.deepNavy }}
            >
              この申し込みを却下しますか？
            </h3>
          </div>
          {applicationToReject && (
            <p
              className="text-sm text-center"
              style={{ color: COLORS.warmGray }}
            >
              <span
                className="font-bold"
                style={{ color: COLORS.charcoal }}
              >
                {applicationToReject.store_name}
              </span>
              の申し込みを完全に削除します。この操作は取り消せません。
            </p>
          )}
          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              className="flex-1 font-bold rounded-xl"
              onClick={() => setRejectModalOpen(false)}
              disabled={rejecting}
              style={{
                borderColor: 'rgba(201, 168, 108, 0.3)',
                backgroundColor: 'rgba(201, 168, 108, 0.08)',
                color: COLORS.charcoal,
              }}
            >
              キャンセル
            </Button>
            <Button
              className="flex-1 font-bold rounded-xl"
              onClick={handleRejectConfirm}
              disabled={rejecting}
              style={{
                background: 'linear-gradient(135deg, #DC2626, #EF4444)',
                color: '#FFFFFF',
              }}
            >
              {rejecting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  処理中...
                </>
              ) : (
                '却下・削除する'
              )}
            </Button>
          </div>
        </div>
      </CustomModal>

      {/* 登録完了確認モーダル */}
      <CustomModal
        isOpen={completeModalOpen}
        onClose={() => !completing && setCompleteModalOpen(false)}
        title=""
        showCloseButton={!completing}
      >
        <div className="space-y-4">
          <div className="text-center">
            <div
              className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center"
              style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)' }}
            >
              <FileText className="w-6 h-6 text-green-600" />
            </div>
            <h3
              className="text-lg font-bold"
              style={{ color: COLORS.deepNavy }}
            >
              登録完了済みにしますか？
            </h3>
          </div>
          {applicationToComplete && (
            <p
              className="text-sm text-center"
              style={{ color: COLORS.warmGray }}
            >
              <span
                className="font-bold"
                style={{ color: COLORS.charcoal }}
              >
                {applicationToComplete.store_name}
              </span>
              の申し込みを登録完了済みにします。一覧から非表示になります。
            </p>
          )}
          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              className="flex-1 font-bold rounded-xl"
              onClick={() => setCompleteModalOpen(false)}
              disabled={completing}
              style={{
                borderColor: 'rgba(201, 168, 108, 0.3)',
                backgroundColor: 'rgba(201, 168, 108, 0.08)',
                color: COLORS.charcoal,
              }}
            >
              キャンセル
            </Button>
            <Button
              className="flex-1 font-bold rounded-xl"
              onClick={handleCompleteConfirm}
              disabled={completing}
              style={{
                background: 'linear-gradient(135deg, #16A34A, #22C55E)',
                color: '#FFFFFF',
              }}
            >
              {completing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  処理中...
                </>
              ) : (
                '登録完了済みにする'
              )}
            </Button>
          </div>
        </div>
      </CustomModal>
    </div>
  );
}
