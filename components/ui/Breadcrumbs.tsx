'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { ChevronRight, Home } from 'lucide-react';
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { useLanguage } from '@/lib/i18n/context';

// パス名とラベルのマッピング
const pathLabels: Record<string, { ja: string; en: string }> = {
  '/': { ja: 'ホーム', en: 'Home' },
  '/landing': { ja: 'ホーム', en: 'Home' },
  '/map': { ja: '地図', en: 'Map' },
  '/store-list': { ja: '店舗一覧', en: 'Store List' },
  '/store': { ja: '店舗', en: 'Store' },
  '/profile': { ja: 'プロフィール', en: 'Profile' },
  '/profile/edit': { ja: '編集', en: 'Edit' },
  '/profile/change-password': { ja: 'パスワード変更', en: 'Change Password' },
  '/store/manage': { ja: '店舗管理', en: 'Store Management' },
  '/store/manage/new': { ja: '新規登録', en: 'New Store' },
  '/store/manage/[id]': { ja: '店舗編集', en: 'Edit Store' },
  '/store/manage/[id]/edit': { ja: '編集', en: 'Edit' },
  '/store/manage/[id]/update': { ja: '更新', en: 'Update' },
  '/store/manage/[id]/change-password': { ja: 'パスワード変更', en: 'Change Password' },
  '/terms': { ja: '利用規約', en: 'Terms' },
  '/privacy': { ja: 'プライバシーポリシー', en: 'Privacy Policy' },
  '/faq': { ja: 'よくある質問', en: 'FAQ' },
  '/release-notes': { ja: 'リリースノート', en: 'Release Notes' },
  '/about': { ja: 'このサービスについて', en: 'About' },
  '/language-settings': { ja: '言語設定', en: 'Language Settings' },
  '/auth/reset-password': { ja: 'パスワードリセット', en: 'Reset Password' },
};

interface BreadcrumbsProps {
  className?: string;
  storeName?: string; // 店舗詳細ページ用の店舗名
}

export function Breadcrumbs({ className, storeName }: BreadcrumbsProps) {
  const pathname = usePathname();
  const { language } = useLanguage();

  // パスを分割してパンくずリストを生成
  const generateBreadcrumbs = () => {
    const paths = pathname.split('/').filter(Boolean);
    const breadcrumbs: Array<{ href: string; label: string }> = [];

    // ホームを常に最初に追加
    breadcrumbs.push({
      href: '/landing',
      label: language === 'ja' ? 'ホーム' : 'Home',
    });

    // 店舗詳細ページ（/store/[id]）の場合は特別な処理
    if (pathname.startsWith('/store/') && paths.length === 2 && paths[0] === 'store' && paths[1] !== 'manage') {
      // 店舗一覧を中間に追加
      breadcrumbs.push({
        href: '/store-list',
        label: language === 'ja' ? '店舗一覧' : 'Store List',
      });
      
      // 店舗詳細を最後に追加
      breadcrumbs.push({
        href: pathname,
        label: storeName || (language === 'ja' ? '店舗詳細' : 'Store Details'),
      });
      
      return breadcrumbs;
    }

    // パスを順に処理
    let currentPath = '';
    paths.forEach((segment, index) => {
      currentPath += `/${segment}`;
      
      // 動的ルート（[id]など）の場合は特別な処理
      let label: string | undefined;
      
      // 店舗管理ページの場合は通常の処理
      if (currentPath.startsWith('/store/manage')) {
        const pathLabel = pathLabels[currentPath];
        if (pathLabel) {
          label = language === 'ja' ? pathLabel.ja : pathLabel.en;
        } else {
          label = segment.charAt(0).toUpperCase() + segment.slice(1);
        }
      } else {
        // 通常のパスラベルを取得
        const pathLabel = pathLabels[currentPath];
        if (pathLabel) {
          label = language === 'ja' ? pathLabel.ja : pathLabel.en;
        } else {
          // マッピングがない場合はセグメント名をそのまま使用（大文字化）
          label = segment.charAt(0).toUpperCase() + segment.slice(1);
        }
      }

      // 最後のパスは現在のページなので、リンクにしない
      const isLast = index === paths.length - 1;
      
      breadcrumbs.push({
        href: isLast ? currentPath : currentPath,
        label: label || segment,
      });
    });

    return breadcrumbs;
  };

  const breadcrumbs = generateBreadcrumbs();

  // ホームのみの場合は表示しない
  if (breadcrumbs.length <= 1) {
    return null;
  }

  return (
    <Breadcrumb className={className}>
      <BreadcrumbList
        className="text-sm"
        style={{
          color: '#F2EBDD',
        }}
      >
        {breadcrumbs.map((crumb, index) => {
          const isLast = index === breadcrumbs.length - 1;

          return (
            <div key={crumb.href} className="flex items-center">
              <BreadcrumbItem>
                {isLast ? (
                  <BreadcrumbPage
                    style={{
                      color: '#F2EBDD',
                      fontWeight: 500,
                    }}
                  >
                    {crumb.label}
                  </BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link
                      href={crumb.href}
                      className="transition-colors hover:opacity-80 flex items-center gap-1"
                      style={{
                        color: '#F2EBDD',
                      }}
                    >
                      {index === 0 && <Home className="w-3.5 h-3.5" />}
                      {crumb.label}
                    </Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
              {!isLast && (
                <BreadcrumbSeparator>
                  <ChevronRight
                    className="w-4 h-4"
                    style={{
                      color: '#C89B3C',
                      opacity: 0.6,
                    }}
                  />
                </BreadcrumbSeparator>
              )}
            </div>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}

