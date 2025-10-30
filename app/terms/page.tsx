import { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export const metadata: Metadata = {
  title: '利用規約 | NIKENME+',
  description: 'NIKENME+（ニケンメプラス）の利用規約をご確認ください。',
};

export default function TermsPage() {
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
        <h1 className="text-3xl sm:text-4xl font-bold mb-8">利用規約</h1>
        
        <div className="prose prose-slate dark:prose-invert max-w-none space-y-6">
          <section>
            <h2 className="text-2xl font-bold mb-4">第1条（適用）</h2>
            <p className="text-muted-foreground leading-relaxed">
              本規約は、NIKENME+（以下「本サービス」といいます）の利用に関する条件を、本サービスを利用するすべてのユーザー（以下「ユーザー」といいます）と本サービスを運営する事業者（以下「当社」といいます）との間で定めるものです。
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">第2条（利用登録）</h2>
            <p className="text-muted-foreground leading-relaxed">
              本サービスの一般ユーザーは登録不要で利用できます。店舗オーナーとして登録を希望する者は、本規約に同意の上、当社の定める方法によって利用登録を申請し、当社がこれを承認することによって、利用登録が完了するものとします。
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">第3条（禁止事項）</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              ユーザーは、本サービスの利用にあたり、以下の行為をしてはなりません。
            </p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground">
              <li>法令または公序良俗に違反する行為</li>
              <li>犯罪行為に関連する行為</li>
              <li>当社のサーバーまたはネットワークの機能を破壊したり、妨害したりする行為</li>
              <li>当社のサービスの運営を妨害するおそれのある行為</li>
              <li>他のユーザーに関する個人情報等を収集または蓄積する行為</li>
              <li>他のユーザーに成りすます行為</li>
              <li>当社のサービスに関連して、反社会的勢力に対して直接または間接に利益を供与する行為</li>
              <li>その他、当社が不適切と判断する行為</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">第4条（本サービスの提供の停止等）</h2>
            <p className="text-muted-foreground leading-relaxed">
              当社は、以下のいずれかの事由があると判断した場合、ユーザーに事前に通知することなく本サービスの全部または一部の提供を停止または中断することができるものとします。
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">第5条（免責事項）</h2>
            <p className="text-muted-foreground leading-relaxed">
              当社は、本サービスに関して、ユーザーと他のユーザーまたは第三者との間において生じた取引、連絡または紛争等について一切責任を負いません。
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">第6条（サービス内容の変更等）</h2>
            <p className="text-muted-foreground leading-relaxed">
              当社は、ユーザーに通知することなく、本サービスの内容を変更しまたは本サービスの提供を中止することができるものとし、これによってユーザーに生じた損害について一切の責任を負いません。
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">第7条（利用規約の変更）</h2>
            <p className="text-muted-foreground leading-relaxed">
              当社は、必要と判断した場合には、ユーザーに通知することなくいつでも本規約を変更することができるものとします。変更後の本規約は、本サービス上に表示した時点より効力を生じるものとします。
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">第8条（準拠法・裁判管轄）</h2>
            <p className="text-muted-foreground leading-relaxed">
              本規約の解釈にあたっては、日本法を準拠法とします。本サービスに関して紛争が生じた場合には、当社の本店所在地を管轄する裁判所を専属的合意管轄とします。
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
