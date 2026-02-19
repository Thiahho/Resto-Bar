import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import * as signalR from '@microsoft/signalr';
import { KitchenTicket, KitchenStation, KitchenTicketStatus } from '../types';
import { useAuth } from '../hooks/useAuth';
import { useAdminAlerts } from './AdminAlertsContext';

interface KitchenContextType {
  tickets: KitchenTicket[];
  isConnected: boolean;
  currentStation: KitchenStation | null;
  setCurrentStation: (station: KitchenStation | null) => void;
  refreshTickets: () => Promise<void>;
  updateTicketStatus: (ticketId: number, status: KitchenTicketStatus, notes?: string) => Promise<void>;
  filterStatus: KitchenTicketStatus | 'ALL';
  setFilterStatus: (status: KitchenTicketStatus | 'ALL') => void;
}

const KitchenContext = createContext<KitchenContextType | undefined>(undefined);

export const KitchenProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token } = useAuth();
  const { playAlertSound } = useAdminAlerts();
  const playAlertSoundRef = useRef(playAlertSound);
  useEffect(() => { playAlertSoundRef.current = playAlertSound; }, [playAlertSound]);

  const [tickets, setTickets] = useState<KitchenTicket[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [connection, setConnection] = useState<signalR.HubConnection | null>(null);
  const [currentStation, setCurrentStation] = useState<KitchenStation | null>(null);
  const [filterStatus, setFilterStatus] = useState<KitchenTicketStatus | 'ALL'>('ALL');

  // Initialize SignalR connection
  useEffect(() => {
    if (!token) return;

    const hubUrl = import.meta.env.VITE_API_URL
      ? `${import.meta.env.VITE_API_URL}/hubs/admin-orders`
      : '/hubs/admin-orders';

    const newConnection = new signalR.HubConnectionBuilder()
      .withUrl(hubUrl, {
        accessTokenFactory: () => token,
        withCredentials: false,
      })
      .withAutomaticReconnect()
      .configureLogging(signalR.LogLevel.Information)
      .build();

    setConnection(newConnection);

    return () => {
      newConnection.stop();
    };
  }, [token]);

  // Start connection and set up event handlers
  useEffect(() => {
    if (!connection) return;

    const startConnection = async () => {
      try {
        await connection.start();
        console.log('✅ Kitchen SignalR connected');
        setIsConnected(true);

        // Join kitchen group if station is selected
        if (currentStation) {
          await connection.invoke('JoinKitchenGroup', currentStation);
          console.log(`🔔 Joined kitchen group: ${currentStation}`);
        }
      } catch (error) {
        console.error('❌ Error connecting to SignalR:', error);
        setIsConnected(false);
      }
    };

    // Event handlers
    connection.on('NewKitchenTicket', (ticket: KitchenTicket) => {
      console.log('🎫 New kitchen ticket:', ticket);

      // Add to tickets if it matches current station filter
      if (!currentStation || ticket.station === currentStation) {
        setTickets((prev) => [ticket, ...prev]);
        playAlertSoundRef.current().catch(() => {});
      }
    });

    connection.on('KitchenTicketUpdated', (ticket: KitchenTicket) => {
      console.log('📝 Kitchen ticket updated:', ticket);

      setTickets((prev) =>
        prev.map((t) => (t.id === ticket.id ? ticket : t))
      );
    });

    connection.onreconnecting(() => {
      console.log('🔄 SignalR reconnecting...');
      setIsConnected(false);
    });

    connection.onreconnected(async () => {
      console.log('✅ SignalR reconnected');
      setIsConnected(true);

      // Rejoin kitchen group
      if (currentStation) {
        await connection.invoke('JoinKitchenGroup', currentStation);
      }

      // Refresh tickets
      await refreshTickets();
    });

    connection.onclose(() => {
      console.log('❌ SignalR disconnected');
      setIsConnected(false);
    });

    startConnection();

    return () => {
      if (currentStation) {
        connection.invoke('LeaveKitchenGroup', currentStation).catch(console.error);
      }
    };
  }, [connection, currentStation]);

  // Change station
  useEffect(() => {
    if (!connection || !isConnected) return;

    const changeStation = async () => {
      try {
        // Leave previous station group (if any)
        const groups = (connection as any)._groups || [];
        for (const group of groups) {
          if (group.startsWith('Kitchen_')) {
            const oldStation = group.replace('Kitchen_', '');
            await connection.invoke('LeaveKitchenGroup', oldStation);
          }
        }

        // Join new station group
        if (currentStation) {
          await connection.invoke('JoinKitchenGroup', currentStation);
          console.log(`🔔 Switched to kitchen group: ${currentStation}`);
        }

        // Refresh tickets for new station
        await refreshTickets();
      } catch (error) {
        console.error('Error changing station:', error);
      }
    };

    changeStation();
  }, [currentStation, connection, isConnected]);

  // Fetch tickets from API
  const refreshTickets = useCallback(async () => {
    if (!token) return;

    try {
      const params = new URLSearchParams();
      if (currentStation) params.append('station', currentStation);
      if (filterStatus !== 'ALL') params.append('status', filterStatus);

      const apiUrl = import.meta.env.VITE_API_URL || '';
      const response = await fetch(
        `${apiUrl}/api/admin/kitchen-tickets?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setTickets(data);
      }
    } catch (error) {
      console.error('Error fetching tickets:', error);
    }
  }, [token, currentStation, filterStatus]);

  // Update ticket status
  const updateTicketStatus = useCallback(
    async (ticketId: number, status: KitchenTicketStatus, notes?: string) => {
      if (!token) return;

      try {
        const apiUrl = import.meta.env.VITE_API_URL || '';
        const response = await fetch(
          `${apiUrl}/api/admin/kitchen-tickets/${ticketId}/status`,
          {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ status, notes }),
          }
        );

        if (response.ok) {
          const updatedTicket = await response.json();
          setTickets((prev) =>
            prev.map((t) => (t.id === updatedTicket.id ? updatedTicket : t))
          );
        }
      } catch (error) {
        console.error('Error updating ticket status:', error);
        throw error;
      }
    },
    [token]
  );

  // Load tickets on mount and when filters change
  useEffect(() => {
    refreshTickets();
  }, [refreshTickets]);

  return (
    <KitchenContext.Provider
      value={{
        tickets,
        isConnected,
        currentStation,
        setCurrentStation,
        refreshTickets,
        updateTicketStatus,
        filterStatus,
        setFilterStatus,
      }}
    >
      {children}
    </KitchenContext.Provider>
  );
};

export const useKitchen = () => {
  const context = useContext(KitchenContext);
  if (!context) {
    throw new Error('useKitchen must be used within KitchenProvider');
  }
  return context;
};
