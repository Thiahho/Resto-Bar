import React, { useState, useEffect } from "react";
import { api } from "../../services/api/apiClient";
import { useToast } from "../../contexts/ToastContext";

interface ComboItem {
  productId: number;
  productName: string;
  qty: number;
}

interface Combo {
  id: number;
  name: string;
  priceCents: number;
  isActive: boolean;
  items: ComboItem[];
}

interface Product {
  id: number;
  name: string;
  priceCents: number;
}

interface ComboFormData {
  name: string;
  priceCents: string;
  isActive: boolean;
  items: { productId: number; qty: number }[];
}

const ComboManager: React.FC = () => {
  const [combos, setCombos] = useState<Combo[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const { showToast, showConfirm } = useToast();

  const emptyForm: ComboFormData = {
    name: "",
    priceCents: "",
    isActive: true,
    items: [],
  };

  const [formData, setFormData] = useState<ComboFormData>(emptyForm);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [combosData, productsData] = await Promise.all([
        api.get<Combo[]>("/api/admin/combos"),
        api.get<Product[]>("/api/admin/products"),
      ]);
      setCombos(combosData);
      setProducts(productsData);
    } catch (error: any) {
      showToast(error.message || "Error al cargar datos", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.items.length === 0) {
      showToast("Debes agregar al menos un producto al combo", "error");
      return;
    }

    try {
      const payload = {
        name: formData.name.trim(),
        priceCents: parseInt(formData.priceCents) || 0,
        isActive: formData.isActive,
        items: formData.items,
      };

      if (editingId) {
        await api.put(`/api/admin/combos/${editingId}`, payload);
        showToast("Combo actualizado exitosamente", "success");
      } else {
        await api.post("/api/admin/combos", payload);
        showToast("Combo creado exitosamente", "success");
      }

      setFormData(emptyForm);
      setEditingId(null);
      setShowForm(false);
      loadData();
    } catch (error: any) {
      showToast(error.message || "Error al guardar combo", "error");
    }
  };

  const handleEdit = (combo: Combo) => {
    setFormData({
      name: combo.name,
      priceCents: combo.priceCents.toString(),
      isActive: combo.isActive,
      items: combo.items.map((item) => ({
        productId: item.productId,
        qty: item.qty,
      })),
    });
    setEditingId(combo.id);
    setShowForm(true);
  };

  const handleDelete = (id: number) => {
    showConfirm("¿Estás seguro de eliminar este combo?", async () => {
      try {
        await api.delete(`/api/admin/combos/${id}`);
        showToast("Combo eliminado exitosamente", "success");
        loadData();
      } catch (error: any) {
        showToast(error.message || "Error al eliminar combo", "error");
      }
    });
  };

  const handleToggleActive = async (id: number) => {
    try {
      await api.post(`/api/admin/combos/${id}/toggle-active`, {});
      showToast("Estado actualizado", "success");
      loadData();
    } catch (error: any) {
      showToast(error.message || "Error al cambiar estado", "error");
    }
  };

  const addItem = () => {
    if (products.length === 0) return;
    setFormData({
      ...formData,
      items: [...formData.items, { productId: products[0].id, qty: 1 }],
    });
  };

  const removeItem = (index: number) => {
    setFormData({
      ...formData,
      items: formData.items.filter((_, i) => i !== index),
    });
  };

  const updateItem = (
    index: number,
    field: "productId" | "qty",
    value: number
  ) => {
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], [field]: value };
    setFormData({ ...formData, items: newItems });
  };

  const cancelEdit = () => {
    setFormData(emptyForm);
    setEditingId(null);
    setShowForm(false);
  };

  const formatCurrency = (value: number) => {
    return `$${value.toLocaleString("es-AR")}`;
  };

  const calculateTotalPrice = () => {
    return formData.items.reduce((total, item) => {
      const product = products.find((p) => p.id === item.productId);
      return total + (product ? product.priceCents * item.qty : 0);
    }, 0);
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Gestión de Combos</h2>
        <button
          onClick={() => {
            setShowForm(!showForm);
            if (showForm) cancelEdit();
          }}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
        >
          {showForm ? "Cancelar" : "Nuevo Combo"}
        </button>
      </div>

      {showForm && (
        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
          <h3 className="text-xl font-semibold mb-4">
            {editingId ? "Editar Combo" : "Nuevo Combo"}
          </h3>
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Nombre del Combo *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="w-full border rounded px-3 py-2"
                  required
                  placeholder="Ej: Combo Clásico"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Precio del Combo ($) *
                </label>
                <input
                  type="number"
                  value={formData.priceCents}
                  onChange={(e) =>
                    setFormData({ ...formData, priceCents: e.target.value })
                  }
                  className="w-full border rounded px-3 py-2"
                  required
                  min="0"
                  step="1"
                  placeholder="Ej: 15000"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Estado</label>
                <label className="flex items-center mt-3">
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
            </div>

            {/* Items del combo */}
            <div className="mb-4">
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium">
                  Productos del Combo *
                </label>
                <button
                  type="button"
                  onClick={addItem}
                  className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-sm"
                >
                  + Agregar Producto
                </button>
              </div>

              {formData.items.length === 0 ? (
                <p className="text-gray-500 text-sm italic">
                  No hay productos agregados
                </p>
              ) : (
                <div className="space-y-2">
                  {formData.items.map((item, index) => (
                    <div
                      key={index}
                      className="flex gap-2 items-center bg-gray-50 p-3 rounded"
                    >
                      <div className="flex-1">
                        <select
                          value={item.productId}
                          onChange={(e) =>
                            updateItem(
                              index,
                              "productId",
                              parseInt(e.target.value)
                            )
                          }
                          className="w-full border rounded px-2 py-1"
                        >
                          {products.map((product) => (
                            <option key={product.id} value={product.id}>
                              {product.name} - {formatCurrency(product.priceCents)}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="w-24">
                        <input
                          type="number"
                          value={item.qty}
                          onChange={(e) =>
                            updateItem(index, "qty", parseInt(e.target.value) || 1)
                          }
                          className="w-full border rounded px-2 py-1"
                          min="1"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        className="text-red-600 hover:text-red-800"
                      >
                        🗑️
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Resumen de precios */}
              {formData.items.length > 0 && (
                <div className="mt-3 p-3 bg-blue-50 rounded">
                  <div className="flex justify-between text-sm">
                    <span>Precio individual de productos:</span>
                    <span className="font-semibold">
                      {formatCurrency(calculateTotalPrice())}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm mt-1">
                    <span>Precio del combo:</span>
                    <span className="font-semibold text-green-600">
                      {formatCurrency(parseInt(formData.priceCents || "0"))}
                    </span>
                  </div>
                  {parseInt(formData.priceCents || "0") > 0 && (
                    <div className="flex justify-between text-sm mt-1">
                      <span className="text-red-600 font-semibold">Ahorro:</span>
                      <span className="text-red-600 font-semibold">
                        {formatCurrency(
                          calculateTotalPrice() - parseInt(formData.priceCents || "0")
                        )}
                      </span>
                    </div>
                  )}
                </div>
              )}
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
                onClick={cancelEdit}
                className="bg-gray-300 hover:bg-gray-400 px-4 py-2 rounded"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Lista de combos */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Nombre
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Precio
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Productos
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Estado
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loading && combos.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                  Cargando combos...
                </td>
              </tr>
            ) : combos.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                  No hay combos creados
                </td>
              </tr>
            ) : (
              combos.map((combo) => (
                <tr key={combo.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-semibold">{combo.name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap font-semibold text-green-600">
                    {formatCurrency(combo.priceCents)}
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm">
                      {combo.items.map((item, idx) => (
                        <div key={idx}>
                          {item.qty}x {item.productName}
                        </div>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => handleToggleActive(combo.id)}
                      className={`px-3 py-1 rounded text-sm ${
                        combo.isActive
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {combo.isActive ? "Activo" : "Inactivo"}
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <button
                      onClick={() => handleEdit(combo)}
                      className="text-blue-600 hover:text-blue-800 mr-3"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleDelete(combo.id)}
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

export default ComboManager;
