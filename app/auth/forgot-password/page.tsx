'use client';

import { useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { ArrowLeft, Loader2, Mail, MailCheck } from 'lucide-react';
import { useLanguage } from '@/lib/i18n/context';

export default function ForgotPasswordPage() {
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

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
    <div className="min-h-[100dvh] flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md p-6 sm:p-8">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-brass-500/15">
            {sent ? (
              <MailCheck className="h-6 w-6 text-brass-500" />
            ) : (
              <Mail className="h-6 w-6 text-brass-500" />
            )}
          </div>
          <h1 className="text-2xl font-bold">
            {sent ? t('auth.forgot_password_sent_title') : t('auth.forgot_password_title')}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {sent ? t('auth.forgot_password_sent_desc') : t('auth.forgot_password_subtitle')}
          </p>
        </div>

        {!sent && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">{t('auth.email')}</Label>
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
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
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
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:opacity-80"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {t('auth.forgot_password_back_to_login')}
          </Link>
        </div>
      </Card>
    </div>
  );
}
