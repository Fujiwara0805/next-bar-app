'use client';

import Link from 'next/link';
import { ArrowLeft, Bell, ExternalLink } from 'lucide-react';
import { useLanguage } from '@/lib/i18n/context';
import { motion } from 'framer-motion';
import { newsTranslations } from '@/lib/news-data';

const COLORS = {
  background: '#0A1628',
  surface: '#162447',
  accent: '#C9A86C',
  text: '#FDFBF7',
  textMuted: 'rgba(253, 251, 247, 0.7)',
  textSubtle: 'rgba(253, 251, 247, 0.5)',
  luxuryGradient: 'linear-gradient(165deg, #0A1628 0%, #162447 50%, #1F4068 100%)',
  goldGradient: 'linear-gradient(135deg, #C9A86C 0%, #E8D5B7 50%, #B8956E 100%)',
  borderGold: 'rgba(201, 168, 108, 0.3)',
  borderSubtle: 'rgba(201, 168, 108, 0.15)',
};

export default function NewsPage() {
  const { t, language } = useLanguage();
  const news = newsTranslations[language] || newsTranslations.ja;

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
            <Bell className="w-4 h-4" style={{ color: COLORS.accent }} />
            <span className="text-xs font-medium tracking-widest uppercase" style={{ color: COLORS.accent }}>News</span>
          </motion.div>
          <h1 className="text-3xl sm:text-4xl font-bold mb-3" style={{ color: COLORS.text }}>{t('news_page.title')}</h1>
          <p className="text-base" style={{ color: COLORS.textMuted }}>{t('news_page.subtitle')}</p>
        </div>

        <div className="space-y-6">
          {news.map((item, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: index * 0.08 }}
              className="relative pl-6"
              style={{ borderLeft: `2px solid ${COLORS.accent}` }}
            >
              <div className="absolute -left-[7px] top-0 w-3 h-3 rounded-full" style={{ background: COLORS.goldGradient, boxShadow: `0 0 10px ${COLORS.accent}60` }} />
              <div className="flex items-center gap-3 mb-2">
                <span className="text-xs px-3 py-1 rounded-full" style={{ background: `${COLORS.accent}15`, color: COLORS.accent, border: `1px solid ${COLORS.borderGold}` }}>
                  {item.date}
                </span>
                {index === 0 && (
                  <span className="text-xs px-3 py-1 rounded-full font-semibold" style={{ background: COLORS.goldGradient, color: COLORS.background }}>
                    New
                  </span>
                )}
              </div>
              <div className="p-4 rounded-xl" style={{ background: `${COLORS.surface}80`, border: `1px solid ${COLORS.borderSubtle}` }}>
                <h3 className="font-bold text-base mb-2" style={{ color: COLORS.text }}>{item.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: COLORS.textMuted }}>{item.body}</p>
                {item.link && (
                  <a
                    href={item.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 mt-3 text-sm font-medium transition-all hover:scale-105 hover:opacity-80"
                    style={{ color: COLORS.accent }}
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    {item.linkLabel || item.link}
                  </a>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </motion.main>
    </div>
  );
}
