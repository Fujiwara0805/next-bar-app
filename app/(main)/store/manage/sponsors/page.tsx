'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Search, Loader2, Building2, Trash2, Edit,
  ChevronLeft, ChevronRight, Globe, Mail, Phone, CheckCircle2, XCircle,
  FileText,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { CustomModal } from '@/components/ui/custom-modal';
import { useAuth } from '@/lib/auth/context';
import { useAdminTheme } from '@/lib/admin-theme-context';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase/client';
import { defaultSponsorFormValues, sponsorFormSchema, type SponsorFormValues } from '@/lib/sponsors/schemas';
import type { Sponsor } from '@/lib/sponsors/types';

const ITEMS_PER_PAGE = 10;

export default function SponsorsPage() {
  const { colors: C, isDark } = useAdminTheme();
  const router = useRouter();
  const { user, profile, accountType } = useAuth();

  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [contractCounts, setContractCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [navigatingId, setNavigatingId] = useState<string | null>(null);

  // Modal states
  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Sponsor | null>(null);
  const [formValues, setFormValues] = useState<SponsorFormValues>(defaultSponsorFormValues);
  const [saving, setSaving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Sponsor | null>(null);
  const [deleting, setDeleting] = useState(false);

  const isAdmin = profile?.is_business && accountType === 'platform';

  const fetchSponsors = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('sponsors')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      const rows = data as Sponsor[];
      setSponsors(rows);
      const counts: Record<string, number> = {};
      await Promise.all(
        rows.map(async (s) => {
          const { count } = await supabase
            .from('sponsor_contracts')
            .select('*', { count: 'exact', head: true })
            .eq('sponsor_id', s.id);
          counts[s.id] = count || 0;
        })
      );
      setContractCounts(counts);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!isAdmin) return;
    fetchSponsors();
  }, [isAdmin]);

  const filtered = useMemo(() => {
    let list = sponsors;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (s) =>
          s.company_name.toLowerCase().includes(q) ||
          s.contact_name?.toLowerCase().includes(q) ||
          s.contact_email?.toLowerCase().includes(q)
      );
    }
    if (statusFilter === 'active') list = list.filter((s) => s.is_active);
    if (statusFilter === 'inactive') list = list.filter((s) => !s.is_active);
    return list;
  }, [sponsors, searchQuery, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paginated = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  useEffect(() => { setCurrentPage(1); }, [searchQuery, statusFilter]);

  const openCreate = () => {
    setEditTarget(null);
    setFormValues(defaultSponsorFormValues);
    setFormOpen(true);
  };

  const openEdit = (sponsor: Sponsor) => {
    setEditTarget(sponsor);
    setFormValues({
      company_name: sponsor.company_name,
      contact_name: sponsor.contact_name || '',
      contact_email: sponsor.contact_email || '',
      contact_phone: sponsor.contact_phone || '',
      website_url: sponsor.website_url || '',
      company_logo_url: sponsor.company_logo_url || '',
      notes: sponsor.notes || '',
      is_active: sponsor.is_active,
    });
    setFormOpen(true);
  };

  const handleSave = async () => {
    const validation = sponsorFormSchema.safeParse(formValues);
    if (!validation.success) {
      toast.error(validation.error.errors[0]?.message || '入力値を確認してください');
      return;
    }
    if (!user) { toast.error('ログインが必要です'); return; }
    setSaving(true);

    const payload = {
      company_name: formValues.company_name,
      contact_name: formValues.contact_name || null,
      contact_email: formValues.contact_email || null,
      contact_phone: formValues.contact_phone || null,
      website_url: formValues.website_url || null,
      company_logo_url: formValues.company_logo_url || null,
      notes: formValues.notes || null,
      is_active: formValues.is_active,
    };

    let error;
    if (editTarget) {
      ({ error } = await supabase.from('sponsors').update(payload).eq('id', editTarget.id).eq('created_by', user.id));
    } else {
      ({ error } = await supabase.from('sponsors').insert({ ...payload, created_by: user.id }));
    }
    setSaving(false);
    if (!error) {
      toast.success(editTarget ? 'スポンサーを更新しました' : 'スポンサーを登録しました');
      setFormOpen(false);
      await fetchSponsors();
    } else {
      toast.error(error.message || '保存に失敗しました');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget || !user) return;
    setDeleting(true);
    const { error } = await supabase.from('sponsors').delete().eq('id', deleteTarget.id).eq('created_by', user.id);
    setDeleting(false);
    if (!error) {
      toast.success('スポンサーを削除しました');
      setDeleteOpen(false);
      setSponsors((prev) => prev.filter((s) => s.id !== deleteTarget.id));
    } else {
      toast.error(error.message || '削除に失敗しました');
    }
  };

  const handleSponsorClick = (id: string) => {
    setNavigatingId(id);
    router.push(`/store/manage/sponsors/${id}`);
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: C.bg }}>
        <p style={{ color: C.textMuted }}>アクセス権限がありません</p>
      </div>
    );
  }

  // テーマ対応のinput style
  const inputStyle = {
    background: C.bgInput,
    border: `1px solid ${C.border}`,
    color: C.text,
  };
  const labelStyle = { color: C.textMuted };

  return (
    <div className="min-h-screen" style={{ background: C.bg }}>
      <div className="max-w-6xl mx-auto px-6 md:px-8 py-8 space-y-6">
        {/* Page Header */}
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight" style={{ color: C.text }}>
              Sponsor Management
            </h1>
            <p className="text-sm mt-1" style={{ color: C.textSubtle }}>
              {filtered.length} sponsors
            </p>
          </div>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold"
            style={{ background: C.accent, color: '#fff' }}
          >
            <Plus className="w-4 h-4" />
            New Sponsor
          </motion.button>
        </motion.div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: C.textSubtle }} />
            <input
              type="text"
              placeholder="企業名・担当者・メールで検索..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-lg text-sm outline-none transition-colors"
              style={inputStyle}
            />
          </div>
          {(['all', 'active', 'inactive'] as const).map((f) => (
            <motion.button
              key={f}
              whileTap={{ scale: 0.95 }}
              onClick={() => setStatusFilter(f)}
              className="px-3 py-2 rounded-lg text-xs font-medium transition-colors"
              style={{
                background: statusFilter === f ? C.accentBg : C.bgCard,
                color: statusFilter === f ? C.accent : C.textMuted,
                border: `1px solid ${statusFilter === f ? C.accent : C.border}`,
              }}
            >
              {f === 'all' ? 'All' : f === 'active' ? 'Active' : 'Inactive'}
            </motion.button>
          ))}
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin" style={{ color: C.accent }} />
          </div>
        ) : paginated.length === 0 ? (
          <div className="text-center py-20">
            <Building2 className="w-12 h-12 mx-auto mb-3" style={{ color: C.textSubtle }} />
            <p className="text-sm" style={{ color: C.textMuted }}>
              {searchQuery ? '検索結果がありません' : 'スポンサーが登録されていません'}
            </p>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block rounded-xl overflow-hidden" style={{ border: `1px solid ${C.border}` }}>
              <div
                className="grid grid-cols-[1fr_120px_100px_100px_80px] gap-4 px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.12em]"
                style={{ background: C.bgElevated, color: C.textSubtle, borderBottom: `1px solid ${C.border}` }}
              >
                <span>企業名</span>
                <span>連絡先</span>
                <span>契約数</span>
                <span>ステータス</span>
                <span></span>
              </div>
              <AnimatePresence>
                {paginated.map((sponsor, idx) => (
                  <motion.div
                    key={sponsor.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: idx * 0.03 }}
                    className="grid grid-cols-[1fr_120px_100px_100px_80px] gap-4 px-5 py-3.5 items-center cursor-pointer transition-colors relative"
                    style={{ background: C.bgCard, borderBottom: `1px solid ${C.borderSubtle}` }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = C.bgCardHover; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = C.bgCard; }}
                    onClick={() => handleSponsorClick(sponsor.id)}
                  >
                    {navigatingId === sponsor.id && (
                      <div className="absolute inset-0 z-10 flex items-center justify-center" style={{ background: isDark ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.6)' }}>
                        <Loader2 className="w-5 h-5 animate-spin" style={{ color: C.accent }} />
                      </div>
                    )}
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold shrink-0" style={{ background: C.accentBg, color: C.accent }}>
                        {sponsor.company_name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate" style={{ color: C.text }}>{sponsor.company_name}</p>
                        {sponsor.website_url && (
                          <p className="text-[11px] truncate" style={{ color: C.textSubtle }}>{sponsor.website_url.replace(/^https?:\/\//, '')}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {sponsor.contact_email && <Mail className="w-3.5 h-3.5" style={{ color: C.textSubtle }} />}
                      {sponsor.contact_phone && <Phone className="w-3.5 h-3.5" style={{ color: C.textSubtle }} />}
                      {sponsor.website_url && <Globe className="w-3.5 h-3.5" style={{ color: C.textSubtle }} />}
                      {!sponsor.contact_email && !sponsor.contact_phone && !sponsor.website_url && (
                        <span className="text-xs" style={{ color: C.textSubtle }}>-</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5" style={{ color: C.textSubtle }} />
                      <span className="text-sm font-medium" style={{ color: C.text }}>{contractCounts[sponsor.id] ?? 0}</span>
                    </div>
                    <div>
                      <span
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium"
                        style={{ background: sponsor.is_active ? C.successBg : C.dangerBg, color: sponsor.is_active ? C.success : C.danger }}
                      >
                        {sponsor.is_active ? <><CheckCircle2 className="w-3 h-3" /> Active</> : <><XCircle className="w-3 h-3" /> Inactive</>}
                      </span>
                    </div>
                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => openEdit(sponsor)} className="p-1.5 rounded-lg transition-colors" style={{ color: C.textMuted }}
                        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = C.accentBg; }}
                        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}>
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => { setDeleteTarget(sponsor); setDeleteOpen(true); }} className="p-1.5 rounded-lg transition-colors" style={{ color: C.danger }}
                        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = C.dangerBg; }}
                        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden space-y-3">
              {paginated.map((sponsor, idx) => (
                <motion.div
                  key={sponsor.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.03 }}
                  className="p-4 rounded-xl cursor-pointer transition-all relative"
                  style={{ background: C.bgCard, border: `1px solid ${C.border}` }}
                  onClick={() => handleSponsorClick(sponsor.id)}
                >
                  {navigatingId === sponsor.id && (
                    <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl" style={{ background: isDark ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.6)' }}>
                      <Loader2 className="w-5 h-5 animate-spin" style={{ color: C.accent }} />
                    </div>
                  )}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold shrink-0" style={{ background: C.accentBg, color: C.accent }}>
                        {sponsor.company_name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate" style={{ color: C.text }}>{sponsor.company_name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span
                            className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium"
                            style={{ background: sponsor.is_active ? C.successBg : C.dangerBg, color: sponsor.is_active ? C.success : C.danger }}
                          >
                            {sponsor.is_active ? 'Active' : 'Inactive'}
                          </span>
                          <span className="text-[11px]" style={{ color: C.textSubtle }}>
                            {contractCounts[sponsor.id] ?? 0} contracts
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => openEdit(sponsor)} className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium" style={{ color: C.accent }}
                      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = C.accentBg; }}
                      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}>
                      <Edit className="w-3 h-3" /> 編集
                    </button>
                    <button onClick={() => { setDeleteTarget(sponsor); setDeleteOpen(true); }} className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium" style={{ color: C.danger }}
                      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = C.dangerBg; }}
                      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}>
                      <Trash2 className="w-3 h-3" /> 削除
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 px-1">
                <p className="text-xs" style={{ color: C.textSubtle }}>
                  {filtered.length}件中 {(currentPage - 1) * ITEMS_PER_PAGE + 1}-{Math.min(currentPage * ITEMS_PER_PAGE, filtered.length)}件
                </p>
                <div className="flex items-center gap-1">
                  <motion.button whileTap={{ scale: 0.9 }} onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1} className="p-1.5 rounded-lg transition-colors disabled:opacity-30" style={{ color: C.textMuted }}>
                    <ChevronLeft className="w-4 h-4" />
                  </motion.button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                    <motion.button key={p} whileTap={{ scale: 0.9 }} onClick={() => setCurrentPage(p)}
                      className="w-7 h-7 rounded-lg text-xs font-medium transition-colors"
                      style={{ background: currentPage === p ? C.accent : 'transparent', color: currentPage === p ? '#fff' : C.textMuted }}>
                      {p}
                    </motion.button>
                  ))}
                  <motion.button whileTap={{ scale: 0.9 }} onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages} className="p-1.5 rounded-lg transition-colors disabled:opacity-30" style={{ color: C.textMuted }}>
                    <ChevronRight className="w-4 h-4" />
                  </motion.button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Create/Edit Modal */}
      <CustomModal isOpen={formOpen} onClose={() => setFormOpen(false)} title={editTarget ? 'スポンサー編集' : '新規スポンサー登録'}>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold mb-1" style={labelStyle}>企業名 <span style={{ color: C.danger }}>*</span></label>
            <input type="text" value={formValues.company_name}
              onChange={(e) => setFormValues((v) => ({ ...v, company_name: e.target.value }))}
              className="w-full px-3 py-2.5 rounded-lg text-sm outline-none transition-colors focus:ring-2 focus:ring-[#C9A86C]/30"
              style={inputStyle} placeholder="株式会社〇〇" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1" style={labelStyle}>担当者名</label>
              <input type="text" value={formValues.contact_name}
                onChange={(e) => setFormValues((v) => ({ ...v, contact_name: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-lg text-sm outline-none transition-colors focus:ring-2 focus:ring-[#C9A86C]/30"
                style={inputStyle} />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1" style={labelStyle}>電話番号</label>
              <input type="text" value={formValues.contact_phone}
                onChange={(e) => setFormValues((v) => ({ ...v, contact_phone: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-lg text-sm outline-none transition-colors focus:ring-2 focus:ring-[#C9A86C]/30"
                style={inputStyle} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1" style={labelStyle}>メールアドレス</label>
            <input type="email" value={formValues.contact_email}
              onChange={(e) => setFormValues((v) => ({ ...v, contact_email: e.target.value }))}
              className="w-full px-3 py-2.5 rounded-lg text-sm outline-none transition-colors focus:ring-2 focus:ring-[#C9A86C]/30"
              style={inputStyle} placeholder="example@company.com" />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1" style={labelStyle}>WebサイトURL</label>
            <input type="url" value={formValues.website_url}
              onChange={(e) => setFormValues((v) => ({ ...v, website_url: e.target.value }))}
              className="w-full px-3 py-2.5 rounded-lg text-sm outline-none transition-colors focus:ring-2 focus:ring-[#C9A86C]/30"
              style={inputStyle} placeholder="https://example.com" />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1" style={labelStyle}>備考</label>
            <textarea value={formValues.notes}
              onChange={(e) => setFormValues((v) => ({ ...v, notes: e.target.value }))}
              className="w-full px-3 py-2.5 rounded-lg text-sm outline-none transition-colors resize-none focus:ring-2 focus:ring-[#C9A86C]/30"
              style={inputStyle} rows={3} />
          </div>
          <div className="flex items-center justify-between py-1">
            <label className="text-xs font-semibold" style={labelStyle}>有効</label>
            <button type="button" onClick={() => setFormValues((v) => ({ ...v, is_active: !v.is_active }))}
              className="relative w-10 h-5 rounded-full transition-colors"
              style={{ background: formValues.is_active ? C.accent : (isDark ? '#374151' : '#d1d5db') }}>
              <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${formValues.is_active ? 'translate-x-5' : ''}`} />
            </button>
          </div>
          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1 font-semibold rounded-lg" onClick={() => setFormOpen(false)}
              style={{ borderColor: C.border, color: C.textMuted }}>
              キャンセル
            </Button>
            <Button className="flex-1 font-semibold rounded-lg" onClick={handleSave} disabled={saving}
              style={{ background: C.accent, color: '#fff' }}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : editTarget ? '更新' : '登録'}
            </Button>
          </div>
        </div>
      </CustomModal>

      {/* Delete Confirm Modal */}
      <CustomModal isOpen={deleteOpen} onClose={() => setDeleteOpen(false)} title="スポンサー削除"
        description={`「${deleteTarget?.company_name}」を削除しますか？関連する契約・広告枠もすべて削除されます。`}>
        <div className="flex gap-2 pt-4">
          <Button variant="outline" className="flex-1 font-semibold rounded-lg" onClick={() => setDeleteOpen(false)}
            style={{ borderColor: C.border, color: C.textMuted }}>
            キャンセル
          </Button>
          <Button className="flex-1 font-semibold rounded-lg" onClick={handleDelete} disabled={deleting}
            style={{ background: C.danger, color: '#fff' }}>
            {deleting ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : '削除する'}
          </Button>
        </div>
      </CustomModal>
    </div>
  );
}
