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
        console.error("Error loading combos:", error);
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

  const filteredProducts = selectedCategoryId
    ? products.filter((p) => p.categoryId === selectedCategoryId)
    : products;

  return (
    <div className="bg-black min-h-screen flex flex-col">
      <Header />

      {/* Perfil del negocio */}
      {businessInfo && <BusinessProfile businessInfo={businessInfo} />}

      {/* Navegación horizontal de categorías - estilo Pedisy */}
      <div className="sticky top-0 bg-black border-b border-gray-800 z-10">
        <div className="max-w-2xl mx-auto">
          <div className="flex overflow-x-auto scrollbar-hide py-4 px-4 gap-4">
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
              🎁 Combos Especiales
            </h2>
            <p className="text-gray-400 text-sm mb-6">
              Ahorra con nuestros combos exclusivos
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {combos.map((combo) => (
                <div
                  key={combo.id}
                  className="bg-secondary rounded-lg p-4 border border-gray-800 hover:border-primary transition-all cursor-pointer"
                >
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="text-white font-semibold text-lg">
                      {combo.name}
                    </h3>
                    <span className="text-primary font-bold text-xl">
                      ${Math.round(combo.priceCents / 100).toLocaleString("es-AR")}
                    </span>
                  </div>
                  <div className="space-y-1 mb-3">
                    {combo.items.map((item, idx) => (
                      <div key={idx} className="text-gray-400 text-sm">
                        • {item.qty}x {item.productName}
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-800">
                    <span className="text-xs text-gray-500">
                      {combo.items.length} productos
                    </span>
                    <button
                      onClick={() => {
                        addComboToCart(combo);
                        showToast(`${combo.name} agregado al carrito`, "success");
                      }}
                      className="bg-primary hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
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
