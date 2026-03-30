'use client';

import { motion } from 'framer-motion';
import { Sun, Moon } from 'lucide-react';
import { useAdminTheme } from '@/lib/admin-theme-context';

export function AdminThemeToggle() {
  const { isDark, toggleTheme, colors } = useAdminTheme();

  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={toggleTheme}
      className="relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-colors"
      style={{
        background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
        border: `1px solid ${colors.border}`,
      }}
      title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
    >
      <motion.div
        initial={false}
        animate={{ rotate: isDark ? 0 : 180, opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        {isDark ? (
          <Moon className="w-3.5 h-3.5" style={{ color: colors.textMuted }} />
        ) : (
          <Sun className="w-3.5 h-3.5" style={{ color: colors.warning }} />
        )}
      </motion.div>
      <span className="text-[11px] font-medium" style={{ color: colors.textMuted }}>
        {isDark ? 'Dark' : 'Light'}
      </span>
    </motion.button>
  );
}
