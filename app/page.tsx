'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useLiff } from '@/lib/line/context';

export default function Home() {
  const router = useRouter();
  const { isLiffReady, isInLine } = useLiff();

  useEffect(() => {
    if (!isLiffReady) return;

    if (isInLine) {
      // LINE内からのアクセス → ランディングページをスキップして直接マップへ
      router.replace('/map');
    } else {
      // 通常のブラウザアクセス → ランディングページへ
      router.replace('/landing');
    }
  }, [isLiffReady, isInLine, router]);

  return null;
}
