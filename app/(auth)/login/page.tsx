'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Mail, Lock, Loader2, Home, ArrowRight, Sparkles, MapPin, Clock, Star } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/lib/auth/context';
import { toast } from 'sonner';
import { PasswordInput } from '@/components/ui/password-input';
import { useLanguage } from '@/lib/i18n/context';
import { useAppMode } from '@/lib/app-mode-context';

const LOGO_URL = 'https://res.cloudinary.com/dz9trbwma/image/upload/f_auto,q_auto/v1761355092/%E3%82%B5%E3%83%BC%E3%83%93%E3%82%B9%E3%82%A2%E3%82%A4%E3%82%B3%E3%83%B3_dggltf.png';

export default function LoginPage() {
  const { colorsB: COLORS } = useAppMode();
  const router = useRouter();
  const { signIn, user, accountType, store, loading: authLoading } = useAuth();
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const prev = document.body.style.backgroundColor;
    document.body.style.backgroundColor = COLORS.deepNavy;
    return () => { document.body.style.backgroundColor = prev; };
  }, [COLORS.deepNavy]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) return;
    if (accountType === 'platform') {
      router.replace('/store/manage');
    } else if (accountType === 'store' && store?.id) {
      router.replace(`/store/manage/${store.id}/update`);
    }
  }, [user, accountType, store, authLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error, accountType, store } = await signIn(email, password);
      if (error) {
        toast.error(t('auth.login_failed'), { description: t('auth.login_failed_desc') });
        return;
      }
      toast.success(t('auth.login_success'), { position: 'top-center', duration: 1000 });
      if (accountType === 'platform') {
        router.push('/store/manage');
      } else if (accountType === 'store') {
        if (store?.id) {
          router.push(`/store/manage/${store.id}/update`);
        } else {
          toast.error(t('auth.store_info_error'));
          return;
        }
      } else {
        router.push('/map');
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

  return (
    <div
      className="min-h-screen relative overflow-hidden"
      style={{ background: COLORS.luxuryGradient }}
    >
      {/* 背景装飾 */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute -top-40 -left-40 h-[50rem] w-[50rem] rounded-full opacity-15"
          style={{ background: `radial-gradient(circle, ${COLORS.champagneGold}25 0%, transparent 60%)` }}
        />
        <div
          className="absolute -bottom-40 -right-40 h-[50rem] w-[50rem] rounded-full opacity-10"
          style={{ background: `radial-gradient(circle, ${COLORS.royalNavy} 0%, transparent 60%)` }}
        />
        <div className="absolute top-0 left-0 right-0 h-[1px]" style={{ background: `linear-gradient(90deg, transparent, ${COLORS.champagneGold}60, transparent)` }} />
      </div>

      {/* 2カラムレイアウト */}
      <div className="relative mx-auto grid w-full max-w-6xl grid-cols-1 md:grid-cols-2 gap-0 md:gap-12 px-4 sm:px-6 min-h-screen">

        {/* 左: ブランドパネル（PC） */}
        <motion.aside
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className="hidden md:flex flex-col justify-center py-16"
        >
          <div className="max-w-md">
            {/* キャッチコピー */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <div className="flex items-center gap-2 mb-6">
                <div className="h-[1px] w-8" style={{ background: COLORS.champagneGold }} />
                <span className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: COLORS.champagneGold }}>
                  Store Management
                </span>
              </div>
              <h1 className="text-4xl leading-[1.15] font-bold mb-5" style={{ color: COLORS.ivory }}>
                {t('auth.find_second_bar')}<br />
                <span style={{ color: COLORS.champagneGold }}>{t('auth.vacancy_map')}</span>
              </h1>
              <p className="text-base leading-relaxed" style={{ color: COLORS.platinum }}>
                {t('auth.vacancy_map_desc')}
              </p>
            </motion.div>

            {/* 区切り線 */}
            <div className="flex items-center gap-3 my-8">
              <div className="h-px flex-1" style={{ background: `linear-gradient(90deg, transparent, ${COLORS.champagneGold}30)` }} />
              <div className="w-1.5 h-1.5 rotate-45" style={{ backgroundColor: COLORS.champagneGold + '60' }} />
              <div className="h-px flex-1" style={{ background: `linear-gradient(90deg, ${COLORS.champagneGold}30, transparent)` }} />
            </div>

            {/* Feature Cards */}
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
                    <p className="text-sm font-semibold" style={{ color: COLORS.champagneGold }}>{f.title}</p>
                    <p className="text-xs mt-0.5 leading-relaxed" style={{ color: COLORS.platinum }}>{f.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Bottom Logo */}
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

        {/* 右: ログインフォーム */}
        <motion.section
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="flex items-center justify-center py-12 md:py-16"
        >
          <div className="w-full max-w-[420px]">
            {/* モバイルロゴ */}
            <div className="md:hidden flex flex-col items-center mb-8">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-2 mb-2"
              >
                <Sparkles className="w-4 h-4" style={{ color: COLORS.champagneGold }} />
                <span className="text-xs tracking-[0.15em] uppercase font-medium" style={{ color: COLORS.champagneGold + '90' }}>
                  Store Management
                </span>
              </motion.div>
            </div>

            {/* カード */}
            <div
              className="rounded-2xl p-7 sm:p-8"
              style={{
                background: '#FFFFFF',
                border: `1px solid rgba(201, 168, 108, 0.1)`,
                boxShadow: '0 25px 80px rgba(0, 0, 0, 0.35), 0 0 0 1px rgba(255,255,255,0.04)',
              }}
            >
              {/* Header */}
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
                    {t('auth.welcome_back')}
                  </h2>
                  <p className="text-sm mt-2" style={{ color: '#64748b' }}>
                    {t('auth.login_to_store')}
                  </p>
                </motion.div>
              </div>

              {/* Form */}
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
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: COLORS.champagneGold }} />
                    <Input
                      id="email"
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-11 h-12 text-sm rounded-xl border-2 transition-all duration-200 focus:border-[#C9A86C] focus:ring-2 focus:ring-[#C9A86C]/20"
                      style={{ fontSize: '16px', borderColor: '#e2e8f0', color: COLORS.deepNavy, background: '#f8fafc' }}
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
                  <Label htmlFor="password" className="text-xs font-semibold" style={{ color: COLORS.deepNavy }}>
                    {t('auth.password')}
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 z-10 pointer-events-none" style={{ color: COLORS.champagneGold }} />
                    <PasswordInput
                      id="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-11 h-12 text-sm rounded-xl border-2 transition-all duration-200 focus:border-[#C9A86C] focus:ring-2 focus:ring-[#C9A86C]/20"
                      style={{ fontSize: '16px', borderColor: '#e2e8f0', color: COLORS.deepNavy, background: '#f8fafc' }}
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
                        <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                      </span>
                    )}
                  </Button>
                </motion.div>
              </form>

              {/* Link */}
              <div className="mt-6 text-center">
                <Link
                  href="/landing"
                  className="inline-flex items-center gap-1.5 text-xs font-medium transition-colors hover:opacity-80"
                  style={{ color: '#94a3b8' }}
                >
                  <Home className="w-3.5 h-3.5" />
                  {t('auth.back_to_home')}
                </Link>
              </div>
            </div>

            {/* Mobile Bottom Logo */}
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
