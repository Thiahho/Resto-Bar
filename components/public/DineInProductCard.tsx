import React, { useState } from 'react';
import { Products } from '../../types';
import { getProductsImageUrl } from '../../services/api/apiClient';
import { useCart } from '../../contexts/CartContext';
import ProductDetailModal from './ProductDetailModal';

interface DineInProductCardProps {
  product: Products;
}

const DineInProductCard: React.FC<DineInProductCardProps> = ({ product }) => {
  const [showModal, setShowModal] = useState(false);
  const { cart } = useCart();

  const imageUrl = product.hasImage ? getProductsImageUrl(product.id) : '/placeholder.png';
  const totalQty = cart
    .filter((item) => item.product?.id === product.id)
    .reduce((sum, item) => sum + item.quantity, 0);

  const hasDiscount =
    product.originalPriceCents && product.originalPriceCents > product.priceCents;

  return (
    <>
      <div className="flex items-center gap-3 bg-charcoal-800 rounded-xl p-3 border border-charcoal-700 hover:border-neon-orange/40 transition-colors">
        {/* Imagen pequeña */}
        <button onClick={() => setShowModal(true)} className="relative flex-shrink-0">
          <img
            src={imageUrl}
            alt={product.name}
            className="w-20 h-20 rounded-lg object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).src = '/placeholder.png';
            }}
          />
          {totalQty > 0 && (
            <span className="absolute -top-2 -right-2 bg-neon-orange text-charcoal-900 text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center shadow">
              {totalQty}
            </span>
          )}
        </button>

        {/* Info */}
        <button onClick={() => setShowModal(true)} className="flex-1 text-left min-w-0">
          <h3 className="font-bold text-white text-sm leading-tight">{product.name}</h3>
          {product.description && (
            <p className="text-gray-400 text-xs mt-0.5 line-clamp-2">{product.description}</p>
          )}
          <div className="mt-1.5">
            {hasDiscount ? (
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-gray-500 line-through">
                  ${product.originalPriceCents!.toLocaleString('es-AR')}
                </span>
                <span className="text-sm font-bold text-green-400">
                  ${product.priceCents.toLocaleString('es-AR')}
                </span>
              </div>
            ) : (
              <span className="text-sm font-bold text-neon-orange">
                ${product.priceCents.toLocaleString('es-AR')}
              </span>
            )}
          </div>
        </button>

        {/* Botón agregar */}
        <button
          onClick={() => setShowModal(true)}
          className={`flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center font-bold text-lg transition-all shadow ${
            totalQty > 0
              ? 'bg-neon-orange text-charcoal-900 scale-110'
              : 'bg-charcoal-700 text-neon-orange border border-neon-orange/50 hover:bg-neon-orange hover:text-charcoal-900'
          }`}
        >
          {totalQty > 0 ? '✓' : '+'}
        </button>
      </div>

      {showModal && (
        <ProductDetailModal product={product} onClose={() => setShowModal(false)} />
      )}
    </>
  );
};

export default DineInProductCard;
