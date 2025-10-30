'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowLeft, Check } from 'lucide-react';
import { useLanguage } from '@/lib/i18n/context';

export default function LanguageSettingsPage() {
  const { language, setLanguage, t } = useLanguage();

  const languages = [
    { code: 'ja' as const, name: '日本語', nativeName: '日本語' },
    { code: 'en' as const, name: 'English', nativeName: 'English' },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-sm border-b">
        <div className="container mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center">
          <Link href="/landing">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              {language === 'ja' ? '戻る' : 'Back'}
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
          <h1 className="text-3xl sm:text-4xl font-bold mb-4">
            {language === 'ja' ? '言語設定' : 'Language Settings'}
          </h1>
          <p className="text-muted-foreground mb-8">
            {language === 'ja' 
              ? '表示言語を選択してください。設定は自動的に保存されます。'
              : 'Select your preferred language. Settings are saved automatically.'}
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
                  className={`p-6 cursor-pointer transition-all hover:shadow-lg ${
                    language === lang.code
                      ? 'border-2 border-primary bg-primary/5'
                      : 'border hover:border-primary/50'
                  }`}
                  onClick={() => setLanguage(lang.code)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xl font-bold mb-1">{lang.nativeName}</h3>
                      <p className="text-sm text-muted-foreground">{lang.name}</p>
                    </div>
                    {language === lang.code && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', stiffness: 200, damping: 10 }}
                      >
                        <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
                          <Check className="w-6 h-6 text-white" />
                        </div>
                      </motion.div>
                    )}
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>

          <div className="mt-8 p-6 bg-accent rounded-lg">
            <h3 className="font-bold mb-2">
              {language === 'ja' ? '言語について' : 'About Languages'}
            </h3>
            <p className="text-sm text-muted-foreground">
              {language === 'ja'
                ? '現在、日本語と英語に対応しています。選択した言語はブラウザに保存され、次回訪問時も適用されます。'
                : 'Currently supporting Japanese and English. Your language preference is saved in your browser and will be applied on your next visit.'}
            </p>
          </div>
        </motion.div>
      </main>
    </div>
  );
}

