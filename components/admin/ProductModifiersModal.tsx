import React, { useState, useEffect } from "react";
import {
  getProductModifiers,
  assignModifierToProduct,
  removeModifierFromProduct,
  ModifierDto,
} from "../../services/api/apiClient";
import { useModifiers } from "../../hooks/useModifiers";

interface ProductModifiersModalProps {
  productId: string;
  productName: string;
  onClose: () => void;
}

const ProductModifiersModal: React.FC<ProductModifiersModalProps> = ({
  productId,
  productName,
  onClose,
}) => {
  const { modifiers: allModifiers, loading: loadingAll } = useModifiers();
  const [productModifiers, setProductModifiers] = useState<ModifierDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadProductModifiers();
  }, [productId]);

  const loadProductModifiers = async () => {
    try {
      const mods = await getProductModifiers(productId);
      setProductModifiers(mods);
    } catch (error) {
      console.error("Error loading product modifiers:", error);
    } finally {
      setLoading(false);
    }
  };

  const isAssigned = (modifierId: number) => {
    return productModifiers.some((m) => m.id === modifierId);
  };

  const handleToggleModifier = async (modifier: ModifierDto) => {
    setSaving(true);
    try {
      if (isAssigned(modifier.id)) {
        await removeModifierFromProduct(productId, modifier.id);
        setProductModifiers((prev) => prev.filter((m) => m.id !== modifier.id));
      } else {
        await assignModifierToProduct(productId, modifier.id);
        setProductModifiers((prev) => [...prev, modifier]);
      }
    } catch (error) {
      console.error("Error toggling modifier:", error);
      alert("Error al actualizar modificador");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleAllInCategory = async (category: string) => {
    setSaving(true);
    try {
      const categoryModifiers = groupedModifiers[category];
      const allAssigned = categoryModifiers.every((m) => isAssigned(m.id));

      if (allAssigned) {
        // Deseleccionar todos
        for (const modifier of categoryModifiers) {
          await removeModifierFromProduct(productId, modifier.id);
        }
        setProductModifiers((prev) =>
          prev.filter((m) => !categoryModifiers.some((cm) => cm.id === m.id))
        );
      } else {
        // Seleccionar todos los que no estén asignados
        const toAssign = categoryModifiers.filter((m) => !isAssigned(m.id));
        for (const modifier of toAssign) {
          await assignModifierToProduct(productId, modifier.id);
        }
        setProductModifiers((prev) => [...prev, ...toAssign]);
      }
    } catch (error) {
      console.error("Error toggling all modifiers:", error);
      alert("Error al actualizar modificadores");
    } finally {
      setSaving(false);
    }
  };

  // Agrupar modificadores por categoría
  const groupedModifiers = allModifiers.reduce((acc, modifier) => {
    const category = modifier.category || "Sin categoría";
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(modifier);
    return acc;
  }, {} as Record<string, ModifierDto[]>);

  const categories = Object.keys(groupedModifiers);

  const areAllAssignedInCategory = (category: string) => {
    return groupedModifiers[category].every((m) => isAssigned(m.id));
  };

  if (loading || loadingAll) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6">
          <p>Cargando modificadores...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-3xl w-full max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold">Modificadores del Producto</h2>
              <p className="text-gray-600 mt-1">{productName}</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
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
        <div className="flex-1 overflow-y-auto p-6">
          {allModifiers.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No hay modificadores disponibles. Crea modificadores primero.
            </div>
          ) : (
            <div className="space-y-6">
              {categories.map((category) => (
                <div key={category}>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-semibold capitalize">
                      {category}
                    </h3>
                    <button
                      onClick={() => handleToggleAllInCategory(category)}
                      disabled={saving}
                      className={`px-4 py-1 text-sm font-medium rounded transition-colors ${
                        areAllAssignedInCategory(category)
                          ? "bg-red-500 hover:bg-red-600 text-white"
                          : "bg-green-500 hover:bg-green-600 text-white"
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      {areAllAssignedInCategory(category)
                        ? "Quitar Todos"
                        : "Agregar Todos"}
                    </button>
                  </div>
                  <div className="space-y-2">
                    {groupedModifiers[category].map((modifier) => (
                      <label
                        key={modifier.id}
                        className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-colors ${
                          isAssigned(modifier.id)
                            ? "bg-blue-50 border-blue-300"
                            : "hover:bg-gray-50"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={isAssigned(modifier.id)}
                            onChange={() => handleToggleModifier(modifier)}
                            disabled={saving}
                            className="w-5 h-5"
                          />
                          <div>
                            <div className="font-medium">{modifier.name}</div>
                            {!modifier.isActive && (
                              <span className="text-xs text-red-600">
                                (Inactivo)
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-gray-600">
                          ${Math.round(modifier.priceCentsDelta / 100).toLocaleString("es-AR")}
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t bg-gray-50">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-600">
              {productModifiers.length} modificador(es) asignado(s)
            </p>
            <button
              onClick={onClose}
              className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductModifiersModal;
