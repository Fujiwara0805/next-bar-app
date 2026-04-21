'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Loader2,
  Megaphone,
  Send,
  Radio,
  Users,
  BarChart3,
  MousePointerClick,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CloseCircleButton } from '@/components/ui/close-circle-button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/lib/auth/context';
import { supabase } from '@/lib/supabase/client';
import { useLanguage } from '@/lib/i18n/context';
import { useAppMode } from '@/lib/app-mode-context';
import { toast } from 'sonner';

type BroadcastKind = 'announcement' | 'open_signal';
type TargetAudience = 'nearby' | 'all_oa';

type StoreMessageRow = {
  id: string;
  kind: string;
  body: string;
  target_audience: string;
  target_radius_km: number | null;
  sent_count: number;
  failed_count: number;
  status: string;
  created_at: string;
};

type KindTotals = { count: number; sent: number; failed: number; clicks: number };

type AnalyticsPayload = {
  windowDays: number;
  totals: KindTotals & { clickRate: number };
  byKind: Record<string, KindTotals>;
  recent: Array<{
    id: string;
    kind: string;
    target_audience: string;
    sent_count: number;
    failed_count: number;
    click_count: number;
    status: string;
    created_at: string;
    body: string;
  }>;
};

const MAX_LEN = 400;

const SectionHeader = ({ icon: Icon, title }: { icon: React.ElementType; title: string }) => {
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

function StoreBroadcastPageInner() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const storeId = Array.isArray(params.id) ? params.id[0] : (params.id as string);
  const { user, accountType, store, loading: authLoading } = useAuth();
  const { t } = useLanguage();
  const { colorsB: COLORS } = useAppMode();

  const initialTab = searchParams.get('tab') === 'analytics' ? 'analytics' : 'broadcast';
  const [activeTab, setActiveTab] = useState<string>(initialTab);

  const [kind, setKind] = useState<BroadcastKind>('open_signal');
  const [target, setTarget] = useState<TargetAudience>('nearby');
  const [radiusKm, setRadiusKm] = useState<number>(1.5);
  const [body, setBody] = useState<string>('');
  const [sending, setSending] = useState(false);
  const [history, setHistory] = useState<StoreMessageRow[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  const [analytics, setAnalytics] = useState<AnalyticsPayload | null>(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(true);

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
      router.replace('/login?role=store');
      return;
    }
    if (!isAuthorized) {
      router.replace('/store/manage');
    }
  }, [authLoading, user, isAuthorized, router]);

  const fetchHistory = async () => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) return;
      const res = await fetch(`/api/stores/${storeId}/broadcast`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (res.ok) setHistory((json.messages ?? []) as StoreMessageRow[]);
    } finally {
      setLoadingHistory(false);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) return;
      const res = await fetch(`/api/stores/${storeId}/analytics`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const json = (await res.json()) as AnalyticsPayload;
        setAnalytics(json);
      }
    } finally {
      setLoadingAnalytics(false);
    }
  };

  useEffect(() => {
    if (!isAuthorized) return;
    fetchHistory();
    fetchAnalytics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthorized]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = body.trim();
    if (!text) {
      toast.error(t('broadcast.body_required'));
      return;
    }
    setSending(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) {
        toast.error(t('broadcast.session_expired'));
        setSending(false);
        return;
      }
      const res = await fetch(`/api/stores/${storeId}/broadcast`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          kind,
          body: text,
          targetAudience: target,
          radiusKm: target === 'nearby' ? radiusKm : undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        const code = json?.error ?? 'unknown';
        toast.error(t(`broadcast.error.${code}`) || code);
        setSending(false);
        return;
      }
      toast.success(
        t('broadcast.sent_toast').replace('{n}', String(json.delivered ?? 0))
      );
      setBody('');
      fetchHistory();
      fetchAnalytics();
    } catch (err) {
      console.error('[broadcast] error', err);
      toast.error(t('broadcast.error.unknown'));
    } finally {
      setSending(false);
    }
  };

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

  const totals = analytics?.totals;
  const clickRatePct =
    totals && totals.sent > 0 ? ((totals.clicks / totals.sent) * 100).toFixed(1) : '0.0';

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
            <h1
              className="text-lg font-light tracking-widest"
              style={{ color: COLORS.ivory }}
            >
              配信・分析
            </h1>
          </div>
          <CloseCircleButton
            type="button"
            size="lg"
            onClick={() => router.push(`/store/manage/${storeId}/update`)}
            className="absolute right-4"
            aria-label={t('common.close')}
          />
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 pt-6">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList
              className="grid w-full grid-cols-2 rounded-xl p-1 mb-6"
              style={{
                background: 'rgba(10, 22, 40, 0.05)',
                border: `1px solid rgba(201, 168, 108, 0.15)`,
              }}
            >
              <TabsTrigger
                value="broadcast"
                className="rounded-lg font-bold transition-all duration-200 data-[state=active]:!bg-[rgba(201,168,108,0.15)] data-[state=active]:shadow-md"
                style={{
                  color: activeTab === 'broadcast' ? COLORS.deepNavy : COLORS.warmGray,
                }}
              >
                <Megaphone className="w-4 h-4 mr-2" />
                配信
              </TabsTrigger>
              <TabsTrigger
                value="analytics"
                className="rounded-lg font-bold transition-all duration-200 data-[state=active]:!bg-[rgba(201,168,108,0.15)] data-[state=active]:shadow-md"
                style={{
                  color: activeTab === 'analytics' ? COLORS.deepNavy : COLORS.warmGray,
                }}
              >
                <BarChart3 className="w-4 h-4 mr-2" />
                分析
              </TabsTrigger>
            </TabsList>

            {/* ===== 配信タブ ===== */}
            <TabsContent value="broadcast">
              <div className="space-y-6">
                <Card
                  className="p-6 rounded-2xl shadow-lg"
                  style={{
                    background: '#FFFFFF',
                    border: `1px solid rgba(201, 168, 108, 0.15)`,
                  }}
                >
                  <SectionHeader icon={Megaphone} title={t('broadcast.title')} />

                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label
                        className="text-xs font-bold mb-2 block"
                        style={{ color: COLORS.deepNavy }}
                      >
                        {t('broadcast.kind_label')}
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          type="button"
                          variant={kind === 'open_signal' ? 'default' : 'outline'}
                          onClick={() => setKind('open_signal')}
                          className="justify-start rounded-xl"
                          style={
                            kind === 'open_signal'
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
                          <Radio className="w-4 h-4 mr-2" />
                          {t('broadcast.kind_open_signal')}
                        </Button>
                        <Button
                          type="button"
                          variant={kind === 'announcement' ? 'default' : 'outline'}
                          onClick={() => setKind('announcement')}
                          className="justify-start rounded-xl"
                          style={
                            kind === 'announcement'
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
                          <Megaphone className="w-4 h-4 mr-2" />
                          {t('broadcast.kind_announcement')}
                        </Button>
                      </div>
                    </div>

                    <div>
                      <label
                        className="text-xs font-bold mb-2 block"
                        style={{ color: COLORS.deepNavy }}
                      >
                        {t('broadcast.target_label')}
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          type="button"
                          variant={target === 'nearby' ? 'default' : 'outline'}
                          onClick={() => setTarget('nearby')}
                          className="justify-start rounded-xl"
                          style={
                            target === 'nearby'
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
                          {t('broadcast.target_nearby')}
                        </Button>
                        <Button
                          type="button"
                          variant={target === 'all_oa' ? 'default' : 'outline'}
                          onClick={() => setTarget('all_oa')}
                          className="justify-start rounded-xl"
                          style={
                            target === 'all_oa'
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
                          {t('broadcast.target_all_oa')}
                        </Button>
                      </div>
                      {target === 'nearby' && (
                        <div className="mt-3">
                          <label
                            className="text-xs mb-1 block"
                            style={{ color: COLORS.warmGray }}
                          >
                            {t('broadcast.radius_label')}: {radiusKm} km
                          </label>
                          <input
                            type="range"
                            min={0.5}
                            max={5}
                            step={0.5}
                            value={radiusKm}
                            onChange={(e) => setRadiusKm(Number(e.target.value))}
                            className="w-full accent-[#C9A86C]"
                          />
                        </div>
                      )}
                      {target === 'all_oa' && (
                        <p className="text-xs mt-2" style={{ color: '#B87333' }}>
                          {t('broadcast.all_oa_warning')}
                        </p>
                      )}
                    </div>

                    <div>
                      <label
                        className="text-xs font-bold mb-2 block"
                        style={{ color: COLORS.deepNavy }}
                      >
                        {t('broadcast.body_label')}
                      </label>
                      <textarea
                        value={body}
                        onChange={(e) => setBody(e.target.value.slice(0, MAX_LEN))}
                        placeholder={t('broadcast.body_placeholder')}
                        rows={5}
                        className="w-full rounded-xl border-2 px-3 py-2 text-sm resize-y font-medium transition-all duration-200 focus:border-[#C9A86C] focus:ring-2 focus:ring-[#C9A86C]/20 focus:outline-none"
                        style={{
                          fontSize: '16px',
                          borderColor: 'rgba(201, 168, 108, 0.3)',
                          backgroundColor: '#ffffff',
                          color: COLORS.deepNavy,
                        }}
                      />
                      <div
                        className="text-right text-xs font-medium mt-1"
                        style={{ color: COLORS.warmGray }}
                      >
                        {body.length} / {MAX_LEN}
                      </div>
                    </div>

                    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                      <Button
                        type="submit"
                        disabled={sending || body.trim().length === 0}
                        className="w-full py-4 rounded-xl font-bold text-base shadow-lg"
                        size="lg"
                        style={{
                          background: COLORS.goldGradient,
                          color: COLORS.deepNavy,
                          boxShadow: '0 8px 25px rgba(201, 168, 108, 0.35)',
                        }}
                      >
                        {sending ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            {t('broadcast.sending')}
                          </>
                        ) : (
                          <>
                            <Send className="w-4 h-4 mr-2" />
                            {t('broadcast.send')}
                          </>
                        )}
                      </Button>
                    </motion.div>
                  </form>
                </Card>

                <Card
                  className="p-6 rounded-2xl shadow-lg"
                  style={{
                    background: '#FFFFFF',
                    border: `1px solid rgba(201, 168, 108, 0.15)`,
                  }}
                >
                  <SectionHeader icon={Radio} title={t('broadcast.history_title')} />
                  {loadingHistory ? (
                    <div className="flex justify-center py-6">
                      <Loader2
                        className="w-5 h-5 animate-spin"
                        style={{ color: COLORS.champagneGold }}
                      />
                    </div>
                  ) : history.length === 0 ? (
                    <p
                      className="text-xs text-center py-6 font-medium"
                      style={{ color: COLORS.warmGray }}
                    >
                      {t('broadcast.history_empty')}
                    </p>
                  ) : (
                    <ul className="space-y-3">
                      {history.map((m) => (
                        <li
                          key={m.id}
                          className="pb-3 last:pb-0"
                          style={{
                            borderBottom: '1px solid rgba(201, 168, 108, 0.15)',
                          }}
                        >
                          <div
                            className="flex items-center justify-between text-xs mb-1"
                            style={{ color: COLORS.warmGray }}
                          >
                            <span>{new Date(m.created_at).toLocaleString('ja-JP')}</span>
                            <span className="font-semibold">
                              {t(`broadcast.status_${m.status}`) || m.status}
                            </span>
                          </div>
                          <p
                            className="text-sm whitespace-pre-wrap font-medium"
                            style={{ color: COLORS.deepNavy }}
                          >
                            {m.body}
                          </p>
                          <div
                            className="flex items-center gap-3 mt-1 text-xs"
                            style={{ color: COLORS.warmGray }}
                          >
                            <span>{t(`broadcast.kind_${m.kind}`) || m.kind}</span>
                            <span>
                              {t(`broadcast.target_${m.target_audience}`) || m.target_audience}
                              {m.target_radius_km ? ` (${m.target_radius_km}km)` : ''}
                            </span>
                            <span>
                              {t('broadcast.delivered_count').replace(
                                '{n}',
                                String(m.sent_count)
                              )}
                            </span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </Card>
              </div>
            </TabsContent>

            {/* ===== 分析タブ ===== */}
            <TabsContent value="analytics">
              {loadingAnalytics || !analytics ? (
                <div className="flex justify-center py-16">
                  <Loader2
                    className="w-6 h-6 animate-spin"
                    style={{ color: COLORS.champagneGold }}
                  />
                </div>
              ) : (
                <div className="space-y-4">
                  <p
                    className="text-xs font-medium"
                    style={{ color: COLORS.warmGray }}
                  >
                    {t('analytics.window_label').replace(
                      '{days}',
                      String(analytics.windowDays)
                    )}
                  </p>

                  <div className="grid grid-cols-2 gap-3">
                    <Card
                      className="p-4 rounded-2xl shadow-md"
                      style={{
                        background: '#FFFFFF',
                        border: `1px solid rgba(201, 168, 108, 0.15)`,
                      }}
                    >
                      <div
                        className="flex items-center gap-2 mb-1 text-xs font-medium"
                        style={{ color: COLORS.warmGray }}
                      >
                        <Send
                          className="w-3 h-3"
                          style={{ color: COLORS.champagneGold }}
                        />
                        {t('analytics.sent')}
                      </div>
                      <div
                        className="text-2xl font-bold"
                        style={{ color: COLORS.deepNavy }}
                      >
                        {totals?.sent ?? 0}
                      </div>
                    </Card>
                    <Card
                      className="p-4 rounded-2xl shadow-md"
                      style={{
                        background: '#FFFFFF',
                        border: `1px solid rgba(201, 168, 108, 0.15)`,
                      }}
                    >
                      <div
                        className="flex items-center gap-2 mb-1 text-xs font-medium"
                        style={{ color: COLORS.warmGray }}
                      >
                        <MousePointerClick
                          className="w-3 h-3"
                          style={{ color: COLORS.champagneGold }}
                        />
                        {t('analytics.clicks')}
                      </div>
                      <div
                        className="text-2xl font-bold"
                        style={{ color: COLORS.deepNavy }}
                      >
                        {totals?.clicks ?? 0}
                      </div>
                    </Card>
                    <Card
                      className="p-4 rounded-2xl shadow-md"
                      style={{
                        background: '#FFFFFF',
                        border: `1px solid rgba(201, 168, 108, 0.15)`,
                      }}
                    >
                      <div
                        className="text-xs font-medium mb-1"
                        style={{ color: COLORS.warmGray }}
                      >
                        {t('analytics.click_rate')}
                      </div>
                      <div
                        className="text-2xl font-bold"
                        style={{ color: COLORS.deepNavy }}
                      >
                        {clickRatePct}%
                      </div>
                    </Card>
                    <Card
                      className="p-4 rounded-2xl shadow-md"
                      style={{
                        background: '#FFFFFF',
                        border: `1px solid rgba(201, 168, 108, 0.15)`,
                      }}
                    >
                      <div
                        className="text-xs font-medium mb-1"
                        style={{ color: COLORS.warmGray }}
                      >
                        {t('analytics.failed')}
                      </div>
                      <div
                        className="text-2xl font-bold"
                        style={{ color: COLORS.deepNavy }}
                      >
                        {totals?.failed ?? 0}
                      </div>
                    </Card>
                  </div>

                  <Card
                    className="p-6 rounded-2xl shadow-lg"
                    style={{
                      background: '#FFFFFF',
                      border: `1px solid rgba(201, 168, 108, 0.15)`,
                    }}
                  >
                    <SectionHeader icon={BarChart3} title={t('analytics.by_kind')} />
                    <div className="space-y-2">
                      {Object.keys(analytics.byKind).length === 0 ? (
                        <p
                          className="text-xs font-medium"
                          style={{ color: COLORS.warmGray }}
                        >
                          {t('analytics.no_data')}
                        </p>
                      ) : (
                        Object.entries(analytics.byKind).map(([kindKey, k]) => (
                          <div
                            key={kindKey}
                            className="flex items-center justify-between text-sm pb-2 last:pb-0"
                            style={{
                              borderBottom: '1px solid rgba(201, 168, 108, 0.15)',
                            }}
                          >
                            <span
                              className="font-bold"
                              style={{ color: COLORS.deepNavy }}
                            >
                              {t(`broadcast.kind_${kindKey}`) || kindKey}
                            </span>
                            <span
                              className="text-xs font-medium"
                              style={{ color: COLORS.warmGray }}
                            >
                              {t('analytics.kind_row')
                                .replace('{count}', String(k.count))
                                .replace('{sent}', String(k.sent))
                                .replace('{clicks}', String(k.clicks))}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </Card>

                  <Card
                    className="p-6 rounded-2xl shadow-lg"
                    style={{
                      background: '#FFFFFF',
                      border: `1px solid rgba(201, 168, 108, 0.15)`,
                    }}
                  >
                    <SectionHeader icon={Radio} title={t('analytics.recent_title')} />
                    {analytics.recent.length === 0 ? (
                      <p
                        className="text-xs font-medium"
                        style={{ color: COLORS.warmGray }}
                      >
                        {t('analytics.no_data')}
                      </p>
                    ) : (
                      <ul className="space-y-3">
                        {analytics.recent.map((m) => (
                          <li
                            key={m.id}
                            className="pb-3 last:pb-0"
                            style={{
                              borderBottom: '1px solid rgba(201, 168, 108, 0.15)',
                            }}
                          >
                            <div
                              className="flex items-center justify-between text-xs mb-1"
                              style={{ color: COLORS.warmGray }}
                            >
                              <span>
                                {new Date(m.created_at).toLocaleString('ja-JP')}
                              </span>
                              <span className="font-semibold">
                                {t(`broadcast.kind_${m.kind}`) || m.kind}
                              </span>
                            </div>
                            <p
                              className="text-sm whitespace-pre-wrap line-clamp-2 font-medium"
                              style={{ color: COLORS.deepNavy }}
                            >
                              {m.body}
                            </p>
                            <div
                              className="flex items-center gap-3 mt-1 text-xs"
                              style={{ color: COLORS.warmGray }}
                            >
                              <span>
                                <Send className="w-3 h-3 inline mr-1" />
                                {m.sent_count}
                              </span>
                              <span>
                                <MousePointerClick className="w-3 h-3 inline mr-1" />
                                {m.click_count}
                              </span>
                              <span className="ml-auto font-semibold">
                                {t(`broadcast.status_${m.status}`) || m.status}
                              </span>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </Card>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
    </div>
  );
}

function BroadcastFallback() {
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

export default function StoreBroadcastPage() {
  return (
    <Suspense fallback={<BroadcastFallback />}>
      <StoreBroadcastPageInner />
    </Suspense>
  );
}
