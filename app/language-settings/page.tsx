'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowLeft, Check } from 'lucide-react';
import { useLanguage, SUPPORTED_LANGUAGES, LANGUAGE_META, type Language } from '@/lib/i18n/context';

// マップ画面・LPと統一したカラーパレット
const colors = {
  background: '#0A1628',
  surface: '#162447',
  surfaceLight: '#1F4068',
  accent: '#C9A86C',
  accentLight: '#E8D5B7',
  text: '#FDFBF7',
  textMuted: 'rgba(253, 251, 247, 0.7)',
  textSubtle: 'rgba(253, 251, 247, 0.5)',
  luxuryGradient: 'linear-gradient(165deg, #0A1628 0%, #162447 50%, #1F4068 100%)',
  borderGold: 'rgba(201, 168, 108, 0.3)',
  goldGradient: 'linear-gradient(135deg, #C9A86C 0%, #E8D5B7 50%, #B8956E 100%)',
};

export default function LanguageSettingsPage() {
  const { language, setLanguage, t } = useLanguage();

  const languages = SUPPORTED_LANGUAGES.map((code) => ({
    code,
    name: LANGUAGE_META[code].name,
    nativeName: LANGUAGE_META[code].nativeName,
    flag: LANGUAGE_META[code].flag,
  }));

  return (
    <div className="min-h-screen" style={{ background: colors.background }}>
      <header
        className="sticky top-0 z-50 backdrop-blur-sm"
        style={{
          background: colors.luxuryGradient,
          borderBottom: `1px solid ${colors.borderGold}`,
        }}
      >
        <div className="container mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center">
          <Link href="/landing">
            <Button
              variant="ghost"
              size="sm"
              className="hover:opacity-90"
              style={{ color: colors.text }}
            >
              <ArrowLeft className="w-4 h-4 mr-2" style={{ color: colors.text }} />
              {t('static_pages.back')}
            </Button>
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-3xl sm:text-4xl font-bold mb-4" style={{ color: colors.text }}>
            {t('language_settings_page.title')}
          </h1>
          <p className="mb-8" style={{ color: colors.textMuted }}>
            {t('language_settings_page.description')}
          </p>

          <div className="space-y-3">
            {languages.map((lang, index) => (
              <motion.div
                key={lang.code}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
              >
                <Card
                  className="p-6 cursor-pointer transition-all hover:shadow-lg"
                  style={{
                    background: language === lang.code ? `${colors.accent}15` : `${colors.surface}99`,
                    border: language === lang.code ? `2px solid ${colors.accent}` : `1px solid ${colors.borderGold}`,
                  }}
                  onClick={() => setLanguage(lang.code as Language)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{lang.flag}</span>
                      <div>
                        <h3 className="text-xl font-bold mb-1" style={{ color: colors.text }}>
                          {lang.nativeName}
                        </h3>
                        <p className="text-sm" style={{ color: colors.textMuted }}>
                          {lang.name}
                        </p>
                      </div>
                    </div>
                    {language === lang.code && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', stiffness: 200, damping: 10 }}
                      >
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center"
                          style={{ background: colors.goldGradient }}
                        >
                          <Check className="w-6 h-6" style={{ color: colors.background }} />
                        </div>
                      </motion.div>
                    )}
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>

          <div
            className="mt-8 p-6 rounded-lg"
            style={{
              background: `${colors.surface}99`,
              border: `1px solid ${colors.borderGold}`,
            }}
          >
            <h3 className="font-bold mb-2" style={{ color: colors.text }}>
              {t('language_settings_page.about_title')}
            </h3>
            <p className="text-sm" style={{ color: colors.textMuted }}>
              {t('language_settings_page.about_description')}
            </p>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
