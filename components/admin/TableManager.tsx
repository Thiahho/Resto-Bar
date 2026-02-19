import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../contexts/ToastContext';
import { useCatalog } from '../../hooks/useCatalog';
import { Table, TableSession } from '../../types';
import TableQRManager from './TableQRManager';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const apiUrl = () => import.meta.env.VITE_API_URL || '';

async function apiFetch(url: string, token: string, opts?: RequestInit) {
  const res = await fetch(url, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(opts?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Error desconocido' }));
    throw new Error(err.message || 'Error desconocido');
  }
  return res.status === 204 ? null : res.json();
}

// ─── Modal: Crear Mesa ────────────────────────────────────────────────────────

interface CreateTableModalProps {
  defaultBranchId: number;
  token: string;
  onSuccess: (table: Table) => void;
  onClose: () => void;
}

const CreateTableModal: React.FC<CreateTableModalProps> = ({ defaultBranchId, token, onSuccess, onClose }) => {
  const { showToast } = useToast();
  const [name, setName] = useState('');
  const [capacity, setCapacity] = useState(4);
  const [sortOrder, setSortOrder] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setIsSubmitting(true);
    try {
      const table = await apiFetch(`${apiUrl()}/api/admin/tables`, token, {
        method: 'POST',
        body: JSON.stringify({ branchId: defaultBranchId, name: name.trim(), capacity, sortOrder, isActive: true }),
      });
      showToast(`Mesa "${name}" creada`, 'success');
      onSuccess(table);
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full" onClick={e => e.stopPropagation()}>
        <div className="bg-gradient-to-r from-indigo-600 to-indigo-500 rounded-t-2xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-indigo-100 text-sm font-medium uppercase tracking-wider">Nueva mesa</p>
              <h2 className="text-2xl font-bold mt-1">Crear Mesa</h2>
            </div>
            <div className="bg-white/20 rounded-xl p-3">
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </div>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Nombre de la mesa *</label>
            <input
              autoFocus
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Ej: Mesa 1, Terraza A, Barra..."
              maxLength={50}
              required
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Capacidad (personas)</label>
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => setCapacity(Math.max(1, capacity - 1))}
                className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xl flex items-center justify-center transition-colors">−</button>
              <div className="flex-1 text-center">
                <span className="text-4xl font-bold text-gray-900">{capacity}</span>
              </div>
              <button type="button" onClick={() => setCapacity(Math.min(100, capacity + 1))}
                className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xl flex items-center justify-center transition-colors">+</button>
            </div>
            <div className="flex gap-2 mt-3 flex-wrap">
              {[2, 4, 6, 8, 10, 12].map(n => (
                <button key={n} type="button" onClick={() => setCapacity(n)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-semibold border transition-colors ${
                    capacity === n ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-gray-300 text-gray-600 hover:border-indigo-400'
                  }`}>{n}</button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Orden de visualización <span className="text-gray-400 font-normal">(menor = primero)</span>
            </label>
            <input
              type="number"
              value={sortOrder}
              onChange={e => setSortOrder(parseInt(e.target.value) || 0)}
              min={0}
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
            />
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} disabled={isSubmitting}
              className="flex-1 py-3 rounded-xl border border-gray-300 text-gray-700 font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50">
              Cancelar
            </button>
            <button type="submit" disabled={isSubmitting || !name.trim()}
              className="flex-1 py-3 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
              {isSubmitting ? (
                <><svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>Creando...</>
              ) : 'Crear Mesa'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Modal: Editar Mesa ───────────────────────────────────────────────────────

interface EditTableModalProps {
  table: Table;
  token: string;
  onSuccess: (table: Table) => void;
  onDeleted: () => void;
  onClose: () => void;
}

const EditTableModal: React.FC<EditTableModalProps> = ({ table, token, onSuccess, onDeleted, onClose }) => {
  const { showToast } = useToast();
  const [name, setName] = useState(table.name);
  const [capacity, setCapacity] = useState(table.capacity);
  const [sortOrder, setSortOrder] = useState(table.sortOrder);
  const [isActive, setIsActive] = useState(table.isActive);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setIsSubmitting(true);
    try {
      const updated = await apiFetch(`${apiUrl()}/api/admin/tables/${table.id}`, token, {
        method: 'PUT',
        body: JSON.stringify({ name: name.trim(), capacity, sortOrder, isActive }),
      });
      showToast('Mesa actualizada', 'success');
      onSuccess(updated);
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await apiFetch(`${apiUrl()}/api/admin/tables/${table.id}`, token, { method: 'DELETE' });
      showToast(`Mesa "${table.name}" eliminada`, 'success');
      onDeleted();
    } catch (err: any) {
      showToast(err.message, 'error');
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full" onClick={e => e.stopPropagation()}>
        <div className="bg-gradient-to-r from-gray-700 to-gray-600 rounded-t-2xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-300 text-sm font-medium uppercase tracking-wider">Editar</p>
              <h2 className="text-2xl font-bold mt-1">{table.name}</h2>
            </div>
            <button onClick={onClose} className="bg-white/20 hover:bg-white/30 rounded-xl p-2 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Nombre *</label>
            <input
              autoFocus
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              maxLength={50}
              required
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent transition"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Capacidad</label>
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => setCapacity(Math.max(1, capacity - 1))}
                className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xl flex items-center justify-center">−</button>
              <div className="flex-1 text-center">
                <span className="text-4xl font-bold text-gray-900">{capacity}</span>
              </div>
              <button type="button" onClick={() => setCapacity(Math.min(100, capacity + 1))}
                className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xl flex items-center justify-center">+</button>
            </div>
            <div className="flex gap-2 mt-3 flex-wrap">
              {[2, 4, 6, 8, 10, 12].map(n => (
                <button key={n} type="button" onClick={() => setCapacity(n)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-semibold border transition-colors ${
                    capacity === n ? 'bg-gray-700 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-600 hover:border-gray-500'
                  }`}>{n}</button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Orden</label>
              <input
                type="number"
                value={sortOrder}
                onChange={e => setSortOrder(parseInt(e.target.value) || 0)}
                min={0}
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent transition"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Estado</label>
              <button
                type="button"
                onClick={() => setIsActive(!isActive)}
                className={`w-full py-3 rounded-xl font-semibold text-sm transition-colors border ${
                  isActive
                    ? 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100'
                    : 'bg-red-50 border-red-200 text-red-700 hover:bg-red-100'
                }`}
              >
                {isActive ? '✓ Activa' : '✗ Inactiva'}
              </button>
            </div>
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} disabled={isSubmitting}
              className="flex-1 py-3 rounded-xl border border-gray-300 text-gray-700 font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50">
              Cancelar
            </button>
            <button type="submit" disabled={isSubmitting || !name.trim()}
              className="flex-1 py-3 rounded-xl bg-gray-700 text-white font-semibold hover:bg-gray-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
              {isSubmitting ? (
                <><svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>Guardando...</>
              ) : 'Guardar cambios'}
            </button>
          </div>

          {/* Delete zone */}
          <div className="pt-1 border-t border-gray-100">
            {!showDeleteConfirm ? (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={table.status === 'OCCUPIED'}
                className="w-full py-2.5 rounded-xl text-red-600 hover:bg-red-50 text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Eliminar mesa {table.status === 'OCCUPIED' ? '(ocupada)' : ''}
              </button>
            ) : (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-3">
                <p className="text-sm text-red-700 font-medium text-center">¿Confirmar eliminación de "{table.name}"?</p>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setShowDeleteConfirm(false)} disabled={isDeleting}
                    className="flex-1 py-2 rounded-lg border border-gray-300 text-gray-700 text-sm font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50">
                    No, cancelar
                  </button>
                  <button type="button" onClick={handleDelete} disabled={isDeleting}
                    className="flex-1 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-1">
                    {isDeleting ? <><svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>Eliminando...</> : 'Sí, eliminar'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Modal: Reservar Mesa ─────────────────────────────────────────────────────

interface ReserveTableModalProps {
  table: Table;
  token: string;
  onSuccess: () => void;
  onClose: () => void;
}

const ReserveTableModal: React.FC<ReserveTableModalProps> = ({ table, token, onSuccess, onClose }) => {
  const { showToast } = useToast();
  const [customerName, setCustomerName] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await apiFetch(`${apiUrl()}/api/admin/tables/${table.id}/reserve`, token, {
        method: 'POST',
        body: JSON.stringify({ customerName: customerName || null, notes: notes || null }),
      });
      showToast(`${table.name} reservada`, 'success');
      onSuccess();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full" onClick={e => e.stopPropagation()}>
        <div className="bg-gradient-to-r from-blue-600 to-blue-500 rounded-t-2xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm font-medium uppercase tracking-wider">Reservar</p>
              <h2 className="text-2xl font-bold mt-1">{table.name}</h2>
            </div>
            <div className="bg-white/20 rounded-xl p-3">
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Nombre del cliente <span className="text-gray-400 font-normal">(opcional)</span>
            </label>
            <input
              autoFocus
              type="text"
              value={customerName}
              onChange={e => setCustomerName(e.target.value)}
              placeholder="Ej: Familia López"
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Notas <span className="text-gray-400 font-normal">(opcional)</span>
            </label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Ej: Cumpleaños, llegan a las 20:00..."
              rows={3}
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none transition"
            />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} disabled={isSubmitting}
              className="flex-1 py-3 rounded-xl border border-gray-300 text-gray-700 font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50">
              Cancelar
            </button>
            <button type="submit" disabled={isSubmitting}
              className="flex-1 py-3 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
              {isSubmitting ? (
                <><svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>Reservando...</>
              ) : 'Confirmar reserva'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Modal: Abrir Mesa ────────────────────────────────────────────────────────

interface WaiterOption { id: number; usuario: string; }

interface OpenSessionModalProps {
  table: Table;
  token: string;
  onConfirm: (guestCount: number, customerName: string, notes: string, waiterId: number | null) => Promise<void>;
  onClose: () => void;
}

const OpenSessionModal: React.FC<OpenSessionModalProps> = ({ table, token, onConfirm, onClose }) => {
  const { userId, userRole } = useAuth();
  const [guestCount, setGuestCount] = useState(2);
  const [customerName, setCustomerName] = useState('');
  const [notes, setNotes] = useState('');
  const [waiterId, setWaiterId] = useState<number | null>(null);
  const [waiters, setWaiters] = useState<WaiterOption[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL || ''}/api/auth/users`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.ok ? r.json() : [])
      .then((users: Array<{ id: number; usuario: string; rol: string }>) => {
        const mozos = users.filter(u => u.rol === 'Mozo');
        setWaiters(mozos);
        // Si el usuario logueado es Mozo, pre-seleccionarlo
        if (userRole === 'Mozo' && userId) {
          setWaiterId(userId);
        }
      })
      .catch(() => {});
  }, [token, userId, userRole]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try { await onConfirm(guestCount, customerName, notes, waiterId); } finally { setIsSubmitting(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full" onClick={e => e.stopPropagation()}>
        <div className="bg-gradient-to-r from-green-600 to-green-500 rounded-t-2xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm font-medium uppercase tracking-wider">Abrir sesión</p>
              <h2 className="text-2xl font-bold mt-1">{table.name}</h2>
            </div>
            <div className="bg-white/20 rounded-xl p-3">
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18M10 4v16M14 4v16M5 4h14a1 1 0 011 1v14a1 1 0 01-1 1H5a1 1 0 01-1-1V5a1 1 0 011-1z" />
              </svg>
            </div>
          </div>
          <p className="text-green-100 text-sm mt-2">Capacidad máxima: {table.capacity} personas</p>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Número de comensales</label>
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => setGuestCount(Math.max(1, guestCount - 1))}
                className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xl flex items-center justify-center transition-colors">−</button>
              <div className="flex-1 text-center">
                <span className="text-4xl font-bold text-gray-900">{guestCount}</span>
                <span className="text-gray-400 text-sm ml-1">personas</span>
              </div>
              <button type="button" onClick={() => setGuestCount(Math.min(table.capacity, guestCount + 1))}
                className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xl flex items-center justify-center transition-colors">+</button>
            </div>
            <div className="flex gap-2 mt-3 flex-wrap">
              {[1, 2, 3, 4, 5, 6, 8].filter(n => n <= table.capacity).map(n => (
                <button key={n} type="button" onClick={() => setGuestCount(n)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-semibold border transition-colors ${
                    guestCount === n ? 'bg-green-600 border-green-600 text-white' : 'bg-white border-gray-300 text-gray-600 hover:border-green-400'
                  }`}>{n}</button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Nombre del cliente <span className="text-gray-400 font-normal">(opcional)</span>
            </label>
            <input type="text" value={customerName} onChange={e => setCustomerName(e.target.value)}
              placeholder="Ej: Familia García"
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Notas <span className="text-gray-400 font-normal">(opcional)</span>
            </label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="Ej: Reserva cumpleaños, alergias..." rows={2}
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none transition" />
          </div>
          {waiters.length > 0 && userRole !== 'Mozo' && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Mozo responsable <span className="text-gray-400 font-normal">(opcional)</span>
              </label>
              <select
                value={waiterId ?? ''}
                onChange={e => setWaiterId(e.target.value ? Number(e.target.value) : null)}
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition"
              >
                <option value="">— Sin asignar —</option>
                {waiters.map(w => (
                  <option key={w.id} value={w.id}>{w.usuario}</option>
                ))}
              </select>
            </div>
          )}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} disabled={isSubmitting}
              className="flex-1 py-3 rounded-xl border border-gray-300 text-gray-700 font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50">
              Cancelar
            </button>
            <button type="submit" disabled={isSubmitting}
              className="flex-1 py-3 rounded-xl bg-green-600 text-white font-semibold hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
              {isSubmitting ? (
                <><svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>Abriendo...</>
              ) : 'Abrir Mesa'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Modal: Cargar Pedido (mozo) ──────────────────────────────────────────────

// ── Tipos internos ─────────────────────────────────────────────────────────────

interface ModifierOption {
  id: number;
  name: string;
  priceCentsDelta: number;
  category: string;
}

interface UnitConfig {
  isDouble: boolean;
  modifierIds: number[];
  note: string;
}

interface StagedItem {
  key: string;          // unique id
  product: import('../../types').Products;
  units: UnitConfig[];  // length = qty
  sameConfig: boolean;  // share units[0] config for all units
  modifierOptions: ModifierOption[];
}

// ── ItemConfigModal ─────────────────────────────────────────────────────────────

interface ItemConfigModalProps {
  product: import('../../types').Products;
  twoForOneActive: boolean;
  existing?: StagedItem;  // if editing
  apiBaseUrl: string;
  onConfirm: (item: StagedItem) => void;
  onClose: () => void;
}

const EMPTY_UNIT = (): UnitConfig => ({ isDouble: false, modifierIds: [], note: '' });

const ItemConfigModal: React.FC<ItemConfigModalProps> = ({
  product, twoForOneActive, existing, apiBaseUrl, onConfirm, onClose,
}) => {
  const [modifierOptions, setModifierOptions] = useState<ModifierOption[]>(existing?.modifierOptions ?? []);
  const [loadingMods, setLoadingMods] = useState(!existing);
  const [units, setUnits] = useState<UnitConfig[]>(existing?.units ?? [EMPTY_UNIT()]);
  const [sameConfig, setSameConfig] = useState(existing?.sameConfig ?? true);
  const [activeTab, setActiveTab] = useState(0);

  const qty = units.length;
  const currentUnit = sameConfig ? units[0] : units[activeTab] ?? units[0];

  // Fetch modifiers on mount
  useEffect(() => {
    if (existing) return;
    const fetch$ = async () => {
      try {
        const res = await fetch(`${apiBaseUrl}/api/products/${product.id}/modifiers`);
        if (res.ok) {
          const data = await res.json();
          // API may return priceCentsDelta or priceCents
          setModifierOptions(data.map((m: any) => ({
            id: m.id,
            name: m.name,
            priceCentsDelta: m.priceCentsDelta ?? m.priceCents ?? 0,
            category: m.category ?? m.type ?? 'otros',
          })).filter((m: ModifierOption) => m.id));
        }
      } catch { /* no modifiers */ } finally { setLoadingMods(false); }
    };
    fetch$();
  }, [product.id, apiBaseUrl, existing]);

  // Update a single unit field (or all if sameConfig)
  const updateUnit = (patch: Partial<UnitConfig>, unitIdx?: number) => {
    setUnits(prev => {
      const next = [...prev];
      if (sameConfig || unitIdx === undefined) {
        // apply to all
        return next.map(u => ({ ...u, ...patch }));
      }
      next[unitIdx] = { ...next[unitIdx], ...patch };
      return next;
    });
  };

  const toggleModifier = (modId: number) => {
    const unit = sameConfig ? units[0] : units[activeTab];
    const has = unit.modifierIds.includes(modId);
    updateUnit(
      { modifierIds: has ? unit.modifierIds.filter(id => id !== modId) : [...unit.modifierIds, modId] },
      sameConfig ? undefined : activeTab,
    );
  };

  const setQty = (delta: number) => {
    setUnits(prev => {
      const nextQty = Math.max(1, prev.length + delta);
      if (nextQty > prev.length) {
        // add units copying first
        const extra = Array.from({ length: nextQty - prev.length }, () => ({ ...prev[0], note: '' }));
        return [...prev, ...extra];
      }
      return prev.slice(0, nextQty);
    });
    setActiveTab(t => Math.min(t, Math.max(0, (units.length + delta) - 1)));
  };

  // Computed price per unit (base + double delta + modifiers)
  const unitPrice = (u: UnitConfig): number => {
    const base = (u.isDouble && product.doublePriceCents) ? product.doublePriceCents : product.priceCents;
    const modDelta = u.modifierIds.reduce((s, id) => {
      const m = modifierOptions.find(o => o.id === id);
      return s + (m?.priceCentsDelta ?? 0);
    }, 0);
    return base + modDelta;
  };

  const lineTotal = (): number => {
    if (sameConfig) {
      const up = unitPrice(units[0]);
      // 2x1 applies per same product: every 2nd is free
      if (twoForOneActive && qty >= 2) {
        const free = Math.floor(qty / 2);
        return up * (qty - free);
      }
      return up * qty;
    }
    return units.reduce((s, u) => s + unitPrice(u), 0);
  };

  const grouped = modifierOptions.reduce<Record<string, ModifierOption[]>>((acc, m) => {
    const cat = m.category || 'Otros';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(m);
    return acc;
  }, {});

  const handleConfirm = () => {
    onConfirm({
      key: existing?.key ?? `${product.id}-${Date.now()}`,
      product,
      units: sameConfig ? Array.from({ length: qty }, () => ({ ...units[0] })) : units,
      sameConfig,
      modifierOptions,
    });
  };

  const hasDouble = !!product.doublePriceCents;
  const u = currentUnit;
  const fmt = (c: number) => `$${Math.round(c).toLocaleString('es-AR')}`;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] flex flex-col" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="bg-gradient-to-r from-gray-800 to-gray-700 rounded-t-2xl p-4 text-white shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-gray-300 text-xs uppercase tracking-wider">Configurar ítem</p>
              <h3 className="text-lg font-bold mt-0.5 truncate">{product.name}</h3>
            </div>
            <button onClick={onClose} className="bg-white/10 hover:bg-white/20 rounded-xl p-2 ml-3 transition-colors shrink-0">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">

          {/* Cantidad */}
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-gray-800 text-sm">Cantidad</p>
              {qty >= 2 && (
                <button
                  onClick={() => { setSameConfig(s => !s); setActiveTab(0); }}
                  className={`text-xs mt-0.5 font-medium transition-colors ${sameConfig ? 'text-orange-600' : 'text-indigo-600'}`}
                >
                  {sameConfig ? '▸ Configurar individualmente' : '▸ Todos iguales'}
                </button>
              )}
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => setQty(-1)} disabled={qty <= 1}
                className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 disabled:opacity-30 text-gray-700 font-bold flex items-center justify-center transition-colors">−</button>
              <span className="w-8 text-center text-2xl font-bold text-gray-900">{qty}</span>
              <button onClick={() => setQty(+1)}
                className="w-9 h-9 rounded-full bg-orange-500 hover:bg-orange-600 text-white font-bold flex items-center justify-center transition-colors">+</button>
            </div>
          </div>

          {/* Tabs individuales (cuando !sameConfig y qty > 1) */}
          {!sameConfig && qty > 1 && (
            <div className="flex gap-1.5 overflow-x-auto">
              {units.map((_, i) => (
                <button key={i} onClick={() => setActiveTab(i)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors shrink-0 ${
                    activeTab === i ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}>
                  Ítem {i + 1}
                </button>
              ))}
            </div>
          )}

          {/* Simple / Doble */}
          {hasDouble && (
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-2">Tamaño</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'Simple', isDouble: false, price: product.priceCents },
                  { label: 'Doble', isDouble: true, price: product.doublePriceCents! },
                ].map(opt => (
                  <button key={opt.label} type="button"
                    onClick={() => updateUnit({ isDouble: opt.isDouble }, sameConfig ? undefined : activeTab)}
                    className={`py-3 rounded-xl border-2 text-sm font-semibold transition-all ${
                      u.isDouble === opt.isDouble
                        ? 'border-orange-500 bg-orange-50 text-orange-700'
                        : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                    }`}>
                    <span className="block">{opt.label}</span>
                    <span className="block text-xs font-normal mt-0.5 text-gray-500">{fmt(opt.price)}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Modificadores agrupados */}
          {loadingMods ? (
            <div className="text-center py-4 text-gray-400 text-sm">Cargando opciones...</div>
          ) : Object.keys(grouped).length > 0 ? (
            <div className="space-y-3">
              {Object.entries(grouped).map(([cat, mods]) => (
                <div key={cat}>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 capitalize">{cat}</p>
                  <div className="space-y-1">
                    {mods.map(mod => {
                      const selected = u.modifierIds.includes(mod.id);
                      return (
                        <button key={mod.id} type="button"
                          onClick={() => toggleModifier(mod.id)}
                          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl border transition-all ${
                            selected
                              ? 'border-orange-300 bg-orange-50'
                              : 'border-gray-200 bg-gray-50 hover:border-gray-300'
                          }`}>
                          <div className="flex items-center gap-2.5">
                            <div className={`w-4 h-4 rounded-md border-2 flex items-center justify-center transition-colors shrink-0 ${
                              selected ? 'bg-orange-500 border-orange-500' : 'border-gray-300'
                            }`}>
                              {selected && (
                                <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                            </div>
                            <span className={`text-sm ${selected ? 'font-semibold text-gray-800' : 'text-gray-700'}`}>
                              {mod.name}
                            </span>
                          </div>
                          {mod.priceCentsDelta > 0 && (
                            <span className="text-xs text-gray-500 shrink-0">+{fmt(mod.priceCentsDelta)}</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          {/* Nota del ítem */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              {sameConfig || qty === 1 ? 'Nota' : `Nota — Ítem ${activeTab + 1}`}
              <span className="text-gray-400 font-normal ml-1">(opcional)</span>
            </label>
            <input
              type="text"
              value={u.note}
              onChange={e => updateUnit({ note: e.target.value }, sameConfig ? undefined : activeTab)}
              placeholder="Sin cebolla, sin TACC..."
              className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-4 shrink-0">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-xs text-gray-500">
                {qty > 1 ? `${qty} unidades` : '1 unidad'}
                {twoForOneActive && qty >= 2 && sameConfig && (
                  <span className="ml-1 text-purple-600 font-medium">· 2x1 aplicado</span>
                )}
              </p>
              <p className="text-lg font-bold text-gray-900">{fmt(lineTotal())}</p>
            </div>
            <div className="flex gap-2">
              <button onClick={onClose}
                className="px-4 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-semibold text-sm hover:bg-gray-50 transition-colors">
                Cancelar
              </button>
              <button onClick={handleConfirm}
                className="px-6 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-semibold text-sm transition-colors">
                {existing ? 'Guardar' : 'Agregar'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── WaiterOrderModal principal ─────────────────────────────────────────────────

interface WaiterOrderModalProps {
  table: Table;
  session: TableSession;
  token: string;
  onClose: () => void;
  onSuccess: () => void;
}

const WaiterOrderModal: React.FC<WaiterOrderModalProps> = ({ table, session, token, onClose, onSuccess }) => {
  const { showToast } = useToast();
  const { products, categories, twoForOneConfig, activePromotion } = useCatalog();
  const [stagedItems, setStagedItems] = useState<StagedItem[]>([]);
  const [configuringProduct, setConfiguringProduct] = useState<import('../../types').Products | null>(null);
  const [editingItem, setEditingItem] = useState<StagedItem | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [orderNote, setOrderNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filtered = selectedCategory ? products.filter(p => p.categoryId === selectedCategory) : products;

  const is2x1 = (productId: string): boolean => {
    if (!twoForOneConfig?.active) return false;
    if (twoForOneConfig.productIds.length === 0) return true;
    return twoForOneConfig.productIds.includes(parseInt(productId));
  };

  const unitPriceOf = (u: UnitConfig, p: import('../../types').Products, mods: ModifierOption[]): number => {
    const base = (u.isDouble && p.doublePriceCents > 0) ? p.doublePriceCents : p.priceCents;
    const modDelta = u.modifierIds.reduce((s, id) => s + (mods.find(o => o.id === id)?.priceCentsDelta ?? 0), 0);
    return base + modDelta;
  };

  const getItemLineTotal = (staged: StagedItem): number => {
    const { product, units, sameConfig, modifierOptions } = staged;
    const qty = units.length;
    if (sameConfig) {
      const up = unitPriceOf(units[0], product, modifierOptions);
      if (is2x1(product.id) && qty >= 2) return up * (qty - Math.floor(qty / 2));
      return up * qty;
    }
    return units.reduce((s, u) => s + unitPriceOf(u, product, modifierOptions), 0);
  };

  const getItemSubtotal = (staged: StagedItem): number =>
    staged.units.reduce((s, u) => s + unitPriceOf(u, staged.product, staged.modifierOptions), 0);

  const totalCents = stagedItems.reduce((s, item) => s + getItemLineTotal(item), 0);
  const subtotalCents = stagedItems.reduce((s, item) => s + getItemSubtotal(item), 0);
  const discountCents = subtotalCents - totalCents;
  const totalQty = stagedItems.reduce((s, item) => s + item.units.length, 0);

  const fmt = (c: number) => `$${Math.round(c).toLocaleString('es-AR')}`;

  const handleConfirm = (item: StagedItem) => {
    setStagedItems(prev => {
      const idx = prev.findIndex(s => s.key === item.key);
      if (idx >= 0) return prev.map((s, i) => i === idx ? item : s);
      return [...prev, item];
    });
    setConfiguringProduct(null);
    setEditingItem(null);
  };

  const removeItem = (key: string) => setStagedItems(prev => prev.filter(s => s.key !== key));

  const handleSubmit = async () => {
    if (stagedItems.length === 0) return;
    setIsSubmitting(true);
    try {
      const items: any[] = [];
      for (const staged of stagedItems) {
        const { product, units, sameConfig, modifierOptions } = staged;
        if (sameConfig) {
          const u = units[0];
          const qty = units.length;
          const unitPrice = unitPriceOf(u, product, modifierOptions);
          const modDelta = u.modifierIds.reduce((s, id) => s + (modifierOptions.find(o => o.id === id)?.priceCentsDelta ?? 0), 0);
          let lineCost = unitPrice * qty;
          if (is2x1(product.id) && qty >= 2) lineCost = unitPrice * (qty - Math.floor(qty / 2));
          const selectedMods = modifierOptions.filter(m => u.modifierIds.includes(m.id));
          const modSnapshot = selectedMods.length > 0
            ? JSON.stringify(selectedMods.map(m => ({ id: m.id, name: m.name, priceCentsDelta: m.priceCentsDelta })))
            : null;
          let nameSuffix = (u.isDouble && product.doublePriceCents > 0) ? ' (Doble)' : '';
          if (u.note) nameSuffix += ` [${u.note}]`;
          items.push({
            productId: parseInt(product.id),
            nameSnapshot: product.name + nameSuffix,
            qty,
            unitPriceCents: unitPrice,
            lineTotalCents: lineCost,
            modifiersTotalCents: modDelta,
            modifiersSnapshot: modSnapshot,
          });
        } else {
          for (const u of units) {
            const unitPrice = unitPriceOf(u, product, modifierOptions);
            const modDelta = u.modifierIds.reduce((s, id) => s + (modifierOptions.find(o => o.id === id)?.priceCentsDelta ?? 0), 0);
            const selectedMods = modifierOptions.filter(m => u.modifierIds.includes(m.id));
            const modSnapshot = selectedMods.length > 0
              ? JSON.stringify(selectedMods.map(m => ({ id: m.id, name: m.name, priceCentsDelta: m.priceCentsDelta })))
              : null;
            let nameSuffix = (u.isDouble && product.doublePriceCents > 0) ? ' (Doble)' : '';
            if (u.note) nameSuffix += ` [${u.note}]`;
            items.push({
              productId: parseInt(product.id),
              nameSnapshot: product.name + nameSuffix,
              qty: 1,
              unitPriceCents: unitPrice,
              lineTotalCents: unitPrice,
              modifiersTotalCents: modDelta,
              modifiersSnapshot: modSnapshot,
            });
          }
        }
      }
      await apiFetch(`${apiUrl()}/api/admin/table-sessions/${session.id}/orders`, token, {
        method: 'POST',
        body: JSON.stringify({ items, note: orderNote || null, discountCents }),
      });
      showToast('Pedido enviado a cocina', 'success');
      onSuccess();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {/* ItemConfigModal (z-60, rendered on top of z-50 main modal) */}
      {(configuringProduct || editingItem) && (
        <ItemConfigModal
          product={(editingItem?.product ?? configuringProduct)!}
          twoForOneActive={is2x1((editingItem?.product ?? configuringProduct)!.id)}
          existing={editingItem ?? undefined}
          apiBaseUrl={apiUrl()}
          onConfirm={handleConfirm}
          onClose={() => { setConfiguringProduct(null); setEditingItem(null); }}
        />
      )}

      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>

          {/* Header */}
          <div className="bg-gradient-to-r from-orange-500 to-amber-500 rounded-t-2xl p-5 text-white shrink-0">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-100 text-xs font-medium uppercase tracking-wider">Cargar pedido</p>
                <h2 className="text-xl font-bold mt-0.5">{table.name} · {session.guestCount} comensales</h2>
              </div>
              <button onClick={onClose} className="bg-white/20 hover:bg-white/30 rounded-xl p-2 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Banners de promo activa */}
          {(activePromotion || twoForOneConfig?.active) && (
            <div className="px-4 pt-3 pb-0 space-y-1.5 shrink-0">
              {activePromotion && (
                <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-3 py-2 text-sm text-green-800">
                  <span className="text-base">🎉</span>
                  <span className="font-semibold">{activePromotion.discountPercent}% OFF</span>
                  <span className="text-green-600">— {activePromotion.message}</span>
                </div>
              )}
              {twoForOneConfig?.active && (
                <div className="flex items-center gap-2 bg-purple-50 border border-purple-200 rounded-xl px-3 py-2 text-sm text-purple-800">
                  <span>2️⃣</span>
                  <span className="font-semibold">2x1 activo</span>
                  <span className="text-purple-600">
                    {twoForOneConfig.productIds.length === 0
                      ? '— Todos los productos'
                      : `— ${twoForOneConfig.productIds.length} producto${twoForOneConfig.productIds.length !== 1 ? 's' : ''}`}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Tabs de categoría */}
          <div className="border-b border-gray-200 px-4 py-3 flex gap-2 overflow-x-auto shrink-0">
            <button onClick={() => setSelectedCategory(null)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${selectedCategory === null ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              Todos
            </button>
            {categories.map(cat => (
              <button key={cat.id} onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${selectedCategory === cat.id ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                {cat.name}
              </button>
            ))}
          </div>

          {/* Scrollable body: product list + staged cart */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2">

            {/* Product list */}
            {filtered.length === 0 && <p className="text-center text-gray-400 py-8">Sin productos en esta categoría</p>}
            {filtered.map(product => {
              const stagedQty = stagedItems
                .filter(s => s.product.id === product.id)
                .reduce((s, i) => s + i.units.length, 0);
              const has2x1 = is2x1(product.id);
              const hasDiscount = !!product.originalPriceCents;

              return (
                <div key={product.id} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 border transition-all ${
                  stagedQty > 0 ? 'bg-orange-50 border-orange-200' : 'bg-gray-50 border-gray-100 hover:border-gray-200'
                }`}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="font-medium text-gray-800 text-sm truncate">{product.name}</p>
                      {has2x1 && <span className="shrink-0 px-1.5 py-0.5 bg-purple-100 text-purple-700 text-xs font-bold rounded-md">2x1</span>}
                      {hasDiscount && <span className="shrink-0 px-1.5 py-0.5 bg-green-100 text-green-700 text-xs font-bold rounded-md">OFERTA</span>}
                    </div>
                    <div className="flex items-baseline gap-1.5 mt-0.5">
                      <span className="text-sm font-semibold text-gray-800">{fmt(product.priceCents)}</span>
                      {hasDiscount && product.originalPriceCents && (
                        <span className="text-xs text-gray-400 line-through">{fmt(product.originalPriceCents)}</span>
                      )}
                      {product.doublePriceCents > 0 && (
                        <span className="text-xs text-gray-400">· Doble {fmt(product.doublePriceCents)}</span>
                      )}
                    </div>
                    {stagedQty > 0 && (
                      <p className="text-xs text-orange-600 font-medium mt-0.5">{stagedQty} en pedido</p>
                    )}
                  </div>
                  <button
                    onClick={() => setConfiguringProduct(product)}
                    className="w-8 h-8 rounded-full bg-orange-500 hover:bg-orange-600 text-white font-bold flex items-center justify-center transition-colors text-lg shrink-0">
                    +
                  </button>
                </div>
              );
            })}

            {/* Staged cart */}
            {stagedItems.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Pedido actual</p>
                <div className="space-y-2">
                  {stagedItems.map(item => {
                    const lineTotal = getItemLineTotal(item);
                    const lineSubtotal = getItemSubtotal(item);
                    const lineDiff = lineSubtotal - lineTotal;
                    const qty = item.units.length;
                    const u0 = item.units[0];
                    const isDouble = item.sameConfig && u0.isDouble && item.product.doublePriceCents > 0;
                    const mods0 = item.sameConfig
                      ? item.modifierOptions.filter(m => u0.modifierIds.includes(m.id))
                      : [];

                    return (
                      <div key={item.key} className="flex items-start gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2.5 shadow-sm">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline gap-1.5">
                            <span className="font-semibold text-gray-800 text-sm">{qty}×</span>
                            <span className="font-medium text-gray-800 text-sm truncate">{item.product.name}</span>
                            {isDouble && <span className="text-xs text-orange-600 font-medium shrink-0">Doble</span>}
                          </div>
                          {item.sameConfig && mods0.length > 0 && (
                            <p className="text-xs text-gray-500 mt-0.5 truncate">{mods0.map(m => m.name).join(', ')}</p>
                          )}
                          {item.sameConfig && u0.note && (
                            <p className="text-xs text-gray-400 mt-0.5 italic truncate">{u0.note}</p>
                          )}
                          {!item.sameConfig && (
                            <p className="text-xs text-indigo-600 mt-0.5">Configuración individual</p>
                          )}
                          <div className="flex items-baseline gap-1.5 mt-1">
                            {lineDiff > 0 && <span className="text-xs text-gray-400 line-through">{fmt(lineSubtotal)}</span>}
                            <span className={`text-sm font-bold ${lineDiff > 0 ? 'text-green-700' : 'text-gray-800'}`}>{fmt(lineTotal)}</span>
                            {lineDiff > 0 && <span className="text-xs text-purple-600">2x1</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button onClick={() => setEditingItem(item)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button onClick={() => removeItem(item.key)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200 p-4 space-y-3 shrink-0">
            <input type="text" value={orderNote} onChange={e => setOrderNote(e.target.value)}
              placeholder="Nota general del pedido (opcional)"
              className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition" />

            {stagedItems.length > 0 && discountCents > 0 && (
              <div className="bg-purple-50 border border-purple-100 rounded-xl px-4 py-2.5 flex items-center justify-between text-sm">
                <span className="text-purple-700 font-medium">Descuento 2x1</span>
                <span className="text-purple-700 font-bold">−{fmt(discountCents)}</span>
              </div>
            )}

            <div className="flex items-center gap-3">
              <div className="flex-1">
                {stagedItems.length > 0 ? (
                  <div>
                    {discountCents > 0 && (
                      <p className="text-xs text-gray-400 line-through">subtotal {fmt(subtotalCents)}</p>
                    )}
                    <p className="text-sm text-gray-600">
                      <span className="font-semibold text-gray-800">{totalQty}</span> ítems ·{' '}
                      <span className="font-bold text-green-700">{fmt(totalCents)}</span>
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-gray-400">Tocá + en un producto para agregarlo</p>
                )}
              </div>
              <button onClick={onClose}
                className="px-4 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-semibold text-sm hover:bg-gray-50 transition-colors">
                Cancelar
              </button>
              <button onClick={handleSubmit} disabled={stagedItems.length === 0 || isSubmitting}
                className="px-6 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-semibold text-sm disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-2">
                {isSubmitting ? (
                  <><svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>Enviando...</>
                ) : 'Enviar a cocina'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

// ─── Modal: Ver Pedidos de Mesa ───────────────────────────────────────────────

interface OrdersViewModalProps {
  table: Table;
  session: TableSession;
  onClose: () => void;
}

const OrdersViewModal: React.FC<OrdersViewModalProps> = ({ table, session, onClose }) => {
  const fmt = (v: number) => `$${Math.round(v).toLocaleString('es-AR')}`;

  // Consolidar todos los items de todos los pedidos agrupados por nombre + modificadores
  const allItems = (session.orders ?? []).flatMap(o => o.items ?? []);

  interface ConsolidatedItem {
    key: string;
    name: string;
    modifierLabel: string;
    qty: number;
    unitPriceCents: number;
    totalCents: number;
  }

  const consolidated: ConsolidatedItem[] = [];
  for (const item of allItems) {
    let modifierLabel = '';
    if (item.modifiersSnapshot) {
      try {
        const mods = JSON.parse(item.modifiersSnapshot);
        const parts: string[] = [];
        if (mods.size) parts.push(mods.size === 'doble' ? 'Doble' : 'Simple');
        if (mods.complementos?.length) parts.push(...mods.complementos.map((m: any) => m.name));
        if (mods.aderezos?.length) parts.push(...mods.aderezos.map((m: any) => m.name));
        if (mods.extras?.length) parts.push(...mods.extras.map((m: any) => m.name));
        if (mods.bebidas) parts.push(mods.bebidas.name);
        if (mods.notes) parts.push(`"${mods.notes}"`);
        modifierLabel = parts.join(' · ');
      } catch { /* ignore */ }
    }
    const key = `${item.nameSnapshot}||${modifierLabel}`;
    const existing = consolidated.find(c => c.key === key);
    if (existing) {
      existing.qty += item.qty;
      existing.totalCents += item.lineTotalCents;
    } else {
      consolidated.push({
        key,
        name: item.nameSnapshot,
        modifierLabel,
        qty: item.qty,
        unitPriceCents: item.unitPriceCents,
        totalCents: item.lineTotalCents,
      });
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[85vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-500 to-orange-400 rounded-t-2xl p-5 text-white flex items-center justify-between shrink-0">
          <div>
            <p className="text-orange-100 text-xs font-medium uppercase tracking-wider">Consumido en mesa</p>
            <h2 className="text-xl font-bold mt-0.5">{table.name}</h2>
            <p className="text-orange-100 text-sm mt-1">
              {session.guestCount} comensal{session.guestCount !== 1 ? 'es' : ''}
              {session.customerName ? ` · ${session.customerName}` : ''}
            </p>
          </div>
          <button onClick={onClose} className="bg-white/20 hover:bg-white/30 rounded-xl p-2 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Lista de productos */}
        <div className="overflow-y-auto flex-1">
          {consolidated.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-3">🍽️</div>
              <p className="text-gray-500">Todavía no hay productos pedidos</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {consolidated.map(item => (
                <div key={item.key} className="px-5 py-3 flex items-center gap-3">
                  <span className="shrink-0 w-8 h-8 bg-orange-100 text-orange-700 rounded-full flex items-center justify-center text-sm font-bold">
                    {item.qty}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 leading-tight">{item.name}</p>
                    {item.modifierLabel && (
                      <p className="text-xs text-gray-400 mt-0.5 truncate">{item.modifierLabel}</p>
                    )}
                  </div>
                  <span className="text-sm font-bold text-gray-700 shrink-0">{fmt(item.totalCents)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer total */}
        {consolidated.length > 0 && (
          <div className="shrink-0 border-t border-gray-200 px-5 py-4 flex items-center justify-between bg-gray-50 rounded-b-2xl">
            <span className="text-sm font-semibold text-gray-600">Total acumulado</span>
            <span className="text-xl font-bold text-green-700">{fmt(session.totalCents)}</span>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Tarjeta de Mesa ──────────────────────────────────────────────────────────

interface TableCardProps {
  table: Table;
  session?: TableSession;
  token: string;
  onOpen: (table: Table) => void;
  onPayment: (table: Table, session: TableSession) => void;
  onQR: (table: Table) => void;
  onAddOrder: (table: Table, session: TableSession) => void;
  onViewOrders: (table: Table, session: TableSession) => void;
  onEdit: (table: Table) => void;
  onReserve: (table: Table) => void;
  onRefresh: () => void;
}

const TableCard: React.FC<TableCardProps> = ({
  table, session, token, onOpen, onPayment, onQR, onAddOrder, onViewOrders, onEdit, onReserve, onRefresh,
}) => {
  const { showToast } = useToast();
  const [elapsed, setElapsed] = useState('');
  const [isActioning, setIsActioning] = useState(false);

  useEffect(() => {
    if (!session) return;
    const update = () => {
      const ms = Date.now() - new Date(session.openedAt).getTime();
      const mins = Math.floor(ms / 60000);
      setElapsed(mins < 60 ? `${mins}m` : `${Math.floor(mins / 60)}h ${mins % 60}m`);
    };
    update();
    const interval = setInterval(update, 30000);
    return () => clearInterval(interval);
  }, [session]);

  const handleRelease = async () => {
    setIsActioning(true);
    try {
      await apiFetch(`${apiUrl()}/api/admin/tables/${table.id}/release`, token, { method: 'POST' });
      showToast(`${table.name} liberada`, 'success');
      onRefresh();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setIsActioning(false);
    }
  };

  const handleOutOfService = async () => {
    setIsActioning(true);
    try {
      await apiFetch(`${apiUrl()}/api/admin/tables/${table.id}/out-of-service`, token, { method: 'POST' });
      showToast(`${table.name} fuera de servicio`, 'success');
      onRefresh();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setIsActioning(false);
    }
  };

  const handleRequestBill = async () => {
    setIsActioning(true);
    try {
      await apiFetch(`${apiUrl()}/api/admin/tables/${table.id}/request-bill`, token, { method: 'POST' });
      showToast(`Cuenta solicitada para ${table.name}`, 'success');
      onRefresh();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setIsActioning(false);
    }
  };

  const statusConfig = {
    AVAILABLE:       { border: 'border-gray-200',  dot: 'bg-green-500',  dotRing: 'ring-green-100',  label: 'Disponible',        labelColor: 'text-green-700 bg-green-50'   },
    OCCUPIED:        { border: 'border-orange-300', dot: 'bg-orange-500', dotRing: 'ring-orange-100', label: 'Ocupada',           labelColor: 'text-orange-700 bg-orange-50' },
    RESERVED:        { border: 'border-blue-300',   dot: 'bg-blue-500',  dotRing: 'ring-blue-100',   label: 'Reservada',         labelColor: 'text-blue-700 bg-blue-50'    },
    OUT_OF_SERVICE:  { border: 'border-gray-200',   dot: 'bg-gray-400',  dotRing: 'ring-gray-100',   label: 'Fuera de servicio', labelColor: 'text-gray-500 bg-gray-100'   },
    BILL_REQUESTED:  { border: 'border-yellow-400', dot: 'bg-yellow-500', dotRing: 'ring-yellow-100', label: 'Cuenta solicitada', labelColor: 'text-yellow-700 bg-yellow-50' },
  };

  const cfg = statusConfig[table.status as keyof typeof statusConfig] ?? statusConfig.AVAILABLE;
  const inactive = !table.isActive;

  return (
    <div className={`bg-white ${cfg.border} border-2 rounded-2xl shadow-sm hover:shadow-md transition-all duration-200 flex flex-col ${inactive ? 'opacity-60' : ''}`}>
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-gray-100">
        <div className="flex items-center gap-2.5">
          <span className={`w-2.5 h-2.5 rounded-full ${cfg.dot} ring-4 ${cfg.dotRing} ${(table.status === 'OCCUPIED' || table.status === 'BILL_REQUESTED') ? 'animate-pulse' : ''}`} />
          <h3 className="text-lg font-bold text-gray-900">{table.name}</h3>
          {inactive && <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Inactiva</span>}
        </div>
        <div className="flex items-center gap-1.5">
          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${cfg.labelColor}`}>{cfg.label}</span>
          <button onClick={() => onEdit(table)} title="Editar"
            className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-3 flex-1">
        <div className="flex items-center gap-1.5 text-sm text-gray-500 mb-3">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span>Capacidad: <strong className="text-gray-700">{table.capacity}</strong></span>
          <span className="text-gray-300 mx-1">·</span>
          <span>Orden: <strong className="text-gray-700">#{table.sortOrder}</strong></span>
        </div>

        {/* OCCUPIED / BILL_REQUESTED: session info */}
        {session && (table.status === 'OCCUPIED' || table.status === 'BILL_REQUESTED') && (
          <div className={`border rounded-xl p-3 space-y-2 ${table.status === 'BILL_REQUESTED' ? 'bg-yellow-50 border-yellow-100' : 'bg-orange-50 border-orange-100'}`}>
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-1.5 text-gray-600">
                <svg className="w-4 h-4 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span>{session.guestCount} comensales</span>
              </div>
              <div className="flex items-center gap-1 text-gray-500 text-xs">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{elapsed}</span>
              </div>
            </div>
            {session.assignedWaiterName && (
              <p className="text-xs text-blue-700 font-semibold truncate flex items-center gap-1">
                <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                {session.assignedWaiterName}
              </p>
            )}
            {session.customerName && (
              <p className="text-xs text-gray-600 truncate">
                <span className="font-medium">Cliente:</span> {session.customerName}
              </p>
            )}
            {session.totalCents > 0 && (
              <div className="flex items-center justify-between pt-1 border-t border-orange-100">
                <span className="text-xs text-gray-500">Total acumulado</span>
                <span className="font-bold text-green-700 text-sm">${Math.round(session.totalCents).toLocaleString('es-AR')}</span>
              </div>
            )}
            {(session.orders?.length ?? 0) > 0 && (
              <button
                onClick={() => onViewOrders(table, session)}
                className="w-full mt-1 py-1.5 rounded-lg bg-white border border-orange-200 text-orange-700 text-xs font-semibold hover:bg-orange-50 transition-colors flex items-center justify-center gap-1.5"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                Ver {session.orders!.length} pedido{session.orders!.length !== 1 ? 's' : ''}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="px-4 pb-4 pt-2 space-y-2">
        {table.status === 'AVAILABLE' && table.isActive && (
          <>
            <button onClick={() => onOpen(table)}
              className="w-full py-2.5 rounded-xl bg-green-600 hover:bg-green-700 text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Abrir Mesa
            </button>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => onReserve(table)}
                className="py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold text-sm transition-colors flex items-center justify-center gap-1.5">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Reservar
              </button>
              <button onClick={handleOutOfService} disabled={isActioning}
                className="py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 font-semibold text-sm transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                </svg>
                Deshabilitar
              </button>
            </div>
          </>
        )}

        {table.status === 'OCCUPIED' && session && (
          <>
            <button onClick={() => onAddOrder(table, session)}
              className="w-full py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
              Cargar pedido
            </button>
            <button onClick={handleRequestBill} disabled={isActioning}
              className="w-full py-2.5 rounded-xl bg-yellow-400 hover:bg-yellow-500 text-yellow-900 font-semibold text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              {isActioning ? 'Procesando...' : 'Solicitar cuenta'}
            </button>
            <button onClick={() => onPayment(table, session)}
              className="w-full py-2.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 font-semibold text-sm transition-colors flex items-center justify-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              Cobrar Mesa
            </button>
          </>
        )}

        {table.status === 'BILL_REQUESTED' && session && (
          <>
            <button onClick={() => onAddOrder(table, session)}
              className="w-full py-2.5 rounded-xl bg-yellow-100 hover:bg-yellow-200 text-yellow-800 font-semibold text-sm transition-colors flex items-center justify-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
              Cargar pedido
            </button>
            <button onClick={() => onPayment(table, session)}
              className="w-full py-2.5 rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold text-sm transition-colors flex items-center justify-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              Cobrar y Cerrar
            </button>
          </>
        )}

        {table.status === 'RESERVED' && (
          <>
            <button onClick={() => onOpen(table)}
              className="w-full py-2.5 rounded-xl bg-green-600 hover:bg-green-700 text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Abrir Mesa
            </button>
            <button onClick={handleRelease} disabled={isActioning}
              className="w-full py-2.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {isActioning ? 'Liberando...' : 'Liberar reserva'}
            </button>
          </>
        )}

        {table.status === 'OUT_OF_SERVICE' && (
          <button onClick={handleRelease} disabled={isActioning}
            className="w-full py-2.5 rounded-xl bg-green-50 hover:bg-green-100 text-green-700 font-semibold text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {isActioning ? 'Habilitando...' : 'Habilitar mesa'}
          </button>
        )}

        {/* QR button - always visible */}
        <button onClick={() => onQR(table)}
          className="w-full py-2 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-600 font-medium text-sm transition-colors flex items-center justify-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
          </svg>
          Ver QR
        </button>
      </div>
    </div>
  );
};

// ─── Modal: Cobrar y Cerrar Mesa ─────────────────────────────────────────────

interface PaymentModalProps {
  table: Table;
  session: TableSession;
  token: string;
  onClose: () => void;
  onSuccess: (paymentMethod: string, tipCents: number) => Promise<void>;
}

const PAYMENT_METHODS = [
  { id: 'CASH',     label: 'Efectivo',      icon: 'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z' },
  { id: 'CARD',     label: 'Tarjeta',       icon: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z' },
  { id: 'TRANSFER', label: 'Transferencia', icon: 'M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4' },
] as const;

const PaymentModal: React.FC<PaymentModalProps> = ({ table, session, onClose, onSuccess }) => {
  const [method, setMethod] = useState<'CASH' | 'CARD' | 'TRANSFER'>('CASH');
  const [tipPercent, setTipPercent] = useState<number | 'custom'>(0);
  const [customTipAmount, setCustomTipAmount] = useState('');
  const [receivedAmount, setReceivedAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const subtotalCents = session.orders?.reduce((sum, o) => sum + o.totalCents, 0) ?? session.totalCents;

  const tipCents = (() => {
    if (tipPercent === 'custom') {
      const val = parseFloat(customTipAmount.replace(',', '.'));
      return isNaN(val) ? 0 : Math.round(val);  // user enters pesos directly
    }
    return Math.round(subtotalCents * (tipPercent as number) / 100);
  })();

  const totalCents = subtotalCents + tipCents;
  const receivedCents = Math.round(parseFloat(receivedAmount.replace(',', '.') || '0'));  // pesos, no division needed
  const changeCents = receivedCents - totalCents;

  const elapsedMinutes = Math.floor((Date.now() - new Date(session.openedAt).getTime()) / 60000);
  const elapsedLabel = elapsedMinutes < 60 ? `${elapsedMinutes} min` : `${Math.floor(elapsedMinutes / 60)}h ${elapsedMinutes % 60}m`;
  const orderCount = session.orders?.length ?? 0;

  const fmt = (v: number) => `$${Math.round(v).toLocaleString('es-AR')}`;

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await onSuccess(method, tipCents);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="bg-gradient-to-r from-yellow-500 to-amber-500 rounded-t-2xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-yellow-100 text-sm font-medium uppercase tracking-wider">Cobrar y cerrar</p>
              <h2 className="text-2xl font-bold mt-1">{table.name}</h2>
            </div>
            <button onClick={onClose} className="bg-white/20 hover:bg-white/30 rounded-xl p-2 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {/* Resumen */}
          <div className="grid grid-cols-4 gap-2 text-center">
            {[
              { val: session.guestCount, lbl: 'Comensales' },
              { val: orderCount, lbl: 'Pedidos' },
              { val: elapsedLabel, lbl: 'Tiempo' },
              { val: fmt(subtotalCents), lbl: 'Subtotal' },
            ].map(({ val, lbl }) => (
              <div key={lbl} className="bg-gray-50 rounded-xl p-2.5 border border-gray-100">
                <p className="text-base font-bold text-gray-800">{val}</p>
                <p className="text-xs text-gray-500 mt-0.5">{lbl}</p>
              </div>
            ))}
          </div>

          {/* Método de pago */}
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-2">Método de pago</p>
            <div className="grid grid-cols-3 gap-2">
              {PAYMENT_METHODS.map(pm => (
                <button
                  key={pm.id}
                  type="button"
                  onClick={() => setMethod(pm.id)}
                  className={`py-3 rounded-xl border-2 font-semibold text-sm flex flex-col items-center gap-1.5 transition-all ${
                    method === pm.id
                      ? 'border-green-500 bg-green-50 text-green-700'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={pm.icon} />
                  </svg>
                  {pm.label}
                </button>
              ))}
            </div>
          </div>

          {/* Propina */}
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-2">Propina (opcional)</p>
            <div className="grid grid-cols-5 gap-1.5">
              {([0, 10, 15, 20] as number[]).map(p => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setTipPercent(p)}
                  className={`py-2 rounded-lg text-sm font-semibold border transition-all ${
                    tipPercent === p
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                  }`}
                >
                  {p === 0 ? 'Sin' : `${p}%`}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setTipPercent('custom')}
                className={`py-2 rounded-lg text-sm font-semibold border transition-all ${
                  tipPercent === 'custom'
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                }`}
              >
                Otro
              </button>
            </div>
            {tipPercent === 'custom' && (
              <div className="mt-2">
                <input
                  type="number"
                  value={customTipAmount}
                  onChange={e => setCustomTipAmount(e.target.value)}
                  placeholder="Monto de propina ($)"
                  min="0"
                  step="1"
                  className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition text-sm"
                />
              </div>
            )}
            {tipCents > 0 && (
              <p className="text-xs text-indigo-600 mt-1.5 font-medium">Propina: {fmt(tipCents)}</p>
            )}
          </div>

          {/* Monto recibido (solo efectivo) */}
          {method === 'CASH' && (
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-2">Monto recibido</p>
              <input
                type="number"
                value={receivedAmount}
                onChange={e => setReceivedAmount(e.target.value)}
                placeholder="Ingresá el monto recibido"
                min="0"
                step="1"
                className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition text-sm"
              />
              {receivedCents > 0 && (
                <div className={`mt-2 px-4 py-2.5 rounded-xl text-sm font-semibold ${
                  changeCents >= 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                }`}>
                  {changeCents >= 0
                    ? `Vuelto: ${fmt(changeCents)}`
                    : `Faltan: ${fmt(Math.abs(changeCents))}`}
                </div>
              )}
            </div>
          )}

          {/* Total final */}
          <div className="bg-green-50 border-2 border-green-200 rounded-2xl p-4 flex items-center justify-between">
            <span className="font-bold text-gray-700 text-lg">Total final</span>
            <span className="text-3xl font-extrabold text-green-700">{fmt(totalCents)}</span>
          </div>

          {/* Botones */}
          <div className="flex gap-3">
            <button type="button" onClick={onClose} disabled={isSubmitting}
              className="flex-1 py-3 rounded-xl border border-gray-300 text-gray-700 font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50">
              Cancelar
            </button>
            <button type="button" onClick={handleSubmit} disabled={isSubmitting}
              className="flex-1 py-3.5 rounded-xl bg-green-600 text-white font-bold hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
              {isSubmitting ? (
                <><svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>Procesando...</>
              ) : 'Cobrar y Cerrar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── TableManager principal ───────────────────────────────────────────────────

const TableManager: React.FC = () => {
  const { token } = useAuth();
  const { showToast } = useToast();
  const [tables, setTables] = useState<Table[]>([]);
  const [sessions, setSessions] = useState<Record<number, TableSession>>({});
  const [isLoading, setIsLoading] = useState(true);

  type Modal =
    | { type: 'create' }
    | { type: 'edit'; table: Table }
    | { type: 'open'; table: Table }
    | { type: 'payment'; table: Table; session: TableSession }
    | { type: 'reserve'; table: Table }
    | { type: 'order'; table: Table; session: TableSession }
    | { type: 'viewOrders'; table: Table; session: TableSession }
    | { type: 'qr'; table: Table };

  const [modal, setModal] = useState<Modal | null>(null);
  const closeModal = () => setModal(null);

  const defaultBranchId = tables[0]?.branchId ?? 1;

  const fetchTables = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const data: Table[] = await apiFetch(`${apiUrl()}/api/admin/tables`, token);
      setTables(data);

      const sessionsMap: Record<number, TableSession> = {};
      await Promise.all(
        data.filter(t => t.status === 'OCCUPIED' || t.status === 'BILL_REQUESTED').map(async t => {
          try {
            const s = await apiFetch(`${apiUrl()}/api/admin/tables/${t.id}/active-session`, token);
            if (s) sessionsMap[t.id] = s;
          } catch { /* ignore */ }
        })
      );
      setSessions(sessionsMap);
    } catch {
      showToast('Error al cargar mesas', 'error');
    } finally {
      setIsLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => { fetchTables(); }, [fetchTables]);

  const handleOpenSession = async (guestCount: number, customerName: string, notes: string, waiterId: number | null) => {
    const m = modal as { type: 'open'; table: Table };
    if (!token) return;
    await apiFetch(`${apiUrl()}/api/admin/tables/${m.table.id}/open-session`, token, {
      method: 'POST',
      body: JSON.stringify({ guestCount, customerName: customerName || null, notes: notes || null, waiterId: waiterId || null }),
    });
    showToast(`${m.table.name} abierta con ${guestCount} comensales`, 'success');
    closeModal();
    fetchTables();
  };

  const handlePaySession = async (paymentMethod: string, tipCents: number) => {
    const m = modal as { type: 'payment'; table: Table; session: TableSession };
    if (!token) return;
    await apiFetch(`${apiUrl()}/api/admin/table-sessions/${m.session.id}/close`, token, {
      method: 'POST',
      body: JSON.stringify({ paymentMethod, tipCents }),
    });
    showToast(`${m.table.name} cobrada y cerrada`, 'success');
    closeModal();
    fetchTables();
  };

  const stats = {
    available:     tables.filter(t => t.status === 'AVAILABLE' && t.isActive).length,
    occupied:      tables.filter(t => t.status === 'OCCUPIED').length,
    billRequested: tables.filter(t => t.status === 'BILL_REQUESTED').length,
    reserved:      tables.filter(t => t.status === 'RESERVED').length,
    total:         tables.filter(t => t.isActive).length,
  };

  return (
    <div className="p-4 md:p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Gestión de Mesas</h1>
          <p className="text-gray-500 mt-1 text-sm">Creá, editá y administrá las mesas del local</p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchTables}
            className="flex items-center gap-2 bg-white border border-gray-300 text-gray-600 px-4 py-2 rounded-xl hover:bg-gray-50 transition-colors text-sm font-medium shadow-sm">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Actualizar
          </button>
          <button onClick={() => setModal({ type: 'create' })}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl transition-colors text-sm font-semibold shadow-sm">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nueva Mesa
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Disponibles', value: stats.available, color: 'text-green-600',  bg: 'bg-green-50',  border: 'border-green-200'  },
          { label: 'Ocupadas',    value: stats.occupied,  color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200' },
          { label: 'Reservadas',  value: stats.reserved,  color: 'text-blue-600',   bg: 'bg-blue-50',   border: 'border-blue-200'   },
          { label: 'Total activas', value: stats.total,   color: 'text-gray-700',   bg: 'bg-gray-50',   border: 'border-gray-200'   },
        ].map(s => (
          <div key={s.label} className={`${s.bg} ${s.border} border rounded-2xl p-4 shadow-sm`}>
            <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-gray-500 mt-1 font-medium">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Table grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => <div key={i} className="bg-gray-100 rounded-2xl h-56 animate-pulse" />)}
        </div>
      ) : tables.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-200 shadow-sm">
          <div className="text-5xl mb-4">🪑</div>
          <p className="text-gray-700 font-semibold text-lg">No hay mesas configuradas</p>
          <p className="text-gray-400 text-sm mt-1 mb-6">Creá tu primera mesa para comenzar</p>
          <button onClick={() => setModal({ type: 'create' })}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-6 py-3 rounded-xl transition-colors">
            + Crear primera mesa
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {tables.map(table => (
            <TableCard
              key={table.id}
              table={table}
              session={sessions[table.id]}
              token={token!}
              onOpen={t => setModal({ type: 'open', table: t })}
              onPayment={(t, s) => setModal({ type: 'payment', table: t, session: s })}
              onQR={t => setModal({ type: 'qr', table: t })}
              onAddOrder={(t, s) => setModal({ type: 'order', table: t, session: s })}
              onViewOrders={(t, s) => setModal({ type: 'viewOrders', table: t, session: s })}
              onEdit={t => setModal({ type: 'edit', table: t })}
              onReserve={t => setModal({ type: 'reserve', table: t })}
              onRefresh={fetchTables}
            />
          ))}
        </div>
      )}

      {/* Modales */}
      {modal?.type === 'create' && (
        <CreateTableModal
          defaultBranchId={defaultBranchId}
          token={token!}
          onSuccess={() => { closeModal(); fetchTables(); }}
          onClose={closeModal}
        />
      )}

      {modal?.type === 'edit' && (
        <EditTableModal
          table={modal.table}
          token={token!}
          onSuccess={() => { closeModal(); fetchTables(); }}
          onDeleted={() => { closeModal(); fetchTables(); }}
          onClose={closeModal}
        />
      )}

      {modal?.type === 'reserve' && (
        <ReserveTableModal
          table={modal.table}
          token={token!}
          onSuccess={() => { closeModal(); fetchTables(); }}
          onClose={closeModal}
        />
      )}

      {modal?.type === 'open' && (
        <OpenSessionModal
          table={modal.table}
          token={token!}
          onConfirm={handleOpenSession}
          onClose={closeModal}
        />
      )}

      {modal?.type === 'payment' && token && (
        <PaymentModal
          table={modal.table}
          session={modal.session}
          token={token}
          onClose={closeModal}
          onSuccess={handlePaySession}
        />
      )}

      {modal?.type === 'qr' && (
        <TableQRManager
          tableId={modal.table.id}
          tableName={modal.table.name}
          onClose={closeModal}
        />
      )}

      {modal?.type === 'order' && token && (
        <WaiterOrderModal
          table={modal.table}
          session={modal.session}
          token={token}
          onClose={closeModal}
          onSuccess={() => { closeModal(); fetchTables(); }}
        />
      )}

      {modal?.type === 'viewOrders' && (
        <OrdersViewModal
          table={modal.table}
          session={modal.session}
          onClose={closeModal}
        />
      )}
    </div>
  );
};

export default TableManager;
