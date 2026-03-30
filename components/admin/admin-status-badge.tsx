'use client';

import { useAdminTheme } from '@/lib/admin-theme-context';

type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

const VARIANT_MAP: Record<BadgeVariant, { colorKey: string; bgKey: string }> = {
  success: { colorKey: 'success', bgKey: 'successBg' },
  warning: { colorKey: 'warning', bgKey: 'warningBg' },
  danger: { colorKey: 'danger', bgKey: 'dangerBg' },
  info: { colorKey: 'info', bgKey: 'infoBg' },
  neutral: { colorKey: 'textSubtle', bgKey: 'bgElevated' },
};

interface AdminStatusBadgeProps {
  label: string;
  variant?: BadgeVariant;
  dot?: boolean;
}

export function AdminStatusBadge({
  label,
  variant = 'neutral',
  dot = false,
}: AdminStatusBadgeProps) {
  const { colors: C } = useAdminTheme();
  const { colorKey, bgKey } = VARIANT_MAP[variant];
  const color = C[colorKey as keyof typeof C] as string;
  const bg = C[bgKey as keyof typeof C] as string;

  return (
    <span
      className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap"
      style={{ color, background: bg }}
    >
      {dot && (
        <span
          className="w-1.5 h-1.5 rounded-full shrink-0"
          style={{ background: color }}
        />
      )}
      {label}
    </span>
  );
}
