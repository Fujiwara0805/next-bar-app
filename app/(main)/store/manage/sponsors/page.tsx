'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Search, ArrowLeft, Loader2, Building2, Trash2, Edit,
  ChevronLeft, ChevronRight, Globe, Mail, Phone, CheckCircle2, XCircle,
  ArrowUpRight, FileText,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { CustomModal } from '@/components/ui/custom-modal';
import { useAuth } from '@/lib/auth/context';
import { useAdminTheme } from '@/lib/admin-theme-context';
import { AdminThemeToggle } from '@/components/admin/admin-theme-toggle';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase/client';
import { defaultSponsorFormValues, sponsorFormSchema, type SponsorFormValues } from '@/lib/sponsors/schemas';
import type { Sponsor, SponsorContract } from '@/lib/sponsors/types';

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

  // Modal states
  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Sponsor | null>(null);
  const [formValues, setFormValues] = useState<SponsorFormValues>(defaultSponsorFormValues);
  const [saving, setSaving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Sponsor | null>(null);
  const [deleting, setDeleting] = useState(false);

  const isAdmin = profile?.is_business && accountType === 'platform';

  // Fetch sponsors
  const fetchSponsors = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('sponsors')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      const rows = data as Sponsor[];
      setSponsors(rows);
      // Fetch contract counts
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

  // Filtered & paginated
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

  // Reset page on filter change
  useEffect(() => { setCurrentPage(1); }, [searchQuery, statusFilter]);

  // Form handlers
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
    if (!user) {
      toast.error('ログインが必要です');
      return;
    }
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
      ({ error } = await supabase
        .from('sponsors')
        .update(payload)
        .eq('id', editTarget.id)
        .eq('created_by', user.id));
    } else {
      ({ error } = await supabase
        .from('sponsors')
        .insert({ ...payload, created_by: user.id }));
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
    const { error } = await supabase
      .from('sponsors')
      .delete()
      .eq('id', deleteTarget.id)
      .eq('created_by', user.id);
    setDeleting(false);
    if (!error) {
      toast.success('スポンサーを削除しました');
      setDeleteOpen(false);
      setSponsors((prev) => prev.filter((s) => s.id !== deleteTarget.id));
    } else {
      toast.error(error.message || '削除に失敗しました');
    }
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: C.bg }}>
        <p style={{ color: C.textMuted }}>アクセス権限がありません</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: C.bg }}>
      {/* Header */}
      <div
        className="sticky top-0 z-30 backdrop-blur-xl"
        style={{
          background: isDark ? 'rgba(15,23,42,0.85)' : 'rgba(248,250,252,0.85)',
          borderBottom: `1px solid ${C.border}`,
        }}
      >
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/store/manage">
              <motion.div
                whileHover={{ x: -2 }}
                className="p-2 rounded-lg cursor-pointer transition-colors"
                style={{ background: C.bgCard, border: `1px solid ${C.border}` }}
              >
                <ArrowLeft className="w-4 h-4" style={{ color: C.textMuted }} />
              </motion.div>
            </Link>
            <div>
              <h1 className="text-xl font-bold tracking-tight" style={{ color: C.text }}>
                Sponsor Management
              </h1>
              <p className="text-xs mt-0.5" style={{ color: C.textMuted }}>
                {filtered.length} sponsors
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <AdminThemeToggle />
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={openCreate}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
              style={{
                background: C.accent,
                color: '#fff',
              }}
            >
              <Plus className="w-4 h-4" />
              New Sponsor
            </motion.button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="max-w-7xl mx-auto px-6 pt-6 pb-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: C.textSubtle }} />
            <input
              type="text"
              placeholder="企業名・担当者・メールで検索..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg text-sm outline-none transition-colors"
              style={{
                background: C.bgInput,
                border: `1px solid ${C.border}`,
                color: C.text,
              }}
            />
          </div>
          {(['all', 'active', 'inactive'] as const).map((f) => (
            <motion.button
              key={f}
              whileTap={{ scale: 0.95 }}
              onClick={() => setStatusFilter(f)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
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
      </div>

      {/* Table */}
      <div className="max-w-7xl mx-auto px-6 pb-8">
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
            <div
              className="rounded-xl overflow-hidden"
              style={{ border: `1px solid ${C.border}` }}
            >
              {/* Table Header */}
              <div
                className="grid grid-cols-[1fr_120px_120px_100px_80px] gap-4 px-5 py-3 text-xs font-semibold uppercase tracking-wider"
                style={{ background: C.bgElevated, color: C.textSubtle, borderBottom: `1px solid ${C.border}` }}
              >
                <span>企業名</span>
                <span>連絡先</span>
                <span>契約数</span>
                <span>ステータス</span>
                <span></span>
              </div>

              {/* Table Rows */}
              <AnimatePresence>
                {paginated.map((sponsor, idx) => (
                  <motion.div
                    key={sponsor.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: idx * 0.03 }}
                    className="grid grid-cols-[1fr_120px_120px_100px_80px] gap-4 px-5 py-3.5 items-center cursor-pointer transition-colors"
                    style={{
                      background: C.bgCard,
                      borderBottom: `1px solid ${C.borderSubtle}`,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = C.bgCardHover;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = C.bgCard;
                    }}
                    onClick={() => router.push(`/store/manage/sponsors/${sponsor.id}`)}
                  >
                    {/* Company */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold shrink-0"
                        style={{ background: C.accentBg, color: C.accent }}
                      >
                        {sponsor.company_name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate" style={{ color: C.text }}>
                          {sponsor.company_name}
                        </p>
                        {sponsor.website_url && (
                          <p className="text-xs truncate" style={{ color: C.textSubtle }}>
                            {sponsor.website_url.replace(/^https?:\/\//, '')}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Contact */}
                    <div className="flex items-center gap-1.5">
                      {sponsor.contact_email && (
                        <Mail className="w-3.5 h-3.5" style={{ color: C.textSubtle }} />
                      )}
                      {sponsor.contact_phone && (
                        <Phone className="w-3.5 h-3.5" style={{ color: C.textSubtle }} />
                      )}
                      {sponsor.website_url && (
                        <Globe className="w-3.5 h-3.5" style={{ color: C.textSubtle }} />
                      )}
                      {!sponsor.contact_email && !sponsor.contact_phone && !sponsor.website_url && (
                        <span className="text-xs" style={{ color: C.textSubtle }}>-</span>
                      )}
                    </div>

                    {/* Contracts */}
                    <div className="flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5" style={{ color: C.textSubtle }} />
                      <span className="text-sm font-medium" style={{ color: C.text }}>
                        {contractCounts[sponsor.id] ?? 0}
                      </span>
                    </div>

                    {/* Status */}
                    <div>
                      <span
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
                        style={{
                          background: sponsor.is_active ? C.successBg : C.dangerBg,
                          color: sponsor.is_active ? C.success : C.danger,
                        }}
                      >
                        {sponsor.is_active ? (
                          <><CheckCircle2 className="w-3 h-3" /> Active</>
                        ) : (
                          <><XCircle className="w-3 h-3" /> Inactive</>
                        )}
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => openEdit(sponsor)}
                        className="p-1.5 rounded-lg transition-colors"
                        style={{ color: C.textMuted }}
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => {
                          setDeleteTarget(sponsor);
                          setDeleteOpen(true);
                        }}
                        className="p-1.5 rounded-lg transition-colors"
                        style={{ color: C.danger }}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </motion.button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 px-1">
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
      </div>

      {/* Create/Edit Modal */}
      <CustomModal
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        title={editTarget ? 'スポンサー編集' : '新規スポンサー登録'}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">
              企業名 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formValues.company_name}
              onChange={(e) => setFormValues((v) => ({ ...v, company_name: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-900 focus:outline-none focus:border-[#C9A86C] focus:ring-2 focus:ring-[#C9A86C]/20"
              placeholder="株式会社〇〇"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">担当者名</label>
              <input
                type="text"
                value={formValues.contact_name}
                onChange={(e) => setFormValues((v) => ({ ...v, contact_name: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-900 focus:outline-none focus:border-[#C9A86C] focus:ring-2 focus:ring-[#C9A86C]/20"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">電話番号</label>
              <input
                type="text"
                value={formValues.contact_phone}
                onChange={(e) => setFormValues((v) => ({ ...v, contact_phone: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-900 focus:outline-none focus:border-[#C9A86C] focus:ring-2 focus:ring-[#C9A86C]/20"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">メールアドレス</label>
            <input
              type="email"
              value={formValues.contact_email}
              onChange={(e) => setFormValues((v) => ({ ...v, contact_email: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-900 focus:outline-none focus:border-[#C9A86C] focus:ring-2 focus:ring-[#C9A86C]/20"
              placeholder="example@company.com"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">WebサイトURL</label>
            <input
              type="url"
              value={formValues.website_url}
              onChange={(e) => setFormValues((v) => ({ ...v, website_url: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-900 focus:outline-none focus:border-[#C9A86C] focus:ring-2 focus:ring-[#C9A86C]/20"
              placeholder="https://example.com"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">備考</label>
            <textarea
              value={formValues.notes}
              onChange={(e) => setFormValues((v) => ({ ...v, notes: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-900 focus:outline-none focus:border-[#C9A86C] focus:ring-2 focus:ring-[#C9A86C]/20 resize-none"
              rows={3}
            />
          </div>
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-gray-600">有効</label>
            <button
              type="button"
              onClick={() => setFormValues((v) => ({ ...v, is_active: !v.is_active }))}
              className={`relative w-10 h-5 rounded-full transition-colors ${formValues.is_active ? 'bg-[#C9A86C]' : 'bg-gray-300'}`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${formValues.is_active ? 'translate-x-5' : ''}`}
              />
            </button>
          </div>
          <div className="flex gap-2 pt-2">
            <button
              onClick={() => setFormOpen(false)}
              className="flex-1 py-2.5 rounded-lg text-sm font-medium border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
            >
              キャンセル
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-white transition-colors disabled:opacity-50"
              style={{ background: C.accent }}
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin mx-auto" />
              ) : editTarget ? (
                '更新'
              ) : (
                '登録'
              )}
            </button>
          </div>
        </div>
      </CustomModal>

      {/* Delete Confirm Modal */}
      <CustomModal
        isOpen={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="スポンサー削除"
        description={`「${deleteTarget?.company_name}」を削除しますか？関連する契約・広告枠もすべて削除されます。`}
      >
        <div className="flex gap-2 pt-4">
          <button
            onClick={() => setDeleteOpen(false)}
            className="flex-1 py-2.5 rounded-lg text-sm font-medium border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
          >
            キャンセル
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-white bg-red-500 hover:bg-red-600 transition-colors disabled:opacity-50"
          >
            {deleting ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : '削除する'}
          </button>
        </div>
      </CustomModal>
    </div>
  );
}
