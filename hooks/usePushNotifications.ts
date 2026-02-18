import { useState, useEffect, useCallback } from 'react';
import apiClient from '../services/api/apiClient';

export type PushStatus = 'loading' | 'unsupported' | 'not-standalone' | 'denied' | 'prompt' | 'subscribed';

/** Convert a VAPID base64url public key to Uint8Array for PushManager.subscribe() */
function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const output = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    output[i] = rawData.charCodeAt(i);
  }
  return output.buffer as ArrayBuffer;
}

/** Returns true if running as an installed PWA (standalone mode) */
function isStandalonePWA(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (navigator as any).standalone === true
  );
}

/**
 * Manages Web Push subscription for kitchen staff.
 *
 * @param station  Kitchen station to filter push notifications (null = all stations)
 */
export function usePushNotifications(station: string | null) {
  const [status, setStatus] = useState<PushStatus>('loading');
  const [standalone, setStandalone] = useState(false);

  useEffect(() => {
    const sa = isStandalonePWA();
    setStandalone(sa);

    // iOS requires the app to be installed as a PWA to receive push notifications
    const isIOS =
      /iPad|iPhone|iPod/.test(navigator.userAgent) &&
      !(window as unknown as { MSStream: unknown }).MSStream;

    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setStatus('unsupported');
      return;
    }

    if (isIOS && !sa) {
      // iOS + not installed → push won't work
      setStatus('not-standalone');
      return;
    }

    if (Notification.permission === 'denied') {
      setStatus('denied');
      return;
    }

    // Check if already subscribed
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setStatus(sub ? 'subscribed' : 'prompt'))
      .catch(() => setStatus('prompt'));
  }, []);

  const subscribe = useCallback(async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

    setStatus('loading');
    try {
      // Register the service worker
      await navigator.serviceWorker.register('/sw.js');
      const reg = await navigator.serviceWorker.ready;

      // Ask the user for notification permission
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setStatus(permission === 'denied' ? 'denied' : 'prompt');
        return;
      }

      // Fetch VAPID public key from backend
      const { data } = await apiClient.get<{ publicKey: string }>('/api/push/vapid-public-key');
      const applicationServerKey = urlBase64ToUint8Array(data.publicKey);

      // Subscribe via Push API
      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey,
      });

      const json = subscription.toJSON();
      await apiClient.post('/api/push/subscribe', {
        endpoint: json.endpoint,
        p256dh: json.keys?.p256dh,
        auth: json.keys?.auth,
        station: station,
      });

      setStatus('subscribed');
    } catch (err) {
      console.error('[Push] Subscription failed:', err);
      setStatus('prompt');
    }
  }, [station]);

  const unsubscribe = useCallback(async () => {
    setStatus('loading');
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await apiClient.delete('/api/push/subscribe', { data: { endpoint: sub.endpoint } });
        await sub.unsubscribe();
      }
      setStatus('prompt');
    } catch (err) {
      console.error('[Push] Unsubscribe failed:', err);
      setStatus('prompt');
    }
  }, []);

  return { status, standalone, subscribe, unsubscribe };
}
