'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useLanguage } from '@/lib/i18n/context';
import { motion } from 'framer-motion';

export default function TermsPage() {
  const { t } = useLanguage();

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
        <h1 className="text-3xl sm:text-4xl font-bold mb-8">{t('terms_page.title')}</h1>
        
        <div className="prose prose-slate dark:prose-invert max-w-none space-y-6">
          <section>
            <h2 className="text-2xl font-bold mb-4">{t('terms_page.section1_title')}</h2>
            <p className="text-muted-foreground leading-relaxed">
              {t('terms_page.section1_content')}
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">{t('terms_page.section2_title')}</h2>
            <p className="text-muted-foreground leading-relaxed">
              {t('terms_page.section2_content')}
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">{t('terms_page.section3_title')}</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              {t('terms_page.section3_content')}
            </p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground">
              <li>{t('terms_page.section3_item1')}</li>
              <li>{t('terms_page.section3_item2')}</li>
              <li>{t('terms_page.section3_item3')}</li>
              <li>{t('terms_page.section3_item4')}</li>
              <li>{t('terms_page.section3_item5')}</li>
              <li>{t('terms_page.section3_item6')}</li>
              <li>{t('terms_page.section3_item7')}</li>
              <li>{t('terms_page.section3_item8')}</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">{t('terms_page.section4_title')}</h2>
            <p className="text-muted-foreground leading-relaxed">
              {t('terms_page.section4_content')}
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">{t('terms_page.section5_title')}</h2>
            <p className="text-muted-foreground leading-relaxed">
              {t('terms_page.section5_content')}
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">{t('terms_page.section6_title')}</h2>
            <p className="text-muted-foreground leading-relaxed">
              {t('terms_page.section6_content')}
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">{t('terms_page.section7_title')}</h2>
            <p className="text-muted-foreground leading-relaxed">
              {t('terms_page.section7_content')}
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">{t('terms_page.section8_title')}</h2>
            <p className="text-muted-foreground leading-relaxed">
              {t('terms_page.section8_content')}
            </p>
          </section>

          <div className="mt-12 pt-8 border-t text-right">
            <p className="text-sm text-muted-foreground">
              {t('terms_page.established_date')}
              <br />
              {t('terms_page.last_updated')}
            </p>
          </div>
        </div>
      </motion.main>
    </div>
  );
}
