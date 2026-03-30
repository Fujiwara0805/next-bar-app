'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { useSponsor } from '@/lib/sponsors/context';

export function SponsorModal() {
  const {
    ads,
    trackEvent,
    shouldShowModal,
    setShouldShowModal,
    checkFrequencyCap,
    incrementFrequency,
  } = useSponsor();
  const [isOpen, setIsOpen] = useState(false);
  const trackedRef = useRef(false);
  const autoCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const ad = ads?.modal;

  const handleClose = useCallback(() => {
    if (ad) {
      trackEvent({
        event_type: 'close',
        creative_id: ad.creative_id,
        ad_slot_id: ad.ad_slot_id,
        contract_id: ad.contract_id,
        sponsor_id: ad.sponsor_id,
      });
    }
    setIsOpen(false);
    trackedRef.current = false;
  }, [ad, trackEvent]);

  const handleImageClick = useCallback(() => {
    if (!ad?.cta_url) return;
    trackEvent({
      event_type: 'cta_click',
      creative_id: ad.creative_id,
      ad_slot_id: ad.ad_slot_id,
      contract_id: ad.contract_id,
      sponsor_id: ad.sponsor_id,
    });
    handleClose();
  }, [ad, trackEvent, handleClose]);

  // Show modal when triggered and frequency cap allows
  useEffect(() => {
    if (
      shouldShowModal &&
      ad &&
      checkFrequencyCap(ad.creative_id, ad.display_config?.frequency_cap_per_session ?? 1)
    ) {
      setIsOpen(true);
      setShouldShowModal(false);
    }
  }, [shouldShowModal, ad, checkFrequencyCap, setShouldShowModal]);

  // Track impression on open
  useEffect(() => {
    if (isOpen && ad && !trackedRef.current) {
      trackedRef.current = true;
      incrementFrequency(ad.creative_id);
      trackEvent({
        event_type: 'impression',
        creative_id: ad.creative_id,
        ad_slot_id: ad.ad_slot_id,
        contract_id: ad.contract_id,
        sponsor_id: ad.sponsor_id,
      });

      const autoClose = ad.display_config?.auto_close_seconds;
      if (autoClose && autoClose > 0) {
        autoCloseTimerRef.current = setTimeout(() => {
          handleClose();
        }, autoClose * 1000);
      }
    }

    return () => {
      if (autoCloseTimerRef.current) {
        clearTimeout(autoCloseTimerRef.current);
      }
    };
  }, [isOpen, ad, incrementFrequency, trackEvent, handleClose]);

  if (!ad) return null;

  const imageUrl = ad.background_image_url || ad.image_url;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)' }}
          onClick={handleClose}
        >
          <div className="absolute inset-0 backdrop-blur-sm" />

          {/* Modal content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="relative z-10"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              onClick={handleClose}
              className="absolute -top-3 -right-3 z-20 flex h-8 w-8 items-center justify-center rounded-full"
              style={{ background: 'rgba(128, 128, 128, 0.8)' }}
              aria-label="閉じる"
            >
              <X className="h-4 w-4 text-white" />
            </motion.button>

            {/* Image — use <a> tag for reliable mobile navigation */}
            {imageUrl ? (
              ad.cta_url ? (
                <a
                  href={ad.cta_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={handleImageClick}
                  className="block rounded-2xl overflow-hidden shadow-2xl cursor-pointer"
                  style={{ maxWidth: '360px', maxHeight: '80vh' }}
                >
                  <img
                    src={imageUrl}
                    alt={ad.company_name || '広告'}
                    className="w-full h-auto object-contain"
                    style={{ aspectRatio: '1080 / 1350' }}
                    loading="eager"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                </a>
              ) : (
                <div
                  className="rounded-2xl overflow-hidden shadow-2xl"
                  style={{ maxWidth: '360px', maxHeight: '80vh' }}
                >
                  <img
                    src={imageUrl}
                    alt={ad.company_name || '広告'}
                    className="w-full h-auto object-contain"
                    style={{ aspectRatio: '1080 / 1350' }}
                    loading="eager"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                </div>
              )
            ) : null}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
