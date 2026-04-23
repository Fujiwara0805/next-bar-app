'use client';

// ============================================
// /liff/coupon/[issueId]
// LINE トークから遷移してくるクーポン受領画面。
//   - LIFF (LINE Login) + Supabase セッションで `coupon_issues` を取得
//   - 6桁コード表示（店舗スタッフに提示 → 店舗側 /store/manage/[id]/redeem で消込）
//   - 初回表示時に属性入力（年代/性別/初来店/出身県）を任意で収集
//   - 既に redeemed_at があれば「使用済」表示に切替
// ============================================

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Loader2,
  Ticket,
  CheckCircle2,
  Calendar,
  MapPin,
  Store as StoreIcon,
  Save,
  Copy,
  Info,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useLiff } from '@/lib/line/context';
import { useAuth } from '@/lib/auth/context';
import { supabase } from '@/lib/supabase/client';
import { LINE_BRAND_COLOR } from '@/lib/line/constants';
import { toast } from 'sonner';

type AgeRange = '10s' | '20s' | '30s' | '40s' | '50s' | '60s+';
type Gender = 'male' | 'female' | 'other' | 'unspecified';
type OriginPrefecture = 'oita' | 'other';

type IssuePayload = {
  issue: {
    id: string;
    coupon_id: string;
    store_id: string;
    redeem_code: string;
    issued_at: string;
    redeemed_at: string | null;
    age_range: string | null;
    gender: string | null;
    is_first_visit: boolean | null;
    origin_prefecture: string | null;
  };
  coupon: {
    id: string;
    title: string;
    body: string | null;
    image_url: string | null;
    discount_type: 'percent' | 'amount' | 'free_item' | 'other';
    discount_value: number | null;
    conditions: string | null;
    valid_from: string | null;
    valid_until: string;
  } | null;
  store: {
    id: string;
    name: string;
    address: string | null;
    latitude: number | null;
    longitude: number | null;
    image_urls: string[] | null;
  } | null;
};

const AGE_OPTIONS: { value: AgeRange; label: string }[] = [
  { value: '10s', label: '10代' },
  { value: '20s', label: '20代' },
  { value: '30s', label: '30代' },
  { value: '40s', label: '40代' },
  { value: '50s', label: '50代' },
  { value: '60s+', label: '60代〜' },
];

const GENDER_OPTIONS: { value: Gender; label: string }[] = [
  { value: 'male', label: '男性' },
  { value: 'female', label: '女性' },
  { value: 'other', label: 'その他' },
  { value: 'unspecified', label: '回答しない' },
];

const ORIGIN_OPTIONS: { value: OriginPrefecture; label: string }[] = [
  { value: 'oita', label: '大分県内' },
  { value: 'other', label: '県外' },
];

export default function LiffCouponPage() {
  const params = useParams();
  const issueId = Array.isArray(params.issueId)
    ? params.issueId[0]
    : (params.issueId as string);

  const { isLiffReady, isLineLoggedIn, liffLogin, liffError } = useLiff();
  const { user, loading: authLoading, signInWithLine } = useAuth();

  const [loadingIssue, setLoadingIssue] = useState(true);
  const [payload, setPayload] = useState<IssuePayload | null>(null);
  const [fetchErr, setFetchErr] = useState<string | null>(null);

  // 属性入力ステート
  const [ageRange, setAgeRange] = useState<AgeRange | ''>('');
  const [gender, setGender] = useState<Gender | ''>('');
  const [isFirstVisit, setIsFirstVisit] = useState<boolean | null>(null);
  const [originPref, setOriginPref] = useState<OriginPrefecture | ''>('');
  const [saving, setSaving] = useState(false);
  const [autoSigningIn, setAutoSigningIn] = useState(false);

  // LIFF がログイン済みかつ Supabase 未ログインなら自動連携
  useEffect(() => {
    if (!isLiffReady) return;
    if (authLoading) return;
    if (user) return;
    if (!isLineLoggedIn) return;
    if (autoSigningIn) return;
    setAutoSigningIn(true);
    signInWithLine().finally(() => setAutoSigningIn(false));
  }, [isLiffReady, isLineLoggedIn, user, authLoading, signInWithLine, autoSigningIn]);

  const fetchIssue = useCallback(async () => {
    if (!user) return;
    setLoadingIssue(true);
    setFetchErr(null);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) {
        setFetchErr('セッションが無効です');
        return;
      }
      const res = await fetch(`/api/coupon-issues/${issueId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!res.ok) {
        setFetchErr(
          json?.error === 'issue_not_found'
            ? 'クーポンが見つかりません'
            : json?.error === 'forbidden'
            ? 'このクーポンを表示する権限がありません'
            : 'クーポンの取得に失敗しました'
        );
        return;
      }
      const data = json as IssuePayload;
      setPayload(data);
      // 既存属性をフォームに反映
      setAgeRange((data.issue.age_range as AgeRange) ?? '');
      setGender((data.issue.gender as Gender) ?? '');
      setIsFirstVisit(data.issue.is_first_visit);
      setOriginPref((data.issue.origin_prefecture as OriginPrefecture) ?? '');
    } catch (err) {
      console.error('[liff coupon] fetch error', err);
      setFetchErr('通信エラーが発生しました');
    } finally {
      setLoadingIssue(false);
    }
  }, [issueId, user]);

  useEffect(() => {
    if (!user) return;
    fetchIssue();
  }, [user, fetchIssue]);

  const handleSaveAttributes = async () => {
    if (!payload) return;
    const body: Record<string, unknown> = {};
    if (ageRange) body.age_range = ageRange;
    if (gender) body.gender = gender;
    if (isFirstVisit !== null) body.is_first_visit = isFirstVisit;
    if (originPref) body.origin_prefecture = originPref;
    if (Object.keys(body).length === 0) return;
    setSaving(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) {
        toast.error('セッションが切れています');
        return;
      }
      const res = await fetch(`/api/coupon-issues/${issueId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json?.error ?? '保存に失敗しました');
        return;
      }
      toast.success('ご回答ありがとうございます');
      fetchIssue();
    } finally {
      setSaving(false);
    }
  };

  const handleCopyCode = () => {
    if (!payload?.issue.redeem_code) return;
    try {
      navigator.clipboard.writeText(payload.issue.redeem_code);
      toast.success('コードをコピーしました');
    } catch {
      /* noop */
    }
  };

  const discountLabel = useMemo(() => {
    if (!payload?.coupon) return null;
    const { discount_type, discount_value } = payload.coupon;
    if (discount_value == null) return null;
    if (discount_type === 'percent') return `${discount_value}% OFF`;
    if (discount_type === 'amount') return `¥${discount_value} OFF`;
    return String(discount_value);
  }, [payload]);

  const isRedeemed = !!payload?.issue.redeemed_at;
  const isExpired = useMemo(() => {
    if (!payload?.coupon) return false;
    return new Date(payload.coupon.valid_until).getTime() < Date.now();
  }, [payload]);

  // ===== レンダリング =====

  // LIFF 初期化中
  if (!isLiffReady || authLoading || autoSigningIn) {
    return (
      <CenteredLoader message="読み込み中..." />
    );
  }

  // LIFF SDK はあるが LINE 未ログイン → ログインボタン
  if (!user && !isLineLoggedIn) {
    return (
      <LiffFrame>
        <Card className="p-6 bg-white text-slate-800 rounded-2xl">
          <div className="flex items-center gap-2 mb-3">
            <Ticket className="w-5 h-5" style={{ color: LINE_BRAND_COLOR }} />
            <h1 className="text-base font-bold">クーポンを表示</h1>
          </div>
          <p className="text-sm mb-4">
            LINE でログインするとクーポンを表示できます。
          </p>
          {liffError && (
            <p className="text-xs text-red-600 mb-3">{liffError}</p>
          )}
          <Button
            onClick={() => liffLogin()}
            className="w-full"
            style={{ backgroundColor: LINE_BRAND_COLOR, color: 'white' }}
          >
            LINE でログイン
          </Button>
        </Card>
      </LiffFrame>
    );
  }

  if (loadingIssue) {
    return <CenteredLoader message="クーポン情報を取得中..." />;
  }

  if (fetchErr || !payload || !payload.coupon) {
    return (
      <LiffFrame>
        <Card className="p-6 bg-white text-slate-800 rounded-2xl">
          <p className="text-sm font-bold mb-2">クーポンを表示できませんでした</p>
          <p className="text-xs text-slate-500">{fetchErr ?? '情報が見つかりません'}</p>
        </Card>
      </LiffFrame>
    );
  }

  const { issue, coupon, store } = payload;
  const needsAttributes =
    !issue.age_range || !issue.gender || issue.is_first_visit === null || !issue.origin_prefecture;

  return (
    <LiffFrame>
      {/* クーポン本体カード */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card
          className="overflow-hidden rounded-2xl mb-4"
          style={{
            background: '#FFFFFF',
            border: `1px solid rgba(255, 198, 45, 0.3)`,
            boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
          }}
        >
          {coupon.image_url && (
            <img
              src={coupon.image_url}
              alt=""
              className="w-full h-40 object-cover"
            />
          )}
          <div className="p-5">
            {store?.name && (
              <div
                className="flex items-center gap-1.5 text-xs mb-2"
                style={{ color: '#636E72' }}
              >
                <StoreIcon className="w-3 h-3" />
                <span>{store.name}</span>
              </div>
            )}
            <h1
              className="text-xl font-bold mb-2"
              style={{ color: '#13294b' }}
            >
              {coupon.title}
            </h1>
            {discountLabel && (
              <div
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold mb-3"
                style={{
                  background: 'rgba(255, 198, 45, 0.18)',
                  color: '#13294b',
                }}
              >
                <Ticket className="w-3 h-3" />
                {discountLabel}
              </div>
            )}
            {coupon.body && (
              <p
                className="text-sm leading-relaxed mb-3 whitespace-pre-wrap"
                style={{ color: '#2D3436' }}
              >
                {coupon.body}
              </p>
            )}
            <div
              className="flex items-center gap-1.5 text-xs"
              style={{ color: isExpired ? '#dc2626' : '#636E72' }}
            >
              <Calendar className="w-3 h-3" />
              <span>
                〜 {new Date(coupon.valid_until).toLocaleString('ja-JP', {
                  year: 'numeric',
                  month: '2-digit',
                  day: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
                {isExpired && ' (期限切れ)'}
              </span>
            </div>
            {coupon.conditions && (
              <div
                className="mt-3 p-3 rounded-xl text-xs"
                style={{
                  background: 'rgba(19, 41, 75, 0.04)',
                  color: '#2D3436',
                }}
              >
                <p className="font-bold mb-1">利用条件</p>
                <p className="whitespace-pre-wrap">{coupon.conditions}</p>
              </div>
            )}
          </div>
        </Card>

        {/* 6桁コード表示エリア */}
        {isRedeemed ? (
          <Card
            className="p-6 rounded-2xl text-center mb-4"
            style={{
              background: 'rgba(99, 110, 114, 0.15)',
              border: '1px solid rgba(99, 110, 114, 0.3)',
            }}
          >
            <CheckCircle2
              className="w-10 h-10 mx-auto mb-2"
              style={{ color: '#636E72' }}
            />
            <p
              className="text-base font-bold mb-1"
              style={{ color: '#F5F3EC' }}
            >
              このクーポンは使用済みです
            </p>
            <p className="text-xs" style={{ color: '#AAA' }}>
              {new Date(issue.redeemed_at!).toLocaleString('ja-JP')}
            </p>
          </Card>
        ) : isExpired ? (
          <Card
            className="p-6 rounded-2xl text-center mb-4"
            style={{
              background: 'rgba(220, 38, 38, 0.12)',
              border: '1px solid rgba(220, 38, 38, 0.3)',
            }}
          >
            <p className="text-base font-bold" style={{ color: '#fca5a5' }}>
              有効期限が過ぎています
            </p>
          </Card>
        ) : (
          <Card
            className="p-6 rounded-2xl text-center mb-4"
            style={{
              background:
                'linear-gradient(135deg, #FDFBF7 0%, #F5F1EB 100%)',
              border: '2px solid rgba(255, 198, 45, 0.4)',
            }}
          >
            <p
              className="text-xs font-semibold mb-2"
              style={{ color: '#636E72' }}
            >
              店舗スタッフにこちらのコードをお伝えください
            </p>
            <div
              className="text-5xl font-bold tracking-[0.4em] py-3"
              style={{
                color: '#13294b',
                fontFamily:
                  'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
              }}
            >
              {issue.redeem_code}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCopyCode}
              className="mt-3 rounded-xl"
              style={{
                borderColor: 'rgba(201, 168, 108, 0.4)',
                color: '#13294b',
                background: '#FFFFFF',
              }}
            >
              <Copy className="w-3 h-3 mr-1" />
              コードをコピー
            </Button>
          </Card>
        )}

        {/* 属性入力フォーム */}
        {!isRedeemed && !isExpired && needsAttributes && (
          <Card className="p-5 bg-white text-slate-800 rounded-2xl mb-4">
            <div className="flex items-center gap-2 mb-3">
              <Info className="w-4 h-4" style={{ color: LINE_BRAND_COLOR }} />
              <h2 className="text-sm font-bold">
                よろしければ教えてください（任意）
              </h2>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              お店のサービス向上のため、ご協力いただけますと幸いです。
            </p>

            <FieldGroup label="年代">
              <SelectChips
                options={AGE_OPTIONS}
                value={ageRange}
                onChange={(v) => setAgeRange(v as AgeRange)}
              />
            </FieldGroup>

            <FieldGroup label="性別">
              <SelectChips
                options={GENDER_OPTIONS}
                value={gender}
                onChange={(v) => setGender(v as Gender)}
              />
            </FieldGroup>

            <FieldGroup label="このお店の利用は">
              <SelectChips
                options={[
                  { value: 'true', label: '初めて' },
                  { value: 'false', label: '2回目以降' },
                ]}
                value={
                  isFirstVisit === null
                    ? ''
                    : isFirstVisit
                    ? 'true'
                    : 'false'
                }
                onChange={(v) => setIsFirstVisit(v === 'true')}
              />
            </FieldGroup>

            <FieldGroup label="お住まい">
              <SelectChips
                options={ORIGIN_OPTIONS}
                value={originPref}
                onChange={(v) => setOriginPref(v as OriginPrefecture)}
              />
            </FieldGroup>

            <Button
              type="button"
              onClick={handleSaveAttributes}
              disabled={
                saving ||
                (!ageRange && !gender && isFirstVisit === null && !originPref)
              }
              className="w-full mt-2 rounded-xl"
              style={{
                background:
                  'linear-gradient(135deg, #ffc62d 0%, #FFD966 50%, #C9A86C 100%)',
                color: '#13294b',
              }}
            >
              {saving ? (
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-1" />
              )}
              回答を送信
            </Button>
          </Card>
        )}

        {/* 店舗情報 */}
        {store && (
          <Card className="p-4 bg-white text-slate-800 rounded-2xl">
            <div className="flex items-start gap-3">
              {store.image_urls?.[0] ? (
                <img
                  src={store.image_urls[0]}
                  alt=""
                  className="w-14 h-14 rounded-xl object-cover flex-shrink-0"
                />
              ) : (
                <div className="w-14 h-14 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
                  <StoreIcon className="w-5 h-5 text-slate-400" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold">{store.name}</p>
                {store.address && (
                  <p className="text-xs text-slate-500 mt-0.5 line-clamp-2 flex items-start gap-1">
                    <MapPin className="w-3 h-3 mt-0.5 flex-shrink-0" />
                    <span>{store.address}</span>
                  </p>
                )}
              </div>
            </div>
          </Card>
        )}
      </motion.div>
    </LiffFrame>
  );
}

function LiffFrame({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="min-h-screen safe-top pb-16"
      style={{
        background: 'linear-gradient(180deg, #0B2447 0%, #152C5B 100%)',
        color: '#F5F3EC',
      }}
    >
      <div className="max-w-xl mx-auto px-4 pt-6">{children}</div>
    </div>
  );
}

function CenteredLoader({ message }: { message: string }) {
  return (
    <LiffFrame>
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <Loader2 className="w-6 h-6 animate-spin" />
        <p className="text-xs opacity-70">{message}</p>
      </div>
    </LiffFrame>
  );
}

function FieldGroup({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-3">
      <p className="text-xs font-bold mb-1.5 text-slate-700">{label}</p>
      {children}
    </div>
  );
}

function SelectChips({
  options,
  value,
  onChange,
}: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className="px-3 py-1.5 rounded-full text-xs font-bold transition-all"
            style={{
              background: active ? '#13294b' : '#F1F3F5',
              color: active ? '#FFC62D' : '#495057',
              border: active ? '1px solid #13294b' : '1px solid transparent',
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
