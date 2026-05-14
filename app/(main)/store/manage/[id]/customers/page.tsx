'use client';

/**
 * 店舗管理「顧客データ」画面
 * - チェックインしたユーザーごとに 来店回数 / 最終来店 / 来店頻度 を集計表示
 * - CSV エクスポート可能
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Users,
  Loader2,
  Search,
  Download,
  User as UserIcon,
  Calendar,
  TrendingUp,
  MessageCircle,
  Filter,
  Save,
  StickyNote,
} from 'lucide-react';
import { useAuth } from '@/lib/auth/context';
import { useAppMode } from '@/lib/app-mode-context';
import { supabase } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { CloseCircleButton } from '@/components/ui/close-circle-button';
import { CustomModal } from '@/components/ui/custom-modal';
import { LoadingScreen } from '@/components/ui/loading-screen';
import { toast } from 'sonner';
import type { StoreCustomerMemo, StoreCustomerRow } from '@/lib/types/store-customer';

const GENDER_LABEL: Record<string, string> = {
  female: '女性',
  male: '男性',
  other: 'その他',
  prefer_not_to_say: '未回答',
};

function fmt(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleString('ja-JP', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

function fmtRelative(iso: string): string {
  const days = Math.floor(
    (Date.now() - new Date(iso).getTime()) / (24 * 60 * 60 * 1000)
  );
  if (days <= 0) return '今日';
  if (days === 1) return '昨日';
  if (days < 7) return `${days}日前`;
  if (days < 30) return `${Math.floor(days / 7)}週間前`;
  if (days < 365) return `${Math.floor(days / 30)}ヶ月前`;
  return `${Math.floor(days / 365)}年前`;
}

function jstDateKey(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

function daysSince(iso: string): number {
  const ms = new Date(iso).getTime();
  if (!Number.isFinite(ms)) return Number.POSITIVE_INFINITY;
  return Math.floor((Date.now() - ms) / (24 * 60 * 60 * 1000));
}

type DateFilter = 'all' | 'today' | '7d' | '30d';

export default function StoreCustomersPage() {
  const params = useParams();
  const router = useRouter();
  const storeId = Array.isArray(params.id) ? params.id[0] : (params.id as string);
  const { user, accountType, store, loading: authLoading } = useAuth();
  const { colorsB: COLORS } = useAppMode();

  const [customers, setCustomers] = useState<StoreCustomerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [minVisits, setMinVisits] = useState(1);
  const [exporting, setExporting] = useState(false);
  const [selected, setSelected] = useState<StoreCustomerRow | null>(null);
  const [memoDraft, setMemoDraft] = useState({
    order_notes: '',
    preference_notes: '',
    conversation_notes: '',
  });
  const [savingMemo, setSavingMemo] = useState(false);

  const isAuthorized = useMemo(() => {
    if (authLoading || !user) return false;
    if (accountType === 'platform') return true;
    if (accountType === 'store' && store?.id === storeId) return true;
    return false;
  }, [authLoading, user, accountType, store, storeId]);

  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;
    const prevRoot = root.style.background;
    const prevBody = body.style.background;
    const bg = COLORS.cardGradient;
    root.style.background = bg;
    body.style.background = bg;
    return () => {
      root.style.background = prevRoot;
      body.style.background = prevBody;
    };
  }, [COLORS.cardGradient]);

  const fetchCustomers = useCallback(async () => {
    if (!isAuthorized) return;
    try {
      setLoading(true);
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error('session_missing');
      const res = await fetch(`/api/stores/${storeId}/customers?t=${Date.now()}`, {
        cache: 'no-store',
        headers: {
          Authorization: `Bearer ${token}`,
          'Cache-Control': 'no-cache',
          Pragma: 'no-cache',
        },
      });
      if (!res.ok) {
        throw new Error(`fetch_failed:${res.status}`);
      }
      const json = (await res.json()) as { customers: StoreCustomerRow[] };
      setCustomers(json.customers ?? []);
      setSelected((current) => {
        if (!current) return null;
        return (
          (json.customers ?? []).find((customer) => customer.user_id === current.user_id) ??
          null
        );
      });
    } catch (err) {
      console.error('[customers] fetch error', err);
      setCustomers([]);
      toast.error('顧客データの取得に失敗しました', { position: 'top-center' });
    } finally {
      setLoading(false);
    }
  }, [isAuthorized, storeId]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error('session_missing');
      const res = await fetch(`/api/stores/${storeId}/customers/export?t=${Date.now()}`, {
        cache: 'no-store',
        headers: {
          Authorization: `Bearer ${token}`,
          'Cache-Control': 'no-cache',
          Pragma: 'no-cache',
        },
      });
      if (!res.ok) throw new Error(`export_failed:${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const date = new Date().toISOString().split('T')[0];
      a.download = `customers_${date}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('CSVをダウンロードしました', { position: 'top-center', duration: 1500 });
    } catch (err) {
      console.error('[customers] export error', err);
      toast.error('CSVエクスポートに失敗しました', { position: 'top-center' });
    } finally {
      setExporting(false);
    }
  };

  const filtered = useMemo(() => {
    const todayKey = jstDateKey(new Date().toISOString());
    const q = searchQuery.toLowerCase();
    return customers.filter((c) => {
      if (searchQuery) {
        const memoText = [
          c.memo?.order_notes,
          c.memo?.preference_notes,
          c.memo?.conversation_notes,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        const matches =
          c.display_name.toLowerCase().includes(q) ||
          (c.attributes.address || '').toLowerCase().includes(q) ||
          (c.attributes.occupation || '').toLowerCase().includes(q) ||
          memoText.includes(q);
        if (!matches) return false;
      }

      if (c.visit_count < minVisits) return false;

      if (dateFilter === 'today') return jstDateKey(c.last_visit_at) === todayKey;
      if (dateFilter === '7d') return daysSince(c.last_visit_at) < 7;
      if (dateFilter === '30d') return daysSince(c.last_visit_at) < 30;
      return true;
    });
  }, [customers, searchQuery, dateFilter, minVisits]);

  const handleSelectCustomer = (customer: StoreCustomerRow) => {
    setSelected(customer);
    setMemoDraft({
      order_notes: customer.memo?.order_notes ?? '',
      preference_notes: customer.memo?.preference_notes ?? '',
      conversation_notes: customer.memo?.conversation_notes ?? '',
    });
  };

  const updateSelectedMemo = (memo: StoreCustomerMemo) => {
    setCustomers((prev) =>
      prev.map((customer) =>
        customer.user_id === memo.user_id ? { ...customer, memo } : customer
      )
    );
    setSelected((current) =>
      current && current.user_id === memo.user_id ? { ...current, memo } : current
    );
  };

  const handleSaveMemo = async () => {
    if (!selected) return;
    setSavingMemo(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error('session_missing');
      const res = await fetch(
        `/api/stores/${storeId}/customers/${selected.user_id}/memo`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(memoDraft),
        }
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (json?.error === 'table_missing') {
          toast.error('顧客メモ用テーブルが未作成です', {
            description: 'docs/database-events-and-customer-notes.sql を適用してください',
            position: 'top-center',
          });
          return;
        }
        throw new Error(json?.error ?? `save_failed:${res.status}`);
      }
      updateSelectedMemo(json.memo as StoreCustomerMemo);
      toast.success('顧客メモを保存しました', { position: 'top-center', duration: 1400 });
    } catch (err) {
      console.error('[customers] save memo error', err);
      toast.error('顧客メモの保存に失敗しました', { position: 'top-center' });
    } finally {
      setSavingMemo(false);
    }
  };

  if (authLoading) return <LoadingScreen />;
  if (!isAuthorized) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center" style={{ background: COLORS.cardGradient }}>
        <p className="text-sm" style={{ color: COLORS.deepNavy }}>
          このページを表示する権限がありません
        </p>
      </div>
    );
  }

  const totalVisits = customers.reduce((sum, c) => sum + c.visit_count, 0);
  const repeatCount = customers.filter((c) => c.visit_count >= 2).length;
  const filteredVisits = filtered.reduce((sum, c) => sum + c.visit_count, 0);

  return (
    <div className="min-h-[100dvh] pb-20" style={{ background: COLORS.cardGradient }}>
      <header
        className="sticky top-0 z-20 safe-top"
        style={{
          background: COLORS.luxuryGradient,
          borderBottom: `1px solid rgba(201, 168, 108, 0.2)`,
        }}
      >
        <div className="flex items-center justify-center p-4 relative">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-light tracking-widest" style={{ color: COLORS.ivory }}>
              顧客データ
            </h1>
          </div>
          <CloseCircleButton
            type="button"
            size="lg"
            onClick={() => router.push(`/store/manage/${storeId}/engagement`)}
            className="absolute right-4"
            aria-label="閉じる"
          />
        </div>
      </header>

      <div className="max-w-3xl mx-auto p-4">
        {/* サマリー */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-3 gap-3 mb-4"
        >
          <Card className="p-3 rounded-xl shadow-sm" style={{ background: '#FFFFFF', border: `1px solid rgba(201, 168, 108, 0.15)` }}>
            <p className="text-[10px] font-medium" style={{ color: COLORS.warmGray }}>ユニーク顧客</p>
            <p className="text-2xl font-bold" style={{ color: COLORS.deepNavy }}>{customers.length}</p>
          </Card>
          <Card className="p-3 rounded-xl shadow-sm" style={{ background: '#FFFFFF', border: `1px solid rgba(201, 168, 108, 0.15)` }}>
            <p className="text-[10px] font-medium" style={{ color: COLORS.warmGray }}>総来店回数</p>
            <p className="text-2xl font-bold" style={{ color: COLORS.deepNavy }}>{totalVisits}</p>
          </Card>
          <Card className="p-3 rounded-xl shadow-sm" style={{ background: '#FFFFFF', border: `1px solid rgba(201, 168, 108, 0.15)` }}>
            <p className="text-[10px] font-medium" style={{ color: COLORS.warmGray }}>リピーター</p>
            <p className="text-2xl font-bold" style={{ color: COLORS.deepNavy }}>{repeatCount}</p>
          </Card>
        </motion.div>

        {/* 検索 + エクスポート */}
        <div className="space-y-3 mb-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
                style={{ color: COLORS.warmGray }}
              />
              <Input
                type="text"
                placeholder="名前・エリア・職業・メモで検索"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-10 rounded-xl"
                style={{ background: '#FFFFFF', border: `1px solid rgba(201, 168, 108, 0.25)`, fontSize: '14px' }}
              />
            </div>
            <Button
              onClick={handleExport}
              disabled={exporting || customers.length === 0}
              className="h-10 px-4 rounded-xl font-semibold whitespace-nowrap"
              style={{
                background: COLORS.deepNavy,
                color: COLORS.ivory,
              }}
            >
              {exporting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Download className="w-4 h-4 mr-1.5" />
                  CSV
                </>
              )}
            </Button>
          </div>

          <Card
            className="p-3 rounded-xl"
            style={{ background: '#FFFFFF', border: `1px solid rgba(201, 168, 108, 0.15)` }}
          >
            <div className="flex items-center gap-2 mb-2">
              <Filter className="w-4 h-4" style={{ color: COLORS.champagneGold }} />
              <p className="text-xs font-bold" style={{ color: COLORS.deepNavy }}>フィルター</p>
              <p className="ml-auto text-[11px]" style={{ color: COLORS.warmGray }}>
                表示 {filtered.length}名 / 来店 {filteredVisits}回
              </p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
              {[
                { value: 'all', label: '全期間' },
                { value: 'today', label: '本日' },
                { value: '7d', label: '直近7日' },
                { value: '30d', label: '直近30日' },
              ].map((option) => {
                const active = dateFilter === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setDateFilter(option.value as DateFilter)}
                    className="h-9 rounded-lg text-xs font-bold transition-colors"
                    style={{
                      background: active ? COLORS.deepNavy : 'rgba(19, 41, 75, 0.04)',
                      color: active ? COLORS.ivory : COLORS.deepNavy,
                      border: `1px solid ${active ? COLORS.deepNavy : 'rgba(19, 41, 75, 0.08)'}`,
                    }}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold whitespace-nowrap" style={{ color: COLORS.warmGray }}>
                来店回数
              </span>
              {[1, 2, 5, 10].map((count) => {
                const active = minVisits === count;
                return (
                  <button
                    key={count}
                    type="button"
                    onClick={() => setMinVisits(count)}
                    className="h-8 px-3 rounded-lg text-xs font-bold"
                    style={{
                      background: active ? 'rgba(201, 168, 108, 0.18)' : 'rgba(19, 41, 75, 0.04)',
                      color: active ? COLORS.deepNavy : COLORS.warmGray,
                      border: `1px solid ${active ? 'rgba(201, 168, 108, 0.55)' : 'rgba(19, 41, 75, 0.08)'}`,
                    }}
                  >
                    {count}回〜
                  </button>
                );
              })}
            </div>
          </Card>
        </div>

        {/* リスト */}
        {loading ? (
          <div className="flex flex-col items-center gap-3 py-16">
            <Loader2 className="w-7 h-7 animate-spin" style={{ color: COLORS.champagneGold }} />
            <p className="text-xs" style={{ color: COLORS.warmGray }}>読み込み中...</p>
          </div>
        ) : filtered.length === 0 ? (
          <Card className="p-8 rounded-2xl text-center" style={{ background: '#FFFFFF', border: `1px solid rgba(201, 168, 108, 0.15)` }}>
            <Users className="w-10 h-10 mx-auto mb-3" style={{ color: COLORS.warmGray }} />
            <p className="text-sm font-medium mb-1" style={{ color: COLORS.deepNavy }}>
              {customers.length === 0 ? 'まだ来店履歴がありません' : '該当する顧客がいません'}
            </p>
            <p className="text-xs" style={{ color: COLORS.warmGray }}>
              {customers.length === 0
                ? 'スタッフがお客様のQRをスキャンすると、ここに来店履歴が表示されます'
                : '検索条件を変更してください'}
            </p>
          </Card>
        ) : (
          <div className="space-y-2">
            {filtered.map((c, idx) => (
              <motion.button
                key={c.user_id}
                type="button"
                onClick={() => handleSelectCustomer(c)}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(idx * 0.02, 0.3) }}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                className="text-left w-full"
              >
                <Card
                  className="p-3 rounded-xl cursor-pointer flex items-center gap-3"
                  style={{ background: '#FFFFFF', border: `1px solid rgba(201, 168, 108, 0.15)` }}
                >
                  <div
                    className="w-11 h-11 rounded-full flex-shrink-0 flex items-center justify-center overflow-hidden"
                    style={{ background: c.avatar_url ? 'transparent' : 'rgba(201, 168, 108, 0.12)' }}
                  >
                    {c.avatar_url ? (
                      <img src={c.avatar_url} alt="" className="w-full h-full object-cover" loading="lazy" />
                    ) : (
                      <UserIcon className="w-5 h-5" style={{ color: COLORS.champagneGold }} />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <p className="text-sm font-bold truncate" style={{ color: COLORS.deepNavy }}>
                        {c.display_name}
                      </p>
                      {c.line_linked && (
                        <span
                          className="text-[10px] font-semibold px-1.5 py-0.5 rounded flex-shrink-0"
                          style={{ background: 'rgba(62, 142, 107, 0.12)', color: '#3E8E6B' }}
                        >
                          LINE
                        </span>
                      )}
                      {c.memo && (
                        <span
                          className="text-[10px] font-semibold px-1.5 py-0.5 rounded flex-shrink-0 inline-flex items-center gap-1"
                          style={{ background: 'rgba(201, 168, 108, 0.14)', color: COLORS.deepNavy }}
                        >
                          <StickyNote className="w-3 h-3" />
                          メモ
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-[11px] flex items-center gap-1" style={{ color: COLORS.warmGray }}>
                        <Calendar className="w-3 h-3" />
                        最終: {fmtRelative(c.last_visit_at)}
                      </span>
                      <span className="text-[11px] flex items-center gap-1" style={{ color: COLORS.warmGray }}>
                        <TrendingUp className="w-3 h-3" />
                        週{c.visits_per_week}回
                      </span>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xl font-bold leading-none" style={{ color: COLORS.deepNavy }}>
                      {c.visit_count}
                    </p>
                    <p className="text-[10px] mt-0.5" style={{ color: COLORS.warmGray }}>来店回数</p>
                  </div>
                </Card>
              </motion.button>
            ))}
          </div>
        )}
      </div>

      {/* 詳細モーダル */}
      <CustomModal
        isOpen={!!selected}
        onClose={() => setSelected(null)}
        title={selected?.display_name || '顧客詳細'}
      >
        {selected && (
          <div className="space-y-3 text-sm" style={{ color: '#13294b' }}>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs font-semibold opacity-70">来店回数</p>
                <p className="text-2xl font-bold">{selected.visit_count}</p>
              </div>
              <div>
                <p className="text-xs font-semibold opacity-70">直近30日来店</p>
                <p className="text-2xl font-bold">{selected.visit_count_30d}</p>
              </div>
              <div>
                <p className="text-xs font-semibold opacity-70">初回来店</p>
                <p className="font-semibold">{fmt(selected.first_visit_at)}</p>
              </div>
              <div>
                <p className="text-xs font-semibold opacity-70">最終来店</p>
                <p className="font-semibold">{fmt(selected.last_visit_at)}</p>
              </div>
              <div>
                <p className="text-xs font-semibold opacity-70">週あたり来店頻度</p>
                <p className="font-semibold">{selected.visits_per_week} 回 / 週</p>
              </div>
              <div>
                <p className="text-xs font-semibold opacity-70">LINE連携</p>
                {selected.line_linked ? (
                  <span className="font-semibold flex items-center gap-1">
                    <MessageCircle className="w-4 h-4" style={{ color: '#3E8E6B' }} />
                    連携済
                  </span>
                ) : (
                  <span className="opacity-60">未連携</span>
                )}
              </div>
            </div>
            <div className="pt-3 border-t" style={{ borderColor: 'rgba(19, 41, 75, 0.1)' }}>
              <p className="text-xs font-semibold opacity-70 mb-1.5">プロフィール属性</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="opacity-60">エリア:</span>{' '}
                  <span className="font-semibold">{selected.attributes.address || '—'}</span>
                </div>
                <div>
                  <span className="opacity-60">年齢:</span>{' '}
                  <span className="font-semibold">{selected.attributes.age || '—'}</span>
                </div>
                <div>
                  <span className="opacity-60">職業:</span>{' '}
                  <span className="font-semibold">{selected.attributes.occupation || '—'}</span>
                </div>
                <div>
                  <span className="opacity-60">性別:</span>{' '}
                  <span className="font-semibold">
                    {GENDER_LABEL[selected.attributes.gender || ''] || selected.attributes.gender || '—'}
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t" style={{ borderColor: 'rgba(19, 41, 75, 0.1)' }}>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold opacity-70">店舗メモ</p>
                {selected.memo?.updated_at && (
                  <span className="text-[10px] opacity-50">
                    更新: {fmt(selected.memo.updated_at)}
                  </span>
                )}
              </div>
              <div className="space-y-3">
                <label className="block">
                  <span className="block text-[11px] font-bold mb-1 opacity-70">
                    注文履歴・よく頼むもの
                  </span>
                  <Textarea
                    value={memoDraft.order_notes}
                    onChange={(e) =>
                      setMemoDraft((prev) => ({ ...prev, order_notes: e.target.value }))
                    }
                    placeholder="例: 初回はハイボール、前回は焼酎ロック。締めに軽いおつまみを注文。"
                    className="min-h-[72px] resize-y"
                    maxLength={4000}
                  />
                </label>
                <label className="block">
                  <span className="block text-[11px] font-bold mb-1 opacity-70">
                    好み・苦手なもの
                  </span>
                  <Textarea
                    value={memoDraft.preference_notes}
                    onChange={(e) =>
                      setMemoDraft((prev) => ({
                        ...prev,
                        preference_notes: e.target.value,
                      }))
                    }
                    placeholder="例: 甘くないお酒が好き。辛い料理は苦手。カウンター席を好む。"
                    className="min-h-[72px] resize-y"
                    maxLength={4000}
                  />
                </label>
                <label className="block">
                  <span className="block text-[11px] font-bold mb-1 opacity-70">
                    接客・会話メモ
                  </span>
                  <Textarea
                    value={memoDraft.conversation_notes}
                    onChange={(e) =>
                      setMemoDraft((prev) => ({
                        ...prev,
                        conversation_notes: e.target.value,
                      }))
                    }
                    placeholder="例: 出張で月1回来店。静かに飲みたいタイプ。大分の日本酒に興味あり。"
                    className="min-h-[72px] resize-y"
                    maxLength={4000}
                  />
                </label>
                <Button
                  onClick={handleSaveMemo}
                  disabled={savingMemo}
                  className="w-full rounded-xl font-bold"
                  style={{ background: COLORS.goldGradient, color: COLORS.deepNavy }}
                >
                  {savingMemo ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  メモを保存
                </Button>
              </div>
            </div>
          </div>
        )}
      </CustomModal>
    </div>
  );
}
