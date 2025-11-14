import React, { useState } from "react";
import { useCatalog } from "../../hooks/useCatalog";
import { useToast } from "../../contexts/ToastContext";
import { Category } from "../../types";
import { api } from "../../services/api/apiClient";

const CategoryManager: React.FC = () => {
  const { categories, addCategory, updateCategory, deleteCategory, refreshCatalog } =
    useCatalog();
  const { showToast, showConfirm } = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentCategory, setCurrentCategory] =
    useState<Partial<Category> | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [draggedCategory, setDraggedCategory] = useState<Category | null>(null);

  const openModal = (category: Partial<Category> | null = null) => {
    setCurrentCategory(category || { name: "" });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setCurrentCategory(null);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!currentCategory) return;
    setCurrentCategory({ ...currentCategory, name: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentCategory || !currentCategory.name) return;
    setIsSubmitting(true);

    const success = currentCategory.id
      ? await updateCategory(currentCategory as Category)
      : await addCategory({ name: currentCategory.name });

    if (success) {
      showToast(
        currentCategory.id
          ? "Category updated successfully!"
          : "Category added successfully!",
        "success"
      );
      closeModal();
    } else {
      showToast("Failed to save category.", "error");
    }
    setIsSubmitting(false);
  };

  const handleDelete = async (categoryId: string) => {
    showConfirm(
      "Are you sure you want to delete this category? This cannot be undone.",
      async () => {
        const success = await deleteCategory(categoryId);
        if (success) {
          showToast("Category deleted successfully!", "success");
        } else {
          showToast("Failed to delete category.", "error");
        }
      }
    );
  };

  const handleDragStart = (category: Category) => {
    setDraggedCategory(category);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (targetCategory: Category) => {
    if (!draggedCategory || draggedCategory.id === targetCategory.id) return;

    const reorderedCategories = [...categories];
    const draggedIndex = reorderedCategories.findIndex(c => c.id === draggedCategory.id);
    const targetIndex = reorderedCategories.findIndex(c => c.id === targetCategory.id);

    // Reordenar en el array local
    reorderedCategories.splice(draggedIndex, 1);
    reorderedCategories.splice(targetIndex, 0, draggedCategory);

    // Actualizar sortOrder de todas las categorías
    const reorderList = reorderedCategories.map((category, index) => ({
      categoryId: parseInt(category.id),
      sortOrder: index
    }));

    try {
      await api.put("/api/admin/categories/reorder", reorderList);
      await refreshCatalog();
      showToast("Orden actualizado correctamente", "success");
    } catch (error) {
      showToast("Error al reordenar categorías", "error");
      console.error(error);
    }

    setDraggedCategory(null);
  };

  const moveCategory = async (category: Category, direction: "up" | "down") => {
    const currentIndex = categories.findIndex(c => c.id === category.id);
    if (
      (direction === "up" && currentIndex === 0) ||
      (direction === "down" && currentIndex === categories.length - 1)
    ) {
      return;
    }

    const newIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    const reorderedCategories = [...categories];
    [reorderedCategories[currentIndex], reorderedCategories[newIndex]] =
      [reorderedCategories[newIndex], reorderedCategories[currentIndex]];

    const reorderList = reorderedCategories.map((c, index) => ({
      categoryId: parseInt(c.id),
      sortOrder: index
    }));

    try {
      await api.put("/api/admin/categories/reorder", reorderList);
      await refreshCatalog();
      showToast("Orden actualizado correctamente", "success");
    } catch (error) {
      showToast("Error al reordenar categorías", "error");
      console.error(error);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Categorias</h1>
        <button
          onClick={() => openModal()}
          className="bg-primary text-white font-bold py-2 px-4 rounded hover:bg-amber-600 transition-colors"
        >
          Añadir Categoria
        </button>
      </div>

      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <table className="min-w-full leading-normal">
          <thead>
            <tr>
              <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Orden
              </th>
              <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Nombre de Categoria
              </th>
              <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody>
            {categories.map((category, index) => (
              <tr
                key={category.id}
                draggable
                onDragStart={() => handleDragStart(category)}
                onDragOver={handleDragOver}
                onDrop={() => handleDrop(category)}
                className="cursor-move hover:bg-gray-50"
              >
                <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                  <div className="flex flex-col gap-1">
                    <button
                      onClick={() => moveCategory(category, "up")}
                      disabled={index === 0}
                      className="text-gray-600 hover:text-gray-900 disabled:text-gray-300 disabled:cursor-not-allowed"
                      title="Mover arriba"
                    >
                      ▲
                    </button>
                    <button
                      onClick={() => moveCategory(category, "down")}
                      disabled={index === categories.length - 1}
                      className="text-gray-600 hover:text-gray-900 disabled:text-gray-300 disabled:cursor-not-allowed"
                      title="Mover abajo"
                    >
                      ▼
                    </button>
                  </div>
                </td>
                <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                  {category.name}
                </td>
                <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                  <button
                    onClick={() => openModal(category)}
                    className="text-indigo-600 hover:text-indigo-900 mr-4"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => handleDelete(category.id)}
                    className="text-red-600 hover:text-red-900"
                  >
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && currentCategory && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-40 flex justify-center items-center">
          <div className="bg-white rounded-lg p-8 z-50 w-full max-w-md">
            <h2 className="text-2xl font-bold mb-4">
              {currentCategory.id ? "Editar Categoria" : "Añadir Categoria"}
            </h2>
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  Nombre
                </label>
                <input
                  type="text"
                  name="name"
                  value={currentCategory.name}
                  onChange={handleInputChange}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  required
                />
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
                  {isSubmitting ? "Saving..." : "Guardar Categoria"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CategoryManager;
