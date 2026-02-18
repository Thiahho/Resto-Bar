import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';

const POLL_INTERVAL_MS = 20_000; // 20 segundos

interface TableInfo {
  tableId: number;
  tableName: string;
  activeSessionId: number | null;
  status: string;
}

export const useTableOrder = () => {
  const { tableId } = useParams<{ tableId: string }>();
  const [tableInfo, setTableInfo] = useState<TableInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  useEffect(() => {
    if (!tableId) {
      setError('No table ID provided');
      setIsLoading(false);
      return;
    }

    const fetchTableInfo = async (silent = false) => {
      if (!silent) setIsLoading(true);
      try {
        const apiUrl = import.meta.env.VITE_API_URL || '';
        const response = await fetch(`${apiUrl}/api/public/tables/${tableId}`);

        if (!isMounted.current) return;

        if (response.status === 404) {
          setError('table_not_found');
          return;
        }

        if (!response.ok) {
          setError('server_error');
          return;
        }

        const data = await response.json();
        setTableInfo({
          tableId: data.tableId,
          tableName: data.tableName,
          activeSessionId: data.activeSessionId ?? null,
          status: data.status,
        });
      } catch {
        if (!silent && isMounted.current) setError('network_error');
      } finally {
        if (!silent && isMounted.current) setIsLoading(false);
      }
    };

    fetchTableInfo();

    // Poll every 20s to detect status changes (e.g. BILL_REQUESTED)
    const interval = setInterval(() => fetchTableInfo(true), POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [tableId]);

  const createOrder = async (items: any[], note?: string, discountCents?: number) => {
    if (!tableId) {
      throw new Error('No table ID');
    }

    if (!tableInfo?.activeSessionId) {
      throw new Error('No active session for this table');
    }

    const apiUrl = import.meta.env.VITE_API_URL || '';
    const response = await fetch(`${apiUrl}/api/public/tables/${tableId}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items, note, discountCents: discountCents ?? 0 }),
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.message || 'Error creating order');
    }

    return await response.json();
  };

  return {
    isLoading,
    error,
    tableId: tableId || '',
    tableName: tableInfo?.tableName ?? `Mesa ${tableId}`,
    sessionId: tableInfo?.activeSessionId,
    tableStatus: tableInfo?.status ?? null,
    isValid: !error && tableInfo !== null,
    hasActiveSession: !!tableInfo?.activeSessionId,
    createOrder,
  };
};
