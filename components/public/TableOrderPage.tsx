import React, { useState } from 'react';
import { useTableOrder } from '../../hooks/useTableOrder';
import { useCart } from '../../contexts/CartContext';
import { useCatalog } from '../../hooks/useCatalog';
import TableHeader from './TableHeader';
import OrderSummaryPanel from './OrderSummaryPanel';
import ConfirmTableOrderModal from './ConfirmTableOrderModal';
import DineInProductCard from './DineInProductCard';

const TableOrderPage: React.FC = () => {
  const { isValid, isLoading, error, tableName, hasActiveSession, tableStatus } = useTableOrder();
  const { categories, products } = useCatalog();
  const { cart: items, cartTotal: totalPrice } = useCart();
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-charcoal-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-neon-orange mx-auto mb-4"></div>
          <p className="text-white text-lg">Cargando mesa...</p>
        </div>
      </div>
    );
  }

  if (!isValid || error === 'table_not_found') {
    return (
      <div className="min-h-screen bg-charcoal-900 flex items-center justify-center p-4">
        <div className="bg-charcoal-800 rounded-xl border-2 border-red-500 p-8 max-w-md text-center">
          <div className="text-5xl mb-4">❌</div>
          <h1 className="text-2xl font-bold text-red-400 mb-4">Mesa no encontrada</h1>
          <p className="text-gray-300">
            El código QR no corresponde a ninguna mesa registrada.
          </p>
        </div>
      </div>
    );
  }

  if (!hasActiveSession) {
    return (
      <div className="min-h-screen bg-charcoal-900 flex items-center justify-center p-4">
        <div className="bg-charcoal-800 rounded-xl border-2 border-yellow-500 p-8 max-w-md text-center">
          <div className="text-5xl mb-4">🔒</div>
          <h1 className="text-2xl font-bold text-yellow-400 mb-4">Mesa cerrada</h1>
          <p className="text-gray-300 mb-2">{tableName}</p>
          <p className="text-sm text-gray-500">
            Esta mesa no tiene una sesión activa. Por favor, pedile al mozo que abra la mesa.
          </p>
        </div>
      </div>
    );
  }

  const filteredProducts = selectedCategory
    ? products.filter((p) => p.categoryId === selectedCategory)
    : products;

  return (
    <div className={`min-h-screen bg-charcoal-900 pb-32 ${tableStatus === 'BILL_REQUESTED' ? 'pt-16' : ''}`}>
      {/* Banner: cuenta solicitada */}
      {tableStatus === 'BILL_REQUESTED' && (
        <div className="fixed inset-x-0 top-0 z-50 bg-yellow-400 text-yellow-900 px-4 py-4 flex items-center justify-center gap-3 shadow-lg animate-pulse">
          <svg className="w-6 h-6 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <div className="text-center">
            <p className="font-bold text-base leading-tight">¡Tu cuenta está en camino!</p>
            <p className="text-sm font-medium opacity-80">El mozo se acerca con el resumen.</p>
          </div>
        </div>
      )}

      {/* Header */}
      <TableHeader tableName={tableName} />

      {/* Category filters */}
      <div className="sticky top-16 bg-charcoal-900 z-40 border-b border-charcoal-700 px-4 py-3">
        <div className="flex gap-2 overflow-x-auto hide-scrollbar">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`px-4 py-2 rounded-full whitespace-nowrap transition-all ${
              selectedCategory === null
                ? 'bg-neon-orange text-charcoal-900 font-bold'
                : 'bg-charcoal-800 text-gray-300 hover:bg-charcoal-700'
            }`}
          >
            Todos
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-4 py-2 rounded-full whitespace-nowrap transition-all ${
                selectedCategory === cat.id
                  ? 'bg-neon-orange text-charcoal-900 font-bold'
                  : 'bg-charcoal-800 text-gray-300 hover:bg-charcoal-700'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Products list */}
      <div className="max-w-xl mx-auto px-4 py-4 space-y-2">
        {filteredProducts.map((product) => (
          <DineInProductCard key={product.id} product={product} />
        ))}

        {filteredProducts.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No hay productos en esta categoría</p>
          </div>
        )}
      </div>

      {/* Floating cart summary */}
      {items.length > 0 && (
        <OrderSummaryPanel
          itemCount={items.length}
          total={totalPrice}
          onCheckout={() => setShowConfirmModal(true)}
        />
      )}

      {/* Confirm modal */}
      {showConfirmModal && (
        <ConfirmTableOrderModal onClose={() => setShowConfirmModal(false)} />
      )}
    </div>
  );
};

export default TableOrderPage;
