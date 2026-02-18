import React, { useState } from 'react';
import { KitchenTicket, KitchenTicketStatus } from '../../types';
import { useKitchen } from '../../contexts/KitchenContext';
import TicketDetailModal from './TicketDetailModal';

interface TicketCardProps {
  ticket: KitchenTicket;
}

const TicketCard: React.FC<TicketCardProps> = ({ ticket }) => {
  const { updateTicketStatus } = useKitchen();
  const [showDetail, setShowDetail] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const getTimeSince = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Ahora';
    if (diffMins < 60) return `${diffMins} min`;
    const diffHours = Math.floor(diffMins / 60);
    return `${diffHours}h ${diffMins % 60}m`;
  };

  const getStatusColor = (status: KitchenTicketStatus) => {
    switch (status) {
      case 'PENDING':
        return 'bg-red-500/20 text-red-300 border-red-500';
      case 'IN_PROGRESS':
        return 'bg-yellow-500/20 text-yellow-300 border-yellow-500';
      case 'READY':
        return 'bg-green-500/20 text-green-300 border-green-500';
      default:
        return 'bg-gray-500/20 text-gray-300 border-gray-500';
    }
  };

  const getNextStatus = (current: KitchenTicketStatus): KitchenTicketStatus | null => {
    switch (current) {
      case 'PENDING':
        return 'IN_PROGRESS';
      case 'IN_PROGRESS':
        return 'READY';
      case 'READY':
        return 'DELIVERED';
      default:
        return null;
    }
  };

  const getActionLabel = (status: KitchenTicketStatus) => {
    switch (status) {
      case 'PENDING':
        return 'Iniciar';
      case 'IN_PROGRESS':
        return 'Listo';
      case 'READY':
        return 'Entregado';
      default:
        return null;
    }
  };

  const handleUpdateStatus = async () => {
    const nextStatus = getNextStatus(ticket.status as KitchenTicketStatus);
    if (!nextStatus) return;

    setIsUpdating(true);
    try {
      await updateTicketStatus(ticket.id, nextStatus);
    } catch (error) {
      console.error('Error updating ticket:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const parseItems = () => {
    try {
      return ticket.itemsSnapshot ? JSON.parse(ticket.itemsSnapshot) : [];
    } catch {
      return [];
    }
  };

  const items = parseItems();
  const isUrgent = ticket.status === 'PENDING' && getTimeSince(ticket.createdAt).includes('h');

  return (
    <>
      <div
        className={`bg-charcoal-800 rounded-lg border-2 ${getStatusColor(
          ticket.status as KitchenTicketStatus
        )} p-4 cursor-pointer hover:border-opacity-100 transition-all ${
          isUrgent ? 'animate-pulse' : ''
        }`}
        onClick={() => setShowDetail(true)}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-neon-orange">
              {ticket.ticketNumber}
            </span>
            <span className="text-xs text-gray-400">
              {getTimeSince(ticket.createdAt)}
            </span>
          </div>
          <div
            className={`px-2 py-1 rounded text-xs font-semibold ${getStatusColor(
              ticket.status as KitchenTicketStatus
            )}`}
          >
            {ticket.status}
          </div>
        </div>

        {/* Table info */}
        {ticket.tableName && (
          <div className="text-xs text-gray-400 mb-2 flex items-center gap-1">
            <span className="text-neon-orange font-semibold">{ticket.tableName}</span>
            {ticket.customerName && <span>· {ticket.customerName}</span>}
          </div>
        )}

        {/* Items */}
        <div className="space-y-1 mb-3">
          {items.slice(0, 3).map((item: any, idx: number) => {
            const raw = item.ModifiersSnapshot || item.modifiersSnapshot;
            let modNames: string[] = [];
            try {
              if (raw) {
                const mods: { name?: string; Name?: string }[] = JSON.parse(raw);
                modNames = mods.map(m => m.name || m.Name || '').filter(Boolean);
              }
            } catch { /* ignore */ }
            return (
              <div key={idx} className="text-sm">
                <span className="text-gray-300">
                  {item.Qty || item.qty}x {item.NameSnapshot || item.nameSnapshot}
                </span>
                {modNames.length > 0 && (
                  <span className="text-xs text-gray-500 ml-1">
                    (+{modNames.join(', ')})
                  </span>
                )}
              </div>
            );
          })}
          {items.length > 3 && (
            <div className="text-xs text-gray-500">
              +{items.length - 3} más...
            </div>
          )}
        </div>

        {/* Action button */}
        {getNextStatus(ticket.status as KitchenTicketStatus) && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleUpdateStatus();
            }}
            disabled={isUpdating}
            className="w-full bg-neon-orange text-charcoal-900 font-bold py-2 rounded hover:bg-neon-orange/80 transition-colors disabled:opacity-50"
          >
            {isUpdating ? 'Actualizando...' : getActionLabel(ticket.status as KitchenTicketStatus)}
          </button>
        )}
      </div>

      {showDetail && (
        <TicketDetailModal
          ticket={ticket}
          onClose={() => setShowDetail(false)}
        />
      )}
    </>
  );
};

export default TicketCard;
