'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
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
  /** 指定すると各行がクリックで展開し、戻り値を行の下に表示する（ドリルダウン明細用） */
  renderExpanded?: (item: T) => ReactNode;
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
  renderExpanded,
}: AdminDataTableProps<T>) {
  const { colors: C } = useAdminTheme();
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const expandable = !!renderExpanded;
  const toggleExpand = (key: string) =>
    setExpandedKey((prev) => (prev === key ? null : key));

  if (data.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col items-center justify-center rounded-2xl px-5 py-12 text-center sm:py-16"
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

  const gridCols = [
    ...columns.map((c) => c.width || '1fr'),
    ...(expandable ? ['36px'] : []),
  ].join(' ');
  const rowClickable = !!onRowClick || expandable;

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
          {expandable && <div aria-hidden />}
        </div>
        <AnimatePresence>
          {data.map((item, i) => {
            const key = keyExtractor(item);
            const isExpanded = expandable && expandedKey === key;
            return (
              <motion.div
                key={key}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ delay: i * 0.03, duration: 0.25 }}
                style={{ borderTop: `1px solid ${C.border}` }}
              >
                <motion.div
                  className="grid items-center px-4 py-3 text-sm transition-colors"
                  style={{
                    gridTemplateColumns: gridCols,
                    color: C.text,
                    cursor: rowClickable ? 'pointer' : undefined,
                    background: isExpanded ? C.bgElevated : undefined,
                  }}
                  onClick={() => {
                    onRowClick?.(item);
                    if (expandable) toggleExpand(key);
                  }}
                  whileHover={
                    rowClickable && !isExpanded ? { backgroundColor: C.bgCardHover } : undefined
                  }
                >
                  {columns.map((col) => (
                    <div key={col.key}>{col.render(item, i)}</div>
                  ))}
                  {expandable && (
                    <div className="flex justify-end">
                      <ChevronDown
                        className="w-4 h-4 transition-transform"
                        style={{ color: C.textSubtle, transform: isExpanded ? 'rotate(180deg)' : undefined }}
                      />
                    </div>
                  )}
                </motion.div>
                <AnimatePresence initial={false}>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                      style={{ background: C.bgElevated }}
                    >
                      <div className="px-4 py-3">{renderExpanded!(item)}</div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        <AnimatePresence>
          {data.map((item, i) => {
            const key = keyExtractor(item);
            const isExpanded = expandable && expandedKey === key;
            return (
              <motion.div
                key={key}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ delay: i * 0.04 }}
                onClick={() => {
                  onRowClick?.(item);
                  if (expandable) toggleExpand(key);
                }}
                className={mobileCardRender ? 'rounded-xl p-4' : 'rounded-xl p-4 space-y-3'}
                style={{
                  background: C.bgCard,
                  border: `1px solid ${C.border}`,
                  cursor: rowClickable ? 'pointer' : undefined,
                }}
              >
                {mobileCardRender ? (
                  <div className="flex items-start gap-2">
                    <div className="flex-1 min-w-0">{mobileCardRender(item, i)}</div>
                    {expandable && (
                      <ChevronDown
                        className="w-4 h-4 mt-0.5 shrink-0 transition-transform"
                        style={{ color: C.textSubtle, transform: isExpanded ? 'rotate(180deg)' : undefined }}
                      />
                    )}
                  </div>
                ) : (
                  columns
                    .filter((c) => !c.hideOnMobile)
                    .map((col) => (
                      <div
                        key={col.key}
                        className={col.header ? 'flex items-start justify-between gap-4 text-sm' : 'flex justify-end pt-1'}
                      >
                        {col.header && (
                          <span className="shrink-0 text-xs font-medium" style={{ color: C.textSubtle }}>
                            {col.header}
                          </span>
                        )}
                        <div className="min-w-0 text-right">{col.render(item, i)}</div>
                      </div>
                    ))
                )}
                <AnimatePresence initial={false}>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="mt-3 pt-3" style={{ borderTop: `1px solid ${C.border}` }}>
                        {renderExpanded!(item)}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </>
  );
}
