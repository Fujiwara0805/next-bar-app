'use client';

import Link from 'next/link';
import { ArrowLeft, FileText } from 'lucide-react';
import { useLanguage } from '@/lib/i18n/context';
import { motion } from 'framer-motion';

const COLORS = {
  background: '#0A1628',
  surface: '#162447',
  accent: '#C9A86C',
  text: '#FDFBF7',
  textMuted: 'rgba(253, 251, 247, 0.7)',
  textSubtle: 'rgba(253, 251, 247, 0.5)',
  luxuryGradient: 'linear-gradient(165deg, #0A1628 0%, #162447 50%, #1F4068 100%)',
  borderGold: 'rgba(201, 168, 108, 0.3)',
  borderSubtle: 'rgba(201, 168, 108, 0.15)',
};

export default function TermsPage() {
  const { t } = useLanguage();

  const sections = [
    { title: t('terms_page.section1_title'), content: t('terms_page.section1_content') },
    { title: t('terms_page.section2_title'), content: t('terms_page.section2_content') },
    { title: t('terms_page.section3_title'), content: t('terms_page.section3_content'), items: [t('terms_page.section3_item1'), t('terms_page.section3_item2'), t('terms_page.section3_item3'), t('terms_page.section3_item4'), t('terms_page.section3_item5'), t('terms_page.section3_item6'), t('terms_page.section3_item7'), t('terms_page.section3_item8')] },
    { title: t('terms_page.section4_title'), content: t('terms_page.section4_content') },
    { title: t('terms_page.section5_title'), content: t('terms_page.section5_content') },
    { title: t('terms_page.section6_title'), content: t('terms_page.section6_content') },
    { title: t('terms_page.section7_title'), content: t('terms_page.section7_content') },
    { title: t('terms_page.section8_title'), content: t('terms_page.section8_content') },
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
            <FileText className="w-4 h-4" style={{ color: COLORS.accent }} />
            <span className="text-xs font-medium tracking-widest uppercase" style={{ color: COLORS.accent }}>Terms</span>
          </motion.div>
          <h1 className="text-3xl sm:text-4xl font-bold" style={{ color: COLORS.text }}>{t('terms_page.title')}</h1>
        </div>

        <div className="space-y-6">
          {sections.map((section, index) => (
            <motion.section
              key={index}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              className="p-5 sm:p-6 rounded-xl"
              style={{ background: `${COLORS.surface}80`, border: `1px solid ${COLORS.borderSubtle}` }}
            >
              <h2 className="text-lg sm:text-xl font-bold mb-3" style={{ color: COLORS.accent }}>{section.title}</h2>
              <p className="text-sm leading-relaxed mb-3" style={{ color: COLORS.textMuted }}>{section.content}</p>
              {section.items && (
                <ul className="space-y-2 ml-1">
                  {section.items.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm" style={{ color: COLORS.textMuted }}>
                      <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: COLORS.accent }} />
                      {item}
                    </li>
                  ))}
                </ul>
              )}
            </motion.section>
          ))}
        </div>

        <div className="mt-10 pt-6 text-right" style={{ borderTop: `1px solid ${COLORS.borderGold}` }}>
          <p className="text-xs" style={{ color: COLORS.textSubtle }}>
            {t('terms_page.established_date')}<br />{t('terms_page.last_updated')}
          </p>
        </div>
      </motion.main>
    </div>
  );
}
