import { useEffect, useRef, useCallback } from 'react';
import * as signalR from '@microsoft/signalr';
import { API_BASE_URL } from '../services/api/apiClient';

export interface AdminOrderCreatedEvent {
  id: number;
  branchId?: number;
  customerName: string;
  phone: string;
  takeMode: string;
  totalCents: number;
  status: string;
  createdAt: string;
}

interface UseAdminHubProps {
  onOrderCreated?: (order: AdminOrderCreatedEvent) => void;
  onOrderCreatedByBranch?: (order: AdminOrderCreatedEvent) => void;
  onConnected?: () => void;
  onDisconnected?: () => void;
  onReconnecting?: () => void;
  onReconnected?: () => void;
}

export const useAdminHub = ({
  onOrderCreated,
  onOrderCreatedByBranch,
  onConnected,
  onDisconnected,
  onReconnecting,
  onReconnected,
}: UseAdminHubProps) => {
  const connectionRef = useRef<signalR.HubConnection | null>(null);
  const isConnectingRef = useRef(false);

  // Usar refs para los callbacks para evitar recrear la conexión
  const onOrderCreatedRef = useRef(onOrderCreated);
  const onOrderCreatedByBranchRef = useRef(onOrderCreatedByBranch);
  const onConnectedRef = useRef(onConnected);
  const onDisconnectedRef = useRef(onDisconnected);
  const onReconnectingRef = useRef(onReconnecting);
  const onReconnectedRef = useRef(onReconnected);

  // Actualizar las refs cuando cambien los callbacks
  useEffect(() => {
    onOrderCreatedRef.current = onOrderCreated;
    onOrderCreatedByBranchRef.current = onOrderCreatedByBranch;
    onConnectedRef.current = onConnected;
    onDisconnectedRef.current = onDisconnected;
    onReconnectingRef.current = onReconnecting;
    onReconnectedRef.current = onReconnected;
  });

  useEffect(() => {
    const token = sessionStorage.getItem('authToken');

    // Si no hay token, no conectar
    if (!token) {
      console.log('No auth token found, skipping SignalR connection');
      return;
    }

    // Prevenir múltiples conexiones simultáneas
    if (isConnectingRef.current || connectionRef.current?.state === signalR.HubConnectionState.Connected) {
      return;
    }

    isConnectingRef.current = true;

    // Crear la conexión
    const connection = new signalR.HubConnectionBuilder()
      .withUrl(`${API_BASE_URL}/hubs/admin-orders`, {
        accessTokenFactory: () => token,
        // Configuración de transporte: intentar en orden de preferencia
        transport: signalR.HttpTransportType.WebSockets | signalR.HttpTransportType.ServerSentEvents | signalR.HttpTransportType.LongPolling,
        skipNegotiation: false, // Importante: mantener negociación para que funcione el fallback
      })
      .withAutomaticReconnect([0, 2000, 5000, 10000, 30000]) // Reintentos más controlados
      .configureLogging(signalR.LogLevel.Information)
      .build();

    // Registrar eventos del hub usando refs
    connection.on('OrderCreated', (order: AdminOrderCreatedEvent) => {
      onOrderCreatedRef.current?.(order);
    });
    connection.on('OrderCreatedByBranch', (order: AdminOrderCreatedEvent) => {
      onOrderCreatedByBranchRef.current?.(order);
    });

    // Eventos de conexión
    connection.onclose((_error) => {
      // console.log('SignalR connection closed', error);
      isConnectingRef.current = false;
      onDisconnectedRef.current?.();
    });

    connection.onreconnecting((_error) => {
      // console.log('SignalR reconnecting...', error);
      onReconnectingRef.current?.();
    });

    connection.onreconnected((_connectionId) => {
      // console.log('SignalR reconnected', connectionId);
      onReconnectedRef.current?.();
    });

    // Iniciar la conexión
    connection.start()
      .then(() => {
        // console.log('✅ Connected to AdminOrdersHub');
        connectionRef.current = connection;
        isConnectingRef.current = false;
        onConnectedRef.current?.();
      })
      .catch((err) => {
        console.error('❌ SignalR connection error:', err);
        isConnectingRef.current = false;
        onDisconnectedRef.current?.();
      });

    // Cleanup: detener la conexión cuando el componente se desmonte
    return () => {
      if (connectionRef.current) {
        // console.log('🔌 Stopping SignalR connection...');
        const conn = connectionRef.current;
        connectionRef.current = null; // Limpiar referencia inmediatamente
        isConnectingRef.current = false;

        // Detener la conexión de forma asíncrona
        conn.stop()
          .then(() => {
            // console.log('✅ SignalR connection stopped');
          })
          .catch(err => console.error('❌ Error stopping SignalR connection:', err));
      } else {
        isConnectingRef.current = false;
      }
    };
    // Solo ejecutar una vez al montar para evitar múltiples conexiones
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Método para suscribirse a una sucursal específica
  const subscribeToBranch = useCallback(async (branchId: number) => {
    if (connectionRef.current?.state === signalR.HubConnectionState.Connected) {
      try {
        await connectionRef.current.invoke('SubscribeToBranch', branchId);
        // console.log(`Subscribed to branch ${branchId}`);
      } catch (err) {
        console.error('Error subscribing to branch:', err);
      }
    }
  }, []);

  // Método para desuscribirse de una sucursal
  const unsubscribeFromBranch = useCallback(async (branchId: number) => {
    if (connectionRef.current?.state === signalR.HubConnectionState.Connected) {
      try {
        await connectionRef.current.invoke('UnsubscribeFromBranch', branchId);
        // console.log(`Unsubscribed from branch ${branchId}`);
      } catch (err) {
        console.error('Error unsubscribing from branch:', err);
      }
    }
  }, []);

  return {
    connection: connectionRef.current,
    connectionState: connectionRef.current?.state,
    subscribeToBranch,
    unsubscribeFromBranch,
  };
};
