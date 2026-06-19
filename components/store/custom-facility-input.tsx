'use client';

import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { FACILITY_CATEGORIES, OTHER_FACILITIES } from '@/lib/types/store-application';

// 既定候補（カテゴリ＋その他）。これに含まれない値＝オリジナル項目。
const PREDEFINED_FACILITIES = new Set<string>([
  ...Object.values(FACILITY_CATEGORIES).flatMap((c) => [...c.items]),
  ...OTHER_FACILITIES,
]);

/**
 * 設備・サービスのオリジナル項目を自由入力で追加するUI。
 * 値は店舗の `facilities` 配列にそのまま追加され、翻訳は不要（生文字で表示）。
 */
export function CustomFacilityInput({
  facilities,
  onAdd,
  onRemove,
}: {
  facilities: string[];
  onAdd: (value: string) => void;
  onRemove: (value: string) => void;
}) {
  const [value, setValue] = useState('');
  const customItems = facilities.filter((f) => !PREDEFINED_FACILITIES.has(f));

  const commit = () => {
    const v = value.trim();
    if (!v) return;
    onAdd(v);
    setValue('');
  };

  return (
    <div className="mt-4">
      <p className="text-sm font-bold mb-1" style={{ color: '#13294b' }}>
        ✏️ オリジナル項目を追加
      </p>
      <p className="text-xs mb-2" style={{ color: 'rgba(19,41,75,0.6)' }}>
        一覧に無い設備・サービス・名物などを自由に追加できます（例: からあげ専門、岩がき、テラスBBQ）。
      </p>
      <div className="flex gap-2">
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              commit();
            }
          }}
          maxLength={30}
          placeholder="項目名を入力"
          className="flex-1 h-11 rounded-xl border px-3 text-sm"
          style={{ borderColor: 'rgba(201,168,108,0.4)', color: '#13294b', fontSize: '16px' }}
        />
        <button
          type="button"
          onClick={commit}
          disabled={!value.trim()}
          className="h-11 px-4 rounded-xl font-bold text-sm inline-flex items-center gap-1 shrink-0 disabled:opacity-50"
          style={{ background: '#13294b', color: '#ffc82c' }}
        >
          <Plus className="w-4 h-4" /> 追加
        </button>
      </div>
      {customItems.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-3">
          {customItems.map((f) => (
            <span
              key={f}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium"
              style={{
                background: 'rgba(201,168,108,0.14)',
                color: '#13294b',
                border: '1px solid rgba(201,168,108,0.35)',
              }}
            >
              {f}
              <button
                type="button"
                onClick={() => onRemove(f)}
                aria-label={`${f} を削除`}
                className="ml-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
