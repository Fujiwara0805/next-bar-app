'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { useSponsor } from '@/lib/sponsors/context';
import { useLanguage } from '@/lib/i18n/context';

const CTA_DISMISSED_KEY = 'sponsor_cta_dismissed';

export function SponsorCtaButton() {
  const { ads, trackEvent } = useSponsor();
  const { language } = useLanguage();
  const [dismissed, setDismissed] = useState(false);
  const [visible, setVisible] = useState(false);
  const [passedHero, setPassedHero] = useState(false);
  const trackedRef = useRef(false);

  const ad = ads?.cta_button;

  // Check dismissed state on mount
  useEffect(() => {
    try {
      if (sessionStorage.getItem(CTA_DISMISSED_KEY) === 'true') {
        setDismissed(true);
      }
    } catch {
      // sessionStorage unavailable
    }
  }, []);

  // Detect scroll past hero section (approx 1 viewport height)
  useEffect(() => {
    if (!ad || dismissed) return;

    const handleScroll = () => {
      const scrollY = window.scrollY || window.pageYOffset;
      const threshold = window.innerHeight * 0.8;
      setPassedHero(scrollY > threshold);
    };

    handleScroll(); // check initial position
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [ad, dismissed]);

  // Show with delay after passing hero
  useEffect(() => {
    if (ad && !dismissed && passedHero) {
      const timer = setTimeout(() => setVisible(true), 500);
      return () => clearTimeout(timer);
    } else {
      setVisible(false);
    }
  }, [ad, dismissed, passedHero]);

  // Track impression
  useEffect(() => {
    if (visible && ad && !trackedRef.current) {
      trackedRef.current = true;
      trackEvent({
        event_type: 'impression',
        creative_id: ad.creative_id,
        ad_slot_id: ad.ad_slot_id,
        contract_id: ad.contract_id,
        sponsor_id: ad.sponsor_id,
      });
    }
  }, [visible, ad, trackEvent]);

  const handleClick = useCallback(() => {
    if (!ad) return;
    trackEvent({
      event_type: 'cta_click',
      creative_id: ad.creative_id,
      ad_slot_id: ad.ad_slot_id,
      contract_id: ad.contract_id,
      sponsor_id: ad.sponsor_id,
    });
    // Navigation handled by <a> tag
  }, [ad, trackEvent]);

  const handleDismiss = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDismissed(true);
    setVisible(false);
    try {
      sessionStorage.setItem(CTA_DISMISSED_KEY, 'true');
    } catch {
      // Silently ignore
    }
  }, []);

  if (!ad || dismissed) return null;

  const ctaText =
    ad.translations?.[language as keyof typeof ad.translations]?.cta_text ||
    ad.cta_text ||
    '';

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ x: 100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 100, opacity: 0 }}
          transition={{ type: 'spring', damping: 20, stiffness: 200 }}
          className="fixed bottom-24 right-4 z-30"
        >
          <motion.div
            animate={{ scale: [1, 1.03, 1] }}
            transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
          >
            <a
              href={ad.cta_url || '#'}
              target="_blank"
              rel="noopener noreferrer"
              onClick={handleClick}
              className="relative flex items-center gap-2 px-5 py-3 rounded-full shadow-lg font-bold text-sm no-underline"
              style={{
                backgroundColor: ad.cta_color || '#C9A86C',
                color: (ad.display_config as any)?.cta_text_color || '#FFFFFF',
                willChange: 'transform',
              }}
            >
              {/* PR badge */}
              <span className="absolute -top-2 -left-1 text-[9px] font-medium bg-popover/90 text-muted-foreground px-1.5 py-0.5 rounded-full">
                PR
              </span>

              {/* Icon */}
              {ad.icon_url && (
                <img
                  src={ad.icon_url}
                  alt=""
                  className="w-5 h-5 rounded-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              )}

              <span>{ctaText}</span>

              {/* Dismiss button */}
              <span
                onClick={handleDismiss}
                className="ml-1 p-0.5 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
                role="button"
                aria-label="閉じる"
              >
                <X className="w-3 h-3" />
              </span>
            </a>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
