'use client';

import Script from 'next/script';
import { useEffect } from 'react';
import { sendGAEvent } from '@/lib/analytics';

export function GoogleAnalytics() {
  const gaId = process.env.NEXT_PUBLIC_GA_ID;

  // stay_time_over_30s: 30秒以上滞在で1回だけ発火
  // time_after_20: 20時以降のアクセスで1回だけ発火
  useEffect(() => {
    if (!gaId) return;

    const timer = setTimeout(() => {
      sendGAEvent('stay_time_over_30s', {
        page_path: window.location.pathname,
      });
    }, 30000);

    const hour = new Date().getHours();
    if (hour >= 20) {
      sendGAEvent('time_after_20', {
        hour,
        page_path: window.location.pathname,
      });
    }

    return () => clearTimeout(timer);
  }, [gaId]);

  if (!gaId) {
    return null;
  }

  return (
    <>
      <Script
        strategy="afterInteractive"
        src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
      />
      <Script
        id="google-analytics"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${gaId}', {
              page_path: window.location.pathname,
            });
          `,
        }}
      />
    </>
  );
}
