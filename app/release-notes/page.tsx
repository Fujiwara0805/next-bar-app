'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Star, Zap } from 'lucide-react';
import { useLanguage } from '@/lib/i18n/context';
import { motion } from 'framer-motion';

export default function ReleaseNotesPage() {
  const { t } = useLanguage();

  const releases = [
    {
      version: '1.0.0',
      date: t('release_notes_page.release_100_date'),
      type: 'major',
      changes: [
        {
          type: 'feature',
          icon: Star,
          title: t('release_notes_page.release_100_feature1_title'),
          description: t('release_notes_page.release_100_feature1_desc'),
        },
        {
          type: 'feature',
          icon: Zap,
          title: t('release_notes_page.release_100_feature2_title'),
          description: t('release_notes_page.release_100_feature2_desc'),
        },
        {
          type: 'feature',
          icon: Star,
          title: t('release_notes_page.release_100_feature3_title'),
          description: t('release_notes_page.release_100_feature3_desc'),
        },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-sm border-b">
        <div className="container mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center">
          <Link href="/landing">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t('static_pages.back')}
            </Button>
          </Link>
        </div>
      </header>

      <motion.main
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="container mx-auto px-4 py-8 max-w-4xl"
      >
        <h1 className="text-3xl sm:text-4xl font-bold mb-4">{t('release_notes_page.title')}</h1>
        <p className="text-muted-foreground mb-8">
          {t('release_notes_page.subtitle')}
        </p>
        
        <div className="space-y-8">
          {releases.map((release, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="border-l-4 border-primary pl-6"
            >
              <div className="flex items-center gap-3 mb-4">
                <span className="text-2xl font-bold">{t('release_notes_page.version_prefix')}{release.version}</span>
                <span className="text-sm text-muted-foreground">{release.date}</span>
              </div>

              <div className="space-y-4">
                {release.changes.map((change, changeIndex) => {
                  const Icon = change.icon;
                  return (
                    <motion.div
                      key={changeIndex}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: (index * 0.1) + (changeIndex * 0.05) }}
                      className="flex gap-3"
                    >
                      <div className="mt-1">
                        <Icon className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-bold mb-1">{change.title}</h3>
                        <p className="text-muted-foreground text-sm leading-relaxed">
                          {change.description}
                        </p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          ))}
        </div>
      </motion.main>
    </div>
  );
}
