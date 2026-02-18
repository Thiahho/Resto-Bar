import React, { useMemo } from 'react';
import { useKitchen } from '../../contexts/KitchenContext';
import { KitchenTicketStatus } from '../../types';
import TicketCard from './TicketCard';
import StationSelector from './StationSelector';

const KitchenViewPage: React.FC = () => {
  const { tickets, isConnected, currentStation, setCurrentStation, refreshTickets } = useKitchen();

  // Group tickets by status
  const ticketsByStatus = useMemo(() => {
    const groups: Record<KitchenTicketStatus, typeof tickets> = {
      PENDING: [],
      IN_PROGRESS: [],
      READY: [],
      DELIVERED: [],
    };

    tickets.forEach((ticket) => {
      const status = ticket.status as KitchenTicketStatus;
      if (groups[status]) {
        groups[status].push(ticket);
      }
    });

    return groups;
  }, [tickets]);

  const columns: { status: KitchenTicketStatus; label: string; color: string }[] = [
    { status: 'PENDING', label: 'Pendientes', color: 'border-red-500' },
    { status: 'IN_PROGRESS', label: 'En Proceso', color: 'border-yellow-500' },
    { status: 'READY', label: 'Listos', color: 'border-green-500' },
  ];

  return (
    <div className="min-h-screen bg-charcoal-900 p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-3xl font-bold text-neon-orange">Vista de Cocina</h1>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div
                className={`w-3 h-3 rounded-full ${
                  isConnected ? 'bg-green-500' : 'bg-red-500'
                } animate-pulse`}
              />
              <span className="text-sm text-gray-400">
                {isConnected ? 'Conectado' : 'Desconectado'}
              </span>
            </div>
            <button
              onClick={refreshTickets}
              className="bg-charcoal-700 text-white px-4 py-2 rounded-lg hover:bg-charcoal-600 transition-colors"
            >
              ↻ Actualizar
            </button>
          </div>
        </div>

        {/* Station selector */}
        <StationSelector
          currentStation={currentStation}
          onStationChange={setCurrentStation}
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
          <p className="text-sm text-red-300 mb-1">Pendientes</p>
          <p className="text-3xl font-bold text-red-400">
            {ticketsByStatus.PENDING.length}
          </p>
        </div>
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
          <p className="text-sm text-yellow-300 mb-1">En Proceso</p>
          <p className="text-3xl font-bold text-yellow-400">
            {ticketsByStatus.IN_PROGRESS.length}
          </p>
        </div>
        <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
          <p className="text-sm text-green-300 mb-1">Listos</p>
          <p className="text-3xl font-bold text-green-400">
            {ticketsByStatus.READY.length}
          </p>
        </div>
      </div>

      {/* Kanban board */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {columns.map((column) => (
          <div key={column.status} className="flex flex-col">
            <div
              className={`bg-charcoal-800 rounded-t-lg border-t-4 ${column.color} p-4 mb-2`}
            >
              <h2 className="text-xl font-bold text-white">
                {column.label} ({ticketsByStatus[column.status].length})
              </h2>
            </div>
            <div className="space-y-3 flex-1">
              {ticketsByStatus[column.status].length === 0 ? (
                <div className="bg-charcoal-800/50 rounded-lg p-8 text-center text-gray-500">
                  Sin tickets
                </div>
              ) : (
                ticketsByStatus[column.status].map((ticket) => (
                  <TicketCard key={ticket.id} ticket={ticket} />
                ))
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Empty state */}
      {tickets.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">
            {currentStation
              ? `No hay tickets para ${currentStation}`
              : 'No hay tickets pendientes'}
          </p>
        </div>
      )}
    </div>
  );
};

export default KitchenViewPage;
