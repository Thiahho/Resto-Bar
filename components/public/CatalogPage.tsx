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
  const { products, categories, businessInfo, activePromotion, twoForOneConfig, isLoading } = useCatalog();
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
    <div className="min-h-screen flex flex-col">
      <Header />

      {/* Perfil del negocio */}
      {businessInfo && <BusinessProfile businessInfo={businessInfo} />}

      {/* Banner de promoción activa */}
      {/* {activePromotion && (
        <div className="bg-gradient-to-r from-red-600 to-orange-500 py-3 px-4">
          <div className="max-w-2xl mx-auto flex items-center justify-center gap-2">
            <span className="text-white font-bold text-lg animate-pulse">
              {activePromotion.message}
            </span>
          </div>
        </div>
      )} */}
      {/* Banner promo (estilo opción A: gradiente + jerarquía + sin emoji) */}
{activePromotion && (
 <div className="relative overflow-hidden border-b border-white/10 bg-gradient-to-r from-blue-900 via-blue-600 to-cyan-400">
    {/* textura sutil */}
    <div className="pointer-events-none absolute inset-0 opacity-20 [background:radial-gradient(700px_200px_at_50%_-50%,white,transparent)]" />

    <div className="mx-auto flex max-w-6xl items-center justify-center px-4 py-2.5 sm:py-3">
      <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-center">
        <span className="inline-flex items-center rounded-full bg-white/15 px-2.5 py-1 text-xs font-semibold text-white ring-1 ring-white/20">
          PROMO
        </span>

        <p className="text-sm font-medium text-white/95 sm:text-base">
          {activePromotion.message}
        </p>

        {/* CTA opcional 
        <button
          type="button"
          className="rounded-full bg-white/15 px-3 py-1.5 text-xs font-semibold text-white ring-1 ring-white/25 transition hover:bg-white/20 active:scale-[0.98]"
          onClick={() => {
            const el = document.getElementById("promos");
            el?.scrollIntoView({ behavior: "smooth", block: "start" });
          }}
        >
          Ver promo
        </button>*/}
      </div>
    </div>
  </div>
)}


      {/* Banner de 2x1 activo */}
      {/* {twoForOneConfig?.active && (
        <div className="bg-gradient-to-r from-green-600 to-emerald-500 py-3 px-4">
          <div className="max-w-2xl mx-auto flex items-center justify-center gap-2">
            <span className="text-white font-bold text-lg">
              🎉 HOY: Promoción 2x1 {twoForOneConfig.productIds.length > 0 ? "en productos seleccionados" : "en todos los productos"}
            </span>
          </div>
        </div>
      )} */}
      {/* Banner 2x1 */}
{/* Banner 2x1 (sin fondo + borde verde “fluorescente”) */}
{twoForOneConfig?.active && (
  <div className="relative border-b border-emerald-400/40 bg-transparent">
    {/* glow */}
    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-emerald-400/70 shadow-[0_0_18px_2px_rgba(16,185,129,0.55)]" />
    <div className="mx-auto flex max-w-6xl items-center justify-center px-4 py-2.5 sm:py-3">
      <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-center">
        <span className="inline-flex items-center rounded-full bg-transparent px-2.5 py-1 text-xs font-semibold text-emerald-200 ring-1 ring-emerald-400/60 shadow-[0_0_16px_rgba(16,185,129,0.25)]">
          PROMO ACTIVA
        </span>

        <p className="text-sm font-medium text-white/90 sm:text-base">
          <span className="font-bold text-white">2x1</span>{" "}
          {twoForOneConfig.productIds.length > 0 ? "en productos seleccionados" : "en todos los productos"}
          <span className="mx-2 text-white/35">•</span>
          <span className="text-emerald-200/90">Solo por hoy</span>
        </p>

      </div>
    </div>
  </div>
)}



      {/* Navegación horizontal de categorías - estilo Pedisy */}
      <div className="sticky top-0  backdrop-blur-md border-b border-white/10 z-10">
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
                  className="bg-secondary/60 rounded-2xl overflow-hidden flex flex-col transform hover:scale-105 transition-transform duration-300 border border-white/10 hover:border-primary"
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
                  {categoryProducts.map((product) => {
                    const hasTwoForOne = twoForOneConfig?.active && (
                      twoForOneConfig.productIds.length === 0 ||
                      twoForOneConfig.productIds.includes(parseInt(product.id))
                    );
                    return (
                      <ProductsCard
                        key={product.id}
                        product={product}
                        hasTwoForOne={hasTwoForOne}
                      />
                    );
                  })}
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
