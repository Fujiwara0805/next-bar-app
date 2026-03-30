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

const KPI_GRADIENTS = {
  gold: 'linear-gradient(135deg, #C9A86C 0%, #B8956E 100%)',
  teal: 'linear-gradient(135deg, #0d9488 0%, #14b8a6 100%)',
  blue: 'linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%)',
  purple: 'linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%)',
  amber: 'linear-gradient(135deg, #d97706 0%, #f59e0b 100%)',
  rose: 'linear-gradient(135deg, #e11d48 0%, #fb7185 100%)',
  green: 'linear-gradient(135deg, #16a34a 0%, #4ade80 100%)',
  slate: 'linear-gradient(135deg, #475569 0%, #64748b 100%)',
} as const;

export type KpiGradientKey = keyof typeof KPI_GRADIENTS;

export function getKpiGradient(key: KpiGradientKey): string {
  return KPI_GRADIENTS[key];
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
  const content = (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.4 }}
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      className="relative rounded-2xl p-5 overflow-hidden cursor-pointer min-w-[180px]"
      style={{ background: gradient }}
    >
      <div className="relative z-10 flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <Icon className="w-5 h-5 text-white/80" />
          {badge && (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white/20 text-white tracking-wide">
              {badge}
            </span>
          )}
        </div>
        <span className="text-3xl font-bold text-white mt-2 tracking-tight">
          {value}
        </span>
        <span className="text-sm text-white/80 font-medium">{label}</span>
        {subLabel && (
          <span className="text-xs text-white/60 mt-0.5">{subLabel}</span>
        )}
      </div>
      {href && (
        <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
      )}
      <div
        className="absolute top-0 right-0 w-24 h-24 rounded-full opacity-10"
        style={{ background: 'white', transform: 'translate(30%, -30%)' }}
      />
    </motion.div>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }
  return content;
}

export function AdminKpiGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-6 gap-4">
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
        className="flex items-center gap-3 rounded-xl p-4 cursor-pointer transition-colors"
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
