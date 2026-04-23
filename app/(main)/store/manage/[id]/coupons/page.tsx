'use client';

/**
 * 店舗クーポン管理画面（Phase 10-2）
 *
 * - 一覧 / 新規作成 / 編集 / アーカイブ / 配信（LINE OA Flex Message）
 * - デザインは `broadcast/page.tsx` と同じラグジュアリーパターン
 * - フォームはダイアログで表示（一覧の可読性を損なわない）
 */

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Loader2,
  Ticket,
  Plus,
  Send,
  Edit,
  Archive,
  Sparkles,
  Users,
  Calendar,
  ImageIcon,
  Tag,
  Trash2,
  CheckCircle2,
  AlertCircle,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CloseCircleButton } from '@/components/ui/close-circle-button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/lib/auth/context';
import { supabase } from '@/lib/supabase/client';
import { useAppMode } from '@/lib/app-mode-context';
import { toast } from 'sonner';

type DiscountType = 'percent' | 'amount' | 'free_item' | 'other';
type TargetAudience = 'nearby' | 'all_oa' | 'store_followers';

type Coupon = {
  id: string;
  store_id: string;
  title: string;
  body: string | null;
  image_url: string | null;
  discount_type: DiscountType;
  discount_value: number | null;
  conditions: string | null;
  valid_from: string | null;
  valid_until: string;
  max_issues: number | null;
  max_per_user: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  issued_count?: number;
  redeemed_count?: number;
};

type CouponFormState = {
  id?: string;
  title: string;
  body: string;
  imageUrl: string;
  discountType: DiscountType;
  discountValue: string;
  conditions: string;
  validFrom: string;
  validUntil: string;
  maxIssues: string;
  maxPerUser: string;
};

const EMPTY_FORM: CouponFormState = {
  title: '',
  body: '',
  imageUrl: '',
  discountType: 'percent',
  discountValue: '',
  conditions: '',
  validFrom: '',
  validUntil: '',
  maxIssues: '',
  maxPerUser: '1',
};

const MAX_TITLE = 60;
const MAX_BODY = 400;
const MAX_CONDITIONS = 300;

const DISCOUNT_LABELS: Record<DiscountType, string> = {
  percent: '％割引',
  amount: '金額割引',
  free_item: '1品無料',
  other: 'その他',
};

const TARGET_LABELS: Record<TargetAudience, string> = {
  nearby: '近隣の友だち',
  all_oa: '全友だち',
  store_followers: 'この店舗に来店歴あり',
};

/** ISO 文字列 → <input type="datetime-local"> が受け付ける形式 */
function toLocalInput(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function toISO(localInput: string): string | null {
  if (!localInput) return null;
  const d = new Date(localInput);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

const SectionHeader = ({
  icon: Icon,
  title,
}: {
  icon: React.ElementType;
  title: string;
}) => {
  const { colorsB: COLORS } = useAppMode();
  return (
    <div className="flex items-center gap-3 mb-4">
      <div
        className="p-2 rounded-lg"
        style={{
          background: COLORS.goldGradient,
          boxShadow: '0 2px 8px rgba(201, 168, 108, 0.25)',
        }}
      >
        <Icon className="w-4 h-4" style={{ color: COLORS.deepNavy }} />
      </div>
      <h2 className="text-lg font-bold" style={{ color: COLORS.deepNavy }}>
        {title}
      </h2>
    </div>
  );
};

function StoreCouponsPageInner() {
  const params = useParams();
  const router = useRouter();
  const storeId = Array.isArray(params.id) ? params.id[0] : (params.id as string);
  const { user, accountType, store, loading: authLoading } = useAuth();
  const { colorsB: COLORS } = useAppMode();

  const [activeTab, setActiveTab] = useState<'active' | 'archived'>('active');
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [uploadingImage, setUploadingImage] = useState(false);

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [form, setForm] = useState<CouponFormState>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);

  const [distributeOpen, setDistributeOpen] = useState(false);
  const [distributeCoupon, setDistributeCoupon] = useState<Coupon | null>(null);
  const [distributeTarget, setDistributeTarget] = useState<TargetAudience>('nearby');
  const [distributeRadius, setDistributeRadius] = useState<number>(1.5);
  const [distributing, setDistributing] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    const docBody = document.body;
    const prevRoot = root.style.background;
    const prevBody = docBody.style.background;
    const bg = COLORS.cardGradient;
    root.style.background = bg;
    docBody.style.background = bg;
    return () => {
      root.style.background = prevRoot;
      docBody.style.background = prevBody;
    };
  }, [COLORS.cardGradient]);

  const isAuthorized = useMemo(() => {
    if (authLoading || !user) return false;
    if (accountType === 'platform') return true;
    if (accountType === 'store' && store?.id === storeId) return true;
    return false;
  }, [authLoading, user, accountType, store, storeId]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace('/login/operator');
      return;
    }
    if (!isAuthorized) {
      router.replace('/store/manage');
    }
  }, [authLoading, user, isAuthorized, router]);

  const fetchCoupons = async () => {
    setLoadingList(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) return;
      const res = await fetch(`/api/stores/${storeId}/coupons`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (res.ok) setCoupons((json.coupons ?? []) as Coupon[]);
      else toast.error(json?.error ?? 'クーポン一覧の取得に失敗しました');
    } catch (err) {
      console.error('[coupons] fetch error', err);
      toast.error('クーポン一覧の取得に失敗しました');
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    if (!isAuthorized) return;
    fetchCoupons();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthorized]);

  const openCreate = () => {
    setFormMode('create');
    setForm(EMPTY_FORM);
    setFormOpen(true);
  };

  const openEdit = (c: Coupon) => {
    setFormMode('edit');
    setForm({
      id: c.id,
      title: c.title,
      body: c.body ?? '',
      imageUrl: c.image_url ?? '',
      discountType: c.discount_type,
      discountValue:
        c.discount_value != null ? String(c.discount_value) : '',
      conditions: c.conditions ?? '',
      validFrom: toLocalInput(c.valid_from),
      validUntil: toLocalInput(c.valid_until),
      maxIssues: c.max_issues != null ? String(c.max_issues) : '',
      maxPerUser: String(c.max_per_user ?? 1),
    });
    setFormOpen(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      toast.error('画像は8MB以下にしてください');
      return;
    }
    setUploadingImage(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${storeId}/coupons/${Date.now()}.${fileExt}`;
      const { error } = await supabase.storage
        .from('store-images')
        .upload(fileName, file, { cacheControl: '3600', upsert: false });
      if (error) throw error;
      const {
        data: { publicUrl },
      } = supabase.storage.from('store-images').getPublicUrl(fileName);
      setForm((prev) => ({ ...prev, imageUrl: publicUrl }));
      toast.success('画像をアップロードしました');
    } catch (err) {
      console.error('[coupon image upload]', err);
      toast.error('画像のアップロードに失敗しました');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const title = form.title.trim();
    if (!title) {
      toast.error('タイトルを入力してください');
      return;
    }
    if (title.length > MAX_TITLE) {
      toast.error(`タイトルは${MAX_TITLE}文字以内`);
      return;
    }
    if (!form.validUntil) {
      toast.error('有効期限を入力してください');
      return;
    }
    const validUntilIso = toISO(form.validUntil);
    if (!validUntilIso) {
      toast.error('有効期限が無効です');
      return;
    }
    if (form.validFrom && !toISO(form.validFrom)) {
      toast.error('開始日時が無効です');
      return;
    }

    const payload: Record<string, unknown> = {
      title,
      body: form.body.trim() || null,
      image_url: form.imageUrl.trim() || null,
      conditions: form.conditions.trim() || null,
      discount_value:
        form.discountValue.trim() === ''
          ? null
          : Number(form.discountValue),
      valid_from: toISO(form.validFrom),
      valid_until: validUntilIso,
      max_issues:
        form.maxIssues.trim() === '' ? null : Number(form.maxIssues),
      max_per_user:
        form.maxPerUser.trim() === '' ? 1 : Number(form.maxPerUser),
    };
    if (formMode === 'create') {
      payload.discount_type = form.discountType;
    }

    setSubmitting(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) {
        toast.error('セッションが切れています');
        return;
      }
      const url =
        formMode === 'create'
          ? `/api/stores/${storeId}/coupons`
          : `/api/stores/${storeId}/coupons/${form.id}`;
      const res = await fetch(url, {
        method: formMode === 'create' ? 'POST' : 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json?.error ?? '保存に失敗しました');
        return;
      }
      toast.success(formMode === 'create' ? 'クーポンを作成しました' : 'クーポンを更新しました');
      setFormOpen(false);
      fetchCoupons();
    } finally {
      setSubmitting(false);
    }
  };

  const handleArchive = async (c: Coupon) => {
    if (!confirm(`「${c.title}」をアーカイブします。よろしいですか？`)) return;
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) return;
    const res = await fetch(`/api/stores/${storeId}/coupons/${c.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    const json = await res.json();
    if (!res.ok) {
      toast.error(json?.error ?? 'アーカイブに失敗しました');
      return;
    }
    toast.success(json?.archived ? 'アーカイブしました' : '削除しました');
    fetchCoupons();
  };

  const openDistribute = (c: Coupon) => {
    setDistributeCoupon(c);
    setDistributeTarget('nearby');
    setDistributeRadius(1.5);
    setDistributeOpen(true);
  };

  const handleDistribute = async () => {
    if (!distributeCoupon) return;
    setDistributing(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) {
        toast.error('セッションが切れています');
        return;
      }
      const res = await fetch(
        `/api/stores/${storeId}/coupons/${distributeCoupon.id}/distribute`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            targetAudience: distributeTarget,
            radiusKm: distributeTarget === 'nearby' ? distributeRadius : undefined,
          }),
        }
      );
      const json = await res.json();
      if (!res.ok) {
        toast.error(json?.error ?? '配信に失敗しました');
        return;
      }
      toast.success(`${json.delivered ?? 0}人に配信しました`);
      setDistributeOpen(false);
      setDistributeCoupon(null);
      fetchCoupons();
    } finally {
      setDistributing(false);
    }
  };

  const activeCoupons = coupons.filter((c) => c.is_active);
  const archivedCoupons = coupons.filter((c) => !c.is_active);
  const displayList = activeTab === 'active' ? activeCoupons : archivedCoupons;

  if (authLoading || !user || !isAuthorized) {
    return (
      <div
        className="min-h-[100dvh] flex items-center justify-center"
        style={{ background: COLORS.cardGradient }}
      >
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
        >
          <Sparkles className="w-10 h-10" style={{ color: COLORS.champagneGold }} />
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] pb-24" style={{ background: COLORS.cardGradient }}>
      <header
        className="sticky top-0 z-20 safe-top"
        style={{
          background: COLORS.luxuryGradient,
          borderBottom: `1px solid rgba(201, 168, 108, 0.2)`,
        }}
      >
        <div className="flex items-center justify-center p-4 relative">
          <h1
            className="text-lg font-light tracking-widest"
            style={{ color: COLORS.ivory }}
          >
            クーポン管理
          </h1>
          <CloseCircleButton
            type="button"
            size="lg"
            onClick={() => router.push(`/store/manage/${storeId}/update`)}
            className="absolute right-4"
            aria-label="閉じる"
          />
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 pt-6">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <div className="flex items-center justify-between gap-3">
            <Tabs
              value={activeTab}
              onValueChange={(v) => setActiveTab(v as 'active' | 'archived')}
              className="flex-1"
            >
              <TabsList
                className="grid w-full grid-cols-2 rounded-xl p-1"
                style={{
                  background: 'rgba(10, 22, 40, 0.05)',
                  border: `1px solid rgba(201, 168, 108, 0.15)`,
                }}
              >
                <TabsTrigger
                  value="active"
                  className="rounded-lg font-bold data-[state=active]:!bg-[rgba(201,168,108,0.15)] data-[state=active]:shadow-md"
                  style={{
                    color: activeTab === 'active' ? COLORS.deepNavy : COLORS.warmGray,
                  }}
                >
                  アクティブ
                  {activeCoupons.length > 0 && (
                    <span className="ml-1 opacity-60">({activeCoupons.length})</span>
                  )}
                </TabsTrigger>
                <TabsTrigger
                  value="archived"
                  className="rounded-lg font-bold data-[state=active]:!bg-[rgba(201,168,108,0.15)] data-[state=active]:shadow-md"
                  style={{
                    color: activeTab === 'archived' ? COLORS.deepNavy : COLORS.warmGray,
                  }}
                >
                  アーカイブ
                  {archivedCoupons.length > 0 && (
                    <span className="ml-1 opacity-60">({archivedCoupons.length})</span>
                  )}
                </TabsTrigger>
              </TabsList>
              <TabsContent value="active" />
              <TabsContent value="archived" />
            </Tabs>
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
              <Button
                type="button"
                onClick={openCreate}
                className="rounded-xl font-bold shadow-md"
                style={{
                  background: COLORS.goldGradient,
                  color: COLORS.deepNavy,
                }}
              >
                <Plus className="w-4 h-4 mr-1" />
                新規
              </Button>
            </motion.div>
          </div>

          {loadingList ? (
            <div className="flex justify-center py-16">
              <Loader2
                className="w-6 h-6 animate-spin"
                style={{ color: COLORS.champagneGold }}
              />
            </div>
          ) : displayList.length === 0 ? (
            <Card
              className="p-8 rounded-2xl text-center"
              style={{
                background: '#FFFFFF',
                border: `1px solid rgba(201, 168, 108, 0.15)`,
              }}
            >
              <Ticket
                className="w-10 h-10 mx-auto mb-3"
                style={{ color: COLORS.champagneGold, opacity: 0.6 }}
              />
              <p className="text-sm font-medium" style={{ color: COLORS.warmGray }}>
                {activeTab === 'active'
                  ? 'アクティブなクーポンはありません。「新規」ボタンから作成してください。'
                  : 'アーカイブされたクーポンはありません。'}
              </p>
            </Card>
          ) : (
            <div className="space-y-3">
              {displayList.map((c) => (
                <CouponCard
                  key={c.id}
                  coupon={c}
                  onEdit={() => openEdit(c)}
                  onDistribute={() => openDistribute(c)}
                  onArchive={() => handleArchive(c)}
                />
              ))}
            </div>
          )}
        </motion.div>
      </div>

      {/* ===== 作成・編集ダイアログ ===== */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-lg max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle style={{ color: COLORS.deepNavy }}>
              {formMode === 'create' ? 'クーポン新規作成' : 'クーポン編集'}
            </DialogTitle>
            <DialogDescription>
              LINE OA で配信するクーポンを設定します。
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* 画像 */}
            <div>
              <Label className="text-xs font-bold" style={{ color: COLORS.deepNavy }}>
                画像
              </Label>
              <div className="mt-2 flex items-center gap-3">
                {form.imageUrl ? (
                  <div className="relative">
                    <img
                      src={form.imageUrl}
                      alt=""
                      className="w-24 h-24 rounded-xl object-cover"
                      style={{ border: `1px solid rgba(201, 168, 108, 0.3)` }}
                    />
                    <button
                      type="button"
                      onClick={() => setForm((p) => ({ ...p, imageUrl: '' }))}
                      className="absolute -top-2 -right-2 rounded-full p-0.5"
                      style={{
                        background: '#FFFFFF',
                        color: '#dc2626',
                        border: '1px solid rgba(0,0,0,0.1)',
                      }}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <div
                    className="w-24 h-24 rounded-xl flex items-center justify-center"
                    style={{
                      background: 'rgba(201, 168, 108, 0.08)',
                      border: `1px dashed rgba(201, 168, 108, 0.3)`,
                    }}
                  >
                    <ImageIcon
                      className="w-6 h-6"
                      style={{ color: COLORS.warmGray }}
                    />
                  </div>
                )}
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageUpload}
                    disabled={uploadingImage}
                  />
                  <span
                    className="inline-flex items-center px-3 py-2 rounded-lg text-xs font-bold"
                    style={{
                      border: `1px solid rgba(201, 168, 108, 0.3)`,
                      background: '#FFFFFF',
                      color: COLORS.deepNavy,
                    }}
                  >
                    {uploadingImage ? (
                      <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                    ) : (
                      <ImageIcon className="w-3 h-3 mr-1" />
                    )}
                    画像を選択
                  </span>
                </label>
              </div>
              <p className="text-[10px] mt-1" style={{ color: COLORS.warmGray }}>
                8MB以下。LINE Flex Messageの上部に表示されます。
              </p>
            </div>

            {/* タイトル */}
            <div>
              <Label
                htmlFor="coupon-title"
                className="text-xs font-bold"
                style={{ color: COLORS.deepNavy }}
              >
                タイトル <span style={{ color: '#dc2626' }}>*</span>
              </Label>
              <Input
                id="coupon-title"
                value={form.title}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    title: e.target.value.slice(0, MAX_TITLE),
                  }))
                }
                placeholder="例: 生ビール半額クーポン"
                className="mt-1 rounded-xl"
                style={{ fontSize: '16px' }}
              />
              <p
                className="text-[10px] text-right mt-1"
                style={{ color: COLORS.warmGray }}
              >
                {form.title.length} / {MAX_TITLE}
              </p>
            </div>

            {/* 本文 */}
            <div>
              <Label
                htmlFor="coupon-body"
                className="text-xs font-bold"
                style={{ color: COLORS.deepNavy }}
              >
                説明文
              </Label>
              <Textarea
                id="coupon-body"
                value={form.body}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    body: e.target.value.slice(0, MAX_BODY),
                  }))
                }
                rows={3}
                placeholder="クーポンの説明を入力してください"
                className="mt-1 rounded-xl"
                style={{ fontSize: '16px' }}
              />
              <p
                className="text-[10px] text-right mt-1"
                style={{ color: COLORS.warmGray }}
              >
                {form.body.length} / {MAX_BODY}
              </p>
            </div>

            {/* 割引種別 */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-bold" style={{ color: COLORS.deepNavy }}>
                  割引種別 <span style={{ color: '#dc2626' }}>*</span>
                </Label>
                <Select
                  value={form.discountType}
                  onValueChange={(v) =>
                    setForm((p) => ({ ...p, discountType: v as DiscountType }))
                  }
                  disabled={formMode === 'edit'}
                >
                  <SelectTrigger className="mt-1 rounded-xl" style={{ fontSize: '16px' }}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(DISCOUNT_LABELS) as DiscountType[]).map((k) => (
                      <SelectItem key={k} value={k}>
                        {DISCOUNT_LABELS[k]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-bold" style={{ color: COLORS.deepNavy }}>
                  値（任意）
                </Label>
                <Input
                  type="number"
                  inputMode="numeric"
                  value={form.discountValue}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, discountValue: e.target.value }))
                  }
                  placeholder={
                    form.discountType === 'percent'
                      ? '例: 20 (%)'
                      : form.discountType === 'amount'
                      ? '例: 500 (円)'
                      : ''
                  }
                  className="mt-1 rounded-xl"
                  style={{ fontSize: '16px' }}
                />
              </div>
            </div>

            {/* 期間 */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label
                  htmlFor="valid-from"
                  className="text-xs font-bold"
                  style={{ color: COLORS.deepNavy }}
                >
                  開始日時
                </Label>
                <Input
                  id="valid-from"
                  type="datetime-local"
                  value={form.validFrom}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, validFrom: e.target.value }))
                  }
                  className="mt-1 rounded-xl"
                  style={{ fontSize: '16px' }}
                />
              </div>
              <div>
                <Label
                  htmlFor="valid-until"
                  className="text-xs font-bold"
                  style={{ color: COLORS.deepNavy }}
                >
                  終了日時 <span style={{ color: '#dc2626' }}>*</span>
                </Label>
                <Input
                  id="valid-until"
                  type="datetime-local"
                  value={form.validUntil}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, validUntil: e.target.value }))
                  }
                  className="mt-1 rounded-xl"
                  style={{ fontSize: '16px' }}
                  required
                />
              </div>
            </div>

            {/* 発行上限 */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-bold" style={{ color: COLORS.deepNavy }}>
                  発行上限（全体）
                </Label>
                <Input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  value={form.maxIssues}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, maxIssues: e.target.value }))
                  }
                  placeholder="空欄=無制限"
                  className="mt-1 rounded-xl"
                  style={{ fontSize: '16px' }}
                />
              </div>
              <div>
                <Label className="text-xs font-bold" style={{ color: COLORS.deepNavy }}>
                  1人あたり上限
                </Label>
                <Input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  value={form.maxPerUser}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, maxPerUser: e.target.value }))
                  }
                  className="mt-1 rounded-xl"
                  style={{ fontSize: '16px' }}
                />
              </div>
            </div>

            {/* 利用条件 */}
            <div>
              <Label
                htmlFor="coupon-conditions"
                className="text-xs font-bold"
                style={{ color: COLORS.deepNavy }}
              >
                利用条件
              </Label>
              <Textarea
                id="coupon-conditions"
                value={form.conditions}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    conditions: e.target.value.slice(0, MAX_CONDITIONS),
                  }))
                }
                rows={2}
                placeholder="例: 他クーポンとの併用不可 / 1組1回限り"
                className="mt-1 rounded-xl"
                style={{ fontSize: '16px' }}
              />
              <p
                className="text-[10px] text-right mt-1"
                style={{ color: COLORS.warmGray }}
              >
                {form.conditions.length} / {MAX_CONDITIONS}
              </p>
            </div>

            <DialogFooter className="gap-2 sm:gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setFormOpen(false)}
                className="rounded-xl"
                disabled={submitting}
              >
                キャンセル
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="rounded-xl font-bold"
                style={{
                  background: COLORS.goldGradient,
                  color: COLORS.deepNavy,
                }}
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 mr-1" />
                )}
                {formMode === 'create' ? '作成' : '更新'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ===== 配信ダイアログ ===== */}
      <Dialog open={distributeOpen} onOpenChange={setDistributeOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle style={{ color: COLORS.deepNavy }}>クーポン配信</DialogTitle>
            <DialogDescription>
              {distributeCoupon?.title}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-xs font-bold" style={{ color: COLORS.deepNavy }}>
                配信対象
              </Label>
              <div className="mt-2 grid grid-cols-1 gap-2">
                {(Object.keys(TARGET_LABELS) as TargetAudience[]).map((k) => (
                  <Button
                    key={k}
                    type="button"
                    variant={distributeTarget === k ? 'default' : 'outline'}
                    onClick={() => setDistributeTarget(k)}
                    className="justify-start rounded-xl"
                    style={
                      distributeTarget === k
                        ? {
                            background: COLORS.goldGradient,
                            color: COLORS.deepNavy,
                            border: 'none',
                          }
                        : {
                            borderColor: 'rgba(201, 168, 108, 0.3)',
                            color: COLORS.charcoal,
                            background: '#FFFFFF',
                          }
                    }
                  >
                    <Users className="w-4 h-4 mr-2" />
                    {TARGET_LABELS[k]}
                  </Button>
                ))}
              </div>
            </div>

            {distributeTarget === 'nearby' && (
              <div>
                <Label className="text-xs font-bold" style={{ color: COLORS.deepNavy }}>
                  配信半径: {distributeRadius} km
                </Label>
                <input
                  type="range"
                  min={0.5}
                  max={5}
                  step={0.5}
                  value={distributeRadius}
                  onChange={(e) => setDistributeRadius(Number(e.target.value))}
                  className="w-full mt-2 accent-[#C9A86C]"
                />
              </div>
            )}

            {distributeTarget === 'all_oa' && (
              <div
                className="flex items-start gap-2 p-3 rounded-xl text-xs"
                style={{
                  background: 'rgba(239, 68, 68, 0.05)',
                  border: '1px solid rgba(239, 68, 68, 0.2)',
                  color: '#B87333',
                }}
              >
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <p>全友だちへの配信は1日3回まで。送信数が増えるとLINE課金が発生します。</p>
              </div>
            )}
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDistributeOpen(false)}
              className="rounded-xl"
              disabled={distributing}
            >
              キャンセル
            </Button>
            <Button
              type="button"
              onClick={handleDistribute}
              disabled={distributing}
              className="rounded-xl font-bold"
              style={{
                background: COLORS.goldGradient,
                color: COLORS.deepNavy,
              }}
            >
              {distributing ? (
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              ) : (
                <Send className="w-4 h-4 mr-1" />
              )}
              配信する
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CouponCard({
  coupon,
  onEdit,
  onDistribute,
  onArchive,
}: {
  coupon: Coupon;
  onEdit: () => void;
  onDistribute: () => void;
  onArchive: () => void;
}) {
  const { colorsB: COLORS } = useAppMode();
  const validUntil = new Date(coupon.valid_until);
  const isExpired = validUntil.getTime() < Date.now();
  const issued = coupon.issued_count ?? 0;
  const redeemed = coupon.redeemed_count ?? 0;
  const cvrPct = issued > 0 ? ((redeemed / issued) * 100).toFixed(1) : '0.0';

  return (
    <Card
      className="p-4 rounded-2xl shadow-md"
      style={{
        background: '#FFFFFF',
        border: `1px solid rgba(201, 168, 108, 0.15)`,
        opacity: coupon.is_active ? 1 : 0.7,
      }}
    >
      <div className="flex gap-3">
        {coupon.image_url ? (
          <img
            src={coupon.image_url}
            alt=""
            className="w-20 h-20 rounded-xl object-cover flex-shrink-0"
            style={{ border: `1px solid rgba(201, 168, 108, 0.2)` }}
          />
        ) : (
          <div
            className="w-20 h-20 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{
              background: 'rgba(201, 168, 108, 0.08)',
              border: `1px solid rgba(201, 168, 108, 0.15)`,
            }}
          >
            <Ticket className="w-7 h-7" style={{ color: COLORS.champagneGold }} />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3
              className="font-bold text-sm line-clamp-2"
              style={{ color: COLORS.deepNavy }}
            >
              {coupon.title}
            </h3>
            {!coupon.is_active && (
              <span
                className="text-[10px] px-2 py-0.5 rounded-full font-bold flex-shrink-0"
                style={{
                  background: 'rgba(99, 110, 114, 0.12)',
                  color: COLORS.warmGray,
                }}
              >
                アーカイブ
              </span>
            )}
          </div>
          <div
            className="flex items-center gap-2 text-[10px] mt-1"
            style={{ color: COLORS.warmGray }}
          >
            <Tag className="w-3 h-3" />
            <span>{DISCOUNT_LABELS[coupon.discount_type]}</span>
            {coupon.discount_value != null && (
              <span className="font-semibold" style={{ color: COLORS.deepNavy }}>
                {coupon.discount_type === 'percent'
                  ? `${coupon.discount_value}%`
                  : coupon.discount_type === 'amount'
                  ? `¥${coupon.discount_value}`
                  : coupon.discount_value}
              </span>
            )}
          </div>
          <div
            className="flex items-center gap-2 text-[10px] mt-0.5"
            style={{ color: isExpired ? '#dc2626' : COLORS.warmGray }}
          >
            <Calendar className="w-3 h-3" />
            <span>
              〜 {validUntil.toLocaleString('ja-JP', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
              })}
              {isExpired && ' (期限切れ)'}
            </span>
          </div>
          <div
            className="flex items-center gap-3 text-[11px] mt-2 font-semibold"
            style={{ color: COLORS.deepNavy }}
          >
            <span>発行 {issued}</span>
            <span>·</span>
            <span>利用 {redeemed}</span>
            <span>·</span>
            <span>CVR {cvrPct}%</span>
          </div>
        </div>
      </div>

      {coupon.is_active && (
        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            onClick={onDistribute}
            disabled={isExpired}
            className="rounded-lg font-bold flex-1"
            style={{
              background: COLORS.goldGradient,
              color: COLORS.deepNavy,
            }}
          >
            <Send className="w-3 h-3 mr-1" />
            配信
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={onEdit}
            className="rounded-lg"
            style={{
              borderColor: 'rgba(201, 168, 108, 0.3)',
              color: COLORS.deepNavy,
              background: '#FFFFFF',
            }}
          >
            <Edit className="w-3 h-3 mr-1" />
            編集
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={onArchive}
            className="rounded-lg"
            style={{
              borderColor: 'rgba(99, 110, 114, 0.2)',
              color: COLORS.warmGray,
              background: '#FFFFFF',
            }}
          >
            {issued > 0 ? (
              <>
                <Archive className="w-3 h-3 mr-1" />
                アーカイブ
              </>
            ) : (
              <>
                <Trash2 className="w-3 h-3 mr-1" />
                削除
              </>
            )}
          </Button>
        </div>
      )}
    </Card>
  );
}

function Fallback() {
  const { colorsB: COLORS } = useAppMode();
  return (
    <div
      className="min-h-[100dvh] flex items-center justify-center"
      style={{ background: COLORS.cardGradient }}
    >
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
      >
        <Sparkles className="w-10 h-10" style={{ color: COLORS.champagneGold }} />
      </motion.div>
    </div>
  );
}

export default function StoreCouponsPage() {
  return (
    <Suspense fallback={<Fallback />}>
      <StoreCouponsPageInner />
    </Suspense>
  );
}
