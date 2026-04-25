'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Loader2, Calendar, Ban, FileText, RotateCcw } from 'lucide-react';
import { useAdminTheme } from '@/lib/admin-theme-context';
import { CustomModal } from '@/components/ui/custom-modal';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth/context';
import { calculateEndDate } from '@/lib/sponsors/utils';
import { renewContract } from '@/lib/actions/sponsor-contract';
import { PLAN_LABELS, CONTRACT_STATUS_LABELS } from '@/lib/sponsors/types';
import type { SponsorContract, PlanType, ContractStatus } from '@/lib/sponsors/types';

interface Props {
  sponsorId: string;
}

const STATUS_COLORS: Record<ContractStatus, { bg: string; color: string }> = {
  scheduled: { bg: 'rgba(59,130,246,0.1)', color: '#3b82f6' },
  active: { bg: 'rgba(34,197,94,0.1)', color: '#22c55e' },
  expired: { bg: 'rgba(107,114,128,0.1)', color: '#6b7280' },
  cancelled: { bg: 'rgba(239,68,68,0.1)', color: '#ef4444' },
};

export function SponsorContractsTab({ sponsorId }: Props) {
  const { colors: C } = useAdminTheme();
  const { user } = useAuth();
  const [contracts, setContracts] = useState<SponsorContract[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<SponsorContract | null>(null);
  const [saving, setSaving] = useState(false);

  // Form
  const [planType, setPlanType] = useState<PlanType>('7day');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState('');
  const [amount, setAmount] = useState(0);
  const [notes, setNotes] = useState('');

  // Renew modal
  const [renewOpen, setRenewOpen] = useState(false);
  const [renewTarget, setRenewTarget] = useState<SponsorContract | null>(null);
  const [renewPlanType, setRenewPlanType] = useState<PlanType>('7day');
  const [renewStartDate, setRenewStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [renewEndDate, setRenewEndDate] = useState('');

  useEffect(() => {
    fetchContracts();
  }, [sponsorId]);

  useEffect(() => {
    if (planType !== 'custom') {
      setEndDate(calculateEndDate(startDate, planType));
    }
  }, [planType, startDate]);

  useEffect(() => {
    if (renewPlanType !== 'custom') {
      setRenewEndDate(calculateEndDate(renewStartDate, renewPlanType));
    }
  }, [renewPlanType, renewStartDate]);

  const fetchContracts = async () => {
    setLoading(true);
    // cancelled は画面上から除外（DBは保持＝論理削除）
    const { data, error } = await supabase
      .from('sponsor_contracts')
      .select('*')
      .eq('sponsor_id', sponsorId)
      .neq('status', 'cancelled')
      .order('created_at', { ascending: false });
    if (!error && data) setContracts(data as SponsorContract[]);
    setLoading(false);
  };

  const handleCreate = async () => {
    if (!user) { toast.error('ログインが必要です'); return; }
    setSaving(true);
    const today = new Date().toISOString().split('T')[0];
    const status = startDate <= today ? 'active' : 'scheduled';
    const { error } = await supabase
      .from('sponsor_contracts')
      .insert({
        sponsor_id: sponsorId,
        plan_type: planType,
        start_date: startDate,
        end_date: endDate,
        price: amount,
        notes: notes || null,
        status,
        created_by: user.id,
      });
    setSaving(false);
    if (!error) {
      toast.success('契約を作成しました');
      setCreateOpen(false);
      resetForm();
      fetchContracts();
    } else {
      toast.error(error.message || '作成に失敗しました');
    }
  };

  const handleCancel = async () => {
    if (!cancelTarget || !user) return;
    setSaving(true);
    const { error } = await supabase
      .from('sponsor_contracts')
      .update({ status: 'cancelled' })
      .eq('id', cancelTarget.id)
      .eq('created_by', user.id);
    setSaving(false);
    if (!error) {
      toast.success('契約をキャンセルしました');
      setCancelOpen(false);
      fetchContracts();
    } else {
      toast.error(error.message || 'キャンセルに失敗しました');
    }
  };

  const openRenew = (c: SponsorContract) => {
    setRenewTarget(c);
    const today = new Date().toISOString().split('T')[0];
    const originalPlan = (c.plan_type as PlanType) || '7day';
    setRenewPlanType(originalPlan);
    setRenewStartDate(today);
    setRenewEndDate(originalPlan === 'custom' ? today : calculateEndDate(today, originalPlan));
    setRenewOpen(true);
  };

  const handleRenew = async () => {
    if (!renewTarget || !user) { toast.error('ログインが必要です'); return; }
    setSaving(true);
    const result = await renewContract(renewTarget.id, {
      plan_type: renewPlanType,
      start_date: renewStartDate,
      end_date: renewEndDate,
      userId: user.id,
    });
    setSaving(false);
    if (result.success) {
      toast.success('同じ条件で広告を再開しました');
      setRenewOpen(false);
      setRenewTarget(null);
      fetchContracts();
    } else {
      toast.error(result.error || '再開に失敗しました');
    }
  };

  const resetForm = () => {
    setPlanType('7day');
    setStartDate(new Date().toISOString().split('T')[0]);
    setAmount(0);
    setNotes('');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-5 h-5 animate-spin" style={{ color: C.accent }} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium" style={{ color: C.textMuted }}>
          {contracts.length}件の契約
        </p>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setCreateOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
          style={{ background: C.accent, color: C.accentForeground }}
        >
          <Plus className="w-3.5 h-3.5" />
          新規契約
        </motion.button>
      </div>

      {contracts.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="w-10 h-10 mx-auto mb-2" style={{ color: C.textSubtle }} />
          <p className="text-sm" style={{ color: C.textMuted }}>契約がありません</p>
        </div>
      ) : (
        <div className="space-y-2">
          <AnimatePresence>
            {contracts.map((c, idx) => {
              const status = c.status as ContractStatus;
              const sc = STATUS_COLORS[status];
              return (
                <motion.div
                  key={c.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="flex items-center justify-between p-4 rounded-xl transition-colors"
                  style={{ background: C.bgCard, border: `1px solid ${C.border}` }}
                >
                  <div className="flex items-center gap-4">
                    <span
                      className="px-2 py-0.5 rounded-full text-xs font-semibold"
                      style={{ background: sc.bg, color: sc.color }}
                    >
                      {CONTRACT_STATUS_LABELS[status]}
                    </span>
                    <div>
                      <p className="text-sm font-semibold" style={{ color: C.text }}>
                        {PLAN_LABELS[c.plan_type as PlanType]}
                      </p>
                      <p className="text-xs" style={{ color: C.textSubtle }}>
                        {c.start_date} ~ {c.end_date}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {c.price != null && (
                      <span className="text-sm font-medium" style={{ color: C.text }}>
                        ¥{Number(c.price).toLocaleString()}
                      </span>
                    )}
                    {(status === 'scheduled' || status === 'active') && (
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => { setCancelTarget(c); setCancelOpen(true); }}
                        className="p-1.5 rounded-lg transition-colors"
                        style={{ color: C.danger }}
                        title="キャンセル"
                      >
                        <Ban className="w-4 h-4" />
                      </motion.button>
                    )}
                    {status === 'expired' && (
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => openRenew(c)}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                        style={{ background: C.accent, color: C.accentForeground }}
                        title="同じ条件で再広告"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        再開
                      </motion.button>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Create Contract Modal (タイトルなし / PCひと回り大きく) */}
      <CustomModal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        size="lg"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">プランタイプ</label>
            <select
              value={planType}
              onChange={(e) => setPlanType(e.target.value as PlanType)}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-900 focus:outline-none focus:border-brass-500"
            >
              {(Object.keys(PLAN_LABELS) as PlanType[]).map((k) => (
                <option key={k} value={k}>{PLAN_LABELS[k]}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">開始日</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-900 focus:outline-none focus:border-brass-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">終了日</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                disabled={planType !== 'custom'}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-900 focus:outline-none focus:border-brass-500 disabled:opacity-60"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">金額（円）</label>
            <input
              type="text"
              inputMode="numeric"
              value={amount}
              onChange={(e) => {
                const v = e.target.value.replace(/[^0-9]/g, '');
                setAmount(v === '' ? 0 : Number(v));
              }}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-900 focus:outline-none focus:border-brass-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">備考</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-900 focus:outline-none focus:border-brass-500 resize-none"
              rows={2}
            />
          </div>
          <div className="flex gap-2 pt-2">
            <button
              onClick={() => setCreateOpen(false)}
              className="flex-1 py-2.5 rounded-lg text-sm font-medium border border-gray-200 text-gray-600 hover:bg-gray-50"
            >
              キャンセル
            </button>
            <button
              onClick={handleCreate}
              disabled={saving}
              className="flex-1 py-2.5 rounded-lg text-sm font-semibold disabled:opacity-50"
              style={{ background: C.accent, color: C.accentForeground }}
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : '作成'}
            </button>
          </div>
        </div>
      </CustomModal>

      {/* Renew Contract Modal (タイトルなし / PCひと回り大きく) */}
      <CustomModal
        isOpen={renewOpen}
        onClose={() => setRenewOpen(false)}
        size="lg"
        description="元契約の金額・備考・広告枠・クリエイティブをそのまま引き継いで、新しい期間の契約を作成します。"
      >
        <div className="space-y-4">
          {renewTarget && (
            <div className="p-3 rounded-lg text-xs" style={{ background: C.bgCard, border: `1px solid ${C.border}`, color: C.textMuted }}>
              <div>元契約: {PLAN_LABELS[renewTarget.plan_type as PlanType]} ({renewTarget.start_date} 〜 {renewTarget.end_date})</div>
              {renewTarget.price != null && <div>金額: ¥{Number(renewTarget.price).toLocaleString()}</div>}
            </div>
          )}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">プランタイプ</label>
            <select
              value={renewPlanType}
              onChange={(e) => setRenewPlanType(e.target.value as PlanType)}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-900 focus:outline-none focus:border-brass-500"
            >
              {(Object.keys(PLAN_LABELS) as PlanType[]).map((k) => (
                <option key={k} value={k}>{PLAN_LABELS[k]}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">開始日</label>
              <input
                type="date"
                value={renewStartDate}
                onChange={(e) => setRenewStartDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-900 focus:outline-none focus:border-brass-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">終了日</label>
              <input
                type="date"
                value={renewEndDate}
                onChange={(e) => setRenewEndDate(e.target.value)}
                disabled={renewPlanType !== 'custom'}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-900 focus:outline-none focus:border-brass-500 disabled:opacity-60"
              />
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <button
              onClick={() => setRenewOpen(false)}
              className="flex-1 py-2.5 rounded-lg text-sm font-medium border border-gray-200 text-gray-600 hover:bg-gray-50"
            >
              キャンセル
            </button>
            <button
              onClick={handleRenew}
              disabled={saving}
              className="flex-1 py-2.5 rounded-lg text-sm font-semibold disabled:opacity-50"
              style={{ background: C.accent, color: C.accentForeground }}
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : '再開する'}
            </button>
          </div>
        </div>
      </CustomModal>

      {/* Cancel Confirm Modal */}
      <CustomModal
        isOpen={cancelOpen}
        onClose={() => setCancelOpen(false)}
        title="契約キャンセル"
        description="この契約をキャンセルしますか？"
      >
        <div className="flex gap-2 pt-4">
          <button
            onClick={() => setCancelOpen(false)}
            className="flex-1 py-2.5 rounded-lg text-sm font-medium border border-gray-200 text-gray-600 hover:bg-gray-50"
          >
            戻る
          </button>
          <button
            onClick={handleCancel}
            disabled={saving}
            className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-destructive-foreground bg-destructive hover:bg-destructive/90 disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'キャンセルする'}
          </button>
        </div>
      </CustomModal>
    </div>
  );
}
