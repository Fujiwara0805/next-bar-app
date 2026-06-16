import * as React from 'react';

import { cn } from '@/lib/utils';

/**
 * SectionHeader — マガジンのシグネチャ見出し（DESIGN.md §4.1）
 *
 * 英字ラベル（Jost・uppercase）＋ 和文見出し（Noto 800）を左揃えで並べ、
 * 下に太罫（Rule Ink = Navy）を引く。雑誌的な「対訳ヘッダー」。
 *
 * 使用例:
 *   <SectionHeader en="LOCAL DINING MAP" title="街の飲食店回遊マップ" />
 *   <SectionHeader en="FOR ORGANIZERS" title="..." tone="inverse" />  // Navy帯の上
 */
export interface SectionHeaderProps
  extends Omit<React.HTMLAttributes<HTMLElement>, 'title'> {
  /** 英字ラベル（uppercase 表示。小文字で渡してOK） */
  en?: string;
  /** 和文見出し */
  title: React.ReactNode;
  /** 補足リード（任意） */
  lead?: React.ReactNode;
  /** Navy帯（暗色面）の上に置く場合は inverse */
  tone?: 'default' | 'inverse';
  /** 中央寄せにする場合 */
  align?: 'left' | 'center';
  /** 見出しに使う要素（既定 h2） */
  as?: 'h1' | 'h2' | 'h3';
}

export function SectionHeader({
  en,
  title,
  lead,
  tone = 'default',
  align = 'left',
  as: As = 'h2',
  className,
  ...props
}: SectionHeaderProps) {
  const inverse = tone === 'inverse';
  return (
    <header
      className={cn(
        'border-b-2 pb-2',
        inverse ? 'border-cream-50/30' : 'border-primary',
        align === 'center' && 'text-center',
        className
      )}
      {...props}
    >
      {en ? (
        <span
          className={cn(
            'section-en block text-[12px] md:text-[13px]',
            inverse ? 'text-brass-500' : 'text-copper-500'
          )}
        >
          {en}
        </span>
      ) : null}
      <As
        className={cn(
          'text-2xl font-extrabold leading-[1.25] md:text-3xl',
          inverse ? 'text-cream-50' : 'text-foreground'
        )}
      >
        {title}
      </As>
      {lead ? (
        <p
          className={cn(
            'mt-2 text-sm leading-relaxed md:text-base',
            inverse ? 'text-cream-50/80' : 'text-muted-foreground'
          )}
        >
          {lead}
        </p>
      ) : null}
    </header>
  );
}

export default SectionHeader;
