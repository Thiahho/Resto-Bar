import React, { useState, useEffect } from "react";
import { useCatalog } from "../../hooks/useCatalog";
import { useCart } from "../../contexts/CartContext";
import { useToast } from "../../contexts/ToastContext";
import { api } from "../../services/api/apiClient";
import { Combo } from "../../types";
import Header from "./Header";
import Footer from "./Footer";
import ProductsCard from "./ProductCard";
import CheckoutModal from "./CheckoutModal";
import BusinessProfile from "./BusinessProfile";

const CatalogPage: React.FC = () => {
  const { products, categories, businessInfo, isLoading } = useCatalog();
  const { addComboToCart } = useCart();
  const { showToast } = useToast();
  const [combos, setCombos] = useState<Combo[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    null
  );

  useEffect(() => {
    const loadCombos = async () => {
      try {
        const data = await api.get<Combo[]>("/api/public/combos");
        setCombos(data);
      } catch (error) {
        // console.error("Error loading combos:", error);
      }
    };
    loadCombos();
  }, []);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        Cargando...
      </div>
    );
  }

  return (
    <div className="bg-black min-h-screen flex flex-col">
      <Header />

      {/* Perfil del negocio */}
      {businessInfo && <BusinessProfile businessInfo={businessInfo} />}

      {/* Navegación horizontal de categorías - estilo Pedisy */}
      <div className="sticky top-0 bg-black border-b border-gray-800 z-10">
        <div className="max-w-2xl mx-auto">
          <div className="flex overflow-x-auto scrollbar-hide py-4 px-4 gap-4">
            <button
              onClick={() => setSelectedCategoryId(null)}
              className={`flex-shrink-0 px-4 py-2 font-medium transition-all whitespace-nowrap ${
                selectedCategoryId === null
                  ? "text-white border-b-2 border-primary"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              Todos
            </button>
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategoryId(category.id)}
                className={`flex-shrink-0 px-4 py-2 font-medium transition-all whitespace-nowrap ${
                  selectedCategoryId === category.id
                    ? "text-white border-b-2 border-primary"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                {category.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      <main className="max-w-2xl mx-auto px-4 py-8 flex-grow w-full">
        {/* Sección de Combos */}
        {combos.length > 0 && !selectedCategoryId && (
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-white mb-2">
              Combos Especiales
            </h2>
            <p className="text-gray-400 text-sm mb-6">
              Ahorra con nuestros combos exclusivos
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {combos.map((combo) => (
                <div
                  key={combo.id}
                  className="bg-gray-900 rounded-2xl overflow-hidden flex flex-col transform hover:scale-105 transition-transform duration-300 border border-gray-800 hover:border-primary"
                >
                  {/* Header del combo con badge */}
                  <div className="bg-gradient-to-r from-primary to-red-700 px-4 py-2">
                    <span className="text-white text-xs font-semibold uppercase tracking-wide">
                      Combo Especial
                    </span>
                  </div>

                  <div className="p-4 flex flex-col flex-grow">
                    <div className="flex justify-between items-start mb-3">
                      <h3 className="text-lg font-bold text-white">
                        {combo.name}
                      </h3>
                      <span className="text-xl font-bold text-white">
                        ${combo.priceCents.toLocaleString("es-AR")}
                      </span>
                    </div>

                    <div className="space-y-1.5 mb-4 flex-grow">
                      {combo.items.map((item, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-gray-400 text-sm">
                          <span className="w-5 h-5 bg-gray-800 rounded-full flex items-center justify-center text-xs text-white">
                            {item.qty}
                          </span>
                          <span>{item.productName}</span>
                        </div>
                      ))}
                    </div>

                    <button
                      onClick={() => {
                        addComboToCart(combo);
                        showToast(`${combo.name} agregado al carrito`, "success");
                      }}
                      className="w-full bg-primary hover:bg-red-700 text-white py-3 rounded-lg font-medium transition-colors"
                    >
                      Agregar al carrito
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Categorías de Productos */}
        {categories
          .filter((cat) => !selectedCategoryId || cat.id === selectedCategoryId)
          .map((category) => {
            const categoryProducts = products.filter(
              (p) => p.categoryId === category.id
            );
            if (categoryProducts.length === 0) return null;

            return (
              <div key={category.id} id={`category-${category.id}`} className="mb-12">
                <h2 className="text-2xl font-bold text-white mb-2">
                  {category.name}
                </h2>
                <p className="text-gray-400 text-sm mb-6">
                  Todos los combos incluyen papas.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {categoryProducts.map((product) => (
                    <ProductsCard key={product.id} product={product} />
                  ))}
                </div>
              </div>
            );
          })}
      </main>
      <Footer />
      <CheckoutModal />
    </div>
  );
};

export default CatalogPage;
