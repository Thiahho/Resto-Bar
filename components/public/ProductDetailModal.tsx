import React, { useState, useEffect } from "react";
import { Products, ProductModifier, CartItem } from "../../types";
import {
  getProductsImageUrl,
  getProductModifiers,
  ModifierDto,
} from "../../services/api/apiClient";
import { useCart } from "../../contexts/CartContext";

interface ProductDetailModalProps {
  product: Products;
  onClose: () => void;
  editMode?: boolean;
  existingCartItem?: CartItem;
}

const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  product,
  onClose,
  editMode = false,
  existingCartItem,
}) => {
  const { addToCart, updateCartItem } = useCart();
  const [size, setSize] = useState<"simple" | "doble">(
    editMode && existingCartItem ? existingCartItem.size || "simple" : "simple"
  );

  // Nuevo sistema: contador de modificadores { modifierId: cantidad }
  const [modifierCounts, setModifierCounts] = useState<Record<number, number>>(
    () => {
      if (editMode && existingCartItem) {
        const counts: Record<number, number> = {};
        // Cargar cantidades desde el item existente
        existingCartItem.modifiers.complementos?.forEach((m) => {
          counts[m.id] = (counts[m.id] || 0) + 1;
        });
        existingCartItem.modifiers.aderezos?.forEach((m) => {
          counts[m.id] = (counts[m.id] || 0) + 1;
        });
        existingCartItem.modifiers.extras?.forEach((m) => {
          counts[m.id] = (counts[m.id] || 0) + 1;
        });
        if (existingCartItem.modifiers.bebidas) {
          counts[existingCartItem.modifiers.bebidas.id] = 1;
        }
        return counts;
      }
      return {};
    }
  );

  const [notes, setNotes] = useState(
    editMode && existingCartItem ? existingCartItem.notes || "" : ""
  );
  const [quantity, setQuantity] = useState(
    editMode && existingCartItem ? existingCartItem.quantity : 1
  );
  const [modifiers, setModifiers] = useState<ProductModifier[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedSections, setExpandedSections] = useState<
    Record<string, boolean>
  >({});

  const imageUrl = product.hasImage
    ? getProductsImageUrl(product.id)
    : "/placeholder.png";

  // Cargar modificadores desde el backend (específicos del producto)
  useEffect(() => {
    const loadModifiers = async () => {
      try {
        const backendModifiers = await getProductModifiers(product.id);
        console.log("Modificadores del producto cargados:", backendModifiers);
        // Convertir ModifierDto a ProductModifier
        const converted: ProductModifier[] = backendModifiers.map(
          (m: ModifierDto) => ({
            id: m.id,
            name: m.name,
            priceCents: m.priceCentsDelta,
            type: m.category as any, // Usar la categoría del backend
          })
        );
        console.log("Modificadores convertidos:", converted);
        setModifiers(converted);
      } catch (error) {
        console.error("Error loading modifiers:", error);
        // Usar fallback si hay error
        setModifiers([]);
      } finally {
        setLoading(false);
      }
    };
    loadModifiers();
  }, [product.id]);

  // Agrupar modificadores dinámicamente por categoría
  const groupedByCategory = modifiers.reduce((acc, modifier) => {
    const category = modifier.type || "otros"; // Si no tiene categoría, va a "otros"
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(modifier);
    return acc;
  }, {} as Record<string, ProductModifier[]>);

  console.log("Modificadores agrupados dinámicamente:", groupedByCategory);

  // Obtener todas las categorías disponibles
  const availableCategories = Object.keys(groupedByCategory);

  // Inicializar todas las secciones como expandidas
  useEffect(() => {
    const initialExpanded: Record<string, boolean> = {};
    availableCategories.forEach((cat) => {
      initialExpanded[cat] = true;
    });
    setExpandedSections(initialExpanded);
  }, [availableCategories.length]);

  const toggleSection = (category: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [category]: !prev[category],
    }));
  };

  const basePrice =
    size === "doble" ? product.priceCents + 2000 : product.priceCents;

  // Funciones para manejar cantidades de modificadores
  const incrementModifier = (modifier: ProductModifier) => {
    setModifierCounts((prev) => ({
      ...prev,
      [modifier.id]: (prev[modifier.id] || 0) + 1,
    }));
  };

  const decrementModifier = (modifierId: number) => {
    setModifierCounts((prev) => {
      const newCounts = { ...prev };
      if (newCounts[modifierId] && newCounts[modifierId] > 0) {
        newCounts[modifierId] -= 1;
        if (newCounts[modifierId] === 0) {
          delete newCounts[modifierId];
        }
      }
      return newCounts;
    });
  };

  const calculateTotal = () => {
    let total = basePrice;
    // Sumar todos los modificadores según su cantidad
    Object.entries(modifierCounts).forEach(([modifierId, count]) => {
      const modifier = modifiers.find((m) => m.id === parseInt(modifierId));
      if (modifier) {
        total += modifier.priceCents * count;
      }
    });
    // Convertir de centavos a pesos y multiplicar por cantidad
    return (total / 100) * quantity;
  };

  const handleAddToCart = () => {
    // Convertir modifierCounts a arrays de modificadores
    const complementos: ProductModifier[] = [];
    const aderezos: ProductModifier[] = [];
    const extras: ProductModifier[] = [];
    let bebidas: ProductModifier | undefined = undefined;

    Object.entries(modifierCounts).forEach(([modifierId, count]) => {
      const modifier = modifiers.find((m) => m.id === parseInt(modifierId));
      if (modifier && count > 0) {
        // Agregar el modificador 'count' veces
        for (let i = 0; i < count; i++) {
          if (modifier.type === "complemento") {
            complementos.push(modifier);
          } else if (modifier.type === "aderezo") {
            aderezos.push(modifier);
          } else if (modifier.type === "extra") {
            extras.push(modifier);
          } else if (modifier.type === "bebida") {
            bebidas = modifier; // Solo una bebida
          } else {
            // Categorías desconocidas van a extras
            extras.push(modifier);
          }
        }
      }
    });

    const cartItem: CartItem = {
      id:
        editMode && existingCartItem
          ? existingCartItem.id
          : `${product.id}-${Date.now()}`,
      product,
      quantity,
      size,
      modifiers: {
        complementos: complementos.length > 0 ? complementos : undefined,
        aderezos: aderezos.length > 0 ? aderezos : undefined,
        extras: extras.length > 0 ? extras : undefined,
        bebidas: bebidas || undefined,
      },
      notes,
      subtotal: calculateTotal(),
    };

    if (editMode && existingCartItem) {
      updateCartItem(existingCartItem.id, cartItem);
    } else {
      addToCart(cartItem);
    }
    onClose();
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
        <div className="bg-gray-900 rounded-2xl p-8">
          <p className="text-white">Cargando opciones...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header con imagen */}
        <div className="relative">
          <button
            onClick={onClose}
            className="absolute top-4 left-4 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-75 z-10"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
          <img
            src={imageUrl}
            alt={product.name}
            className="w-full h-64 object-cover rounded-t-2xl"
            onError={(e) => {
              (e.target as HTMLImageElement).src = "/placeholder.png";
            }}
          />
        </div>

        <div className="p-6">
          {/* Título y descripción */}
          <div className="mb-6">
            <p className="text-gray-400 text-sm mb-1">Hamburguesas de carne</p>
            <h2 className="text-2xl font-bold text-white mb-2">
              {product.name}
            </h2>
            <p className="text-gray-400 text-sm">{product.description}</p>
          </div>

          {/* Selector de tamaño */}
          <div className="mb-6">
            <div className="flex gap-3">
              <button
                onClick={() => setSize("simple")}
                className={`flex-1 py-3 px-4 rounded-lg border-2 transition-all ${
                  size === "simple"
                    ? "border-primary bg-primary bg-opacity-10 text-white"
                    : "border-gray-700 text-gray-400 hover:border-gray-600"
                }`}
              >
                <div className="font-semibold">Simple</div>
                <div className="text-sm">
                  $
                  {(product.priceCents / 100).toLocaleString("es-AR", {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0,
                  })}
                </div>
              </button>
              <button
                onClick={() => setSize("doble")}
                className={`flex-1 py-3 px-4 rounded-lg border-2 transition-all ${
                  size === "doble"
                    ? "border-primary bg-primary bg-opacity-10 text-white"
                    : "border-gray-700 text-gray-400 hover:border-gray-600"
                }`}
              >
                <div className="font-semibold">Doble</div>
                <div className="text-sm">
                  $
                  {((product.priceCents + 2000) / 100).toLocaleString("es-AR", {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0,
                  })}
                </div>
              </button>
            </div>
          </div>

          {/* Secciones dinámicas de modificadores por categoría */}
          {availableCategories.map((category) => (
            <div key={category} className="mb-6">
              <button
                onClick={() => toggleSection(category)}
                className="w-full flex items-center justify-between text-left py-3 border-b border-gray-800"
              >
                <div>
                  <h3 className="text-white font-semibold capitalize">
                    {category}
                  </h3>
                </div>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className={`h-5 w-5 text-gray-400 transition-transform ${
                    expandedSections[category] ? "rotate-180" : ""
                  }`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>
              {expandedSections[category] && (
                <div className="mt-3 space-y-2">
                  {groupedByCategory[category].map((modifier) => (
                    <div
                      key={modifier.id}
                      className="flex items-center justify-between py-2"
                    >
                      <span className="text-white">{modifier.name}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-gray-400">
                          $ {Math.round(modifier.priceCents / 100).toLocaleString("es-AR")}
                        </span>
                        <div className="flex items-center gap-2">
                          {/* Botón para remover */}
                          <button
                            onClick={() => decrementModifier(modifier.id)}
                            className="px-3 py-1 rounded-full text-xl font-bold bg-gray-800 text-gray-400 hover:bg-red-600 hover:text-white transition-colors"
                          >
                            -
                          </button>
                          {/* Contador */}
                          <span className="text-white font-semibold min-w-[2rem] text-center">
                            {modifierCounts[modifier.id] || 0}
                          </span>
                          {/* Botón para agregar */}
                          <button
                            onClick={() => incrementModifier(modifier)}
                            className="px-3 py-1 rounded-full text-xl font-bold bg-primary text-white hover:bg-opacity-90 transition-colors"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}

          {/* Resumen de modificadores seleccionados */}
          {Object.keys(modifierCounts).length > 0 && (
            <div className="mb-6 bg-gray-800 rounded-lg p-4">
              <h3 className="text-white font-semibold mb-3">
                📝 Modificadores agregados
              </h3>
              <div className="space-y-2">
                {Object.entries(modifierCounts).map(([modifierId, count]) => {
                  const modifier = modifiers.find(
                    (m) => m.id === parseInt(modifierId)
                  );
                  if (!modifier || count === 0) return null;
                  return (
                    <div
                      key={modifierId}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="text-gray-300">
                        {count}x {modifier.name}
                      </span>
                      <span className="text-primary font-medium">
                        $ {Math.round((modifier.priceCents * count) / 100).toLocaleString("es-AR")}
                      </span>
                    </div>
                  );
                })}
                <div className="border-t border-gray-700 pt-2 mt-2">
                  <div className="flex items-center justify-between font-semibold">
                    <span className="text-white">Total modificadores:</span>
                    <span className="text-primary">
                      ${" "}
                      {Math.round(
                        Object.entries(modifierCounts).reduce(
                          (sum, [modifierId, count]) => {
                            const modifier = modifiers.find(
                              (m) => m.id === parseInt(modifierId)
                            );
                            return (
                              sum + (modifier ? modifier.priceCents * count : 0)
                            );
                          },
                          0
                        ) / 100
                      ).toLocaleString("es-AR")}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Nota al producto */}
          <div className="mb-6">
            <label className="block text-white font-semibold mb-2">
              Nota al producto
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Aclará lo que necesites"
              className="w-full bg-gray-800 text-white rounded-lg p-3 border border-gray-700 focus:border-primary outline-none resize-none"
              rows={3}
            />
          </div>

          {/* Footer con cantidad y botón agregar */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 bg-gray-800 rounded-lg px-4 py-2">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="text-white text-xl font-bold"
              >
                -
              </button>
              <span className="text-white font-semibold min-w-[2rem] text-center">
                {quantity}u
              </span>
              <button
                onClick={() => setQuantity(quantity + 1)}
                className="text-white text-xl font-bold"
              >
                +
              </button>
            </div>
            <button
              onClick={handleAddToCart}
              className="flex-1 bg-primary hover:bg-opacity-90 text-white font-bold py-3 px-6 rounded-lg transition-all"
            >
              {editMode ? "Actualizar" : "Agregar"} ${" "}
              {(calculateTotal() / 100).toLocaleString("es-AR", {
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              })}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetailModal;
