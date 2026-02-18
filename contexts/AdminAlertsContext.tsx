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
  const audioCtxRef = useRef<AudioContext | null>(null);
  const soundUnlockedRef = useRef(false);
  const onNewOrderCallbackRef = useRef<((order: AdminOrderCreatedEvent) => void) | null>(null);
  const processedOrderIdsRef = useRef<Set<number>>(new Set());

  // Cargar preferencia de sonido desde localStorage
  useEffect(() => {
    const storedSoundEnabled = localStorage.getItem("adminOrderAlertSoundEnabled");
    if (storedSoundEnabled !== null) {
      setSoundEnabled(storedSoundEnabled === "true");
    }
  }, []);

  // Guardar preferencia de sonido en localStorage
  useEffect(() => {
    localStorage.setItem("adminOrderAlertSoundEnabled", String(soundEnabled));
  }, [soundEnabled]);

  // Función para reproducir sonido de campana
  const playAlertSound = useCallback(async () => {
    // console.log('🔊 Intentando reproducir sonido...', { soundEnabled, soundUnlocked });

    if (!soundEnabled) {
      // console.log('⚠️ Sonido desactivado por el usuario');
      return;
    }

    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) {
      console.error('❌ AudioContext no disponible');
      return;
    }

    try {
      // Crear o obtener contexto de audio
      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioContextClass();
        // console.log('🎵 AudioContext creado en playAlertSound');
      }

      const ctx = audioCtxRef.current;

      // Intentar reanudar el contexto si está suspendido
      if (ctx.state === "suspended") {
        // console.log('🎵 Intentando reanudar AudioContext...');
        await ctx.resume();
        // console.log('✅ AudioContext reanudado, estado:', ctx.state);
      }

      // Marcar como desbloqueado si el contexto está corriendo
      if (ctx.state === "running" && !soundUnlockedRef.current) {
        soundUnlockedRef.current = true;
        setSoundUnlocked(true);
      }

      // Función helper para crear un "ding" de campana
      const createBellTone = (startTime: number, frequency: number, duration: number) => {
        // Oscilador principal
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();

        // Crear armónicos para sonido más rico (campana)
        const harmonic1 = ctx.createOscillator();
        const harmonic2 = ctx.createOscillator();
        const harmonicGain1 = ctx.createGain();
        const harmonicGain2 = ctx.createGain();

        // Configurar frecuencias (fundamental + armónicos)
        oscillator.frequency.value = frequency;
        harmonic1.frequency.value = frequency * 2; // Primera octava
        harmonic2.frequency.value = frequency * 3; // Quinta

        // Tipo de onda para sonido de campana
        oscillator.type = 'sine';
        harmonic1.type = 'sine';
        harmonic2.type = 'sine';

        // Conectar nodos
        oscillator.connect(gainNode);
        harmonic1.connect(harmonicGain1);
        harmonic2.connect(harmonicGain2);

        gainNode.connect(ctx.destination);
        harmonicGain1.connect(ctx.destination);
        harmonicGain2.connect(ctx.destination);

        // Envelope ADSR para sonido de campana (ataque rápido, decay largo)
        const attackTime = 0.01;
        const decayTime = duration;
        const peakVolume = 0.3;
        const harmonicVolume1 = 0.15;
        const harmonicVolume2 = 0.08;

        // Oscilador principal
        gainNode.gain.setValueAtTime(0, startTime);
        gainNode.gain.linearRampToValueAtTime(peakVolume, startTime + attackTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + decayTime);

        // Armónicos
        harmonicGain1.gain.setValueAtTime(0, startTime);
        harmonicGain1.gain.linearRampToValueAtTime(harmonicVolume1, startTime + attackTime);
        harmonicGain1.gain.exponentialRampToValueAtTime(0.001, startTime + decayTime);

        harmonicGain2.gain.setValueAtTime(0, startTime);
        harmonicGain2.gain.linearRampToValueAtTime(harmonicVolume2, startTime + attackTime);
        harmonicGain2.gain.exponentialRampToValueAtTime(0.001, startTime + decayTime);

        // Iniciar y detener
        oscillator.start(startTime);
        harmonic1.start(startTime);
        harmonic2.start(startTime);

        oscillator.stop(startTime + decayTime);
        harmonic1.stop(startTime + decayTime);
        harmonic2.stop(startTime + decayTime);
      };

      // Crear sonido "Ding-Dong" (dos tonos de campana)
      const now = ctx.currentTime;

      // Primer "Ding" (nota más alta - E6)
      createBellTone(now, 1318.5, 1.2);

      // Segundo "Dong" (nota más baja - C6, después de 0.35s)
      createBellTone(now + 0.35, 1046.5, 1.5);

      // console.log('✅ Sonido de campana reproducido correctamente');
    } catch (error) {
      console.error('❌ Error al reproducir sonido:', error);
    }
  }, [soundEnabled]);

  // Función para probar el sonido manualmente
  const testSound = useCallback(() => {
    // console.log('🔔 Botón de prueba presionado');
    playAlertSound();
  }, [playAlertSound]);

  // Desbloquear audio al interactuar (Android requiere gesto directo + silent buffer)
  useEffect(() => {
    const unlockAudio = async () => {
      if (soundUnlockedRef.current) return;

      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;

      try {
        if (!audioCtxRef.current) {
          audioCtxRef.current = new AudioContextClass();
        }

        const ctx = audioCtxRef.current;

        if (ctx.state === 'suspended') {
          await ctx.resume();
        }

        if (ctx.state === 'running') {
          // Reproducir buffer silencioso — obligatorio en Android para desbloquear realmente
          const buf = ctx.createBuffer(1, 1, ctx.sampleRate);
          const src = ctx.createBufferSource();
          src.buffer = buf;
          src.connect(ctx.destination);
          src.start(0);

          soundUnlockedRef.current = true;
          setSoundUnlocked(true);
        }
      } catch (error) {
        console.error('❌ Error al desbloquear audio:', error);
      }
    };

    // Escuchar múltiples eventos de usuario para desbloquear audio
    // Sin { once: true } para reintentar si el primer intento falla
    const events = ['click', 'touchstart', 'keydown', 'mousedown'];
    events.forEach(event => {
      document.addEventListener(event, unlockAudio);
    });

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, unlockAudio);
      });
    };
  }, []);

  // Callback cuando llega una nueva orden por SignalR
  const handleNewOrder = useCallback((orderEvent: AdminOrderCreatedEvent) => {
    // Verificar si ya procesamos este pedido (evitar duplicados por múltiples conexiones)
    if (processedOrderIdsRef.current.has(orderEvent.id)) {
      // console.log('⚠️ Pedido #' + orderEvent.id + ' ya fue procesado, ignorando duplicado');
      return;
    }

    // Marcar como procesado
    processedOrderIdsRef.current.add(orderEvent.id);

    // Limpiar IDs antiguos (mantener solo los últimos 100 para evitar memory leak)
    if (processedOrderIdsRef.current.size > 100) {
      const idsArray = Array.from(processedOrderIdsRef.current);
      processedOrderIdsRef.current = new Set(idsArray.slice(-100));
    }

    // console.log('🔔 Nueva orden recibida por SignalR:', orderEvent);
    setPendingAlerts((prev) => prev + 1);
    showToast(`🔔 Nuevo pedido #${orderEvent.id} de ${orderEvent.customerName}`, "success");
    playAlertSound().catch(err => console.error('Error playing sound:', err));

    // Notificar a componentes suscritos (ej: OrderManager)
    if (onNewOrderCallbackRef.current) {
      onNewOrderCallbackRef.current(orderEvent);
    }
  }, [showToast, playAlertSound]);

  // Callback cuando un ticket de cocina está listo para servir
  const handleKitchenTicketReady = useCallback((ticket: KitchenTicket) => {
    const mesa = ticket.tableName ?? ticket.ticketNumber;
    showToast(`Pedido listo - ${mesa} (${ticket.station})`, "info");
    playAlertSound().catch(err => console.error('Error playing sound:', err));
  }, [showToast, playAlertSound]);

  // Función para que los componentes se suscriban a nuevas órdenes
  const onNewOrderAlert = useCallback((callback: (order: AdminOrderCreatedEvent) => void) => {
    onNewOrderCallbackRef.current = callback;
  }, []);

  // Conectar a SignalR
  useAdminHub({
    // Solo escuchar el evento general para evitar duplicados
    // (OrderCreated se envía a todos los admins, OrderCreatedByBranch solo a la sucursal específica)
    onOrderCreated: handleNewOrder,
    // No escuchar OrderCreatedByBranch aquí para evitar alertas duplicadas
    onOrderCreatedByBranch: undefined,
    onKitchenTicketReady: handleKitchenTicketReady,
    onConnected: () => {
      // console.log("🟢 SignalR conectado - Alertas en tiempo real activas");
      setIsSignalRConnected(true);
    },
    onDisconnected: () => {
      // console.log("🔴 SignalR desconectado");
      setIsSignalRConnected(false);
    },
    onReconnecting: () => {
      // console.log("🟡 SignalR reconectando...");
      setIsSignalRConnected(false);
    },
    onReconnected: () => {
      // console.log("🟢 SignalR reconectado");
      setIsSignalRConnected(true);
    },
  });

  const clearAlerts = useCallback(() => {
    setPendingAlerts(0);
  }, []);

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
