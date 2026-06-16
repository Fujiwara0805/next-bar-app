import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-bold tracking-[0.02em] transition-colors focus:outline-none focus:ring-[3px] focus:ring-ring/25 focus:ring-offset-0',
  {
    variants: {
      variant: {
        default:
          'border-transparent bg-primary text-primary-foreground hover:bg-primary/80',
        secondary:
          'border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80',
        destructive:
          'border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80',
        outline: 'border-border text-foreground',
        success:
          'border-transparent bg-success text-success-foreground',
        warning:
          'border-transparent bg-warning text-warning-foreground',
        info:
          'border-transparent bg-info text-info-foreground',
        // soft: 淡Brass地に Navy 文字（DESIGN.md: Brass上は濃色文字でコントラスト確保）
        soft:
          'border-brass-500/30 bg-brass-500/15 text-brewer-700',
        // category: マガジンのカテゴリバッジ（英字uppercase・Jost）
        category:
          'border-transparent bg-secondary text-secondary-foreground font-en uppercase tracking-[0.06em]',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
