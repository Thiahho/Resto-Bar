import React, { useState } from "react";
import { Products } from "../../types";
import { getProductsImageUrl } from "../../services/api/apiClient";
import ProductDetailModal from "./ProductDetailModal";

interface ProductsCardProps {
  product: Products;
  hasTwoForOne?: boolean;
}

const ProductsCard: React.FC<ProductsCardProps> = ({ product, hasTwoForOne }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const imageUrl = product.hasImage
    ? getProductsImageUrl(product.id)
    : "/placeholder.png";

  const hasDiscount = product.originalPriceCents && product.originalPriceCents > product.priceCents;

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className="bg-secondary/60 rounded-2xl overflow-hidden flex flex-col transform hover:scale-105 transition-transform duration-300 cursor-pointer text-left border border-white/10 hover:border-primary"
      >
        <div className="relative">
          <img
            src={imageUrl}
            alt={product.name}
            loading="lazy"
            className="w-full h-48 object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).src = "/placeholder.png";
            }}
          />
          {hasTwoForOne && (
            <div className="absolute top-2 left-2 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full">
              2x1
            </div>
          )}
          {hasDiscount && (
            <div className="absolute top-2 right-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
              OFERTA
            </div>
          )}
        </div>
        <div className="p-4 flex flex-col flex-grow">
          <h3 className="text-lg font-bold text-white">{product.name}</h3>
          <p className="text-gray-400 text-sm mt-1 line-clamp-2 flex-grow">
            {product.description}
          </p>
          <div className="mt-3 flex justify-between items-center">
            {hasDiscount ? (
              <div className="flex flex-col">
                <span className="text-sm text-gray-500 line-through">
                  ${product.originalPriceCents!.toLocaleString("es-AR")}
                </span>
                <span className="text-xl font-bold text-green-400">
                  ${product.priceCents.toLocaleString("es-AR")}
                </span>
              </div>
            ) : (
              <p className="text-xl font-bold text-white">
                ${product.priceCents.toLocaleString("es-AR")}
              </p>
            )}
          </div>
        </div>
      </button>

      {isModalOpen && (
        <ProductDetailModal
          product={product}
          onClose={() => setIsModalOpen(false)}
          hasTwoForOne={hasTwoForOne}
        />
      )}
    </>
  );
};

export default React.memo(ProductsCard);
