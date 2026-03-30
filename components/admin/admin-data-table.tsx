'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useAdminTheme } from '@/lib/admin-theme-context';
import type { ReactNode } from 'react';

export interface AdminColumn<T> {
  key: string;
  header: string;
  width?: string;
  render: (item: T, index: number) => ReactNode;
  hideOnMobile?: boolean;
}

interface AdminDataTableProps<T> {
  columns: AdminColumn<T>[];
  data: T[];
  keyExtractor: (item: T) => string;
  onRowClick?: (item: T) => void;
  emptyIcon?: ReactNode;
  emptyTitle?: string;
  emptyDescription?: string;
  mobileCardRender?: (item: T, index: number) => ReactNode;
}

export function AdminDataTable<T>({
  columns,
  data,
  keyExtractor,
  onRowClick,
  emptyIcon,
  emptyTitle = 'データがありません',
  emptyDescription,
  mobileCardRender,
}: AdminDataTableProps<T>) {
  const { colors: C } = useAdminTheme();

  if (data.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col items-center justify-center py-16 rounded-2xl"
        style={{ background: C.bgCard, border: `1px dashed ${C.border}` }}
      >
        {emptyIcon && <div className="mb-3 opacity-40">{emptyIcon}</div>}
        <p className="text-sm font-medium" style={{ color: C.textSubtle }}>
          {emptyTitle}
        </p>
        {emptyDescription && (
          <p className="text-xs mt-1" style={{ color: C.textSubtle }}>
            {emptyDescription}
          </p>
        )}
      </motion.div>
    );
  }

  const gridCols = columns
    .map((c) => c.width || '1fr')
    .join(' ');

  return (
    <>
      {/* Desktop table */}
      <div className="hidden md:block rounded-2xl overflow-hidden" style={{ border: `1px solid ${C.border}` }}>
        <div
          className="grid items-center px-4 py-3 text-xs font-semibold uppercase tracking-wider"
          style={{
            gridTemplateColumns: gridCols,
            background: C.bgElevated,
            color: C.textSubtle,
          }}
        >
          {columns.map((col) => (
            <div key={col.key}>{col.header}</div>
          ))}
        </div>
        <AnimatePresence>
          {data.map((item, i) => (
            <motion.div
              key={keyExtractor(item)}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ delay: i * 0.03, duration: 0.25 }}
              className="grid items-center px-4 py-3 text-sm transition-colors"
              style={{
                gridTemplateColumns: gridCols,
                borderTop: `1px solid ${C.border}`,
                color: C.text,
                cursor: onRowClick ? 'pointer' : undefined,
              }}
              onClick={() => onRowClick?.(item)}
              whileHover={
                onRowClick
                  ? { backgroundColor: C.bgCardHover }
                  : undefined
              }
            >
              {columns.map((col) => (
                <div key={col.key}>{col.render(item, i)}</div>
              ))}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        <AnimatePresence>
          {data.map((item, i) =>
            mobileCardRender ? (
              <motion.div
                key={keyExtractor(item)}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ delay: i * 0.04 }}
                onClick={() => onRowClick?.(item)}
                className="rounded-xl p-4"
                style={{
                  background: C.bgCard,
                  border: `1px solid ${C.border}`,
                  cursor: onRowClick ? 'pointer' : undefined,
                }}
              >
                {mobileCardRender(item, i)}
              </motion.div>
            ) : (
              <motion.div
                key={keyExtractor(item)}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ delay: i * 0.04 }}
                onClick={() => onRowClick?.(item)}
                className="rounded-xl p-4 space-y-2"
                style={{
                  background: C.bgCard,
                  border: `1px solid ${C.border}`,
                  cursor: onRowClick ? 'pointer' : undefined,
                }}
              >
                {columns
                  .filter((c) => !c.hideOnMobile)
                  .map((col) => (
                    <div key={col.key} className="flex items-center justify-between text-sm">
                      <span className="text-xs font-medium" style={{ color: C.textSubtle }}>
                        {col.header}
                      </span>
                      <div>{col.render(item, i)}</div>
                    </div>
                  ))}
              </motion.div>
            )
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
