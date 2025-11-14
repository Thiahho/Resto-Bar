// services/api/apiClient.ts
import axios from "axios";
import { OrderRequest, OrderResponse } from "../../types";

export const API_BASE_URL =
  import.meta.env.VITE_API_URL ?? "http://localhost:5277";

const apiClient = axios.create({ baseURL: API_BASE_URL });

apiClient.interceptors.request.use((config) => {
  const token = sessionStorage.getItem("authToken");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Generic API wrapper
export const api = {
  get: async <T>(url: string): Promise<T> => {
    const response = await apiClient.get<T>(url);
    return response.data;
  },
  post: async <T>(url: string, data?: any): Promise<T> => {
    const response = await apiClient.post<T>(url, data);
    return response.data;
  },
  put: async <T>(url: string, data?: any): Promise<T> => {
    const response = await apiClient.put<T>(url, data);
    return response.data;
  },
  delete: async <T>(url: string): Promise<T> => {
    const response = await apiClient.delete<T>(url);
    return response.data;
  },
};

export const getFullApiUrl = (relativePath?: string) =>
  relativePath ? `${API_BASE_URL}${relativePath}` : "";

export const getProductsImageUrl = (productId: string) =>
  `${API_BASE_URL}/api/public/products/${productId}/image`;

// Order API
export const createOrder = async (order: OrderRequest): Promise<OrderResponse> => {
  const response = await apiClient.post<OrderResponse>("/api/orders", order);
  return response.data;
};

// Modifiers API
export interface ModifierDto {
  id: number;
  name: string;
  priceCentsDelta: number;
  category?: string;
  isActive: boolean;
}

export interface ProductInfoDto {
  id: number;
  name: string;
}

export interface ModifierWithProductsDto extends ModifierDto {
  associatedProducts: ProductInfoDto[];
}

export const getActiveModifiers = async (): Promise<ModifierDto[]> => {
  const response = await apiClient.get<ModifierDto[]>("/api/modifiers");
  return response.data;
};

export const getAllModifiersWithProducts = async (): Promise<ModifierWithProductsDto[]> => {
  const response = await apiClient.get<ModifierWithProductsDto[]>("/api/admin/modifiers/with-products");
  return response.data;
};

export const getProductModifiers = async (productId: string): Promise<ModifierDto[]> => {
  const response = await apiClient.get<ModifierDto[]>(`/api/products/${productId}/modifiers`);
  return response.data;
};

export const getModifierCategories = async (): Promise<string[]> => {
  const response = await apiClient.get<string[]>("/api/modifiers/categories");
  return response.data;
};

export const assignModifierToProduct = async (productId: string, modifierId: number): Promise<void> => {
  await apiClient.post(`/api/admin/products/${productId}/modifiers/${modifierId}`);
};

export const removeModifierFromProduct = async (productId: string, modifierId: number): Promise<void> => {
  await apiClient.delete(`/api/admin/products/${productId}/modifiers/${modifierId}`);
};

export default apiClient;
