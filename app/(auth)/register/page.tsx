'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Mail, Lock, User as UserIcon, Loader2, AlertCircle, Sparkles, Home } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PasswordInput } from '@/components/ui/password-input';
import { useAuth } from '@/lib/auth/context';
import { useLanguage } from '@/lib/i18n/context';
import { useAppMode } from '@/lib/app-mode-context';
import { toast } from 'sonner';

const LOGO_URL =
  'https://res.cloudinary.com/dz9trbwma/image/upload/f_auto,q_auto/v1761355092/%E3%82%B5%E3%83%BC%E3%83%93%E3%82%B9%E3%82%A2%E3%82%A4%E3%82%B3%E3%83%B3_dggltf.png';

export default function RegisterPage() {
  const router = useRouter();
  const { signUp } = useAuth();
  const { t } = useLanguage();
  const { colorsB: COLORS } = useAppMode();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage('');

    try {
      if (!displayName.trim()) {
        const msg = t('auth.signup_error_display_name_required');
        setErrorMessage(msg);
        toast.error(msg);
        setLoading(false);
        return;
      }

      if (!email.trim()) {
        const msg = t('auth.signup_error_email_required');
        setErrorMessage(msg);
        toast.error(msg);
        setLoading(false);
        return;
      }

      if (password.length < 6) {
        const msg = t('auth.signup_error_password_too_short');
        setErrorMessage(msg);
        toast.error(msg);
        setLoading(false);
        return;
      }

      const { error } = await signUp(email, password, displayName);

      if (error) {
        let msg = t('auth.signup_failed');
        if (error.message.includes('already registered') || error.message.includes('already exists')) {
          msg = t('auth.signup_error_email_in_use');
        } else if (error.message.includes('invalid email')) {
          msg = t('auth.signup_error_email_invalid');
        } else if (error.message.includes('weak password')) {
          msg = t('auth.signup_error_weak_password');
        } else if (error.message) {
          msg = error.message;
        }
        setErrorMessage(msg);
        toast.error(t('auth.signup_failed'), { description: msg });
        return;
      }

      toast.success(t('auth.signup_success'), {
        description: t('auth.signup_success_desc'),
        position: 'top-center',
        duration: 3000,
      });
      router.push('/login?registered=1');
    } catch (error) {
      const msg = error instanceof Error ? error.message : t('common.error_occurred');
      setErrorMessage(msg);
      toast.error(t('common.error_occurred'), { description: msg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-[100dvh] relative overflow-hidden"
      style={{ background: COLORS.cardGradient }}
    >
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
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
      <div className="relative mx-auto flex w-full max-w-2xl px-4 sm:px-6 min-h-[100dvh] items-center justify-center py-10">
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full"
        >
          <div className="w-full max-w-[460px] mx-auto">
            <div className="flex flex-col items-center mb-6">
              <div className="flex items-center gap-2 mb-2">
                <img src={LOGO_URL} alt="NIKENME+" className="w-5 h-5" />
                <Sparkles className="w-3.5 h-3.5" style={{ color: COLORS.champagneGold }} />
                <span
                  className="text-[11px] tracking-[0.2em] uppercase font-semibold"
                  style={{ color: COLORS.antiqueGold }}
                >
                  NIKENME+
                </span>
              </div>
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
                <h1 className="text-2xl font-bold tracking-tight" style={{ color: COLORS.deepNavy }}>
                  {t('auth.customer_signup_title')}
                </h1>
                <p className="text-sm mt-2 leading-relaxed" style={{ color: COLORS.warmGray }}>
                  {t('auth.customer_signup_subtitle')}
                </p>
              </div>

              {errorMessage && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-6 p-4 rounded-xl flex items-start gap-3"
                  style={{
                    background: 'hsl(3 48% 47% / 0.08)',
                    border: '1px solid hsl(3 48% 47% / 0.3)',
                  }}
                >
                  <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                  <p className="text-sm font-medium text-destructive">{errorMessage}</p>
                </motion.div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-1.5">
                  <Label
                    htmlFor="displayName"
                    className="text-xs font-semibold"
                    style={{ color: COLORS.deepNavy }}
                  >
                    {t('auth.display_name')}
                  </Label>
                  <div className="relative">
                    <UserIcon
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
                      style={{ color: COLORS.champagneGold }}
                    />
                    <Input
                      id="displayName"
                      type="text"
                      placeholder={t('auth.display_name_placeholder')}
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="pl-11 h-12 text-sm rounded-xl border-2 border-border bg-muted transition-all duration-200 focus:border-brass-500 focus:ring-2 focus:ring-brass-500/20"
                      style={{ fontSize: '16px', color: COLORS.deepNavy }}
                      required
                      disabled={loading}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label
                    htmlFor="email"
                    className="text-xs font-semibold"
                    style={{ color: COLORS.deepNavy }}
                  >
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
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-11 h-12 text-sm rounded-xl border-2 border-border bg-muted transition-all duration-200 focus:border-brass-500 focus:ring-2 focus:ring-brass-500/20"
                      style={{ fontSize: '16px', color: COLORS.deepNavy }}
                      required
                      disabled={loading}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label
                    htmlFor="password"
                    className="text-xs font-semibold"
                    style={{ color: COLORS.deepNavy }}
                  >
                    {t('auth.password')}
                  </Label>
                  <div className="relative">
                    <Lock
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 z-10 pointer-events-none"
                      style={{ color: COLORS.champagneGold }}
                    />
                    <PasswordInput
                      id="password"
                      placeholder={t('auth.password_placeholder_6')}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-11 h-12 text-sm rounded-xl border-2 border-border bg-muted transition-all duration-200 focus:border-brass-500 focus:ring-2 focus:ring-brass-500/20"
                      style={{ fontSize: '16px', color: COLORS.deepNavy }}
                      required
                      disabled={loading}
                      autoComplete="new-password"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full h-12 text-sm font-bold rounded-xl shadow-lg transition-all duration-200 mt-2"
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
                      {t('auth.signup_loading')}
                    </>
                  ) : (
                    t('auth.signup_button')
                  )}
                </Button>
              </form>

              <div className="mt-6 flex flex-col gap-2 text-center text-xs">
                <p style={{ color: COLORS.warmGray }}>
                  {t('auth.already_have_account')}{' '}
                  <Link
                    href="/login"
                    className="font-semibold hover:opacity-80 transition-opacity"
                    style={{ color: COLORS.champagneGold }}
                  >
                    {t('auth.login')}
                  </Link>
                </p>
              </div>

              <div className="mt-5 text-center">
                <Link
                  href="/landing"
                  className="inline-flex items-center gap-1.5 text-xs font-medium transition-colors hover:opacity-80"
                  style={{ color: COLORS.warmGray }}
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
