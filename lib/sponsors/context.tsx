'use client';

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import type { ActiveAdsResponse, TrackEvent } from './types';
import { isWithinSchedule } from './utils';
import { createEventTracker } from './tracking';
import type { ScheduleConfig } from './types';
import { supabase } from '@/lib/supabase/client';

interface SponsorContextType {
  ads: ActiveAdsResponse | null;
  loading: boolean;
  sessionId: string;
  trackEvent: (event: TrackEvent) => void;
  shouldShowModal: boolean;
  setShouldShowModal: (v: boolean) => void;
  checkFrequencyCap: (creativeId: string, maxPerSession: number) => boolean;
  incrementFrequency: (creativeId: string) => void;
}

const SponsorContext = createContext<SponsorContextType | undefined>(undefined);

const FREQ_STORAGE_KEY = 'sponsor_freq_caps';

function getFreqStorage(): Map<string, number> {
  try {
    const raw = sessionStorage.getItem(FREQ_STORAGE_KEY);
    if (raw) {
      return new Map(Object.entries(JSON.parse(raw)));
    }
  } catch {
    // sessionStorage unavailable (private browsing, SSR)
  }
  return new Map();
}

function setFreqStorage(map: Map<string, number>): void {
  try {
    sessionStorage.setItem(
      FREQ_STORAGE_KEY,
      JSON.stringify(Object.fromEntries(map))
    );
  } catch {
    // Silently ignore
  }
}

export function SponsorProvider({ children }: { children: ReactNode }) {
  const [ads, setAds] = useState<ActiveAdsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [shouldShowModal, setShouldShowModal] = useState(false);
  const sessionIdRef = useRef<string>('');
  const trackerRef = useRef<ReturnType<typeof createEventTracker> | null>(null);
  const freqMapRef = useRef<Map<string, number>>(new Map());

  // Generate session ID on mount
  if (!sessionIdRef.current) {
    sessionIdRef.current =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : Math.random().toString(36).slice(2) + Date.now().toString(36);
  }

  const sessionId = sessionIdRef.current;

  // Initialize tracker
  useEffect(() => {
    trackerRef.current = createEventTracker('/api/sponsors/track', sessionId);
    freqMapRef.current = getFreqStorage();

    return () => {
      trackerRef.current?.destroy();
    };
  }, [sessionId]);

  const fetchAds = useCallback(() => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    fetch('/api/sponsors/active', {
      signal: controller.signal,
      cache: 'no-store',
    })
      .then((res) => res.json())
      .then((data: ActiveAdsResponse) => {
        const filtered = filterBySchedule(data);
        setAds(filtered);
      })
      .catch(() => {})
      .finally(() => {
        clearTimeout(timeout);
        setLoading(false);
      });

    return controller;
  }, []);

  // Initial fetch + realtime subscription for instant updates
  useEffect(() => {
    const controller = fetchAds();

    const channel = supabase
      .channel('sponsor-ads-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sponsor_ad_creatives' },
        () => { fetchAds(); }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sponsor_ad_slots' },
        () => { fetchAds(); }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sponsor_contracts' },
        () => { fetchAds(); }
      )
      .subscribe();

    return () => {
      controller.abort();
      supabase.removeChannel(channel);
    };
  }, [fetchAds]);

  const trackEvent = useCallback((event: TrackEvent) => {
    trackerRef.current?.track(event);
  }, []);

  const checkFrequencyCap = useCallback(
    (creativeId: string, maxPerSession: number): boolean => {
      const count = freqMapRef.current.get(creativeId) || 0;
      return count < maxPerSession;
    },
    []
  );

  const incrementFrequency = useCallback((creativeId: string) => {
    const current = freqMapRef.current.get(creativeId) || 0;
    freqMapRef.current.set(creativeId, current + 1);
    setFreqStorage(freqMapRef.current);
  }, []);

  return (
    <SponsorContext.Provider
      value={{
        ads,
        loading,
        sessionId,
        trackEvent,
        shouldShowModal,
        setShouldShowModal,
        checkFrequencyCap,
        incrementFrequency,
      }}
    >
      {children}
    </SponsorContext.Provider>
  );
}

export function useSponsor() {
  const context = useContext(SponsorContext);
  if (!context) {
    throw new Error('useSponsor must be used within SponsorProvider');
  }
  return context;
}

/**
 * クライアントサイドでschedule_configに基づき広告をフィルタリング。
 * 現在の曜日・時間帯に合致しない広告を除外する。
 */
function filterBySchedule(data: ActiveAdsResponse): ActiveAdsResponse {
  const check = (ad: ActiveAdsResponse['modal']): typeof ad => {
    if (!ad) return null;
    if (!ad.schedule_config) return ad; // スケジュール未設定 = 常時表示
    if (isWithinSchedule(ad.schedule_config)) return ad;
    return null;
  };

  return {
    modal: check(data.modal),
    cta_button: check(data.cta_button),
    map_icons: data.map_icons.filter(
      (icon) => !icon.schedule_config || isWithinSchedule(icon.schedule_config)
    ),
    campaign_banner: check(data.campaign_banner),
  };
}
