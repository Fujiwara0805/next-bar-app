'use client';

import { useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useSponsor } from '@/lib/sponsors/context';

export function SponsorMapIcon() {
  const { ads, trackEvent } = useSponsor();
  const trackedRef = useRef<Set<string>>(new Set());

  const icons = ads?.map_icons || [];

  // Track impressions
  useEffect(() => {
    for (const icon of icons) {
      if (!trackedRef.current.has(icon.creative_id)) {
        trackedRef.current.add(icon.creative_id);
        trackEvent({
          event_type: 'impression',
          creative_id: icon.creative_id,
          ad_slot_id: icon.ad_slot_id,
          contract_id: icon.contract_id,
          sponsor_id: icon.sponsor_id,
        });
      }
    }
  }, [icons, trackEvent]);

  const handleClick = useCallback(
    (icon: (typeof icons)[0]) => {
      trackEvent({
        event_type: 'click',
        creative_id: icon.creative_id,
        ad_slot_id: icon.ad_slot_id,
        contract_id: icon.contract_id,
        sponsor_id: icon.sponsor_id,
      });
      // Navigation handled by <a> tag
    },
    [trackEvent]
  );

  if (icons.length === 0) return null;

  return (
    <div className="fixed top-20 left-4 z-20 flex flex-col items-start gap-3 pointer-events-none safe-top">
      {icons.map((icon, index) => {
        const size = icon.icon_size || 48;

        const content = icon.icon_url ? (
          <img
            src={icon.icon_url}
            alt={icon.company_name}
            width={size}
            height={size}
            className="rounded-xl shadow-lg object-cover"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        ) : (
          <div
            className="rounded-xl shadow-lg bg-gradient-to-br from-[#C9A86C] to-[#A88B5A] flex items-center justify-center text-white font-bold text-xs"
            style={{ width: size, height: size }}
          >
            {icon.company_name.charAt(0)}
          </div>
        );

        return (
          <motion.div
            key={icon.creative_id}
            className="pointer-events-auto cursor-pointer"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.15, duration: 0.3 }}
          >
            <motion.div
              animate={{ y: [0, -5, 0] }}
              transition={{
                duration: 1.8,
                repeat: Infinity,
                repeatDelay: 2,
                delay: index * 0.5,
              }}
            >
              <div className="relative">
                {icon.cta_url ? (
                  <a
                    href={icon.cta_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => handleClick(icon)}
                    className="block"
                  >
                    {content}
                  </a>
                ) : (
                  <div onClick={() => handleClick(icon)}>
                    {content}
                  </div>
                )}

                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-[7px] font-bold bg-black/60 text-white px-1 py-px rounded">
                  AD
                </span>
              </div>
            </motion.div>
          </motion.div>
        );
      })}
    </div>
  );
}
