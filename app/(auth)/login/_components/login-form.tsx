'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { Mail, Lock, Loader2, Home, Sparkles, MapPin, Zap, CheckCircle2 } from 'lucide-react';
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

const LINE_BRAND_ICON_URL =
  'https://res.cloudinary.com/dz9trbwma/image/upload/f_auto,q_auto/v1776852523/LINE_Brand_icon_zfypmz.png';

const LINE_BRAND = '#06C755';

const HERO_IMAGES = [
  'https://res.cloudinary.com/dz9trbwma/image/upload/f_auto,q_auto/v1774355369/brian-jones-YBlcnXfv9OM-unsplash_orpuaz.jpg',
  'https://res.cloudinary.com/dz9trbwma/image/upload/f_auto,q_auto/v1772501853/masahiro-miyagi-RLDNGblOqHU-unsplash_zadhp8.jpg',
  'https://res.cloudinary.com/dz9trbwma/image/upload/f_auto,q_auto/v1774355344/romeo-a-P8dzevR1yE4-unsplash_enlnhr.jpg',
  'https://res.cloudinary.com/dz9trbwma/image/upload/f_auto,q_auto/v1772501853/patrick-tomasso-GXXYkSwndP4-unsplash_w4c9df.jpg',
  'https://res.cloudinary.com/dz9trbwma/image/upload/f_auto,q_auto/v1772501860/drew-beamer-bTN-zKFy9uA-unsplash_kmcnyo.jpg',
];

const LP_NAVY = '#0A1628';

export function LoginForm() {
  const { colorsB: COLORS } = useAppMode();
  const router = useRouter();
  const searchParams = useSearchParams();

  const redirectTo = useMemo(() => {
    const r = searchParams.get('redirect');
    if (!r) return null;
    if (!r.startsWith('/') || r.startsWith('//')) return null;
    return r;
  }, [searchParams]);

  const { signIn, signInWithLine, user, accountType, store, loading: authLoading } = useAuth();
  const { isLiffReady } = useLiff();
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [lineLoading, setLineLoading] = useState(false);
  const [heroImageIndex, setHeroImageIndex] = useState(0);

  useEffect(() => {
    HERO_IMAGES.forEach((src) => {
      const img = new Image();
      img.src = src;
    });
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setHeroImageIndex((prev) => (prev + 1) % HERO_IMAGES.length);
    }, 4500);
    return () => clearInterval(interval);
  }, []);

  const liffAvailable = Boolean(process.env.NEXT_PUBLIC_LIFF_ID);

  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;
    const prevRoot = root.style.background;
    const prevBody = body.style.background;
    const prevBodyColor = body.style.backgroundColor;
    const bg = COLORS.cardGradient;
    root.style.background = bg;
    body.style.background = bg;
    body.style.backgroundColor = '';
    return () => {
      root.style.background = prevRoot;
      body.style.background = prevBody;
      body.style.backgroundColor = prevBodyColor;
    };
  }, [COLORS.cardGradient]);

  // ログイン済みなら役割に応じて自動遷移
  useEffect(() => {
    if (authLoading || !user) return;
    if (accountType === 'platform') {
      router.replace('/store/manage');
    } else if (accountType === 'store' && store?.id) {
      router.replace(`/store/manage/${store.id}/update`);
    } else if (accountType === 'customer') {
      router.replace(redirectTo ?? '/map');
    }
  }, [authLoading, user, accountType, store, redirectTo, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await signIn(email, password);
      if (result.error) {
        toast.error(t('auth.login_failed'), { description: t('auth.login_failed_desc') });
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
      className="min-h-[100dvh] relative overflow-hidden lg:grid lg:grid-cols-2"
      style={{ background: COLORS.cardGradient }}
    >
      {/* ===== Desktop-only: Left Hero Panel ===== */}
      <aside
        className="hidden lg:flex relative overflow-hidden flex-col justify-between p-12 xl:p-16"
        style={{ background: LP_NAVY, minHeight: '100dvh' }}
      >
        {/* Rotating hero background */}
        <div className="absolute inset-0 z-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={heroImageIndex}
              initial={{ opacity: 0, scale: 1.05 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.2, ease: 'easeOut' }}
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url('${HERO_IMAGES[heroImageIndex]}')` }}
            />
          </AnimatePresence>
          {/* Dark overlay for readability */}
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(135deg, rgba(10,22,40,0.88) 0%, rgba(10,22,40,0.7) 45%, rgba(19,41,75,0.82) 100%)`,
            }}
          />
          <div
            className="absolute inset-0"
            style={{
              background: `radial-gradient(circle at 20% 0%, ${COLORS.champagneGold}22 0%, transparent 55%)`,
            }}
          />
        </div>

        {/* Top: Kicker + Logo */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative z-10 flex items-center gap-3"
        >
          <img src={LOGO_URL} alt="NIKENME+" className="w-9 h-9" />
          <div className="flex flex-col">
            <span
              className="text-[10px] tracking-[0.25em] uppercase font-semibold"
              style={{ color: COLORS.champagneGold }}
            >
              Night Discovery Platform
            </span>
            <span className="text-base font-bold text-white">NIKENME+</span>
          </div>
        </motion.div>

        {/* Middle: Hero copy */}
        <div className="relative z-10 space-y-6 max-w-xl">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="text-4xl xl:text-5xl font-bold tracking-tight text-white leading-[1.15]"
          >
            {t('landing.hero_pc_title').split('\n').map((line, i, arr) => (
              <span key={i}>
                {line}
                {i < arr.length - 1 && <br />}
              </span>
            ))}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="text-base xl:text-lg leading-relaxed"
            style={{ color: 'rgba(255,255,255,0.82)' }}
          >
            {t('landing.hero_pc_description')}
          </motion.p>

          {/* Floating availability chip */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            className="inline-flex items-center gap-3 px-4 py-3 rounded-2xl"
            style={{
              background: 'rgba(255,255,255,0.08)',
              backdropFilter: 'blur(20px)',
              border: `1px solid ${COLORS.champagneGold}4d`,
              boxShadow: '0 12px 32px rgba(0,0,0,0.3)',
            }}
          >
            <motion.span
              animate={{ scale: [1, 1.3, 1], opacity: [1, 0.6, 1] }}
              transition={{ duration: 1.6, repeat: Infinity }}
              className="w-2.5 h-2.5 rounded-full"
              style={{ background: '#4ADE80', boxShadow: '0 0 10px #4ADE80' }}
            />
            <div>
              <p className="text-sm font-semibold text-white">
                {t('landing.seats_available')}
              </p>
              <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.6)' }}>
                {t('landing.hero_subcopy')}
              </p>
            </div>
          </motion.div>
        </div>

        {/* Bottom: Feature cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.4 }}
          className="relative z-10 space-y-3"
        >
          {[
            { icon: MapPin, title: t('landing.benefit_quick_check'), desc: t('landing.benefit_quick_check_desc') },
            { icon: Zap, title: t('landing.benefit_one_tap'), desc: t('landing.benefit_one_tap_desc') },
          ].map((item) => (
            <div
              key={item.title}
              className="flex items-center gap-3 p-3.5 rounded-xl"
              style={{
                background: 'rgba(255,255,255,0.06)',
                backdropFilter: 'blur(12px)',
                border: '1px solid rgba(255,255,255,0.1)',
              }}
            >
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: `${COLORS.champagneGold}26`, border: `1px solid ${COLORS.champagneGold}4d` }}
              >
                <item.icon className="w-4 h-4" style={{ color: COLORS.champagneGold }} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white truncate">{item.title}</p>
                <p className="text-xs" style={{ color: 'rgba(255,255,255,0.6)' }}>
                  {item.desc}
                </p>
              </div>
              <CheckCircle2 className="w-4 h-4 ml-auto shrink-0" style={{ color: COLORS.champagneGold }} />
            </div>
          ))}
        </motion.div>
      </aside>

      {/* Subtle decorative accents on off-white (right side / mobile) */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden lg:hidden">
        <div
          className="absolute -top-48 -left-48 h-[44rem] w-[44rem] rounded-full"
          style={{
            background: `radial-gradient(circle, ${COLORS.champagneGold}1f 0%, transparent 60%)`,
          }}
        />
        <div
          className="absolute -bottom-56 -right-40 h-[44rem] w-[44rem] rounded-full"
          style={{
            background: `radial-gradient(circle, ${COLORS.royalNavy}26 0%, transparent 60%)`,
          }}
        />
        <div
          className="absolute top-0 left-0 right-0 h-[2px]"
          style={{
            background: `linear-gradient(90deg, transparent, ${COLORS.champagneGold}, transparent)`,
          }}
        />
      </div>

      {/* ===== Right: Login Form (= mobile full layout) ===== */}
      <div className="relative mx-auto flex w-full max-w-2xl lg:max-w-xl px-4 sm:px-6 min-h-[100dvh] items-center justify-center py-10">
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full"
        >
          <div className="w-full max-w-[460px] mx-auto">
            <div className="flex flex-col items-center mb-6">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-2 mb-2"
              >
                <img src={LOGO_URL} alt="NIKENME+" className="w-5 h-5" />
                <Sparkles className="w-3.5 h-3.5" style={{ color: COLORS.champagneGold }} />
                <span
                  className="text-[11px] tracking-[0.2em] uppercase font-semibold"
                  style={{ color: COLORS.antiqueGold }}
                >
                  {t('auth.login_hero_kicker') || 'NIKENME+'}
                </span>
              </motion.div>
            </div>

            <div
              className="rounded-2xl p-7 sm:p-9"
              style={{
                background: '#ffffff',
                border: `1px solid ${COLORS.champagneGold}33`,
                boxShadow:
                  '0 18px 48px rgba(19, 41, 75, 0.12), 0 4px 12px rgba(19, 41, 75, 0.06)',
              }}
            >
              <div className="text-center mb-8">
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <h2
                    className="text-2xl font-bold tracking-tight"
                    style={{ color: COLORS.deepNavy }}
                  >
                    {t('auth.login_heading')}
                  </h2>
                  <p
                    className="text-sm mt-2 leading-relaxed"
                    style={{ color: COLORS.warmGray }}
                  >
                    {t('auth.login_tagline')}
                  </p>
                </motion.div>
              </div>

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
                    disabled={loading}
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

              {liffAvailable && (
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
                    disabled={lineLoading || !isLiffReady}
                    className="w-full h-12 text-sm font-bold rounded-xl transition-all duration-200 text-white"
                    style={{
                      background: LINE_BRAND,
                      boxShadow: '0 6px 24px rgba(6, 199, 85, 0.35)',
                    }}
                  >
                    {lineLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        {t('auth.login_with_line_progress')}
                      </>
                    ) : (
                      <span className="flex items-center justify-center gap-2">
                        <img
                          src={LINE_BRAND_ICON_URL}
                          alt=""
                          width={22}
                          height={22}
                          className="w-[1.15rem] h-[1.15rem] shrink-0 object-contain"
                          loading="eager"
                          fetchPriority="high"
                        />
                        {t('auth.login_with_line')}
                      </span>
                    )}
                  </Button>
                </motion.div>
              )}

              <div className="mt-5 flex flex-col gap-2 text-center text-xs">
                <Link
                  href="/register?role=customer"
                  className="font-medium transition-colors hover:opacity-80 mt-2"
                  style={{ color: COLORS.champagneGold }}
                >
                  {t('auth.customer_signup_cta')}
                </Link>
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

            <div className="flex items-center justify-center gap-2 mt-8">
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
    const bg = COLORS.cardGradient;
    root.style.background = bg;
    body.style.background = bg;
    body.style.backgroundColor = '';
    return () => {
      root.style.background = prevRoot;
      body.style.background = prevBody;
      body.style.backgroundColor = prevBodyColor;
    };
  }, [COLORS.cardGradient]);
  return (
    <div
      className="min-h-[100dvh] flex items-center justify-center"
      style={{ background: COLORS.cardGradient }}
    >
      <Loader2 className="w-8 h-8 animate-spin" style={{ color: COLORS.champagneGold }} />
    </div>
  );
}
