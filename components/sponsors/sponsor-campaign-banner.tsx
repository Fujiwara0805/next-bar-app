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
    // Navigation handled by <a> tag
  }, [ad, trackEvent]);

  if (!ad) return null;

  const Wrapper = ad.cta_url ? 'a' : 'div';
  const wrapperProps = ad.cta_url
    ? { href: ad.cta_url, target: '_blank' as const, rel: 'noopener noreferrer', onClick: handleClick }
    : {};

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="mb-3"
    >
      <Wrapper
        {...wrapperProps}
        className="relative block w-full rounded-xl overflow-hidden shadow-md cursor-pointer no-underline"
        style={{ minHeight: 80 }}
      >
        {/* Background */}
        {ad.image_url ? (
          <img
            src={ad.image_url}
            alt={ad.company_name || ''}
            className="w-full h-full object-cover absolute inset-0"
            loading="lazy"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-r from-[#1A2E4A] to-[#0A1628]" />
        )}

        {/* Dark overlay */}
        <div className="absolute inset-0 bg-black/10" />

        {/* Content */}
        <div className="relative z-10 p-4 flex items-center justify-between">
          <div className="flex-1 min-w-0">
            {/* PR label */}
            <span className="inline-block text-[9px] font-medium bg-white/20 text-white/80 px-1.5 py-0.5 rounded-full mb-1">
              PR
            </span>
            {ad.company_name && (
              <h3 className="text-sm font-bold text-white truncate">{ad.company_name}</h3>
            )}
          </div>

          {/* CTA arrow */}
          {ad.cta_url && (
            <div
              className="ml-3 flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center"
              style={{ backgroundColor: ad.cta_color || '#C9A86C' }}
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
            </div>
          )}
        </div>
      </Wrapper>
    </motion.div>
  );
}
