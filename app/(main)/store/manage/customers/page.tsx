'use client';

import { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Users, Loader2, Search, ChevronLeft, ChevronRight, Mail, Trash2, User, MessageCircle,
} from 'lucide-react';
import { useAdminTheme } from '@/lib/admin-theme-context';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth/context';
import { toast } from 'sonner';
import { AdminDataTable, type AdminColumn } from '@/components/admin/admin-data-table';
import { AdminStatusBadge } from '@/components/admin/admin-status-badge';
import { CustomModal } from '@/components/ui/custom-modal';
import { Button } from '@/components/ui/button';
import type { Database } from '@/lib/supabase/types';

type UserRow = Database['public']['Tables']['users']['Row'];

const ITEMS_PER_PAGE = 20;

export default function CustomersPage() {
  const { colors: C } = useAdminTheme();
  const { user: authUser, accountType } = useAuth();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selected, setSelected] = useState<UserRow | null>(null);
  const [sendingReset, setSendingReset] = useState(false);

  useEffect(() => {
    if (!authUser || accountType !== 'platform') return;
    (async () => {
      try {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('role', 'customer')
          .order('created_at', { ascending: false });
        if (error) throw error;
        setUsers((data || []) as UserRow[]);
      } catch (err) {
        console.error('Error fetching users:', err);
        toast.error('顧客一覧の取得に失敗しました', { position: 'top-center' });
      } finally {
        setLoading(false);
      }
    })();
  }, [authUser, accountType]);

  const filtered = useMemo(() => {
    if (!searchQuery) return users;
    const q = searchQuery.toLowerCase();
    return users.filter(
      (u) =>
        (u.display_name || '').toLowerCase().includes(q) ||
        (u.email || '').toLowerCase().includes(q) ||
        (u.phone || '').includes(searchQuery)
    );
  }, [users, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paginated = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  useEffect(() => { setCurrentPage(1); }, [searchQuery]);

  const handleSendReset = async () => {
    if (!selected?.email) return;
    setSendingReset(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(selected.email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });
      if (error) throw error;
      toast.success('パスワードリセットメールを送信しました', {
        description: `${selected.email} にメールを送信しました。`,
        position: 'top-center',
        duration: 1500,
      });
    } catch (err) {
      toast.error('メールの送信に失敗しました', {
        description: err instanceof Error ? err.message : '不明なエラーが発生しました',
        position: 'top-center',
      });
    } finally {
      setSendingReset(false);
    }
  };

  const columns: AdminColumn<UserRow>[] = [
    {
      key: 'user',
      header: '顧客',
      width: '2fr',
      render: (u) => (
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-lg flex-shrink-0 flex items-center justify-center overflow-hidden"
            style={{ background: u.avatar_url || u.line_picture_url ? 'transparent' : C.accentBg }}
          >
            {u.avatar_url || u.line_picture_url ? (
              <img
                src={u.avatar_url || u.line_picture_url || ''}
                alt={u.display_name}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            ) : (
              <User className="w-4 h-4" style={{ color: C.accent }} />
            )}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate" style={{ color: C.text }}>
              {u.display_name || '（名前未設定）'}
            </p>
            <p className="text-xs truncate" style={{ color: C.textSubtle }}>{u.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'line',
      header: 'LINE連携',
      width: '110px',
      hideOnMobile: true,
      render: (u) =>
        u.line_user_id ? (
          <AdminStatusBadge label="連携済" variant="success" dot />
        ) : (
          <AdminStatusBadge label="未連携" variant="neutral" />
        ),
    },
    {
      key: 'phone',
      header: '電話番号',
      width: '140px',
      hideOnMobile: true,
      render: (u) => (
        <span className="text-xs" style={{ color: C.textMuted }}>{u.phone || '—'}</span>
      ),
    },
    {
      key: 'created',
      header: '登録日',
      width: '110px',
      hideOnMobile: true,
      render: (u) => (
        <span className="text-xs" style={{ color: C.textSubtle }}>
          {u.created_at ? new Date(u.created_at).toLocaleDateString('ja-JP') : '—'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      width: '60px',
      render: (u) => (
        <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => { setSelected(u); setDetailOpen(true); }}
            className="text-xs font-medium px-2 py-1 rounded-md"
            style={{ background: C.accentBg, color: C.accent }}
          >
            詳細
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
          <p className="text-xs tracking-wider" style={{ color: C.textSubtle }}>Loading customers...</p>
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
              顧客管理
            </h1>
            <p className="text-sm mt-1" style={{ color: C.textSubtle }}>
              登録済み顧客の一覧
            </p>
          </div>
          <span
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full"
            style={{ background: C.accentBg, color: C.accent }}
          >
            <Users className="w-3 h-3" />
            {users.length} 名
          </span>
        </motion.div>

        {/* 検索 */}
        {users.length > 0 && (
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: C.textSubtle }} />
            <input
              type="text"
              placeholder="名前・メール・電話で検索..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-lg text-sm outline-none transition-colors"
              style={{ background: C.bgInput, border: `1px solid ${C.border}`, color: C.text }}
            />
          </div>
        )}

        {/* テーブル */}
        <AdminDataTable
          columns={columns}
          data={paginated}
          keyExtractor={(u) => u.id}
          onRowClick={(u) => { setSelected(u); setDetailOpen(true); }}
          emptyIcon={<Users className="w-12 h-12" style={{ color: C.textSubtle }} />}
          emptyTitle="まだ顧客が登録されていません"
          emptyDescription="顧客がアカウント登録すると、ここに表示されます"
          mobileCardRender={(u) => (
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-lg flex-shrink-0 flex items-center justify-center overflow-hidden"
                style={{ background: u.avatar_url || u.line_picture_url ? 'transparent' : C.accentBg }}
              >
                {u.avatar_url || u.line_picture_url ? (
                  <img src={u.avatar_url || u.line_picture_url || ''} alt={u.display_name} className="w-full h-full object-cover" loading="lazy" />
                ) : (
                  <User className="w-4 h-4" style={{ color: C.accent }} />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold truncate" style={{ color: C.text }}>
                  {u.display_name || '（名前未設定）'}
                </p>
                <p className="text-xs truncate" style={{ color: C.textSubtle }}>{u.email}</p>
              </div>
              {u.line_user_id && <AdminStatusBadge label="LINE" variant="success" dot />}
            </div>
          )}
        />

        {/* ページネーション */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-1">
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
      </div>

      {/* 詳細モーダル */}
      <CustomModal
        isOpen={detailOpen}
        onClose={() => setDetailOpen(false)}
        title={selected?.display_name || '顧客詳細'}
        description={selected?.email || ''}
      >
        {selected && (
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-muted-foreground">電話番号</p>
                <p className="font-semibold">{selected.phone || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">登録日</p>
                <p className="font-semibold">
                  {selected.created_at ? new Date(selected.created_at).toLocaleDateString('ja-JP') : '—'}
                </p>
              </div>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">LINE連携</p>
              {selected.line_user_id ? (
                <div className="flex items-center gap-2">
                  <MessageCircle className="w-4 h-4 text-success" />
                  <span className="font-semibold">連携済 {selected.line_display_name ? `(${selected.line_display_name})` : ''}</span>
                </div>
              ) : (
                <span className="text-muted-foreground">未連携</span>
              )}
            </div>
            {selected.bio && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">自己紹介</p>
                <p className="text-sm leading-relaxed">{selected.bio}</p>
              </div>
            )}
            <div className="pt-4 border-t flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSendReset}
                disabled={sendingReset || !selected.email}
                className="flex-1"
              >
                {sendingReset ? (
                  <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> 送信中…</>
                ) : (
                  <><Mail className="w-3 h-3 mr-1" /> PWリセット送信</>
                )}
              </Button>
            </div>
          </div>
        )}
      </CustomModal>
    </div>
  );
}
