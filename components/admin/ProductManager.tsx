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
    setCurrentProducts({
      ...currentProducts,
      [name]: name === "priceCents" ? Math.round(parseFloat(value) * 100) : value,
    });
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
      console.error(error);
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
      console.error(error);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">
          Gestion de Productos
        </h1>
        <button
          onClick={() => openModal()}
          className="bg-primary text-white font-bold py-2 px-4 rounded hover:bg-amber-600 transition-colors"
        >
          Añadir Producto
        </button>
      </div>

      <div className="bg-white shadow-md rounded-lg overflow-x-auto">
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
                  ${Math.round(product.priceCents / 100).toLocaleString("es-AR")}
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

      {isModalOpen && currentProducts && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-40 flex justify-center items-center">
          <div className="bg-white rounded-lg p-8 z-50 w-full max-w-lg max-h-screen overflow-y-auto">
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
                  Precio (en pesos)
                </label>
                <input
                  type="number"
                  name="priceCents"
                  value={(currentProducts.priceCents || 0) / 100}
                  onChange={handleInputChange}
                  step="0.01"
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  required
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
