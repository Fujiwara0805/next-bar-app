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
      if (icon.cta_url) {
        window.open(icon.cta_url, '_blank', 'noopener,noreferrer');
      }
    },
    [trackEvent]
  );

  if (icons.length === 0) return null;

  return (
    <div className="absolute top-0 left-0 z-20 pointer-events-none">
      {icons.map((icon, index) => {
        const top = icon.icon_position?.top || `${16 + index * 64}px`;
        const left = icon.icon_position?.left || '16px';
        const size = icon.icon_size || 48;

        return (
          <motion.div
            key={icon.creative_id}
            className="absolute pointer-events-auto cursor-pointer"
            style={{ top, left }}
            animate={{ y: [0, -6, 0] }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              repeatDelay: 1.5,
              delay: index * 0.5,
            }}
          >
            <div className="relative">
              {icon.icon_url ? (
                <img
                  src={icon.icon_url}
                  alt={icon.company_name}
                  width={size}
                  height={size}
                  className="rounded-lg shadow-md object-cover"
                  onClick={() => handleClick(icon)}
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              ) : (
                <div
                  className="rounded-lg shadow-md bg-gradient-to-br from-[#C9A86C] to-[#A88B5A] flex items-center justify-center text-white font-bold text-xs"
                  style={{ width: size, height: size }}
                  onClick={() => handleClick(icon)}
                >
                  {icon.company_name.charAt(0)}
                </div>
              )}

              {/* AD badge */}
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-[8px] font-bold bg-black/60 text-white px-1 py-px rounded">
                AD
              </span>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
