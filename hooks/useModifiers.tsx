import { useState, useEffect } from "react";
import apiClient, { ModifierDto, ModifierWithProductsDto, getAllModifiersWithProducts } from "../services/api/apiClient";

interface CreateModifierData {
  name: string;
  priceCentsDelta: number;
  category?: string;
  isActive: boolean;
}

interface UpdateModifierData {
  name?: string;
  priceCentsDelta?: number;
  category?: string;
  isActive?: boolean;
}

export const useModifiers = () => {
  const [modifiers, setModifiers] = useState<ModifierDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchModifiers = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.get<ModifierDto[]>("/api/admin/modifiers");
      setModifiers(response.data);
    } catch (err: any) {
      setError(err.response?.data?.message || "Error loading modifiers");
      console.error("Error fetching modifiers:", err);
    } finally {
      setLoading(false);
    }
  };

  const createModifier = async (data: CreateModifierData) => {
    setLoading(true);
    setError(null);
    try {
      await apiClient.post("/api/admin/modifiers", data);
      await fetchModifiers();
      return true;
    } catch (err: any) {
      setError(err.response?.data?.message || "Error creating modifier");
      console.error("Error creating modifier:", err);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const updateModifier = async (id: number, data: UpdateModifierData) => {
    setLoading(true);
    setError(null);
    try {
      await apiClient.put(`/api/admin/modifiers/${id}`, data);
      await fetchModifiers();
      return true;
    } catch (err: any) {
      setError(err.response?.data?.message || "Error updating modifier");
      console.error("Error updating modifier:", err);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const deleteModifier = async (id: number) => {
    setLoading(true);
    setError(null);
    try {
      await apiClient.delete(`/api/admin/modifiers/${id}`);
      await fetchModifiers();
      return true;
    } catch (err: any) {
      setError(err.response?.data?.message || "Error deleting modifier");
      console.error("Error deleting modifier:", err);
      return false;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchModifiers();
  }, []);

  return {
    modifiers,
    loading,
    error,
    fetchModifiers,
    createModifier,
    updateModifier,
    deleteModifier,
  };
};

export const useModifiersWithProducts = () => {
  const [modifiers, setModifiers] = useState<ModifierWithProductsDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchModifiers = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAllModifiersWithProducts();
      setModifiers(data);
    } catch (err: any) {
      setError(err.response?.data?.message || "Error loading modifiers");
      console.error("Error fetching modifiers with products:", err);
    } finally {
      setLoading(false);
    }
  };

  const createModifier = async (data: CreateModifierData) => {
    setLoading(true);
    setError(null);
    try {
      await apiClient.post("/api/admin/modifiers", data);
      await fetchModifiers();
      return true;
    } catch (err: any) {
      setError(err.response?.data?.message || "Error creating modifier");
      console.error("Error creating modifier:", err);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const updateModifier = async (id: number, data: UpdateModifierData) => {
    setLoading(true);
    setError(null);
    try {
      await apiClient.put(`/api/admin/modifiers/${id}`, data);
      await fetchModifiers();
      return true;
    } catch (err: any) {
      setError(err.response?.data?.message || "Error updating modifier");
      console.error("Error updating modifier:", err);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const deleteModifier = async (id: number) => {
    setLoading(true);
    setError(null);
    try {
      await apiClient.delete(`/api/admin/modifiers/${id}`);
      await fetchModifiers();
      return true;
    } catch (err: any) {
      setError(err.response?.data?.message || "Error deleting modifier");
      console.error("Error deleting modifier:", err);
      return false;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchModifiers();
  }, []);

  return {
    modifiers,
    loading,
    error,
    fetchModifiers,
    createModifier,
    updateModifier,
    deleteModifier,
  };
};
