import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
} from "react";
import { Products, Category, BusinessInfo, ActivePromotion, UpsellConfig, TwoForOneConfig } from "../types";
import apiClient from "../services/api/apiClient";

interface CatalogContextType {
  products: Products[];
  categories: Category[];
  businessInfo: BusinessInfo | null;
  activePromotion: ActivePromotion | null;
  upsellConfig: UpsellConfig | null;
  twoForOneConfig: TwoForOneConfig | null;
  isLoading: boolean;
  addProducts: (productData: FormData) => Promise<boolean>;
  updateProducts: (
    productId: string,
    productData: FormData
  ) => Promise<boolean>;
  deleteProducts: (productId: string) => Promise<boolean>;
  addCategory: (category: Omit<Category, "id">) => Promise<boolean>;
  updateCategory: (category: Category) => Promise<boolean>;
  deleteCategory: (categoryId: string) => Promise<boolean>;
  updateBusinessInfo: (info: BusinessInfo | FormData) => Promise<boolean>;
  refreshCatalog: () => Promise<void>;
}

const CatalogContext = createContext<CatalogContextType | undefined>(undefined);

export const CatalogProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [products, setProducts] = useState<Products[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [businessInfo, setBusinessInfo] = useState<BusinessInfo | null>(null);
  const [activePromotion, setActivePromotion] = useState<ActivePromotion | null>(null);
  const [upsellConfig, setUpsellConfig] = useState<UpsellConfig | null>(null);
  const [twoForOneConfig, setTwoForOneConfig] = useState<TwoForOneConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const response = await apiClient.get("/api/public/catalog");
      const {
        products: apiProducts,
        categories: apiCategories,
        businessInfo: apiBusinessInfo,
        activePromotion: apiActivePromotion,
        upsellConfig: apiUpsellConfig,
        twoForOneConfig: apiTwoForOneConfig,
      } = response.data;

      // El backend devuelve IDs numéricos, pero el frontend usa strings. Hacemos la conversión.
      const transformedProducts = apiProducts.map((p: any) => ({
        ...p,
        id: p.id.toString(),
        categoryId: p.categoryId.toString(),
      }));
      const transformedCategories = apiCategories.map((c: any) => ({
        ...c,
        id: c.id.toString(),
      }));

      setProducts(transformedProducts);
      setCategories(transformedCategories);
      setBusinessInfo(apiBusinessInfo);
      setActivePromotion(apiActivePromotion || null);
      setUpsellConfig(apiUpsellConfig || null);
      setTwoForOneConfig(apiTwoForOneConfig || null);
    } catch (error) {
      // console.error("Failed to fetch catalog data", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const addProducts = async (productData: FormData): Promise<boolean> => {
    try {
      await apiClient.post("/api/admin/products", productData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      await fetchData(); // Recargar datos para reflejar el cambio
      return true;
    } catch (error) {
      // console.error("Failed to add product", error);
      return false;
    }
  };

  const updateProducts = async (
    productId: string,
    productData: FormData
  ): Promise<boolean> => {
    try {
      await apiClient.put(`/api/admin/products/${productId}`, productData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      await fetchData();
      return true;
    } catch (error) {
      // console.error("Failed to update product", error);
      return false;
    }
  };

  const deleteProducts = async (productId: string): Promise<boolean> => {
    try {
      await apiClient.delete(`/api/admin/products/${productId}`);
      await fetchData();
      return true;
    } catch (error) {
      // console.error("Failed to delete product", error);
      return false;
    }
  };

  const addCategory = async (
    category: Omit<Category, "id">
  ): Promise<boolean> => {
    try {
      await apiClient.post("/api/admin/categories", category);
      await fetchData();
      return true;
    } catch (error) {
      // console.error("Failed to add category", error);
      return false;
    }
  };

  const updateCategory = async (category: Category): Promise<boolean> => {
    try {
      await apiClient.put(`/api/admin/categories/${category.id}`, {
        name: category.name,
      });
      await fetchData();
      return true;
    } catch (error) {
      // console.error("Failed to update category", error);
      return false;
    }
  };

  const deleteCategory = async (categoryId: string): Promise<boolean> => {
    try {
      await apiClient.delete(`/api/admin/categories/${categoryId}`);
      await fetchData();
      return true;
    } catch (error) {
      // console.error("Failed to delete category", error);
      return false;
    }
  };

  const updateBusinessInfo = async (info: BusinessInfo | FormData): Promise<boolean> => {
    try {
      // FormData o BusinessInfo, ambos se envían correctamente
      await apiClient.put("/api/admin/settings", info);
      await fetchData();
      return true;
    } catch (error) {
      // console.error("Failed to update business info", error);
      return false;
    }
  };

  const value = {
    products,
    categories,
    businessInfo,
    activePromotion,
    upsellConfig,
    twoForOneConfig,
    isLoading,
    addProducts,
    updateProducts,
    deleteProducts,
    addCategory,
    updateCategory,
    deleteCategory,
    updateBusinessInfo,
    refreshCatalog: fetchData,
  };

  return (
    <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>
  );
};

export const useCatalog = () => {
  const context = useContext(CatalogContext);
  if (context === undefined) {
    throw new Error("useCatalog must be used within a CatalogProvider");
  }
  return context;
};
