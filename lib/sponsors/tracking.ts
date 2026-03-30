import type { TrackEvent } from './types';

interface EventTracker {
  track: (event: TrackEvent) => void;
  flush: () => Promise<void>;
  destroy: () => void;
}

export function createEventTracker(
  endpoint: string,
  sessionId: string
): EventTracker {
  let queue: TrackEvent[] = [];
  let timer: ReturnType<typeof setInterval> | null = null;
  let flushing = false;

  async function flush(): Promise<void> {
    if (queue.length === 0 || flushing) return;

    flushing = true;
    const batch = [...queue];
    queue = [];

    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            events: batch,
            session_id: sessionId,
            timestamp: new Date().toISOString(),
          }),
        });
        flushing = false;
        return;
      } catch {
        if (attempt < 2) {
          await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, attempt)));
        }
      }
    }

    // All retries failed — silently drop
    if (process.env.NODE_ENV === 'development') {
      console.warn('[SponsorTracking] Failed to flush events after 3 retries');
    }
    flushing = false;
  }

  function track(event: TrackEvent): void {
    queue.push(event);

    if (!timer) {
      timer = setInterval(() => {
        flush();
      }, 10_000);
    }

    if (queue.length >= 5) {
      flush();
    }
  }

  function destroy(): void {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
    flush();
  }

  return { track, flush, destroy };
}
