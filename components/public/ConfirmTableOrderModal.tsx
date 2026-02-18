import React, { useState } from 'react';
import { useTableOrder } from '../../hooks/useTableOrder';
import { useCart } from '../../contexts/CartContext';
import { useToast } from '../../contexts/ToastContext';
import { CartItem } from '../../types';

interface ConfirmTableOrderModalProps {
  onClose: () => void;
}

const ConfirmTableOrderModal: React.FC<ConfirmTableOrderModalProps> = ({ onClose }) => {
  const { cart: items, cartTotal: totalPrice, clearCart } = useCart();
  const { createOrder } = useTableOrder();
  const { showToast } = useToast();
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderCreated, setOrderCreated] = useState(false);

  const formatPrice = (value: number) => {
    return `$${Math.round(value).toLocaleString('es-AR')}`;
  };

  const handleSubmit = async () => {
    if (items.length === 0) return;

    setIsSubmitting(true);

    try {
      // Transform cart items to order items format
      const orderItems = items.map((item: CartItem) => {
        const productId = item.product?.id ? parseInt(item.product.id) : undefined;
        const unitPrice = item.product?.priceCents || 0;
        const modifiersTotal = 0; // Calculate if modifiers exist
        const lineTotal = item.subtotal;

        return {
          productId,
          nameSnapshot: item.product?.name || item.combo?.name || 'Unknown',
          qty: item.quantity,
          unitPriceCents: unitPrice,
          modifiersTotalCents: modifiersTotal,
          lineTotalCents: lineTotal,
          modifiersSnapshot: item.notes || undefined,
        };
      });

      await createOrder(orderItems, note);

      setOrderCreated(true);
      showToast('¡Pedido enviado a cocina!', 'success');

      // Clear cart after 2 seconds
      setTimeout(() => {
        clearCart();
        onClose();
      }, 2000);
    } catch (error: any) {
      console.error('Error creating order:', error);
      showToast(error.message || 'Error al crear el pedido', 'error');
      setIsSubmitting(false);
    }
  };

  if (orderCreated) {
    return (
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <div
          className="bg-charcoal-800 rounded-xl border-2 border-green-500 max-w-md w-full p-8 text-center"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="text-6xl mb-4">✅</div>
          <h2 className="text-2xl font-bold text-green-400 mb-2">
            ¡Pedido Confirmado!
          </h2>
          <p className="text-gray-300 mb-4">
            Tu pedido ha sido enviado a cocina y llegará pronto a tu mesa.
          </p>
          <div className="bg-charcoal-900/50 rounded-lg p-4 mb-4">
            <p className="text-sm text-gray-400">Total</p>
            <p className="text-3xl font-bold text-neon-orange">
              {formatPrice(totalPrice)}
            </p>
          </div>
          <p className="text-xs text-gray-500">
            Puedes seguir pidiendo cuando quieras
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-charcoal-800 rounded-xl border-2 border-neon-orange max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-neon-orange/20 to-transparent p-6 border-b border-neon-orange/30 sticky top-0 bg-charcoal-800 z-10">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-neon-orange">
              Confirmar Pedido
            </h2>
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

        {/* Items */}
        <div className="p-6 space-y-4">
          <div>
            <h3 className="text-lg font-bold text-white mb-3">Tu pedido</h3>
            <div className="space-y-2">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="bg-charcoal-900/50 rounded-lg p-3 border border-gray-700"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className="font-semibold text-white">
                        {item.quantity}x {item.product?.name || item.combo?.name}
                      </p>
                      {item.notes && (
                        <p className="text-sm text-gray-400 mt-1">{item.notes}</p>
                      )}
                    </div>
                    <p className="font-bold text-neon-orange ml-4">
                      {formatPrice(item.subtotal)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Note */}
          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2">
              Nota especial (opcional)
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ej: Sin cebolla, picante aparte..."
              className="w-full bg-charcoal-900 border border-gray-700 rounded-lg p-3 text-white placeholder-gray-500 focus:border-neon-orange focus:outline-none resize-none"
              rows={3}
            />
          </div>

          {/* Total */}
          <div className="bg-gradient-to-r from-neon-orange/10 to-transparent rounded-lg p-4 border border-neon-orange/30">
            <div className="flex justify-between items-center">
              <span className="text-lg font-semibold text-white">Total</span>
              <span className="text-2xl font-bold text-neon-orange">
                {formatPrice(totalPrice)}
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-700 sticky bottom-0 bg-charcoal-800">
          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 bg-charcoal-700 text-white font-bold py-3 rounded-lg hover:bg-charcoal-600 transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || items.length === 0}
              className="flex-1 bg-neon-orange text-charcoal-900 font-bold py-3 rounded-lg hover:bg-neon-orange/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Enviando...' : 'Confirmar y Enviar a Cocina'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmTableOrderModal;
