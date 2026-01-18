import React, { useState, useEffect } from 'react';
import { api } from '../../services/api/apiClient';
import { useToast } from '../../contexts/ToastContext';

interface Coupon {
  id: number;
  code: string;
  type: 'PERCENT' | 'AMOUNT';
  value: number;
  minTotalCents: number | null;
  validFrom: string;
  validTo: string;
  usageLimit: number | null;
  usageCount: number;
  isActive: boolean;
}

interface CouponFormData {
  code: string;
  type: 'PERCENT' | 'AMOUNT';
  value: number;
  minTotalCents: string;
  validFrom: string;
  validTo: string;
  usageLimit: string;
  isActive: boolean;
}

const CouponManager: React.FC = () => {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const { showToast, showConfirm } = useToast();

  const emptyForm: CouponFormData = {
    code: '',
    type: 'PERCENT',
    value: 0,
    minTotalCents: '',
    validFrom: new Date().toISOString().slice(0, 16),
    validTo: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
    usageLimit: '',
    isActive: true,
  };

  const [formData, setFormData] = useState<CouponFormData>(emptyForm);

  useEffect(() => {
    loadCoupons();
  }, []);

  const loadCoupons = async () => {
    try {
      setLoading(true);
      const data = await api.get<Coupon[]>('/api/coupons');
      setCoupons(data);
    } catch (error: any) {
      showToast(error.message || 'Error al cargar cupones', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const validFromDate = new Date(formData.validFrom);
      const validToDate = new Date(formData.validTo);

      const payload = {
        code: formData.code.trim().toUpperCase(),
        type: formData.type,
        value: Math.round(formData.value),
        minTotalCents: formData.minTotalCents ? parseInt(formData.minTotalCents) : null,
        validFrom: validFromDate.toISOString(),
        validTo: validToDate.toISOString(),
        usageLimit: formData.usageLimit ? parseInt(formData.usageLimit) : null,
        isActive: formData.isActive,
      };

      if (editingId) {
        await api.put(`/api/coupons/${editingId}`, payload);
        showToast('Cupón actualizado exitosamente', 'success');
      } else {
        await api.post('/api/coupons', payload);
        showToast('Cupón creado exitosamente', 'success');
      }

      setFormData(emptyForm);
      setEditingId(null);
      setShowForm(false);
      loadCoupons();
    } catch (error: any) {
      showToast(error.message || 'Error al guardar cupón', 'error');
    }
  };

  const handleEdit = (coupon: Coupon) => {
    setFormData({
      code: coupon.code,
      type: coupon.type,
      value: coupon.value,
      minTotalCents: coupon.minTotalCents ? coupon.minTotalCents.toString() : '',
      validFrom: new Date(coupon.validFrom).toISOString().slice(0, 16),
      validTo: new Date(coupon.validTo).toISOString().slice(0, 16),
      usageLimit: coupon.usageLimit ? coupon.usageLimit.toString() : '',
      isActive: coupon.isActive,
    });
    setEditingId(coupon.id);
    setShowForm(true);
  };

  const handleDelete = (id: number) => {
    showConfirm('¿Estás seguro de eliminar este cupón?', async () => {
      try {
        await api.delete(`/api/coupons/${id}`);
        showToast('Cupón eliminado exitosamente', 'success');
        loadCoupons();
      } catch (error: any) {
        showToast(error.message || 'Error al eliminar cupón', 'error');
      }
    });
  };

  const handleToggleActive = async (id: number) => {
    try {
      await api.post(`/api/coupons/${id}/toggle-active`, {});
      showToast('Estado actualizado', 'success');
      loadCoupons();
    } catch (error: any) {
      showToast(error.message || 'Error al cambiar estado', 'error');
    }
  };

  const cancelEdit = () => {
    setFormData(emptyForm);
    setEditingId(null);
    setShowForm(false);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  };

  const isExpired = (validTo: string) => {
    return new Date(validTo) < new Date();
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Gestión de Cupones</h2>
        <button
          onClick={() => {
            setShowForm(!showForm);
            if (showForm) cancelEdit();
          }}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
        >
          {showForm ? 'Cancelar' : 'Nuevo Cupón'}
        </button>
      </div>

      {showForm && (
        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
          <h3 className="text-xl font-semibold mb-4">
            {editingId ? 'Editar Cupón' : 'Nuevo Cupón'}
          </h3>
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium mb-2">Código *</label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  required
                  maxLength={40}
                  placeholder="VERANO2024"
                  style={{ textTransform: 'uppercase' }}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Tipo *</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as 'PERCENT' | 'AMOUNT' })}
                  className="w-full border rounded px-3 py-2"
                  required
                >
                  <option value="PERCENT">Porcentaje (%)</option>
                  <option value="AMOUNT">Monto Fijo ($)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Valor * {formData.type === 'PERCENT' ? '(%)' : '($)'}
                </label>
                <input
                  type="number"
                  value={formData.value}
                  onChange={(e) => setFormData({ ...formData, value: parseFloat(e.target.value) || 0 })}
                  className="w-full border rounded px-3 py-2"
                  required
                  min="0"
                  max={formData.type === 'PERCENT' ? 100 : undefined}
                  step={formData.type === 'PERCENT' ? 1 : 0.01}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Monto Mínimo ($)</label>
                <input
                  type="number"
                  value={formData.minTotalCents}
                  onChange={(e) => setFormData({ ...formData, minTotalCents: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  min="0"
                  step="0.01"
                  placeholder="Opcional"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Válido Desde *</label>
                <input
                  type="datetime-local"
                  value={formData.validFrom}
                  onChange={(e) => setFormData({ ...formData, validFrom: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Válido Hasta *</label>
                <input
                  type="datetime-local"
                  value={formData.validTo}
                  onChange={(e) => setFormData({ ...formData, validTo: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Límite de Usos</label>
                <input
                  type="number"
                  value={formData.usageLimit}
                  onChange={(e) => setFormData({ ...formData, usageLimit: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  min="1"
                  step="1"
                  placeholder="Ilimitado"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Estado</label>
                <label className="flex items-center mt-3">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="mr-2"
                  />
                  Activo
                </label>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={loading}
                className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded disabled:opacity-50"
              >
                {loading ? 'Guardando...' : 'Guardar'}
              </button>
              <button
                type="button"
                onClick={cancelEdit}
                className="bg-gray-300 hover:bg-gray-400 px-4 py-2 rounded"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Código
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Tipo
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Valor
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Mín. Total
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Vigencia
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Usos
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Estado
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loading && coupons.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-4 text-center text-gray-500">
                  Cargando cupones...
                </td>
              </tr>
            ) : coupons.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-4 text-center text-gray-500">
                  No hay cupones creados
                </td>
              </tr>
            ) : (
              coupons.map((coupon) => (
                <tr key={coupon.id} className={isExpired(coupon.validTo) ? 'bg-gray-100' : ''}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-semibold">{coupon.code}</div>
                    {isExpired(coupon.validTo) && (
                      <span className="inline-block px-2 py-1 text-xs bg-red-100 text-red-800 rounded mt-1">
                        Expirado
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {coupon.type === 'PERCENT' ? (
                      <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                        Porcentaje
                      </span>
                    ) : (
                      <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded">
                        Monto Fijo
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap font-semibold text-blue-600">
                    {coupon.type === 'PERCENT'
                      ? `${coupon.value}%`
                      : `$${coupon.value.toLocaleString("es-AR")}`}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {coupon.minTotalCents
                      ? `$${coupon.minTotalCents.toLocaleString("es-AR")}`
                      : '-'}
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-xs text-gray-500">
                      <div>Desde: {formatDate(coupon.validFrom)}</div>
                      <div>Hasta: {formatDate(coupon.validTo)}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      {coupon.usageCount}
                      {coupon.usageLimit ? ` / ${coupon.usageLimit}` : ' / ∞'}
                    </div>
                    {coupon.usageLimit && coupon.usageCount >= coupon.usageLimit && (
                      <span className="inline-block px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded mt-1">
                        Agotado
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => handleToggleActive(coupon.id)}
                      className={`px-3 py-1 rounded text-sm ${
                        coupon.isActive
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {coupon.isActive ? 'Activo' : 'Inactivo'}
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <button
                      onClick={() => handleEdit(coupon)}
                      className="text-blue-600 hover:text-blue-800 mr-3"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleDelete(coupon.id)}
                      disabled={coupon.usageCount > 0}
                      className={`${
                        coupon.usageCount > 0
                          ? 'text-gray-400 cursor-not-allowed'
                          : 'text-red-600 hover:text-red-800'
                      }`}
                      title={coupon.usageCount > 0 ? 'No se puede eliminar un cupón usado' : ''}
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CouponManager;
