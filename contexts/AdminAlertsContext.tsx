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

  // HTML5 Audio element — más confiable que Web Audio API en Android Chrome
  const audioRef = useRef<HTMLAudioElement | null>(null);
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

  // Crear el elemento <audio> una sola vez
  useEffect(() => {
    const audio = new Audio('/notification.wav');
    audio.preload = 'auto';
    audio.volume = 0.8;
    audioRef.current = audio;
  }, []);

  // Reproducir sonido de alerta
  const playAlertSound = useCallback(async () => {
    if (!soundEnabled || !audioRef.current) return;
    try {
      audioRef.current.currentTime = 0;
      await audioRef.current.play();
    } catch {
      // Silencioso si falla (e.g. contexto suspendido en background)
    }
  }, [soundEnabled]);

  // Probar sonido — también desbloquea el audio en Android
  const testSound = useCallback(() => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = 0;
    audioRef.current.play()
      .then(() => {
        if (!soundUnlockedRef.current) {
          soundUnlockedRef.current = true;
          setSoundUnlocked(true);
        }
      })
      .catch(() => {});
  }, []);

  // Desbloquear audio automáticamente en el primer gesto del usuario
  useEffect(() => {
    const unlock = () => {
      if (soundUnlockedRef.current || !audioRef.current) return;
      audioRef.current.play()
        .then(() => {
          audioRef.current!.pause();
          audioRef.current!.currentTime = 0;
          soundUnlockedRef.current = true;
          setSoundUnlocked(true);
        })
        .catch(() => {});
    };

    const events = ['click', 'touchstart', 'keydown'];
    events.forEach(e => document.addEventListener(e, unlock));
    return () => events.forEach(e => document.removeEventListener(e, unlock));
  }, []);

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
