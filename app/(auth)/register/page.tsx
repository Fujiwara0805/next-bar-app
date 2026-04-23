'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Mail, Lock, User as UserIcon, Loader2, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/lib/auth/context';
import { useLanguage } from '@/lib/i18n/context';
import { toast } from 'sonner';

export default function RegisterPage() {
  const router = useRouter();
  const { signUp } = useAuth();
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

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
    <div className="min-h-screen flex flex-col bg-background">
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="w-full max-w-md"
        >
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2">{t('auth.customer_signup_title')}</h1>
            <p className="text-muted-foreground">{t('auth.customer_signup_subtitle')}</p>
          </div>

          {errorMessage && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-4 bg-destructive/10 border border-destructive/30 rounded-lg flex items-start gap-3"
            >
              <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
              <p className="text-sm font-medium text-destructive">{errorMessage}</p>
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="displayName">{t('auth.display_name')}</Label>
              <div className="relative">
                <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="displayName"
                  type="text"
                  placeholder={t('auth.display_name_placeholder')}
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="pl-10"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">{t('auth.email')}</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="email@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">{t('auth.password')}</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder={t('auth.password_placeholder_6')}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
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

          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              {t('auth.already_have_account')}{' '}
              <Link href="/login" className="text-primary font-medium hover:underline">
                {t('auth.login')}
              </Link>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
