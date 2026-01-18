import React, { useState } from "react";
import { useCatalog } from "../../hooks/useCatalog";
import { useToast } from "../../contexts/ToastContext";
import { Products } from "../../types";
import { getProductsImageUrl, api } from "../../services/api/apiClient";
import ProductModifiersModal from "./ProductModifiersModal";

const ProductsManager: React.FC = () => {
  const { products, categories, addProducts, updateProducts, deleteProducts, refreshCatalog } =
    useCatalog();
  const { showToast, showConfirm } = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentProducts, setCurrentProducts] =
    useState<Partial<Products> | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modifiersModalProduct, setModifiersModalProduct] = useState<Products | null>(null);
  const [draggedProduct, setDraggedProduct] = useState<Products | null>(null);

  const openModal = (product: Products | null = null) => {
    setCurrentProducts(
      product || {
        name: "",
        description: "",
        priceCents: 0,
        doublePriceCents: 0,
        categoryId: categories[0]?.id || "",
        hasImage: false,
      }
    );
    setImageFile(null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setCurrentProducts(null);
    setImageFile(null);
  };

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    if (!currentProducts) return;
    const { name, value } = e.target;

    // Manejar campos de precio (valores enteros)
    if (name === "priceCents" || name === "doublePriceCents") {
      const numValue = parseInt(value, 10);
      setCurrentProducts({
        ...currentProducts,
        [name]: isNaN(numValue) ? undefined : numValue,
      });
    } else {
      setCurrentProducts({
        ...currentProducts,
        [name]: value,
      });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImageFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !currentProducts ||
      !currentProducts.name ||
      !currentProducts.categoryId
    )
      return;
    setIsSubmitting(true);

    const formData = new FormData();
    formData.append("name", currentProducts.name);
    formData.append("description", currentProducts.description || "");
    formData.append("priceCents", (currentProducts.priceCents || 0).toString());
    formData.append("categoryId", currentProducts.categoryId);
    // Enviar precio doble solo si está definido
    if (currentProducts.doublePriceCents !== undefined && currentProducts.doublePriceCents !== null) {
      formData.append("doublePriceCents", currentProducts.doublePriceCents.toString());
    }
    if (imageFile) {
      formData.append("ImageData", imageFile); // Debe coincidir con el nombre del DTO del backend
    }

    const success = currentProducts.id
      ? await updateProducts(currentProducts.id, formData)
      : await addProducts(formData);

    if (success) {
      showToast(
        currentProducts.id ? "Producto actualizado!" : "Producto Añadido!",
        "success"
      );
      closeModal();
    } else {
      showToast("No se pudo guardar el producto. Inténtelo de nuevo.", "error");
    }
    setIsSubmitting(false);
  };

  const handleDelete = async (productId: string) => {
    showConfirm(
      "¿Estás seguro de que deseas eliminar este artículo?",
      async () => {
        const success = await deleteProducts(productId);
        if (success) {
          showToast("¡Producto eliminado correctamente!", "success");
        } else {
          showToast("No se pudo eliminar el producto.", "error");
        }
      }
    );
  };

  const handleDragStart = (product: Products) => {
    setDraggedProduct(product);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (targetProduct: Products) => {
    if (!draggedProduct || draggedProduct.id === targetProduct.id) return;

    const reorderedProducts = [...products];
    const draggedIndex = reorderedProducts.findIndex(p => p.id === draggedProduct.id);
    const targetIndex = reorderedProducts.findIndex(p => p.id === targetProduct.id);

    // Reordenar en el array local
    reorderedProducts.splice(draggedIndex, 1);
    reorderedProducts.splice(targetIndex, 0, draggedProduct);

    // Actualizar displayOrder de todos los productos
    const reorderList = reorderedProducts.map((product, index) => ({
      productId: parseInt(product.id),
      displayOrder: index
    }));

    try {
      await api.put("/api/admin/products/reorder", reorderList);
      await refreshCatalog();
      showToast("Orden actualizado correctamente", "success");
    } catch (error) {
      showToast("Error al reordenar productos", "error");
      // console.error(error);
    }

    setDraggedProduct(null);
  };

  const moveProduct = async (product: Products, direction: "up" | "down") => {
    const currentIndex = products.findIndex(p => p.id === product.id);
    if (
      (direction === "up" && currentIndex === 0) ||
      (direction === "down" && currentIndex === products.length - 1)
    ) {
      return;
    }

    const newIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    const reorderedProducts = [...products];
    [reorderedProducts[currentIndex], reorderedProducts[newIndex]] =
      [reorderedProducts[newIndex], reorderedProducts[currentIndex]];

    const reorderList = reorderedProducts.map((p, index) => ({
      productId: parseInt(p.id),
      displayOrder: index
    }));

    try {
      await api.put("/api/admin/products/reorder", reorderList);
      await refreshCatalog();
      showToast("Orden actualizado correctamente", "success");
    } catch (error) {
      showToast("Error al reordenar productos", "error");
      // console.error(error);
    }
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800">
          Gestion de Productos
        </h1>
        <button
          onClick={() => openModal()}
          className="bg-primary text-white font-bold py-2 px-4 rounded hover:bg-amber-600 transition-colors whitespace-nowrap"
        >
          + Añadir
        </button>
      </div>

      {/* Table view for desktop */}
      <div className="hidden md:block bg-white shadow-md rounded-lg overflow-x-auto">
        <table className="min-w-full leading-normal">
          <thead>
            <tr>
              <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Orden
              </th>
              <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Imagen
              </th>
              <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Nombre
              </th>
              <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Categoria
              </th>
              <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Precio
              </th>
              <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Precio Doble
              </th>
              <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody>
            {products.map((product, index) => (
              <tr
                key={product.id}
                draggable
                onDragStart={() => handleDragStart(product)}
                onDragOver={handleDragOver}
                onDrop={() => handleDrop(product)}
                className="cursor-move hover:bg-gray-50"
              >
                <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                  <div className="flex flex-col gap-1">
                    <button
                      onClick={() => moveProduct(product, "up")}
                      disabled={index === 0}
                      className="text-gray-600 hover:text-gray-900 disabled:text-gray-300 disabled:cursor-not-allowed"
                      title="Mover arriba"
                    >
                      ▲
                    </button>
                    <button
                      onClick={() => moveProduct(product, "down")}
                      disabled={index === products.length - 1}
                      className="text-gray-600 hover:text-gray-900 disabled:text-gray-300 disabled:cursor-not-allowed"
                      title="Mover abajo"
                    >
                      ▼
                    </button>
                  </div>
                </td>
                <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                  {product.hasImage ? (
                    <img
                      src={getProductsImageUrl(product.id)}
                      alt={product.name}
                      className="w-16 h-16 object-cover rounded"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "/placeholder.png";
                      }}
                    />
                  ) : (
                    <div className="w-16 h-16 bg-gray-200 rounded flex items-center justify-center text-gray-400 text-xs">
                      No Imagen
                    </div>
                  )}
                </td>
                <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                  {product.name}
                </td>
                <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                  {categories.find((c) => c.id === product.categoryId)?.name}
                </td>
                <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                  ${product.priceCents.toLocaleString("es-AR")}
                </td>
                <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                  ${(product.doublePriceCents || 0).toLocaleString("es-AR")}
                </td>
                <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                  <button
                    onClick={() => openModal(product)}
                    className="text-indigo-600 hover:text-indigo-900 mr-4"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => setModifiersModalProduct(product)}
                    className="text-green-600 hover:text-green-900 mr-4"
                  >
                    Modificadores
                  </button>
                  <button
                    onClick={() => handleDelete(product.id)}
                    className="text-red-600 hover:text-red-900"
                  >
                    Borrar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Card view for mobile */}
      <div className="md:hidden space-y-4">
        {products.map((product, index) => (
          <div
            key={product.id}
            className="bg-white shadow-md rounded-lg p-4"
          >
            <div className="flex gap-4">
              {/* Imagen */}
              <div className="flex-shrink-0">
                {product.hasImage ? (
                  <img
                    src={getProductsImageUrl(product.id)}
                    alt={product.name}
                    className="w-20 h-20 object-cover rounded"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = "/placeholder.png";
                    }}
                  />
                ) : (
                  <div className="w-20 h-20 bg-gray-200 rounded flex items-center justify-center text-gray-400 text-xs text-center">
                    No Img
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-lg text-gray-800 truncate">
                  {product.name}
                </h3>
                <p className="text-sm text-gray-600">
                  {categories.find((c) => c.id === product.categoryId)?.name}
                </p>
                <p className="text-lg font-semibold text-primary mt-1">
                  ${product.priceCents.toLocaleString("es-AR")}
                </p>
              </div>
            </div>

            {/* Botones de orden */}
            <div className="flex gap-2 mt-3 border-t pt-3">
              <button
                onClick={() => moveProduct(product, "up")}
                disabled={index === 0}
                className="flex-1 bg-gray-100 hover:bg-gray-200 disabled:bg-gray-50 disabled:text-gray-300 text-gray-700 py-2 px-3 rounded text-sm font-medium transition-colors"
                title="Mover arriba"
              >
                ▲ Subir
              </button>
              <button
                onClick={() => moveProduct(product, "down")}
                disabled={index === products.length - 1}
                className="flex-1 bg-gray-100 hover:bg-gray-200 disabled:bg-gray-50 disabled:text-gray-300 text-gray-700 py-2 px-3 rounded text-sm font-medium transition-colors"
                title="Mover abajo"
              >
                ▼ Bajar
              </button>
            </div>

            {/* Acciones */}
            <div className="flex flex-col gap-2 mt-3">
              <button
                onClick={() => openModal(product)}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-4 rounded text-sm font-medium transition-colors"
              >
                Editar
              </button>
              <button
                onClick={() => setModifiersModalProduct(product)}
                className="w-full bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded text-sm font-medium transition-colors"
              >
                Modificadores
              </button>
              <button
                onClick={() => handleDelete(product.id)}
                className="w-full bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded text-sm font-medium transition-colors"
              >
                Borrar
              </button>
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && currentProducts && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-40 flex justify-center items-center p-4">
          <div className="bg-white rounded-lg p-4 md:p-8 z-50 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-4">
              {currentProducts.id ? "Editar Productos" : "Añadir Productos"}
            </h2>
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  Nombre
                </label>
                <input
                  type="text"
                  name="name"
                  value={currentProducts.name}
                  onChange={handleInputChange}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  Descripcion
                </label>
                <textarea
                  name="description"
                  value={currentProducts.description}
                  onChange={handleInputChange}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  rows={4}
                  required
                ></textarea>
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  Precio Simple (en pesos)
                </label>
                <input
                  type="number"
                  name="priceCents"
                  value={currentProducts.priceCents || 0}
                  onChange={handleInputChange}
                  step="1"
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  Precio Doble (en pesos)
                  <span className="text-gray-500 font-normal text-xs ml-2">
                    Opcional - dejar vacío si no aplica
                  </span>
                </label>
                <input
                  type="number"
                  name="doublePriceCents"
                  value={currentProducts.doublePriceCents || ""}
                  onChange={handleInputChange}
                  step="1"
                  placeholder="Ej: 150"
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                />
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  Categoria
                </label>
                <select
                  name="categoryId"
                  value={currentProducts.categoryId}
                  onChange={handleInputChange}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  required
                >
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  Imagen (800X800)
                </label>
                <input
                  type="file"
                  name="image"
                  onChange={handleFileChange}
                  accept="image/*"
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                />
                {currentProducts.id &&
                  currentProducts.hasImage &&
                  !imageFile && (
                    <img
                      src={getProductsImageUrl(currentProducts.id)}
                      alt="Current"
                      className="w-20 h-20 mt-2 object-cover rounded"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "/placeholder.png";
                      }}
                    />
                  )}
              </div>
              <div className="flex items-center justify-end">
                <button
                  type="button"
                  onClick={closeModal}
                  className="bg-gray-500 text-white font-bold py-2 px-4 rounded hover:bg-gray-700 transition-colors mr-2"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-primary text-white font-bold py-2 px-4 rounded hover:bg-amber-600 transition-colors disabled:bg-gray-400"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Guardando..." : "Guardar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Modificadores */}
      {modifiersModalProduct && (
        <ProductModifiersModal
          productId={modifiersModalProduct.id}
          productName={modifiersModalProduct.name}
          onClose={() => setModifiersModalProduct(null)}
        />
      )}
    </div>
  );
};

export default ProductsManager;
