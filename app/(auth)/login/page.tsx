'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Mail, Lock, Loader2, Sparkles, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/lib/auth/context';
import { toast } from 'sonner';
import { PasswordInput } from '@/components/ui/password-input';
import { useLanguage } from '@/lib/i18n/context';

// ============================================
// カラーパレット定義（店舗詳細画面準拠）
// ============================================
const COLORS = {
  // プライマリ
  deepNavy: '#0A1628',
  midnightBlue: '#162447',
  royalNavy: '#1F4068',
  
  // アクセント
  champagneGold: '#C9A86C',
  paleGold: '#E8D5B7',
  antiqueGold: '#B8956E',
  
  // ニュートラル
  charcoal: '#2D3436',
  warmGray: '#636E72',
  platinum: '#DFE6E9',
  ivory: '#FDFBF7',
  
  // グラデーション
  luxuryGradient: 'linear-gradient(165deg, #0A1628 0%, #162447 50%, #1F4068 100%)',
  goldGradient: 'linear-gradient(135deg, #C9A86C 0%, #E8D5B7 50%, #B8956E 100%)',
  cardGradient: 'linear-gradient(145deg, #FDFBF7 0%, #F5F1EB 100%)',
};

/**
 * ゴールド装飾ディバイダー
 */
const GoldDivider = () => (
  <div className="flex items-center justify-center gap-3 my-6">
    <div 
      className="h-px flex-1"
      style={{ background: `linear-gradient(90deg, transparent, ${COLORS.champagneGold}40)` }}
    />
    <div 
      className="w-1.5 h-1.5 rotate-45"
      style={{ backgroundColor: COLORS.champagneGold }}
    />
    <div 
      className="h-px flex-1"
      style={{ background: `linear-gradient(90deg, ${COLORS.champagneGold}40, transparent)` }}
    />
  </div>
);

export default function LoginPage() {
  const router = useRouter();
  const { signIn } = useAuth();
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error, accountType, profile, store } = await signIn(email, password);

      if (error) {
        toast.error(t('auth.login_failed'), {
          description: t('auth.login_failed_desc'),
        });
        return;
      }

      toast.success(t('auth.login_success'), {
        position: 'top-center',
        duration: 1000,
        className: 'bg-gray-100'
      });

      // アカウントタイプによってリダイレクト先を変更
      if (accountType === 'platform') {
        // 運営会社アカウント
        router.push('/store/manage');
      } else if (accountType === 'store') {
        // 店舗アカウント
        // store?.id が取得できない場合はフォールバック
        if (store?.id) {
          router.push(`/store/manage/${store.id}/update`);
        } else {
          // storeが取得できない場合はログインページに留まるか、エラーハンドリング
          console.error('Store information not found for store account');
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

  return (
    <div 
      className="min-h-screen relative overflow-hidden"
      style={{ background: COLORS.luxuryGradient }}
    >
      {/* 背景装飾 */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div 
          className="pointer-events-none absolute -top-40 -left-40 h-[50rem] w-[50rem] rounded-full opacity-20"
          style={{ background: `radial-gradient(circle, ${COLORS.champagneGold}30 0%, transparent 70%)` }}
        />
        <div 
          className="pointer-events-none absolute -bottom-40 -right-40 h-[50rem] w-[50rem] rounded-full opacity-15"
          style={{ background: `radial-gradient(circle, ${COLORS.royalNavy} 0%, transparent 70%)` }}
        />
        {/* ゴールドのアクセントライン */}
        <div 
          className="absolute top-0 left-0 right-0 h-1"
          style={{ background: COLORS.goldGradient }}
        />
      </div>

      {/* レスポンシブ2カラム */}
      <div className="mx-auto grid w-full max-w-6xl grid-cols-1 md:grid-cols-2 gap-0 md:gap-8 px-4 sm:px-6 py-8 sm:py-12 md:py-16">
        {/* 左：ブランド・ベネフィット（md以上で表示） */}
        <motion.aside
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className="hidden md:flex flex-col justify-between rounded-2xl p-8 relative overflow-hidden"
          style={{ 
            background: 'rgba(255, 255, 255, 0.05)',
            backdropFilter: 'blur(10px)',
            border: `1px solid rgba(201, 168, 108, 0.2)`,
          }}
        >
          <div 
            className="absolute inset-0 opacity-30"
            style={{ 
              background: `radial-gradient(ellipse at 20% -10%, ${COLORS.champagneGold}20, transparent 50%)` 
            }}
          />
          <div className="relative">
            <div className="flex items-center gap-3 mb-8">
              <img
                src="https://res.cloudinary.com/dz9trbwma/image/upload/v1761355092/%E3%82%B5%E3%83%BC%E3%83%92%E3%82%99%E3%82%B9%E3%82%A2%E3%82%A4%E3%82%B3%E3%83%B3_dggltf.png"
                alt="NIKENME+"
                className="w-16 h-16 object-contain"
              />
            </div>
            <h1 
              className="text-4xl leading-tight font-bold mb-4"
              style={{ color: COLORS.ivory }}
            >
              {t('auth.find_second_bar')}<br />
              <span style={{ color: COLORS.champagneGold }}>{t('auth.vacancy_map')}</span>
            </h1>
            <p 
              className="text-lg font-medium"
              style={{ color: COLORS.platinum }}
            >
              {t('auth.vacancy_map_desc')}
            </p>
          </div>

          <GoldDivider />

          <div className="grid grid-cols-1 gap-4">
            {/* ベネフィットカード */}
            <motion.div 
              className="rounded-xl p-4"
              style={{ 
                background: 'rgba(201, 168, 108, 0.1)',
                border: `1px solid rgba(201, 168, 108, 0.2)`,
              }}
              whileHover={{ scale: 1.02 }}
              transition={{ duration: 0.2 }}
            >
              <p className="font-bold" style={{ color: COLORS.champagneGold }}>
                {t('auth.benefit_quick_check')}
              </p>
              <p className="text-sm font-medium mt-1" style={{ color: COLORS.platinum }}>
                {t('auth.benefit_quick_check_desc')}
              </p>
            </motion.div>
            <motion.div 
              className="rounded-xl p-4"
              style={{ 
                background: 'rgba(201, 168, 108, 0.1)',
                border: `1px solid rgba(201, 168, 108, 0.2)`,
              }}
              whileHover={{ scale: 1.02 }}
              transition={{ duration: 0.2 }}
            >
              <p className="font-bold" style={{ color: COLORS.champagneGold }}>
                {t('auth.benefit_one_tap')}
              </p>
              <p className="text-sm font-medium mt-1" style={{ color: COLORS.platinum }}>
                {t('auth.benefit_one_tap_desc')}
              </p>
            </motion.div>
          </div>

          <div className="text-sm font-medium mt-6" style={{ color: COLORS.warmGray }}>
            © {new Date().getFullYear()} NIKENME+
          </div>
        </motion.aside>

        {/* 右：ログインフォーム */}
        <motion.section
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="flex items-center"
        >
          <div className="w-full">
            <div className="mx-auto w-full max-w-md">
              {/* モバイル用ロゴ */}
              <div className="mb-6 md:mb-8 flex flex-col items-center justify-center md:hidden">
                <img
                  src="https://res.cloudinary.com/dz9trbwma/image/upload/v1761355092/%E3%82%B5%E3%83%BC%E3%83%92%E3%82%99%E3%82%B9%E3%82%A2%E3%82%A4%E3%82%B3%E3%83%B3_dggltf.png"
                  alt="NIKENME+"
                  className="w-20 h-20 object-contain mb-3"
                />
              </div>

              {/* ログインカード */}
              <div 
                className="rounded-2xl p-6 sm:p-8 shadow-2xl"
                style={{ 
                  background: '#FFFFFF',
                  border: `1px solid rgba(201, 168, 108, 0.15)`,
                }}
              >
                <div className="text-center mb-6 sm:mb-8">
                  <div className="flex items-center justify-center gap-2 mb-3">
                    <Sparkles className="w-5 h-5" style={{ color: COLORS.champagneGold }} />
                    <h2 
                      className="text-2xl sm:text-3xl font-bold"
                      style={{ color: COLORS.deepNavy }}
                    >
                      {t('auth.welcome_back')}
                    </h2>
                  </div>
                  <p 
                    className="text-sm font-medium"
                    style={{ color: COLORS.warmGray }}
                  >
                    {t('auth.login_to_store')}
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6">
                  <div className="space-y-2">
                    <Label 
                      htmlFor="email" 
                      className="text-sm font-bold"
                      style={{ color: COLORS.deepNavy }}
                    >
                      {t('auth.email')}
                    </Label>
                    <div className="relative">
                      <Mail 
                        className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 pointer-events-none" 
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
                        className="pl-10 h-12 text-base rounded-xl border-2 transition-all duration-200 focus:border-[#C9A86C] focus:ring-2 focus:ring-[#C9A86C]/20"
                        style={{ 
                          fontSize: '16px',
                          borderColor: 'rgba(201, 168, 108, 0.3)',
                        }}
                        aria-label={t('auth.email')}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label 
                      htmlFor="password" 
                      className="text-sm font-bold"
                      style={{ color: COLORS.deepNavy }}
                    >
                      {t('auth.password')}
                    </Label>
                    <div className="relative">
                      <Lock 
                        className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 z-10 pointer-events-none" 
                        style={{ color: COLORS.champagneGold }}
                      />
                      <PasswordInput
                        id="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-10 h-12 text-base rounded-xl border-2 transition-all duration-200 focus:border-[#C9A86C] focus:ring-2 focus:ring-[#C9A86C]/20"
                        style={{ 
                          fontSize: '16px',
                          borderColor: 'rgba(201, 168, 108, 0.3)',
                        }}
                        autoComplete="current-password"
                        aria-label={t('auth.password')}
                        required
                      />
                    </div>
                  </div>

                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    <Button
                      type="submit"
                      className="w-full h-12 text-base mt-4 rounded-xl font-bold shadow-lg transition-all duration-200"
                      style={{ 
                        background: COLORS.goldGradient,
                        color: COLORS.deepNavy,
                        boxShadow: '0 8px 25px rgba(201, 168, 108, 0.35)',
                      }}
                      disabled={loading}
                      aria-busy={loading}
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                          {t('auth.logging_in')}
                        </>
                      ) : (
                        <>
                          {t('auth.login')}
                          <ArrowRight className="w-5 h-5 ml-2" />
                        </>
                      )}
                    </Button>
                  </motion.div>

                  <GoldDivider />

                  <div className="text-center space-y-3">
                    <Link 
                      href="/landing" 
                      className="inline-flex items-center gap-1 text-sm font-bold transition-colors hover:opacity-80"
                      style={{ color: COLORS.royalNavy }}
                    >
                      {t('auth.back_to_home')}
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </motion.section>
      </div>
    </div>
  );
}