'use client';

import { useState } from 'react';
import { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function FAQPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const faqs = [
    {
      question: 'NIKENME+とは何ですか？',
      answer: 'NIKENME+（ニケンメプラス）は、大分県大分市で2軒目・バー・スナック・居酒屋を探す際に便利な空席情報マップサービスです。リアルタイムで店舗の空席状況を地図上で確認でき、ログイン不要で今すぐ使えます。',
    },
    {
      question: '利用料金はかかりますか？',
      answer: '完全無料です。ログインや会員登録も不要で、アクセスするだけですぐに利用できます。',
    },
    {
      question: '位置情報を許可する必要がありますか？',
      answer: '位置情報の許可は必須ではありませんが、許可していただくと現在地周辺の店舗を表示でき、距離も確認できるためより便利にご利用いただけます。位置情報はサーバーに保存されず、ブラウザ上でのみ一時的に使用されます。',
    },
    {
      question: '空席情報はリアルタイムで更新されますか？',
      answer: 'はい、店舗オーナーが更新した空席情報はリアルタイムで反映されます。常に最新の情報を確認できるため、無駄な移動や待ち時間を減らせます。',
    },
    {
      question: '対応エリアはどこですか？',
      answer: '現在は大分県大分市を中心にサービスを提供しています。今後、他のエリアへの展開も検討しています。',
    },
    {
      question: 'スマートフォンでも使えますか？',
      answer: 'はい、スマートフォン、タブレット、PCなど、あらゆるデバイスで利用できます。レスポンシブデザインにより、どのデバイスでも快適にご利用いただけます。',
    },
    {
      question: '店舗を登録するにはどうすればいいですか？',
      answer: '店舗オーナーの方は、画面右上の「店舗ログイン」ボタンから登録ページにアクセスできます。必要な情報を入力して登録申請を行ってください。',
    },
    {
      question: 'お店の情報が間違っている場合はどうすればいいですか？',
      answer: 'お問い合わせフォームより、該当店舗名と修正内容をお知らせください。確認の上、速やかに対応いたします。',
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-sm border-b">
        <div className="container mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center">
          <Link href="/landing">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              戻る
            </Button>
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <h1 className="text-3xl sm:text-4xl font-bold mb-4">よくある質問 (FAQ)</h1>
        <p className="text-muted-foreground mb-8">
          NIKENME+に関するよくある質問と回答をまとめました。
        </p>
        
        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <div key={index} className="border rounded-lg overflow-hidden">
              <button
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="w-full flex items-center justify-between p-4 sm:p-6 text-left hover:bg-accent transition-colors"
              >
                <h3 className="font-bold text-base sm:text-lg pr-4">{faq.question}</h3>
                <motion.div
                  animate={{ rotate: openIndex === index ? 180 : 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <ChevronDown className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                </motion.div>
              </button>
              
              <AnimatePresence>
                {openIndex === index && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="px-4 sm:px-6 pb-4 sm:pb-6">
                      <p className="text-muted-foreground leading-relaxed">{faq.answer}</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>

        <div className="mt-12 p-6 bg-accent rounded-lg text-center">
          <h3 className="font-bold text-lg mb-2">他にご質問がありますか？</h3>
          <p className="text-muted-foreground mb-4">
            こちらに掲載されていない質問については、お問い合わせフォームよりご連絡ください。
          </p>
          <Button variant="default">
            お問い合わせ
          </Button>
        </div>
      </main>
    </div>
  );
}
