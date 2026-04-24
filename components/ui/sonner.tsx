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
          toast:
            'group toast group-[.toaster]:bg-cream-50 group-[.toaster]:text-brewer-900 group-[.toaster]:border group-[.toaster]:border-brass-500/40 group-[.toaster]:shadow-[0_12px_32px_rgba(19,41,75,0.18)] group-[.toaster]:rounded-xl',
          title: 'group-[.toast]:text-brewer-900 group-[.toast]:font-semibold',
          description: 'group-[.toast]:text-brewer-700/80',
          actionButton:
            'group-[.toast]:bg-brass-500 group-[.toast]:text-brewer-900 group-[.toast]:hover:bg-brass-500/90 group-[.toast]:font-semibold',
          cancelButton:
            'group-[.toast]:bg-brewer-100 group-[.toast]:text-brewer-700',
          success:
            'group-[.toaster]:bg-cream-50 group-[.toaster]:text-brewer-900 group-[.toaster]:border-brass-500/50',
          error:
            'group-[.toaster]:bg-brewer-900 group-[.toaster]:text-cream-50 group-[.toaster]:border-brass-500/60',
          warning:
            'group-[.toaster]:bg-brass-300/90 group-[.toaster]:text-brewer-900 group-[.toaster]:border-brass-500/70',
          info:
            'group-[.toaster]:bg-brewer-700 group-[.toaster]:text-cream-50 group-[.toaster]:border-brass-500/40',
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
