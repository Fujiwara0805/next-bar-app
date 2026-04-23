'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Mail,
  Lock,
  Loader2,
  Home,
  Sparkles,
  MapPin,
  Clock,
  Shield,
  Building2,
} from 'lucide-react';
import { LineAppIcon } from '@/components/icons/line-app-icon';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/lib/auth/context';
import { useLiff } from '@/lib/line/context';
import { toast } from 'sonner';
import { PasswordInput } from '@/components/ui/password-input';
import { useLanguage } from '@/lib/i18n/context';
import { useAppMode } from '@/lib/app-mode-context';

const LOGO_URL =
  'https://res.cloudinary.com/dz9trbwma/image/upload/f_auto,q_auto/v1761355092/%E3%82%B5%E3%83%BC%E3%83%93%E3%82%B9%E3%82%A2%E3%82%A4%E3%82%B3%E3%83%B3_dggltf.png';

const LINE_BRAND = '#06C755';

export type LoginMode = 'customer' | 'operator' | 'store';

export function LoginForm({ mode }: { mode: LoginMode }) {
  const { colorsB: COLORS } = useAppMode();
  const router = useRouter();
  const searchParams = useSearchParams();

  const redirectTo = useMemo(() => {
    const r = searchParams.get('redirect');
    if (!r) return null;
    if (!r.startsWith('/') || r.startsWith('//')) return null;
    return r;
  }, [searchParams]);

  const { signIn, signInWithLine, signOut, user, accountType, store, loading: authLoading } = useAuth();
  const { isLiffReady } = useLiff();
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [lineLoading, setLineLoading] = useState(false);
  const [lineInClient, setLineInClient] = useState<boolean | null>(null);

  const liffAvailable = Boolean(process.env.NEXT_PUBLIC_LIFF_ID);

  const isOperator = mode === 'operator';
  const isStore = mode === 'store';
  const isCustomer = mode === 'customer';

  const sessionMismatch =
    !authLoading &&
    !!user &&
    ((isOperator && accountType === 'customer') ||
      (isStore && accountType === 'customer') ||
      (isCustomer && (accountType === 'platform' || accountType === 'store')));

  useEffect(() => {
    if (authLoading || !user) return;
    if (isOperator && accountType === 'store' && store?.id) {
      router.replace(`/store/manage/${store.id}/update`);
      return;
    }
    if (isStore && accountType === 'platform') {
      router.replace('/store/manage');
    }
  }, [authLoading, user, isOperator, isStore, accountType, store, router]);

  useEffect(() => {
    let cancel = false;
    (async () => {
      if (!liffAvailable || !isCustomer) {
        if (!cancel) setLineInClient(null);
        return;
      }
      const liff = await (await import('@/lib/line/liff')).getLiff();
      if (!cancel) setLineInClient(!!liff?.isInClient());
    })();
    return () => {
      cancel = true;
    };
  }, [liffAvailable, isCustomer]);

  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;
    const prevRoot = root.style.background;
    const prevBody = body.style.background;
    const prevBodyColor = body.style.backgroundColor;
    const bg = COLORS.luxuryGradient;
    root.style.background = bg;
    body.style.background = bg;
    body.style.backgroundColor = '';
    return () => {
      root.style.background = prevRoot;
      body.style.background = prevBody;
      body.style.backgroundColor = prevBodyColor;
    };
  }, [COLORS.luxuryGradient]);

  useEffect(() => {
    if (authLoading || !user || sessionMismatch) return;

    if (isOperator) {
      if (accountType === 'platform') {
        router.replace('/store/manage');
      }
      return;
    }

    if (isStore) {
      if (accountType === 'store' && store?.id) {
        router.replace(`/store/manage/${store.id}/update`);
      }
      return;
    }

    if (isCustomer && accountType === 'customer') {
      router.replace(redirectTo ?? '/map');
    }
  }, [user, accountType, store, authLoading, router, isOperator, isStore, isCustomer, redirectTo, sessionMismatch]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (sessionMismatch) {
      toast.error(t('common.error_occurred'));
      return;
    }
    setLoading(true);
    try {
      const result = await signIn(email, password);
      if (result.error) {
        toast.error(t('auth.login_failed'), { description: t('auth.login_failed_desc') });
        return;
      }

      if (isOperator) {
        if (result.accountType === 'customer') {
          await signOut();
          toast.error(t('auth.wrong_account_for_operator'), {
            description: t('auth.wrong_account_for_operator_desc'),
          });
          return;
        }
        if (result.accountType === 'store') {
          await signOut();
          toast.error(t('auth.use_store_login_entry'), {
            description: t('auth.use_store_login_entry_desc'),
          });
          return;
        }
      }

      if (isStore) {
        if (result.accountType === 'platform' || result.accountType === 'customer') {
          await signOut();
          toast.error(t('auth.use_operator_or_customer_entry'), {
            description:
              result.accountType === 'platform'
                ? t('auth.use_operator_entry_desc')
                : t('auth.wrong_account_for_store_desc'),
          });
          return;
        }
        if (result.accountType === 'store' && !result.store?.id) {
          toast.error(t('auth.store_info_error'));
          return;
        }
      }

      if (isCustomer && result.accountType !== 'customer') {
        await signOut();
        toast.error(t('auth.wrong_account_for_store'), {
          description: t('auth.wrong_account_for_store_desc'),
        });
        return;
      }

      toast.success(t('auth.login_success'), { position: 'top-center', duration: 1000 });
      if (result.accountType === 'platform') {
        router.push('/store/manage');
      } else if (result.accountType === 'store') {
        if (result.store?.id) {
          router.push(`/store/manage/${result.store.id}/update`);
        } else {
          toast.error(t('auth.store_info_error'));
        }
      } else if (result.accountType === 'customer') {
        router.push(redirectTo ?? '/map');
      } else {
        router.push(redirectTo ?? '/map');
      }
    } catch (error) {
      console.error('Login error:', error);
      toast.error(t('common.error_occurred'));
    } finally {
      setLoading(false);
    }
  };

  const features = [
    { icon: MapPin, title: t('auth.benefit_quick_check'), desc: t('auth.benefit_quick_check_desc') },
    { icon: Clock, title: t('auth.benefit_one_tap'), desc: t('auth.benefit_one_tap_desc') },
  ];

  const asideBadge = isOperator
    ? t('auth.aside_eyebrow_operator')
    : isStore
      ? t('auth.aside_eyebrow_store')
      : t('auth.aside_eyebrow_customer');
  const loginSubtitle = isOperator
    ? t('auth.login_to_operator')
    : isStore
      ? t('auth.login_to_store')
      : t('auth.customer_login_subtitle');
  const roleHint = isOperator
    ? t('auth.login_role_platform_hint')
    : isStore
      ? t('auth.login_role_store_hint')
      : t('auth.customer_login_role_hint');
  const titleText = isOperator
    ? t('header.operator_login')
    : isStore
      ? t('auth.store_login_page_title')
      : t('auth.customer_login_title');

  const handleLineLogin = async () => {
    if (!liffAvailable) {
      toast.error(t('auth.line_login_unavailable'));
      return;
    }
    setLineLoading(true);
    try {
      const { error } = await signInWithLine();
      if (error) {
        toast.error(t('auth.line_login_failed'), { description: error.message });
        return;
      }
      toast.success(t('auth.login_success'), { position: 'top-center', duration: 1000 });
    } catch (err) {
      toast.error(t('auth.line_login_failed'), {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setLineLoading(false);
    }
  };

  return (
    <div
      className="min-h-[100dvh] relative overflow-hidden"
      style={{ background: COLORS.luxuryGradient }}
    >
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute -top-40 -left-40 h-[50rem] w-[50rem] rounded-full opacity-15"
          style={{ background: `radial-gradient(circle, ${COLORS.champagneGold}25 0%, transparent 60%)` }}
        />
        <div
          className="absolute -bottom-40 -right-40 h-[50rem] w-[50rem] rounded-full opacity-10"
          style={{ background: `radial-gradient(circle, ${COLORS.royalNavy} 0%, transparent 60%)` }}
        />
        <div
          className="absolute top-0 left-0 right-0 h-[1px]"
          style={{ background: `linear-gradient(90deg, transparent, ${COLORS.champagneGold}60, transparent)` }}
        />
      </div>

      <div className="relative mx-auto grid w-full max-w-6xl grid-cols-1 md:grid-cols-2 gap-0 md:gap-12 px-4 sm:px-6 min-h-[100dvh]">
        <motion.aside
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className="hidden md:flex flex-col justify-center py-16"
        >
          <div className="max-w-md">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <div className="flex items-center gap-2 mb-6">
                <div className="h-[1px] w-8" style={{ background: COLORS.champagneGold }} />
                <span
                  className="text-xs font-semibold uppercase tracking-[0.2em]"
                  style={{ color: COLORS.champagneGold }}
                >
                  {asideBadge}
                </span>
              </div>
              <h1 className="text-4xl leading-[1.15] font-bold mb-5" style={{ color: COLORS.ivory }}>
                {isOperator ? (
                  <>
                    <span style={{ color: COLORS.champagneGold }}>{t('header.operator_login')}</span>
                    <br />
                    <span className="text-2xl font-semibold mt-2 block" style={{ color: COLORS.platinum }}>
                      {t('auth.aside_operator_subline')}
                    </span>
                  </>
                ) : isStore ? (
                  <>
                    <span style={{ color: COLORS.champagneGold }}>{t('auth.store_aside_kicker')}</span>
                    <br />
                    <span className="text-2xl font-semibold mt-2 block" style={{ color: COLORS.platinum }}>
                      {t('auth.store_aside_subline')}
                    </span>
                  </>
                ) : (
                  <>
                    {t('auth.find_second_bar')}
                    <br />
                    <span style={{ color: COLORS.champagneGold }}>{t('auth.vacancy_map')}</span>
                  </>
                )}
              </h1>
              <p className="text-base leading-relaxed" style={{ color: COLORS.platinum }}>
                {isOperator || isStore ? roleHint : t('auth.vacancy_map_desc')}
              </p>
            </motion.div>

            {isCustomer && (
              <>
                <div className="flex items-center gap-3 my-8">
                  <div
                    className="h-px flex-1"
                    style={{
                      background: `linear-gradient(90deg, transparent, ${COLORS.champagneGold}30)`,
                    }}
                  />
                  <div
                    className="w-1.5 h-1.5 rotate-45"
                    style={{ backgroundColor: COLORS.champagneGold + '60' }}
                  />
                  <div
                    className="h-px flex-1"
                    style={{
                      background: `linear-gradient(90deg, ${COLORS.champagneGold}30, transparent)`,
                    }}
                  />
                </div>

                <div className="space-y-3">
                  {features.map((f, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.4 + i * 0.1 }}
                      className="flex items-start gap-4 p-4 rounded-xl"
                      style={{
                        background: 'rgba(201, 168, 108, 0.06)',
                        border: `1px solid rgba(201, 168, 108, 0.12)`,
                      }}
                    >
                      <div
                        className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                        style={{ background: 'rgba(201, 168, 108, 0.12)' }}
                      >
                        <f.icon className="w-4 h-4" style={{ color: COLORS.champagneGold }} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold" style={{ color: COLORS.champagneGold }}>
                          {f.title}
                        </p>
                        <p className="text-xs mt-0.5 leading-relaxed" style={{ color: COLORS.platinum }}>
                          {f.desc}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </>
            )}

            {isOperator && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.45 }}
                className="mt-10 flex items-start gap-4 p-4 rounded-xl"
                style={{
                  background: 'rgba(201, 168, 108, 0.06)',
                  border: `1px solid rgba(201, 168, 108, 0.12)`,
                }}
              >
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(201, 168, 108, 0.12)' }}
                >
                  <Shield className="w-4 h-4" style={{ color: COLORS.champagneGold }} />
                </div>
                <p className="text-sm leading-relaxed" style={{ color: COLORS.platinum }}>
                  {roleHint}
                </p>
              </motion.div>
            )}

            {isStore && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.45 }}
                className="mt-10 flex items-start gap-4 p-4 rounded-xl"
                style={{
                  background: 'rgba(34, 197, 94, 0.06)',
                  border: '1px solid rgba(34, 197, 94, 0.12)',
                }}
              >
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(34, 197, 94, 0.12)' }}
                >
                  <Building2 className="w-4 h-4" style={{ color: '#4ade80' }} />
                </div>
                <p className="text-sm leading-relaxed" style={{ color: COLORS.platinum }}>{t('auth.store_aside_blurb')}</p>
              </motion.div>
            )}

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="flex items-center gap-2.5 mt-12"
            >
              <img src={LOGO_URL} alt="NIKENME+" className="w-7 h-7 opacity-60" />
              <span className="text-xs font-medium" style={{ color: COLORS.warmGray }}>
                © {new Date().getFullYear()} NIKENME+
              </span>
            </motion.div>
          </div>
        </motion.aside>

        <motion.section
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="flex items-center justify-center py-12 md:py-16"
        >
          <div className="w-full max-w-[420px]">
            <div className="md:hidden flex flex-col items-center mb-8">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-2 mb-2"
              >
                {isOperator ? (
                  <Shield className="w-4 h-4" style={{ color: COLORS.champagneGold }} />
                ) : isStore ? (
                  <Building2 className="w-4 h-4" style={{ color: '#4ade80' }} />
                ) : (
                  <Sparkles className="w-4 h-4" style={{ color: COLORS.champagneGold }} />
                )}
                <span
                  className="text-xs tracking-[0.15em] uppercase font-medium"
                  style={{ color: COLORS.champagneGold + '90' }}
                >
                  {asideBadge}
                </span>
              </motion.div>
            </div>

            <div
              className="rounded-2xl p-7 sm:p-8 bg-popover"
              style={{
                border: `1px solid rgba(201, 168, 108, 0.1)`,
                boxShadow: '0 25px 80px rgba(0, 0, 0, 0.35), 0 0 0 1px rgba(255,255,255,0.04)',
              }}
            >
              <div className="text-center mb-8">
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <h2 className="text-2xl font-bold tracking-tight" style={{ color: COLORS.deepNavy }}>
                    {titleText}
                  </h2>
                  <p className="text-sm mt-2 text-muted-foreground">
                    {loginSubtitle}
                  </p>
                  <p className="text-xs mt-3 leading-relaxed px-1 text-muted-foreground">
                    {roleHint}
                  </p>
                </motion.div>
              </div>

              {sessionMismatch && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-6 rounded-xl p-4 text-sm space-y-3 bg-warning/10 text-warning border border-warning/30"
                >
                  <p>
                    {isOperator
                      ? t('auth.session_mismatch_operator')
                      : isStore
                        ? t('auth.session_mismatch_on_store_login')
                        : t('auth.session_mismatch_store')}
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full border-warning/30 text-warning"
                    onClick={async () => {
                      await signOut();
                      toast.success(t('auth.logout_success'));
                    }}
                  >
                    {t('auth.logout')}
                  </Button>
                </motion.div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="space-y-1.5"
                >
                  <Label htmlFor="email" className="text-xs font-semibold" style={{ color: COLORS.deepNavy }}>
                    {t('auth.email')}
                  </Label>
                  <div className="relative">
                    <Mail
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
                      style={{ color: COLORS.champagneGold }}
                    />
                    <Input
                      id="email"
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-11 h-12 text-sm rounded-xl border-2 border-border bg-muted transition-all duration-200 focus:border-brass-500 focus:ring-2 focus:ring-brass-500/20"
                      style={{
                        fontSize: '16px',
                        color: COLORS.deepNavy,
                      }}
                      required
                    />
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.35 }}
                  className="space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <Label
                      htmlFor="password"
                      className="text-xs font-semibold"
                      style={{ color: COLORS.deepNavy }}
                    >
                      {t('auth.password')}
                    </Label>
                    <Link
                      href="/auth/forgot-password"
                      className="text-[11px] font-medium transition-colors hover:opacity-80"
                      style={{ color: COLORS.champagneGold }}
                    >
                      {t('auth.forgot_password')}
                    </Link>
                  </div>
                  <div className="relative">
                    <Lock
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 z-10 pointer-events-none"
                      style={{ color: COLORS.champagneGold }}
                    />
                    <PasswordInput
                      id="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-11 h-12 text-sm rounded-xl border-2 border-border bg-muted transition-all duration-200 focus:border-brass-500 focus:ring-2 focus:ring-brass-500/20"
                      style={{
                        fontSize: '16px',
                        color: COLORS.deepNavy,
                      }}
                      autoComplete="current-password"
                      required
                    />
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  <Button
                    type="submit"
                    className="w-full h-12 text-sm font-bold rounded-xl shadow-lg transition-all duration-200 mt-1 group"
                    style={{
                      background: COLORS.goldGradient,
                      color: COLORS.deepNavy,
                      boxShadow: '0 6px 24px rgba(201, 168, 108, 0.35)',
                    }}
                    disabled={loading || sessionMismatch}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        {t('auth.logging_in')}
                      </>
                    ) : (
                      <span className="flex items-center gap-2">
                        {t('auth.login')}
                      </span>
                    )}
                  </Button>
                </motion.div>
              </form>

              {isCustomer && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.45 }}
                  className="mt-5"
                >
                  <div className="flex items-center gap-3 my-4" aria-hidden>
                    <div className="flex-1 h-px bg-border" />
                    <span className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground font-semibold">
                      {t('auth.or_continue_with')}
                    </span>
                    <div className="flex-1 h-px bg-border" />
                  </div>
                  <Button
                    type="button"
                    onClick={handleLineLogin}
                    disabled={!liffAvailable || lineLoading || !isLiffReady}
                    className={`w-full h-12 text-sm font-bold rounded-xl transition-all duration-200 text-white ${liffAvailable ? '' : 'bg-muted-foreground'}`}
                    style={{
                      background: liffAvailable ? LINE_BRAND : undefined,
                      boxShadow: liffAvailable ? '0 6px 24px rgba(6, 199, 85, 0.35)' : undefined,
                    }}
                  >
                    {lineLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        {t('auth.login_with_line_progress')}
                      </>
                    ) : (
                      <span className="flex items-center justify-center gap-2">
                        <LineAppIcon className="w-[1.15rem] h-[1.15rem] shrink-0" />
                        {t('auth.login_with_line')}
                      </span>
                    )}
                  </Button>
                  {!liffAvailable && (
                    <p className="mt-2 text-[11px] text-center text-muted-foreground">
                      {t('auth.line_login_unavailable')}
                    </p>
                  )}
                  {liffAvailable && lineInClient === false && (
                    <p className="mt-2 text-[11px] text-center text-muted-foreground leading-relaxed">
                      {t('auth.line_login_browser_note')}
                    </p>
                  )}
                </motion.div>
              )}

              <div className="mt-5 flex flex-col gap-2 text-center text-xs">
                {isCustomer && (
                  <>
                    <Link
                      href="/register?role=customer"
                      className="font-medium transition-colors hover:opacity-80"
                      style={{ color: COLORS.champagneGold }}
                    >
                      {t('auth.customer_signup_cta')}
                    </Link>
                    <Link
                      href="/login/store"
                      className="font-medium transition-colors hover:opacity-80"
                      style={{ color: COLORS.champagneGold }}
                    >
                      {t('auth.login_switch_to_store')}
                    </Link>
                    <Link
                      href="/login/operator"
                      className="font-medium transition-colors hover:opacity-80"
                      style={{ color: COLORS.champagneGold }}
                    >
                      {t('auth.login_switch_to_operator')}
                    </Link>
                  </>
                )}
                {isOperator && (
                  <>
                    <Link
                      href="/login/store"
                      className="font-medium transition-colors hover:opacity-80"
                      style={{ color: COLORS.champagneGold }}
                    >
                      {t('auth.login_switch_to_store')}
                    </Link>
                    <Link
                      href="/login/customer"
                      className="font-medium transition-colors hover:opacity-80"
                      style={{ color: COLORS.champagneGold }}
                    >
                      {t('auth.login_switch_to_customer')}
                    </Link>
                  </>
                )}
                {isStore && (
                  <>
                    <Link
                      href="/login/operator"
                      className="font-medium transition-colors hover:opacity-80"
                      style={{ color: COLORS.champagneGold }}
                    >
                      {t('auth.login_switch_to_operator')}
                    </Link>
                    <Link
                      href="/login/customer"
                      className="font-medium transition-colors hover:opacity-80"
                      style={{ color: COLORS.champagneGold }}
                    >
                      {t('auth.login_switch_to_customer')}
                    </Link>
                  </>
                )}
              </div>

              <div className="mt-6 text-center">
                <Link
                  href="/landing"
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:opacity-80"
                >
                  <Home className="w-3.5 h-3.5" />
                  {t('auth.back_to_home')}
                </Link>
              </div>
            </div>

            <div className="md:hidden flex items-center justify-center gap-2 mt-8">
              <img src={LOGO_URL} alt="NIKENME+" className="w-6 h-6 opacity-50" />
              <span className="text-[11px]" style={{ color: COLORS.warmGray + '80' }}>
                © {new Date().getFullYear()} NIKENME+
              </span>
            </div>
          </div>
        </motion.section>
      </div>
    </div>
  );
}

export function LoginFormFallback() {
  const { colorsB: COLORS } = useAppMode();
  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;
    const prevRoot = root.style.background;
    const prevBody = body.style.background;
    const prevBodyColor = body.style.backgroundColor;
    const bg = COLORS.luxuryGradient;
    root.style.background = bg;
    body.style.background = bg;
    body.style.backgroundColor = '';
    return () => {
      root.style.background = prevRoot;
      body.style.background = prevBody;
      body.style.backgroundColor = prevBodyColor;
    };
  }, [COLORS.luxuryGradient]);
  return (
    <div
      className="min-h-[100dvh] flex items-center justify-center"
      style={{ background: COLORS.luxuryGradient }}
    >
      <Loader2 className="w-8 h-8 animate-spin" style={{ color: COLORS.champagneGold }} />
    </div>
  );
}
