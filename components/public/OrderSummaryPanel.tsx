import React from 'react';

interface OrderSummaryPanelProps {
  itemCount: number;
  total: number;
  onCheckout: () => void;
}

const OrderSummaryPanel: React.FC<OrderSummaryPanelProps> = ({
  itemCount,
  total,
  onCheckout,
}) => {
  const formatPrice = (value: number) => {
    return `$${Math.round(value).toLocaleString('es-AR')}`;
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-charcoal-900 via-charcoal-900 to-transparent z-50 pb-safe">
      <div className="container mx-auto px-4 py-4">
        <div className="bg-charcoal-800 rounded-xl border-2 border-neon-orange shadow-2xl overflow-hidden">
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm text-gray-400">
                  {itemCount} {itemCount === 1 ? 'item' : 'items'} en tu pedido
                </p>
                <p className="text-2xl font-bold text-neon-orange">
                  {formatPrice(total)}
                </p>
              </div>
              <button
                onClick={onCheckout}
                className="bg-neon-orange text-charcoal-900 font-bold px-8 py-3 rounded-lg hover:bg-neon-orange/90 transition-all transform hover:scale-105 active:scale-95 shadow-lg"
              >
                Confirmar Pedido
              </button>
            </div>
            <p className="text-xs text-gray-500 text-center">
              Tu pedido será enviado directamente a cocina
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderSummaryPanel;
