import { trackEvents } from '@/api';
import { useWidgetStore } from '@/store';

let eventBuffer: Array<{
  event_type: string;
  event_data?: Record<string, unknown>;
  page_url?: string;
}> = [];

let flushTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Queue a widget event for batch sending.
 * Events are flushed every 2 seconds or when the buffer reaches 10 items.
 */
export function trackEvent(
  eventType: string,
  eventData?: Record<string, unknown>,
) {
  eventBuffer.push({
    event_type: eventType,
    event_data: eventData,
    page_url: window.location.href,
  });

  if (eventBuffer.length >= 10) {
    flushEvents();
  } else if (!flushTimer) {
    flushTimer = setTimeout(flushEvents, 2000);
  }
}

export function flushEvents() {
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }

  if (eventBuffer.length === 0) return;

  const { sessionToken, config } = useWidgetStore.getState();
  if (!sessionToken || !config?.projectId) {
    eventBuffer = [];
    return;
  }

  const events = [...eventBuffer];
  eventBuffer = [];

  trackEvents(sessionToken, config.projectId, events).catch(() => {
    // Silently drop failed events
  });
}

// Flush remaining events when page is unloaded
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', flushEvents);
}
