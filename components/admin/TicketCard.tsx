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
            {ticket.waiterName && (
              <span className="text-blue-400 font-medium">· {ticket.waiterName}</span>
            )}
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

        {/* WhatsApp button when READY */}
        {ticket.status === 'READY' && ticket.waiterPhone && (
          <a
            href={`https://wa.me/${ticket.waiterPhone}?text=${encodeURIComponent(`Mesa ${ticket.tableName ?? ticket.ticketNumber}: el pedido está listo para servir 🍽️`)}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            className="w-full mb-2 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-500 text-white font-bold py-2 rounded transition-colors text-sm"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            Notificar a {ticket.waiterName ?? 'mozo'}
          </a>
        )}

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
