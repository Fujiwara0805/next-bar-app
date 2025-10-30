import { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Star, Bug, Zap } from 'lucide-react';

export const metadata: Metadata = {
  title: 'リリースノート | NIKENME+',
  description: 'NIKENME+（ニケンメプラス）のアップデート履歴とリリースノートをご確認ください。',
};

export default function ReleaseNotesPage() {
  const releases = [
    {
      version: '1.0.0',
      date: '2025年1月30日',
      type: 'major',
      changes: [
        {
          type: 'feature',
          icon: Star,
          title: '初回リリース',
          description: 'NIKENME+の正式リリース。大分市内の店舗の空席情報をリアルタイムで確認できるようになりました。',
        },
        {
          type: 'feature',
          icon: Zap,
          title: 'リアルタイム更新機能',
          description: '店舗の空席情報がリアルタイムで地図上に反映されます。',
        },
        {
          type: 'feature',
          icon: Star,
          title: '位置情報連携',
          description: '現在地からの距離を表示し、近くの店舗を簡単に見つけられます。',
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
              戻る
            </Button>
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <h1 className="text-3xl sm:text-4xl font-bold mb-4">リリースノート</h1>
        <p className="text-muted-foreground mb-8">
          NIKENME+の最新アップデート情報と変更履歴をご確認いただけます。
        </p>
        
        <div className="space-y-8">
          {releases.map((release, index) => (
            <div key={index} className="border-l-4 border-primary pl-6">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-2xl font-bold">v{release.version}</span>
                <span className="text-sm text-muted-foreground">{release.date}</span>
              </div>

              <div className="space-y-4">
                {release.changes.map((change, changeIndex) => {
                  const Icon = change.icon;
                  return (
                    <div key={changeIndex} className="flex gap-3">
                      <div className="mt-1">
                        <Icon className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-bold mb-1">{change.title}</h3>
                        <p className="text-muted-foreground text-sm leading-relaxed">
                          {change.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
