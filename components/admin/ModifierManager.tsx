import React, { useState, useEffect } from "react";
import { useModifiersWithProducts } from "../../hooks/useModifiers";
import {
  ModifierWithProductsDto,
  getModifierCategories,
} from "../../services/api/apiClient";

const ModifierManager: React.FC = () => {
  const {
    modifiers,
    loading,
    error,
    createModifier,
    updateModifier,
    deleteModifier,
  } = useModifiersWithProducts();

  const [showForm, setShowForm] = useState(false);
  const [editingModifier, setEditingModifier] = useState<ModifierWithProductsDto | null>(
    null
  );
  const [existingCategories, setExistingCategories] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    name: "",
    priceCentsDelta: 0,
    category: "",
    isActive: true,
  });

  const loadCategories = async () => {
    try {
      const categories = await getModifierCategories();
      setExistingCategories(categories);
    } catch (err) {
      // console.error("Error loading categories:", err);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const dataToSave = {
      ...formData,
      priceCentsDelta: formData.priceCentsDelta
    };

    if (editingModifier) {
      const success = await updateModifier(editingModifier.id, dataToSave);
      if (success) {
        await loadCategories(); // Recargar categorías después de guardar
        resetForm();
      }
    } else {
      const success = await createModifier(dataToSave);
      if (success) {
        await loadCategories(); // Recargar categorías después de crear
        resetForm();
      }
    }
  };

  const resetForm = () => {
    setFormData({ name: "", priceCentsDelta: 0, category: "", isActive: true });
    setEditingModifier(null);
    setShowForm(false);
  };

  const handleEdit = (modifier: ModifierWithProductsDto) => {
    setEditingModifier(modifier);
    setFormData({
      name: modifier.name,
      priceCentsDelta: modifier.priceCentsDelta,
      category: modifier.category || "",
      isActive: modifier.isActive,
    });
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (window.confirm("¿Estás seguro de eliminar este modificador?")) {
      await deleteModifier(id);
    }
  };

  const toggleActive = async (modifier: ModifierWithProductsDto) => {
    await updateModifier(modifier.id, { isActive: !modifier.isActive });
  };

  return (
    <div className="p-4 md:p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
        <h2 className="text-xl md:text-2xl font-bold">Gestión de Modificadores</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="w-full sm:w-auto bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
        >
          {showForm ? "Cancelar" : "Nuevo Modificador"}
        </button>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {showForm && (
        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
          <h3 className="text-xl font-semibold mb-4">
            {editingModifier ? "Editar Modificador" : "Nuevo Modificador"}
          </h3>
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium mb-2">Nombre</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="w-full border rounded px-3 py-2"
                  required
                  maxLength={120}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Precio ($ pesos, puede ser negativo)
                </label>
                <input
                  type="number"
                  value={formData.priceCentsDelta}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      priceCentsDelta: parseInt(e.target.value) || 0,
                    })
                  }
                  className="w-full border rounded px-3 py-2"
                  required
                />
              </div>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">
                Categoría (ej: complemento, aderezo, extra, bebida, tamaño)
              </label>
              <input
                type="text"
                list="categories"
                value={formData.category}
                onChange={(e) =>
                  setFormData({ ...formData, category: e.target.value })
                }
                className="w-full border rounded px-3 py-2"
                maxLength={50}
                placeholder="Escribe o selecciona una categoría"
              />
              <datalist id="categories">
                {existingCategories.map((cat) => (
                  <option key={cat} value={cat} />
                ))}
              </datalist>
              {existingCategories.length > 0 && (
                <p className="text-xs text-gray-500 mt-1">
                  Categorías existentes: {existingCategories.join(", ")}
                </p>
              )}
            </div>
            <div className="mb-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) =>
                    setFormData({ ...formData, isActive: e.target.checked })
                  }
                  className="mr-2"
                />
                Activo
              </label>
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={loading}
                className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded disabled:opacity-50"
              >
                {loading ? "Guardando..." : "Guardar"}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="bg-gray-300 hover:bg-gray-400 px-4 py-2 rounded"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Vista móvil - Tarjetas */}
      <div className="md:hidden space-y-4">
        {loading && modifiers.length === 0 ? (
          <div className="bg-white p-4 rounded-lg shadow text-center text-gray-500">
            Cargando modificadores...
          </div>
        ) : modifiers.length === 0 ? (
          <div className="bg-white p-4 rounded-lg shadow text-center text-gray-500">
            No hay modificadores registrados
          </div>
        ) : (
          modifiers.map((modifier) => (
            <div key={modifier.id} className="bg-white rounded-lg shadow-md p-4">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-semibold text-lg">{modifier.name}</h3>
                  <span className="text-xs text-gray-500">ID: {modifier.id}</span>
                </div>
                <button
                  onClick={() => toggleActive(modifier)}
                  className={`px-3 py-1 rounded text-sm ${
                    modifier.isActive
                      ? "bg-green-100 text-green-800"
                      : "bg-red-100 text-red-800"
                  }`}
                >
                  {modifier.isActive ? "Activo" : "Inactivo"}
                </button>
              </div>

              <div className="space-y-2 mb-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Categoría:</span>
                  <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                    {modifier.category || "Sin categoría"}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Precio:</span>
                  <span className="font-medium">${modifier.priceCentsDelta.toLocaleString("es-AR")}</span>
                </div>
              </div>

              {modifier.associatedProducts.length > 0 && (
                <div className="mb-3">
                  <span className="text-sm text-gray-600 block mb-1">Productos:</span>
                  <div className="flex flex-wrap gap-1">
                    {modifier.associatedProducts.map((product) => (
                      <span
                        key={product.id}
                        className="inline-flex items-center px-2 py-1 text-xs bg-purple-100 text-purple-800 rounded"
                        title={product.name}
                      >
                        {product.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-3 border-t">
                <button
                  onClick={() => handleEdit(modifier)}
                  className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-2 rounded text-sm"
                >
                  Editar
                </button>
                <button
                  onClick={() => handleDelete(modifier.id)}
                  className="flex-1 bg-red-500 hover:bg-red-600 text-white py-2 rounded text-sm"
                >
                  Eliminar
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Vista desktop - Tabla */}
      <div className="hidden md:block bg-white rounded-lg shadow-md overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                ID
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Nombre
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Categoría
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Precio
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Estado
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Productos Asociados
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loading && modifiers.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                  Cargando modificadores...
                </td>
              </tr>
            ) : modifiers.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                  No hay modificadores registrados
                </td>
              </tr>
            ) : (
              modifiers.map((modifier) => (
                <tr key={modifier.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {modifier.id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {modifier.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                      {modifier.category || "Sin categoría"}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    ${modifier.priceCentsDelta.toLocaleString("es-AR")}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => toggleActive(modifier)}
                      className={`px-3 py-1 rounded text-sm ${
                        modifier.isActive
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {modifier.isActive ? "Activo" : "Inactivo"}
                    </button>
                  </td>
                  <td className="px-6 py-4">
                    {modifier.associatedProducts.length === 0 ? (
                      <span className="text-xs text-gray-400 italic">
                        Sin productos asociados
                      </span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {modifier.associatedProducts.map((product) => (
                          <span
                            key={product.id}
                            className="inline-flex items-center px-2 py-1 text-xs bg-purple-100 text-purple-800 rounded"
                            title={product.name}
                          >
                            {product.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <button
                      onClick={() => handleEdit(modifier)}
                      className="text-blue-600 hover:text-blue-800 mr-3"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleDelete(modifier.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ModifierManager;
