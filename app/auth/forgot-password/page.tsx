'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { ArrowLeft, Loader2, Mail, MailCheck } from 'lucide-react';
import { useLanguage } from '@/lib/i18n/context';
import { useAppMode } from '@/lib/app-mode-context';

export default function ForgotPasswordPage() {
  const { t } = useLanguage();
  const { colorsB: COLORS } = useAppMode();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

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

    const trimmed = email.trim();
    if (!trimmed) {
      toast.error(t('auth.forgot_password_email_required'));
      return;
    }

    setLoading(true);
    try {
      const redirectTo = `${window.location.origin}/auth/reset-password`;
      const { error } = await supabase.auth.resetPasswordForEmail(trimmed, { redirectTo });
      if (error) throw error;

      setSent(true);
      toast.success(t('auth.forgot_password_sent_title'), {
        position: 'top-center',
        duration: 2000,
      });
    } catch (error) {
      console.error('Password reset request failed:', error);
      toast.error(t('auth.forgot_password_failed'), {
        description: error instanceof Error ? error.message : undefined,
      });
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
      </div>
      <div className="relative flex items-center justify-center p-4 min-h-[100dvh]">
        <div
          className="w-full max-w-md rounded-2xl p-7 sm:p-9"
          style={{
            background: '#ffffff',
            border: `1px solid ${COLORS.champagneGold}33`,
            boxShadow:
              '0 18px 48px rgba(19, 41, 75, 0.12), 0 4px 12px rgba(19, 41, 75, 0.06)',
          }}
        >
          <div className="mb-6 text-center">
            <div
              className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full"
              style={{
                background: `${COLORS.champagneGold}20`,
                border: `1px solid ${COLORS.champagneGold}50`,
              }}
            >
              {sent ? (
                <MailCheck className="h-6 w-6" style={{ color: COLORS.champagneGold }} />
              ) : (
                <Mail className="h-6 w-6" style={{ color: COLORS.champagneGold }} />
              )}
            </div>
            <h1 className="text-2xl font-bold" style={{ color: COLORS.deepNavy }}>
              {sent ? t('auth.forgot_password_sent_title') : t('auth.forgot_password_title')}
            </h1>
            <p className="mt-2 text-sm leading-relaxed" style={{ color: COLORS.warmGray }}>
              {sent ? t('auth.forgot_password_sent_desc') : t('auth.forgot_password_subtitle')}
            </p>
          </div>

          {!sent && (
            <form onSubmit={handleSubmit} className="space-y-4">
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
                    inputMode="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loading}
                    className="pl-11 h-12 text-sm rounded-xl border-2 border-border bg-muted transition-all duration-200 focus:border-brass-500 focus:ring-2 focus:ring-brass-500/20"
                    style={{ fontSize: '16px', color: COLORS.deepNavy }}
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
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t('auth.forgot_password_sending')}
                  </>
                ) : (
                  t('auth.forgot_password_send')
                )}
              </Button>
            </form>
          )}

          <div className="mt-6 text-center">
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 text-xs font-medium transition-colors hover:opacity-80"
              style={{ color: COLORS.warmGray }}
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              {t('auth.forgot_password_back_to_login')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
