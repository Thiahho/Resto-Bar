import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { useAdminHub, AdminOrderCreatedEvent } from '../hooks/useAdminHub';
import { useToast } from './ToastContext';
import { KitchenTicket } from '../types';

interface AdminAlertsContextType {
  isSignalRConnected: boolean;
  pendingAlerts: number;
  clearAlerts: () => void;
  soundEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;
  soundUnlocked: boolean;
  playAlertSound: () => Promise<void>;
  testSound: () => void;
  onNewOrderAlert: (callback: (order: AdminOrderCreatedEvent) => void) => void;
}

const AdminAlertsContext = createContext<AdminAlertsContextType | undefined>(undefined);

export const useAdminAlerts = () => {
  const context = useContext(AdminAlertsContext);
  if (!context) {
    throw new Error('useAdminAlerts must be used within AdminAlertsProvider');
  }
  return context;
};

interface AdminAlertsProviderProps {
  children: React.ReactNode;
}

export const AdminAlertsProvider: React.FC<AdminAlertsProviderProps> = ({ children }) => {
  const { showToast } = useToast();
  const [isSignalRConnected, setIsSignalRConnected] = useState(false);
  const [pendingAlerts, setPendingAlerts] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [soundUnlocked, setSoundUnlocked] = useState(false);

  // Persistent AudioContext — created ONCE, resumed on first user gesture.
  // Never recreated so it stays in 'running' state after resume().
  const audioCtxRef = useRef<AudioContext | null>(null);
  const soundUnlockedRef = useRef(false);
  const onNewOrderCallbackRef = useRef<((order: AdminOrderCreatedEvent) => void) | null>(null);
  const processedOrderIdsRef = useRef<Set<number>>(new Set());

  // Cargar preferencia de sonido desde localStorage
  useEffect(() => {
    const stored = localStorage.getItem('adminOrderAlertSoundEnabled');
    if (stored !== null) setSoundEnabled(stored === 'true');
  }, []);

  // Guardar preferencia de sonido en localStorage
  useEffect(() => {
    localStorage.setItem('adminOrderAlertSoundEnabled', String(soundEnabled));
  }, [soundEnabled]);

  // Crear AudioContext una sola vez al montar
  useEffect(() => {
    try {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch {
      // AudioContext no soportado en este navegador
    }
    return () => {
      audioCtxRef.current?.close().catch(() => {});
    };
  }, []);

  // Sintetizar un ding-dong usando el AudioContext ya activo.
  // Al no depender de ningún archivo externo, siempre funciona si ctx está running.
  const playBell = useCallback(() => {
    const ctx = audioCtxRef.current;
    if (!ctx || ctx.state !== 'running') return;

    const playNote = (freq: number, startTime: number, duration: number, volume = 0.5) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(volume, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(startTime);
      osc.stop(startTime + duration);
    };

    const now = ctx.currentTime;
    // Ding: E6 + armónico
    playNote(1318.51, now, 0.7, 0.6);
    playNote(2637.02, now, 0.35, 0.15);
    // Dong: C6 + armónico (350ms después)
    playNote(1046.50, now + 0.35, 0.7, 0.6);
    playNote(2093.00, now + 0.35, 0.35, 0.15);
  }, []);

  // Reproducir alerta: vibración (Android, sin restricciones) + campana (si desbloqueada)
  const playAlertSound = useCallback(async () => {
    if (!soundEnabled) return;

    // Vibración — funciona en Android sin permiso de audio ni gesto del usuario
    if ('vibrate' in navigator) {
      navigator.vibrate([200, 100, 200]);
    }

    if (!soundUnlockedRef.current) return;
    playBell();
  }, [soundEnabled, playBell]);

  // Desbloquear AudioContext en el primer gesto confiable del usuario.
  // ctx.resume() es la API oficial para salir del estado 'suspended' en Chrome/Android.
  const unlock = useCallback(() => {
    if (soundUnlockedRef.current || !audioCtxRef.current) return;
    audioCtxRef.current.resume()
      .then(() => {
        soundUnlockedRef.current = true;
        setSoundUnlocked(true);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    document.addEventListener('click', unlock);
    document.addEventListener('touchend', unlock);
    document.addEventListener('keydown', unlock);
    return () => {
      document.removeEventListener('click', unlock);
      document.removeEventListener('touchend', unlock);
      document.removeEventListener('keydown', unlock);
    };
  }, [unlock]);

  // Botón "Probar" — fuerza resume() + toca la campana inmediatamente
  const testSound = useCallback(() => {
    const ctx = audioCtxRef.current;
    if (!ctx) return;
    ctx.resume()
      .then(() => {
        soundUnlockedRef.current = true;
        setSoundUnlocked(true);
        playBell();
      })
      .catch(() => {});
  }, [playBell]);

  // Escuchar mensajes del service worker (push recibido mientras la app está abierta)
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    const handler = (event: MessageEvent) => {
      if (event.data?.type === 'PUSH_KITCHEN_ORDER') {
        playAlertSound().catch(() => {});
      }
    };
    navigator.serviceWorker.addEventListener('message', handler);
    return () => navigator.serviceWorker.removeEventListener('message', handler);
  }, [playAlertSound]);

  // Callback cuando llega una nueva orden por SignalR
  const handleNewOrder = useCallback((orderEvent: AdminOrderCreatedEvent) => {
    if (processedOrderIdsRef.current.has(orderEvent.id)) return;
    processedOrderIdsRef.current.add(orderEvent.id);

    if (processedOrderIdsRef.current.size > 100) {
      const arr = Array.from(processedOrderIdsRef.current);
      processedOrderIdsRef.current = new Set(arr.slice(-100));
    }

    setPendingAlerts((prev) => prev + 1);
    showToast(`🔔 Nuevo pedido #${orderEvent.id} de ${orderEvent.customerName}`, 'success');
    playAlertSound().catch(() => {});

    if (onNewOrderCallbackRef.current) {
      onNewOrderCallbackRef.current(orderEvent);
    }
  }, [showToast, playAlertSound]);

  // Callback cuando un ticket de cocina está listo para servir
  const handleKitchenTicketReady = useCallback((ticket: KitchenTicket) => {
    const mesa = ticket.tableName ?? ticket.ticketNumber;
    showToast(`Pedido listo - ${mesa} (${ticket.station})`, 'info');
    playAlertSound().catch(() => {});
  }, [showToast, playAlertSound]);

  const onNewOrderAlert = useCallback((callback: (order: AdminOrderCreatedEvent) => void) => {
    onNewOrderCallbackRef.current = callback;
  }, []);

  useAdminHub({
    onOrderCreated: handleNewOrder,
    onOrderCreatedByBranch: undefined,
    onKitchenTicketReady: handleKitchenTicketReady,
    onConnected: () => setIsSignalRConnected(true),
    onDisconnected: () => setIsSignalRConnected(false),
    onReconnecting: () => setIsSignalRConnected(false),
    onReconnected: () => setIsSignalRConnected(true),
  });

  const clearAlerts = useCallback(() => setPendingAlerts(0), []);

  const value: AdminAlertsContextType = {
    isSignalRConnected,
    pendingAlerts,
    clearAlerts,
    soundEnabled,
    setSoundEnabled,
    soundUnlocked,
    playAlertSound,
    testSound,
    onNewOrderAlert,
  };

  return (
    <AdminAlertsContext.Provider value={value}>
      {children}
    </AdminAlertsContext.Provider>
  );
};
