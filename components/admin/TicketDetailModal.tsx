import React from 'react';
import { KitchenTicket } from '../../types';

interface TicketDetailModalProps {
  ticket: KitchenTicket;
  onClose: () => void;
}

const TicketDetailModal: React.FC<TicketDetailModalProps> = ({ ticket, onClose }) => {
  const parseItems = () => {
    try {
      return ticket.itemsSnapshot ? JSON.parse(ticket.itemsSnapshot) : [];
    } catch {
      return [];
    }
  };

  const items = parseItems();

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleTimeString('es-AR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-charcoal-800 rounded-xl border-2 border-neon-orange/50 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-neon-orange/20 to-transparent p-6 border-b border-neon-orange/30">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold text-neon-orange">
                Ticket {ticket.ticketNumber}
              </h2>
              <p className="text-sm text-gray-400 mt-1">
                Orden #{ticket.orderId} • {ticket.station}
                {ticket.tableName && <> • <span className="text-neon-orange font-semibold">{ticket.tableName}</span></>}
                {ticket.customerName && <> — {ticket.customerName}</>}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Status & Times */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-500 uppercase mb-1">Estado</p>
              <p className="text-lg font-semibold text-white">{ticket.status}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase mb-1">Creado</p>
              <p className="text-lg text-white">{formatDate(ticket.createdAt)}</p>
            </div>
            {ticket.startedAt && (
              <div>
                <p className="text-xs text-gray-500 uppercase mb-1">Iniciado</p>
                <p className="text-lg text-white">{formatDate(ticket.startedAt)}</p>
              </div>
            )}
            {ticket.readyAt && (
              <div>
                <p className="text-xs text-gray-500 uppercase mb-1">Listo</p>
                <p className="text-lg text-white">{formatDate(ticket.readyAt)}</p>
              </div>
            )}
          </div>

          {/* Items */}
          <div>
            <h3 className="text-lg font-bold text-neon-orange mb-3">Items</h3>
            <div className="space-y-2">
              {items.map((item: any, idx: number) => (
                <div
                  key={idx}
                  className="bg-charcoal-900/50 rounded-lg p-3 border border-gray-700"
                >
                  <p className="font-semibold text-white">
                    {item.Qty || item.qty}x {item.NameSnapshot || item.nameSnapshot}
                  </p>
                  {(() => {
                    const raw = item.ModifiersSnapshot || item.modifiersSnapshot;
                    if (!raw) return null;
                    try {
                      const mods: { name?: string; Name?: string }[] = JSON.parse(raw);
                      if (!mods.length) return null;
                      return (
                        <ul className="mt-1 space-y-0.5">
                          {mods.map((m, mi) => (
                            <li key={mi} className="text-xs text-gray-400 flex items-center gap-1">
                              <span className="text-neon-orange">+</span>
                              {m.name || m.Name}
                            </li>
                          ))}
                        </ul>
                      );
                    } catch {
                      return null;
                    }
                  })()}
                </div>
              ))}
            </div>
          </div>

          {/* Notes */}
          {ticket.notes && (
            <div>
              <h3 className="text-lg font-bold text-neon-orange mb-2">Notas</h3>
              <p className="text-gray-300 bg-charcoal-900/50 rounded-lg p-3 border border-gray-700">
                {ticket.notes}
              </p>
            </div>
          )}

          {/* Assigned to */}
          {ticket.assignedToUserName && (
            <div>
              <p className="text-xs text-gray-500 uppercase mb-1">Asignado a</p>
              <p className="text-white">{ticket.assignedToUserName}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-700">
          <button
            onClick={onClose}
            className="w-full bg-neon-orange text-charcoal-900 font-bold py-3 rounded-lg hover:bg-neon-orange/80 transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

export default TicketDetailModal;
