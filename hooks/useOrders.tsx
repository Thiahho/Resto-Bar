import { useState, useEffect, useRef, useCallback } from "react";
import apiClient from "../services/api/apiClient";
import { OrderResponse } from "../types";

export const useOrders = () => {
  const [orders, setOrders] = useState<OrderResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isFetchingRef = useRef(false);

  const fetchOrders = useCallback(async (options?: { silent?: boolean }) => {
    if (isFetchingRef.current) return;

    try {
      isFetchingRef.current = true;
      if (!options?.silent) {
        setLoading(true);
      }
      setError(null);

      const response = await apiClient.get<OrderResponse[]>("/api/admin/orders");
      setOrders(response.data);
    } catch (err: any) {
      console.error("Error fetching orders:", err);
      setError(err.response?.data?.message || "Error al cargar las órdenes");
    } finally {
      isFetchingRef.current = false;
      setLoading(false);
    }
  }, []);

  const getOrderById = async (id: number): Promise<OrderResponse | null> => {
    try {
      const response = await apiClient.get<OrderResponse>(`/api/admin/orders/${id}`);
      return response.data;
    } catch (err: any) {
      return null;
    }
  };

  const updateOrderStatus = async (
    id: number,
    status: string,
  ): Promise<OrderResponse | null> => {
    try {
      const response = await apiClient.put<OrderResponse>(
        `/api/admin/orders/${id}/status`,
        { status },
      );
      const updatedOrder = response.data;
      // Actualizar el estado local con la orden completa (incluye trackingUrl)
      setOrders((prev) =>
        prev.map((order) =>
          order.id === id ? updatedOrder : order
        )
      );
      return updatedOrder;
    } catch (err: any) {
      return null;
    }
  };

  const deleteOrder = async (id: number): Promise<boolean> => {
    try {
      await apiClient.delete(`/api/admin/orders/${id}`);
      setOrders((prev) => prev.filter((order) => order.id !== id));
      return true;
    } catch (err: any) {
      return false;
    }
  };

  // Cargar órdenes al montar
  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  return {
    orders,
    setOrders, // Exportar setOrders para que el contexto pueda actualizar el estado
    loading,
    error,
    fetchOrders,
    getOrderById,
    updateOrderStatus,
    deleteOrder,
  };
};
