'use client';

import { useTheme } from 'next-themes';
import { Toaster as Sonner } from 'sonner';

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = 'system' } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps['theme']}
      className="toaster group"
      toastOptions={{
        classNames: {
          // ライトマガジン: 白カード＋細罫＋状態色のアクセント罫（DESIGN.md §4 / §6）
          toast:
            'group toast group-[.toaster]:bg-card group-[.toaster]:text-foreground group-[.toaster]:border group-[.toaster]:border-border group-[.toaster]:shadow-floating group-[.toaster]:rounded-xl',
          title: 'group-[.toast]:text-foreground group-[.toast]:font-semibold',
          description: 'group-[.toast]:text-muted-foreground',
          actionButton:
            'group-[.toast]:bg-secondary group-[.toast]:text-secondary-foreground group-[.toast]:hover:bg-brass-300 group-[.toast]:font-semibold',
          cancelButton:
            'group-[.toast]:bg-muted group-[.toast]:text-foreground',
          success:
            'group-[.toaster]:bg-card group-[.toaster]:text-foreground group-[.toaster]:border-success/50',
          error:
            'group-[.toaster]:bg-destructive group-[.toaster]:text-destructive-foreground group-[.toaster]:border-destructive [&_[data-title]]:text-destructive-foreground [&_[data-description]]:text-destructive-foreground/90 [&_[data-icon]]:text-destructive-foreground',
          warning:
            'group-[.toaster]:bg-card group-[.toaster]:text-foreground group-[.toaster]:border-warning/60',
          info:
            'group-[.toaster]:bg-card group-[.toaster]:text-foreground group-[.toaster]:border-info/50',
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
