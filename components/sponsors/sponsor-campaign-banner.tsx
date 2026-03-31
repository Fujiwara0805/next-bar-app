'use client';

import { useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useSponsor } from '@/lib/sponsors/context';

export function SponsorCampaignBanner() {
  const { ads, trackEvent } = useSponsor();
  const trackedRef = useRef(false);

  const ad = ads?.campaign_banner;

  // Track impression
  useEffect(() => {
    if (ad && !trackedRef.current) {
      trackedRef.current = true;
      trackEvent({
        event_type: 'impression',
        creative_id: ad.creative_id,
        ad_slot_id: ad.ad_slot_id,
        contract_id: ad.contract_id,
        sponsor_id: ad.sponsor_id,
      });
    }
  }, [ad, trackEvent]);

  const handleClick = useCallback(() => {
    if (!ad) return;
    trackEvent({
      event_type: 'click',
      creative_id: ad.creative_id,
      ad_slot_id: ad.ad_slot_id,
      contract_id: ad.contract_id,
      sponsor_id: ad.sponsor_id,
    });
  }, [ad, trackEvent]);

  if (!ad) return null;

  const Wrapper = ad.cta_url ? 'a' : 'div';
  const wrapperProps = ad.cta_url
    ? { href: ad.cta_url, target: '_blank' as const, rel: 'noopener noreferrer', onClick: handleClick }
    : {};

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="mb-4"
    >
      <Wrapper
        {...wrapperProps}
        className="relative block w-full rounded-2xl overflow-hidden no-underline group"
        style={{
          boxShadow: '0 4px 24px rgba(0, 0, 0, 0.12), 0 1px 4px rgba(0, 0, 0, 0.08)',
        }}
      >
        {/* 3:1 アスペクト比コンテナ */}
        <div className="relative w-full" style={{ paddingBottom: '33.333%' }}>
          {ad.image_url ? (
            <img
              src={ad.image_url}
              alt={ad.company_name || ''}
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
              loading="lazy"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                const fallback = e.currentTarget.parentElement?.querySelector('.fallback-bg') as HTMLElement;
                if (fallback) fallback.style.display = 'block';
              }}
            />
          ) : null}

          {/* フォールバック背景 */}
          <div
            className="fallback-bg absolute inset-0 bg-gradient-to-br from-[#1A2E4A] via-[#162447] to-[#0A1628]"
            style={{ display: ad.image_url ? 'none' : 'block' }}
          />

          {/* 微細なグラデーションオーバーレイ（テキスト可読性） */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/15 via-transparent to-transparent" />

          {/* PR ラベル */}
          <div className="absolute top-2.5 left-2.5 sm:top-3 sm:left-3">
            <span
              className="inline-flex items-center text-[9px] sm:text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-md"
              style={{
                background: 'rgba(255, 255, 255, 0.15)',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                color: 'rgba(255, 255, 255, 0.85)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
              }}
            >
              AD
            </span>
          </div>

          {/* CTA インジケーター */}
          {ad.cta_url && (
            <div className="absolute bottom-2.5 right-2.5 sm:bottom-3 sm:right-3">
              <motion.div
                whileHover={{ scale: 1.1 }}
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center transition-shadow"
                style={{
                  backgroundColor: ad.cta_color || '#C9A86C',
                  boxShadow: `0 2px 12px ${ad.cta_color || '#C9A86C'}88`,
                }}
              >
                <svg
                  className="w-4 h-4 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </motion.div>
            </div>
          )}
        </div>
      </Wrapper>
    </motion.div>
  );
}
