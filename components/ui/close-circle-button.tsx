'use client';

import * as React from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * NIKENME+ カラーパレット準拠: ネイビー系のライトトーン円 ＋ ディープネイビーの×
 *（deepNavy #0A1628 由来の薄いブルーグレー / hover・active でも背景は変えない）
 */
const CIRCLE_BG =
  'bg-[#E4E9F2] hover:bg-[#E4E9F2] active:bg-[#E4E9F2] data-[state=open]:bg-[#E4E9F2] text-[#0A1628]';

/** 既定よりモバイルのみ1段小さく、sm 以上は従来サイズ */
const sizeStyles = {
  sm: 'h-6 w-6 sm:h-7 sm:w-7 [&>svg]:h-2 [&>svg]:w-2 sm:[&>svg]:h-2.5 sm:[&>svg]:w-2.5',
  md: 'h-7 w-7 sm:h-8 sm:w-8 [&>svg]:h-2.5 [&>svg]:w-2.5 sm:[&>svg]:h-3 sm:[&>svg]:w-3',
  lg: 'h-8 w-8 sm:h-9 sm:w-9 [&>svg]:h-3 [&>svg]:w-3 sm:[&>svg]:h-3.5 sm:[&>svg]:w-3.5',
} as const;

export type CloseCircleButtonProps = Omit<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  'children'
> & {
  size?: keyof typeof sizeStyles;
};

export const CloseCircleButton = React.forwardRef<
  HTMLButtonElement,
  CloseCircleButtonProps
>(({ className, size = 'md', type = 'button', ...props }, ref) => (
  <button
    ref={ref}
    type={type}
    className={cn(
      'inline-flex shrink-0 items-center justify-center rounded-full',
      CIRCLE_BG,
      'transition-none',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F4068]/35 focus-visible:ring-offset-0',
      'touch-manipulation [-webkit-tap-highlight-color:transparent]',
      sizeStyles[size],
      className,
    )}
    {...props}
  >
    <X strokeWidth={2.5} className="shrink-0" aria-hidden />
  </button>
));
CloseCircleButton.displayName = 'CloseCircleButton';
