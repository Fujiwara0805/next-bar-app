'use client';

import Link from 'next/link';
import { ArrowLeft, Scale } from 'lucide-react';
import { useLanguage } from '@/lib/i18n/context';
import { motion } from 'framer-motion';
import { useAppMode } from '@/lib/app-mode-context';

export default function LegalPage() {
  const { colorsA: COLORS } = useAppMode();
  const { t } = useLanguage();

  const items = [
    { label: t('legal_page.seller'), value: t('legal_page.seller_value') },
    { label: t('legal_page.representative'), value: t('legal_page.representative_value') },
    { label: t('legal_page.address'), value: t('legal_page.address_value') },
    { label: t('legal_page.email'), value: t('legal_page.email_value') },
    { label: t('legal_page.url'), value: t('legal_page.url_value') },
    { label: t('legal_page.service'), value: t('legal_page.service_value') },
    { label: t('legal_page.price'), value: t('legal_page.price_value') },
    { label: t('legal_page.payment'), value: t('legal_page.payment_value') },
    { label: t('legal_page.payment_timing'), value: t('legal_page.payment_timing_value') },
    { label: t('legal_page.cancellation'), value: t('legal_page.cancellation_value') },
  ];

  return (
    <div className="min-h-screen" style={{ background: COLORS.luxuryGradient }}>
      <header className="sticky top-0 z-50 backdrop-blur-md" style={{ background: `${COLORS.background}CC`, borderBottom: `1px solid ${COLORS.borderGold}` }}>
        <div className="container mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center">
          <Link href="/landing" className="flex items-center gap-2 px-3 py-2 rounded-lg transition-all hover:scale-105" style={{ color: COLORS.accent }}>
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm font-medium">{t('static_pages.back')}</span>
          </Link>
        </div>
      </header>

      <motion.main
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="container mx-auto px-4 py-8 sm:py-12 max-w-4xl"
      >
        <div className="text-center mb-10">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-2 mb-4 rounded-full"
            style={{ background: `${COLORS.accent}15`, border: `1px solid ${COLORS.borderGold}` }}
          >
            <Scale className="w-4 h-4" style={{ color: COLORS.accent }} />
            <span className="text-xs font-medium tracking-widest uppercase" style={{ color: COLORS.accent }}>Legal</span>
          </motion.div>
          <h1 className="text-3xl sm:text-4xl font-bold" style={{ color: COLORS.text }}>{t('legal_page.title')}</h1>
        </div>

        <div className="space-y-4">
          {items.map((item, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.03 }}
              className="p-5 sm:p-6 rounded-xl"
              style={{ background: `${COLORS.surface}80`, border: `1px solid ${COLORS.borderSubtle}` }}
            >
              <h2 className="text-sm font-bold mb-2" style={{ color: COLORS.accent }}>{item.label}</h2>
              <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: COLORS.textMuted }}>{item.value}</p>
            </motion.div>
          ))}
        </div>

        <div className="mt-10 pt-6 text-right" style={{ borderTop: `1px solid ${COLORS.borderGold}` }}>
          <p className="text-xs" style={{ color: COLORS.textSubtle }}>
            {t('legal_page.last_updated')}
          </p>
        </div>
      </motion.main>
    </div>
  );
}
