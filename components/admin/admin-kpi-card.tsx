'use client';

import { motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import { useAdminTheme } from '@/lib/admin-theme-context';

export interface AdminKpiCardProps {
  label: string;
  value: string | number;
  subLabel?: string;
  icon: LucideIcon;
  gradient: string;
  href?: string;
  index?: number;
  badge?: string;
}

// freee 風: 白カード＋細罫の機能的ライト。アクセントはアイコンチップの色のみ。
// gradient prop はアイコンチップのアクセント色として再解釈する（DESIGN.md 規律内: Navy/Copper/Brass/緑）。
const KPI_ACCENTS = {
    gold: '#13294b',     // Navy
    teal: '#13294b',     // Navy
    blue: '#3B5A87',     // Info navy
    purple: '#13294b',   // Navy
    amber: '#B87333',    // Copper
    rose: '#B87333',     // Copper
    green: '#3E8E6B',
    slate: '#4D5567',
} as const;

export type KpiGradientKey = keyof typeof KPI_ACCENTS;

export function getKpiGradient(key: KpiGradientKey): string {
  return KPI_ACCENTS[key];
}

/** hex を rgba 背景（薄塗り）へ */
function tint(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function AdminKpiCard({
  label,
  value,
  subLabel,
  icon: Icon,
  gradient,
  href,
  index = 0,
  badge,
}: AdminKpiCardProps) {
  const { colors: C } = useAdminTheme();
  const accent = gradient; // 再解釈: アクセント色
  const content = (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.4 }}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.99 }}
      className="relative h-full min-w-0 cursor-pointer overflow-hidden rounded-xl p-4 sm:p-5"
      style={{ background: C.bgCard, border: `1px solid ${C.border}` }}
    >
      <div className="relative z-10 flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <span
            className="w-9 h-9 rounded-lg flex items-center justify-center"
            style={{ background: tint(accent, 0.1) }}
          >
            <Icon style={{ color: accent, width: 18, height: 18 }} />
          </span>
          {badge && (
            <span
              className="font-en text-[10px] font-bold px-2 py-0.5 rounded-full tracking-[0.06em]"
              style={{ background: '#ffc82c', color: '#13294b' }}
            >
              {badge}
            </span>
          )}
        </div>
        <span className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl" style={{ color: C.text }}>
          {value}
        </span>
        <span className="text-sm font-medium" style={{ color: C.textMuted }}>{label}</span>
        {subLabel && (
          <span className="text-xs mt-0.5" style={{ color: C.textSubtle }}>{subLabel}</span>
        )}
      </div>
      {href && (
        <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: C.textSubtle }} />
      )}
    </motion.div>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }
  return content;
}

export function AdminKpiGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-6">
      {children}
    </div>
  );
}

export function AdminQuickAction({
  label,
  subLabel,
  icon: Icon,
  href,
  index = 0,
}: {
  label: string;
  subLabel?: string;
  icon: LucideIcon;
  href: string;
  index?: number;
}) {
  const { colors: C } = useAdminTheme();
  return (
    <Link href={href}>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 + index * 0.05, duration: 0.35 }}
        whileHover={{ scale: 1.03, y: -1 }}
        whileTap={{ scale: 0.97 }}
        className="flex min-h-16 items-center gap-3 rounded-xl p-3.5 cursor-pointer transition-colors sm:p-4"
        style={{ background: C.bgCard, border: `1px solid ${C.border}` }}
      >
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: C.accentBg }}
        >
          <Icon className="w-5 h-5" style={{ color: C.accent }} />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold truncate" style={{ color: C.text }}>
            {label}
          </p>
          {subLabel && (
            <p className="text-xs truncate" style={{ color: C.textSubtle }}>
              {subLabel}
            </p>
          )}
        </div>
      </motion.div>
    </Link>
  );
}
