'use client';

import { motion } from 'framer-motion';
import { Edit, LogOut, Building, Calendar, Key, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/lib/auth/context';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ja, enUS, ko, zhCN } from 'date-fns/locale';
import { useLanguage } from '@/lib/i18n/context';
import { LoadingScreen } from '@/components/ui/loading-screen';

const BG_OFFWHITE = '#F7F3E9';
const NAVY = '#13294b';
const BRASS = '#ffc62d';
const COPPER = '#B87333';
const GOLD_GRADIENT = 'linear-gradient(135deg, #ffc62d 0%, #FFD966 50%, #C9A86C 100%)';
const NAVY_GRADIENT = 'linear-gradient(165deg, #13294b 0%, #1A3562 50%, #1F57A4 100%)';

export default function ProfilePage() {
  const router = useRouter();
  const { user, profile, signOut, accountType, store: userStore } = useAuth();
  const { t, language } = useLanguage();

  const getDateLocale = () => {
    switch (language) {
      case 'en': return enUS;
      case 'ko': return ko;
      case 'zh': return zhCN;
      default: return ja;
    }
  };

  useEffect(() => {
    if (accountType === 'store' && userStore) {
      router.push(`/store/manage/${userStore.id}/update`);
      return;
    }
    if (accountType === 'customer') {
      router.push('/mypage');
      return;
    }
    if (accountType !== 'platform') {
      router.push('/login');
      return;
    }
  }, [accountType, userStore, router]);

  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;
    const prevRoot = root.style.background;
    const prevBody = body.style.background;
    root.style.background = BG_OFFWHITE;
    body.style.background = BG_OFFWHITE;
    return () => {
      root.style.background = prevRoot;
      body.style.background = prevBody;
    };
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      toast.error(t('auth.logout_failed'), { position: 'top-center', duration: 3000 });
    }
  };

  if (!user || !profile) {
    return <LoadingScreen size="lg" />;
  }

  return (
    <div className="min-h-screen pb-20" style={{ background: BG_OFFWHITE }}>
      <header
        className="sticky top-0 z-20 safe-top"
        style={{ background: NAVY_GRADIENT, borderBottom: `1px solid ${BRASS}33` }}
      >
        <div className="flex items-center justify-between p-4 max-w-2xl mx-auto">
          <button
            onClick={() => router.push('/store/manage')}
            className="flex items-center gap-1.5 text-sm font-medium transition-opacity hover:opacity-80"
            style={{ color: '#FDFBF7' }}
          >
            <ArrowLeft className="w-4 h-4" />
            {t('profile.dashboard_back')}
          </button>
          <h1 className="text-lg font-light tracking-[0.2em]" style={{ color: '#FDFBF7' }}>
            {t('profile.title')}
          </h1>
          <div className="w-12" />
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div
            className="rounded-2xl p-6 relative overflow-hidden"
            style={{
              background: 'white',
              border: `1px solid ${BRASS}33`,
              boxShadow: '0 12px 32px rgba(19, 41, 75, 0.10)',
            }}
          >
            <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: GOLD_GRADIENT }} />
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-start gap-4">
                <Avatar
                  className="w-20 h-20"
                  style={{ boxShadow: `0 0 0 2px ${BRASS}66, 0 4px 12px rgba(19, 41, 75, 0.12)` }}
                >
                  <AvatarImage src={profile.avatar_url || undefined} />
                  <AvatarFallback
                    className="text-2xl"
                    style={{ background: NAVY, color: BRASS, fontWeight: 700 }}
                  >
                    {profile.display_name[0]}
                  </AvatarFallback>
                </Avatar>

                <div>
                  <h2 className="text-2xl font-bold mb-1" style={{ color: NAVY }}>
                    {profile.display_name}
                  </h2>
                  <p className="text-sm mb-2" style={{ color: 'rgba(19, 41, 75, 0.65)' }}>
                    {user.email}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {profile.role === 'admin' && (
                      <Badge
                        variant="secondary"
                        style={{ background: `${BRASS}20`, color: NAVY, border: `1px solid ${BRASS}66` }}
                      >
                        <Building className="w-3 h-3 mr-1" />
                        {t('profile.business_account')}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              <Button
                variant="outline"
                size="icon"
                onClick={() => router.push('/profile/edit')}
                style={{
                  background: 'white',
                  color: NAVY,
                  border: `1.5px solid ${BRASS}60`,
                }}
              >
                <Edit className="w-4 h-4" />
              </Button>
            </div>

            {profile.bio && (
              <p className="text-sm mb-6 whitespace-pre-wrap" style={{ color: 'rgba(19, 41, 75, 0.8)' }}>
                {profile.bio}
              </p>
            )}

            <div
              className="flex items-center gap-4 text-sm pb-6 border-b"
              style={{ color: 'rgba(19, 41, 75, 0.6)', borderColor: `${BRASS}30` }}
            >
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4" style={{ color: COPPER }} />
                <span>
                  {t('profile.member_since').replace(
                    '{date}',
                    format(
                      new Date(profile.created_at ?? Date.now()),
                      language === 'ja' ? 'yyyy年M月' : 'MMM yyyy',
                      { locale: getDateLocale() }
                    )
                  )}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-6 space-y-2">
            <Button
              variant="outline"
              className="w-full justify-start h-12 rounded-xl font-medium"
              onClick={() => router.push('/profile/change-password')}
              style={{
                background: 'white',
                color: NAVY,
                border: `1px solid ${BRASS}55`,
              }}
            >
              <Key className="w-4 h-4 mr-2" style={{ color: COPPER }} />
              {t('auth.change_password')}
            </Button>

            <Button
              variant="outline"
              className="w-full justify-start h-12 rounded-xl font-medium"
              onClick={handleSignOut}
              style={{
                background: 'white',
                color: '#dc2626',
                border: '1px solid rgba(220, 38, 38, 0.35)',
              }}
            >
              <LogOut className="w-4 h-4 mr-2" />
              {t('auth.logout')}
            </Button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
