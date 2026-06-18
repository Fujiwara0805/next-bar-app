'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  BarChart3,
  CalendarDays,
  CheckCircle2,
  Edit,
  ImageIcon,
  Loader2,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAdminTheme } from '@/lib/admin-theme-context';
import { useAuth } from '@/lib/auth/context';
import { supabase } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { CustomModal } from '@/components/ui/custom-modal';
import { AdminDataTable, type AdminColumn } from '@/components/admin/admin-data-table';
import { AdminKpiCard, AdminKpiGrid, getKpiGradient } from '@/components/admin/admin-kpi-card';
import { AdminStatusBadge } from '@/components/admin/admin-status-badge';
import type { PlatformEvent, PlatformEventStatus } from '@/lib/types/platform-event';

type FormState = {
  title: string;
  organizer_name: string;
  description: string;
  area_label: string;
  start_at: string;
  end_at: string;
  image_url: string;
  external_url: string;
  status: PlatformEventStatus;
  stamp_enabled: boolean;
  stamp_goal: string;
  stamp_reward_text: string;
  cost_total: string;
};

const emptyForm: FormState = {
  title: '',
  organizer_name: '',
  description: '',
  area_label: '',
  start_at: '',
  end_at: '',
  image_url: '',
  external_url: '',
  status: 'draft',
  stamp_enabled: true,
  stamp_goal: '3',
  stamp_reward_text: '',
  cost_total: '',
};

function toDateInputValue(iso: string | null): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (!Number.isFinite(date.getTime())) return '';
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function fmt(iso: string | null): string {
  if (!iso) return '未設定';
  const date = new Date(iso);
  if (!Number.isFinite(date.getTime())) return '未設定';
  return date.toLocaleDateString('ja-JP', {
    timeZone: 'Asia/Tokyo',
    month: '2-digit',
    day: '2-digit',
  });
}

function statusBadge(status: PlatformEventStatus) {
  if (status === 'published') return { label: '公開中', variant: 'success' as const };
  if (status === 'archived') return { label: '終了', variant: 'neutral' as const };
  return { label: '下書き', variant: 'warning' as const };
}

export default function PlatformEventsPage() {
  const { colors: C } = useAdminTheme();
  const router = useRouter();
  const { session, loading: authLoading } = useAuth();
  const accessToken = session?.access_token;
  const [events, setEvents] = useState<PlatformEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<PlatformEvent | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [uploadingImage, setUploadingImage] = useState(false);
  const imageInputRef = useRef<HTMLInputElement | null>(null);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      if (!accessToken) throw new Error('session_missing');
      const res = await fetch('/api/platform/events', {
        cache: 'no-store',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) throw new Error(`fetch_failed:${res.status}`);
      const json = await res.json();
      setEvents(json.events ?? []);
    } catch (err) {
      console.error('[events] fetch error', err);
      toast.error('イベント一覧の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    if (authLoading) return;
    if (!accessToken) {
      setLoading(false);
      return;
    }
    fetchEvents();
  }, [authLoading, accessToken, fetchEvents]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    if (!q) return events;
    return events.filter((event) =>
      [
        event.title,
        event.organizer_name,
        event.area_label,
        event.description,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(q)
    );
  }, [events, query]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setFormOpen(true);
  };

  const openEdit = (event: PlatformEvent) => {
    setEditing(event);
    setForm({
      title: event.title,
      organizer_name: event.organizer_name ?? '',
      description: event.description ?? '',
      area_label: event.area_label ?? '',
      start_at: toDateInputValue(event.start_at),
      end_at: toDateInputValue(event.end_at),
      image_url: event.image_url ?? '',
      external_url: event.external_url ?? '',
      status: event.status,
      stamp_enabled: event.stamp_enabled ?? true,
      stamp_goal: String(event.stamp_goal ?? 3),
      stamp_reward_text: event.stamp_reward_text ?? '',
      cost_total: event.cost_total != null ? String(event.cost_total) : '',
    });
    setFormOpen(true);
  };

  const uploadEventImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('画像ファイルを選択してください');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('画像は10MB以下にしてください');
      return;
    }

    setUploadingImage(true);
    try {
      const fileExt = file.name.split('.').pop() || 'jpg';
      const fileName = `event-images/${crypto.randomUUID()}/${Date.now()}.${fileExt}`;
      const { error } = await supabase.storage
        .from('store-images')
        .upload(fileName, file, { cacheControl: '3600', upsert: false });
      if (error) throw error;

      const {
        data: { publicUrl },
      } = supabase.storage.from('store-images').getPublicUrl(fileName);

      setForm((prev) => ({ ...prev, image_url: publicUrl }));
      toast.success('画像をアップロードしました');
    } catch (err) {
      console.error('[events] image upload error', err);
      toast.error('画像のアップロードに失敗しました');
    } finally {
      setUploadingImage(false);
      if (imageInputRef.current) imageInputRef.current.value = '';
    }
  };

  const clearEventImage = () => {
    setForm((prev) => ({ ...prev, image_url: '' }));
    if (imageInputRef.current) imageInputRef.current.value = '';
  };

  const saveEvent = async () => {
    if (!form.title.trim()) {
      toast.error('イベント名を入力してください');
      return;
    }
    setSaving(true);
    try {
      if (!accessToken) throw new Error('session_missing');
      const res = await fetch(
        editing ? `/api/platform/events/${editing.id}` : '/api/platform/events',
        {
          method: editing ? 'PATCH' : 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify(form),
        }
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (json?.error === 'table_missing') {
          toast.error('イベント用テーブルが未作成です', {
            description: 'docs/database-events-and-customer-notes.sql を適用してください',
          });
          return;
        }
        throw new Error(json?.error ?? `save_failed:${res.status}`);
      }
      toast.success(editing ? 'イベントを更新しました' : 'イベントを追加しました');
      setFormOpen(false);
      await fetchEvents();
    } catch (err) {
      console.error('[events] save error', err);
      toast.error('イベントの保存に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  const deleteEvent = async (event: PlatformEvent) => {
    if (!window.confirm(`${event.title} を削除しますか？`)) return;
    setDeletingId(event.id);
    try {
      if (!accessToken) throw new Error('session_missing');
      const res = await fetch(`/api/platform/events/${event.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) throw new Error(`delete_failed:${res.status}`);
      toast.success('イベントを削除しました');
      setEvents((prev) => prev.filter((row) => row.id !== event.id));
    } catch (err) {
      console.error('[events] delete error', err);
      toast.error('イベントの削除に失敗しました');
    } finally {
      setDeletingId(null);
    }
  };

  const columns: AdminColumn<PlatformEvent>[] = [
    {
      key: 'event',
      header: 'イベント',
      width: '2fr',
      render: (event) => (
        <div className="min-w-0">
          <p className="text-sm font-semibold truncate" style={{ color: C.text }}>
            {event.title}
          </p>
          <p className="text-xs truncate" style={{ color: C.textSubtle }}>
            {event.organizer_name || '主催未設定'} / {event.area_label || 'エリア未設定'}
          </p>
        </div>
      ),
    },
    {
      key: 'period',
      header: '期間',
      width: '1.4fr',
      render: (event) => (
        <span className="text-xs" style={{ color: C.textMuted }}>
          {fmt(event.start_at)} - {fmt(event.end_at)}
        </span>
      ),
    },
    {
      key: 'status',
      header: '状態',
      width: '110px',
      render: (event) => {
        const badge = statusBadge(event.status);
        return <AdminStatusBadge label={badge.label} variant={badge.variant} dot />;
      },
    },
    {
      key: 'actions',
      header: '',
      width: '136px',
      render: (event) => (
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            title="費用対効果"
            onClick={() => router.push(`/store/manage/events/${event.id}/roi`)}
            className="p-1.5 rounded-md"
            style={{ color: C.info }}
          >
            <BarChart3 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => openEdit(event)}
            className="p-1.5 rounded-md"
            style={{ color: C.accent }}
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => deleteEvent(event)}
            className="p-1.5 rounded-md"
            style={{ color: C.danger }}
          >
            {deletingId === event.id ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4" />
            )}
          </button>
        </div>
      ),
    },
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: C.bg }}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: C.accent }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: C.bg }}>
      <div className="max-w-6xl mx-auto px-6 md:px-8 py-8 space-y-6">
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight" style={{ color: C.text }}>イベント管理</h1>
            <p className="text-sm mt-1" style={{ color: C.textSubtle }}>自治体・地域イベントを追加し、加盟店の参加設定へ公開します</p>
          </div>
          <button
            type="button"
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold"
            style={{ background: C.accent, color: C.accentForeground }}
          >
            <Plus className="w-4 h-4" />
            新規イベント
          </button>
        </motion.div>

        <AdminKpiGrid>
          <AdminKpiCard icon={CalendarDays} label="全イベント" value={events.length} gradient={getKpiGradient('gold')} index={0} />
          <AdminKpiCard icon={CheckCircle2} label="公開中" value={events.filter((event) => event.status === 'published').length} gradient={getKpiGradient('green')} index={1} />
        </AdminKpiGrid>

        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: C.textSubtle }} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="イベント名・主催・エリアで検索..."
            className="w-full pl-10 pr-4 py-2.5 rounded-lg text-sm outline-none"
            style={{ background: C.bgInput, border: `1px solid ${C.border}`, color: C.text }}
          />
        </div>

        <AdminDataTable
          columns={columns}
          data={filtered}
          keyExtractor={(event) => event.id}
          onRowClick={openEdit}
          emptyIcon={<CalendarDays className="w-12 h-12" style={{ color: C.textSubtle }} />}
          emptyTitle="イベントがありません"
          emptyDescription="自治体イベントや地域企画を追加してください"
          mobileCardRender={(event) => {
            const badge = statusBadge(event.status);
            return (
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold" style={{ color: C.text }}>{event.title}</p>
                    <p className="text-xs mt-1" style={{ color: C.textSubtle }}>{fmt(event.start_at)} - {fmt(event.end_at)}</p>
                  </div>
                  <AdminStatusBadge label={badge.label} variant={badge.variant} dot />
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    router.push(`/store/manage/events/${event.id}/roi`);
                  }}
                  className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold"
                  style={{ color: C.info }}
                >
                  <BarChart3 className="w-3.5 h-3.5" /> 費用対効果を見る
                </button>
              </div>
            );
          }}
        />
      </div>

      <CustomModal
        isOpen={formOpen}
        onClose={() => !saving && setFormOpen(false)}
      >
        <div className="space-y-3" style={{ color: '#13294b' }}>
          <Input placeholder="イベント名" value={form.title} onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))} />
          <div className="grid grid-cols-2 gap-2">
            <Input placeholder="主催者・自治体名" value={form.organizer_name} onChange={(e) => setForm((prev) => ({ ...prev, organizer_name: e.target.value }))} />
            <Input placeholder="対象エリア" value={form.area_label} onChange={(e) => setForm((prev) => ({ ...prev, area_label: e.target.value }))} />
          </div>
          <Textarea placeholder="イベント説明" value={form.description} onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))} className="min-h-[100px]" />
          <div className="grid grid-cols-2 gap-2">
            <Input type="date" value={form.start_at} onChange={(e) => setForm((prev) => ({ ...prev, start_at: e.target.value }))} />
            <Input type="date" value={form.end_at} onChange={(e) => setForm((prev) => ({ ...prev, end_at: e.target.value }))} />
          </div>
          {/* 費用対効果（ROI）用のイベント総費用 */}
          <div className="rounded-lg border p-3 space-y-1.5" style={{ borderColor: '#DCE1EB', background: '#F7F8FA' }}>
            <span className="text-sm font-bold" style={{ color: '#13294b' }}>💰 イベント費用（円）</span>
            <Input
              type="number"
              min={0}
              inputMode="numeric"
              placeholder="例: 150000"
              value={form.cost_total}
              onChange={(e) => setForm((prev) => ({ ...prev, cost_total: e.target.value }))}
            />
            <p className="text-[11px] leading-relaxed" style={{ color: '#7a6b50' }}>
              チラシ・紙クーポン・広告などの総費用。費用対効果レポート（コスト/チェックイン・コスト/消込）の算出に使用します。
            </p>
          </div>
          {/* スタンプラリー設定（回遊×特典） */}
          <div className="rounded-lg border p-3 space-y-2" style={{ borderColor: '#d6c19a', background: '#fffaf0' }}>
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold" style={{ color: '#13294b' }}>
                🎫 スタンプラリー
              </span>
              <label className="inline-flex items-center gap-1.5 text-xs font-semibold cursor-pointer" style={{ color: '#13294b' }}>
                <input
                  type="checkbox"
                  checked={form.stamp_enabled}
                  onChange={(e) => setForm((prev) => ({ ...prev, stamp_enabled: e.target.checked }))}
                />
                有効にする
              </label>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold whitespace-nowrap" style={{ color: '#7a6b50' }}>ゴール店舗数</span>
              <Input
                type="number"
                min={1}
                max={20}
                value={form.stamp_goal}
                disabled={!form.stamp_enabled}
                onChange={(e) => setForm((prev) => ({ ...prev, stamp_goal: e.target.value }))}
                className="w-24"
              />
            </div>
            <Input
              placeholder="コンプリート特典（例: ドリンク1杯無料）"
              value={form.stamp_reward_text}
              disabled={!form.stamp_enabled}
              maxLength={200}
              onChange={(e) => setForm((prev) => ({ ...prev, stamp_reward_text: e.target.value }))}
            />
            <p className="text-[11px] leading-relaxed" style={{ color: '#7a6b50' }}>
              参加店を {form.stamp_goal || '—'} 店チェックインでコンプリート → 特典をアンロック（来店QR／会員証QRで記録）。
            </p>
          </div>
          <div className="space-y-2">
            {form.image_url ? (
              <div className="relative overflow-hidden rounded-lg border" style={{ borderColor: '#d6c19a' }}>
                <img src={form.image_url} alt="イベント画像" className="aspect-[16/9] w-full object-cover" />
                <button
                  type="button"
                  onClick={clearEventImage}
                  className="absolute right-2 top-2 rounded-full p-1.5"
                  style={{ background: 'rgba(19, 41, 75, 0.9)', color: '#ffc82c' }}
                  aria-label="画像を削除"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => imageInputRef.current?.click()}
                disabled={uploadingImage}
                className="flex aspect-[16/9] w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed text-sm font-bold disabled:opacity-60"
                style={{ borderColor: '#d6c19a', color: '#13294b', background: '#fffaf0' }}
              >
                {uploadingImage ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <ImageIcon className="h-5 w-5" />
                )}
                イベント画像をアップロード
              </button>
            )}
            <p className="text-[11px] font-medium leading-relaxed" style={{ color: '#7a6b50' }}>
              推奨サイズ: <strong style={{ color: '#13294b' }}>1600 × 900 px（16:9 横長）</strong>　最小: 1280 × 720 px　形式: JPEG / PNG / WebP　容量: 10MB 以下<br />
              ※ LP イベントセクションは 16:9 で表示されます。比率が異なる画像は上下／左右がトリミングされます。
            </p>
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={uploadEventImage}
              disabled={uploadingImage}
            />
          </div>
          <Input placeholder="外部URL" value={form.external_url} onChange={(e) => setForm((prev) => ({ ...prev, external_url: e.target.value }))} />
          <select
            value={form.status}
            onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value as PlatformEventStatus }))}
            className="w-full h-10 rounded-md border px-3 text-sm"
            style={{ background: '#fff', color: '#13294b' }}
          >
            <option value="draft">下書き</option>
            <option value="published">公開中</option>
            <option value="archived">終了</option>
          </select>
          <Button onClick={saveEvent} disabled={saving} className="w-full rounded-lg font-bold" style={{ background: C.accent, color: C.accentForeground }}>
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            保存
          </Button>
        </div>
      </CustomModal>
    </div>
  );
}
