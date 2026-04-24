'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { PasswordInput } from '@/components/ui/password-input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { KeyRound, Loader2, Lock } from 'lucide-react';
import { useLanguage } from '@/lib/i18n/context';
import { useAppMode } from '@/lib/app-mode-context';

export default function ResetPasswordPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const { colorsB: COLORS } = useAppMode();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

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

    if (newPassword !== confirmPassword) {
      toast.error(t('auth.password_mismatch'));
      return;
    }

    if (newPassword.length < 6) {
      toast.error(t('auth.password_min_length'));
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      toast.success(t('auth.password_changed'), {
        position: 'top-center',
        duration: 1500,
      });
      router.push('/login');
    } catch (error) {
      console.error('Error:', error);
      toast.error(t('auth.password_change_failed'));
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
              <KeyRound className="h-6 w-6" style={{ color: COLORS.champagneGold }} />
            </div>
            <h1 className="text-2xl font-bold" style={{ color: COLORS.deepNavy }}>
              {t('auth.reset_password')}
            </h1>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label
                htmlFor="newPassword"
                className="text-xs font-semibold"
                style={{ color: COLORS.deepNavy }}
              >
                {t('auth.new_password')}
              </Label>
              <div className="relative">
                <Lock
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 z-10 pointer-events-none"
                  style={{ color: COLORS.champagneGold }}
                />
                <PasswordInput
                  id="newPassword"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder={t('auth.password_placeholder')}
                  required
                  minLength={6}
                  className="pl-11 h-12 text-sm rounded-xl border-2 border-border bg-muted transition-all duration-200 focus:border-brass-500 focus:ring-2 focus:ring-brass-500/20"
                  style={{ fontSize: '16px', color: COLORS.deepNavy }}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label
                htmlFor="confirmPassword"
                className="text-xs font-semibold"
                style={{ color: COLORS.deepNavy }}
              >
                {t('auth.confirm_password')}
              </Label>
              <div className="relative">
                <Lock
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 z-10 pointer-events-none"
                  style={{ color: COLORS.champagneGold }}
                />
                <PasswordInput
                  id="confirmPassword"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder={t('auth.password_confirm_placeholder')}
                  required
                  minLength={6}
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
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {t('auth.changing')}
                </>
              ) : (
                t('auth.change_password')
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
