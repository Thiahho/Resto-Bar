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

// Toca un ding-dong sobre el AudioContext dado (que ya debe estar en 'running').
function playBellOn(ctx: AudioContext) {
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
  // Ding: E6
  playNote(1318.51, now, 0.7, 0.6);
  playNote(2637.02, now, 0.35, 0.15);
  // Dong: C6 (350ms después)
  playNote(1046.50, now + 0.35, 0.7, 0.6);
  playNote(2093.00, now + 0.35, 0.35, 0.15);
}

export const AdminAlertsProvider: React.FC<AdminAlertsProviderProps> = ({ children }) => {
  const { showToast } = useToast();
  const [isSignalRConnected, setIsSignalRConnected] = useState(false);
  const [pendingAlerts, setPendingAlerts] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [soundUnlocked, setSoundUnlocked] = useState(false);

  // AudioContext creado DENTRO de un gesto del usuario → arranca en 'running' en Chrome/Android.
  // Crearlo fuera (useEffect) lo deja en 'suspended' y resume() puede fallar en Android.
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

  // Cleanup del AudioContext al desmontar
  useEffect(() => {
    return () => {
      audioCtxRef.current?.close().catch(() => {});
    };
  }, []);

  /**
   * Crea un nuevo AudioContext DENTRO de un gesto del usuario.
   * En Chrome/Android, un AudioContext creado en un gesto arranca directamente
   * en 'running', sin necesidad de llamar resume().
   * Devuelve el contexto si tuvo éxito, o null si el navegador lo bloqueó.
   */
  const createRunningContext = useCallback((): AudioContext | null => {
    try {
      // Cerrar el anterior si existe
      audioCtxRef.current?.close().catch(() => {});
      const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      audioCtxRef.current = ctx;
      soundUnlockedRef.current = true;
      setSoundUnlocked(true);
      return ctx;
    } catch {
      return null;
    }
  }, []);

  // Auto-unlock en el primer gesto confiable del usuario (sin reproducir sonido)
  useEffect(() => {
    const unlock = () => {
      if (soundUnlockedRef.current) return;
      createRunningContext();
    };
    document.addEventListener('click', unlock);
    document.addEventListener('touchend', unlock);
    document.addEventListener('keydown', unlock);
    return () => {
      document.removeEventListener('click', unlock);
      document.removeEventListener('touchend', unlock);
      document.removeEventListener('keydown', unlock);
    };
  }, [createRunningContext]);

  // Reproducir alerta: vibración + campana (si el contexto fue desbloqueado)
  const playAlertSound = useCallback(async () => {
    if (!soundEnabled) return;

    // Vibración — funciona en Android sin restricciones de volumen ni gesto
    if ('vibrate' in navigator) {
      navigator.vibrate([200, 100, 200]);
    }

    // Campana — solo si el AudioContext ya está corriendo (desbloqueado por gesto previo)
    const ctx = audioCtxRef.current;
    if (ctx && ctx.state === 'running') {
      playBellOn(ctx);
    }
  }, [soundEnabled]);

  // Botón "Probar": crea el contexto en el gesto del usuario y toca inmediatamente
  const testSound = useCallback(() => {
    const ctx = createRunningContext();
    if (ctx) playBellOn(ctx);
  }, [createRunningContext]);

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
