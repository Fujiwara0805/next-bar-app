import { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export const metadata: Metadata = {
  title: 'プライバシーポリシー | NIKENME+',
  description: 'NIKENME+（ニケンメプラス）のプライバシーポリシーをご確認ください。',
};

export default function PrivacyPage() {
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
        <h1 className="text-3xl sm:text-4xl font-bold mb-8">プライバシーポリシー</h1>
        
        <div className="prose prose-slate dark:prose-invert max-w-none space-y-6">
          <section>
            <h2 className="text-2xl font-bold mb-4">1. 個人情報の収集</h2>
            <p className="text-muted-foreground leading-relaxed">
              当社は、本サービスの提供にあたり、以下の個人情報を収集することがあります。
            </p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground mt-4">
              <li>位置情報（ユーザーが許可した場合のみ）</li>
              <li>店舗オーナーの氏名、メールアドレス、電話番号</li>
              <li>店舗情報（店舗名、住所、営業時間等）</li>
              <li>サービス利用履歴</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">2. 個人情報の利用目的</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              当社は、収集した個人情報を以下の目的で利用します。
            </p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground">
              <li>本サービスの提供・運営のため</li>
              <li>ユーザーからのお問い合わせに回答するため</li>
              <li>メンテナンス、重要なお知らせなど必要に応じたご連絡のため</li>
              <li>利用規約に違反したユーザーや、不正・不当な目的でサービスを利用しようとするユーザーの特定をし、ご利用をお断りするため</li>
              <li>サービスの改善・新サービスの開発のため</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">3. 個人情報の第三者提供</h2>
            <p className="text-muted-foreground leading-relaxed">
              当社は、次に掲げる場合を除いて、あらかじめユーザーの同意を得ることなく、第三者に個人情報を提供することはありません。
            </p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground mt-4">
              <li>法令に基づく場合</li>
              <li>人の生命、身体または財産の保護のために必要がある場合</li>
              <li>公衆衛生の向上または児童の健全な育成の推進のために特に必要がある場合</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">4. 位置情報の取り扱い</h2>
            <p className="text-muted-foreground leading-relaxed">
              本サービスでは、ユーザーの現在地周辺の店舗情報を表示するために位置情報を使用します。位置情報の取得はユーザーの明示的な許可がある場合のみ行われ、サーバーに保存されることはありません。ブラウザ上でのみ一時的に使用されます。
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">5. Cookie等の使用</h2>
            <p className="text-muted-foreground leading-relaxed">
              当社は、本サービスの利便性向上のため、Cookieを使用することがあります。Cookieを通じて取得する情報は個人を特定するものではありません。
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">6. 個人情報の開示・訂正・削除</h2>
            <p className="text-muted-foreground leading-relaxed">
              ユーザーは、当社の保有する自己の個人情報について、開示・訂正・削除を請求することができます。請求方法については、お問い合わせフォームよりご連絡ください。
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">7. プライバシーポリシーの変更</h2>
            <p className="text-muted-foreground leading-relaxed">
              当社は、本ポリシーの内容を必要に応じて変更することがあります。変更後のプライバシーポリシーは、本サービス上に表示した時点より効力を生じるものとします。
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">8. お問い合わせ</h2>
            <p className="text-muted-foreground leading-relaxed">
              本ポリシーに関するお問い合わせは、本サービス内のお問い合わせフォームよりご連絡ください。
            </p>
          </section>

          <div className="mt-12 pt-8 border-t text-right">
            <p className="text-sm text-muted-foreground">
              制定日：2025年1月1日
              <br />
              最終更新日：2025年1月1日
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
