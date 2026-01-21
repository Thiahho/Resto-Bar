import { useState, useEffect } from "react";
import apiClient from "../services/api/apiClient";
import { OrderResponse } from "../types";

export const useOrders = () => {
  const [orders, setOrders] = useState<OrderResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log("Fetching orders...");
      const response = await apiClient.get<OrderResponse[]>("/api/admin/orders");
      console.log("Orders response:", response.data);
      setOrders(response.data);
    } catch (err: any) {
      console.error("Error fetching orders:", err);
      setError(err.response?.data?.message || "Error al cargar las órdenes");
    } finally {
      setLoading(false);
    }
  };

  const getOrderById = async (id: number): Promise<OrderResponse | null> => {
    try {
      const response = await apiClient.get<OrderResponse>(`/api/admin/orders/${id}`);
      return response.data;
    } catch (err: any) {
      // console.error("Error fetching order:", err);
      return null;
    }
  };

  const updateOrderStatus = async (id: number, status: string): Promise<OrderResponse | null> => {
    try {
      const response = await apiClient.put<OrderResponse>(`/api/admin/orders/${id}/status`, { status });
      const updatedOrder = response.data;
      // Actualizar el estado local con la orden completa (incluye trackingUrl)
      setOrders((prev) =>
        prev.map((order) =>
          order.id === id ? updatedOrder : order
        )
      );
      return updatedOrder;
    } catch (err: any) {
      // console.error("Error updating order status:", err);
      return null;
    }
  };

  const deleteOrder = async (id: number): Promise<boolean> => {
    try {
      await apiClient.delete(`/api/admin/orders/${id}`);
      setOrders((prev) => prev.filter((order) => order.id !== id));
      return true;
    } catch (err: any) {
      // console.error("Error deleting order:", err);
      return false;
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  return {
    orders,
    loading,
    error,
    fetchOrders,
    getOrderById,
    updateOrderStatus,
    deleteOrder,
  };
};
