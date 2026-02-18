import React, { useState, useEffect, useCallback } from "react";
import apiClient from "../../services/api/apiClient";
import { useToast } from "../../contexts/ToastContext";

interface UserDto {
  id: number;
  usuario: string;
  rol: string;
}

interface CreateUserForm {
  usuario: string;
  password: string;
  rol: string;
}

const ROLES = ["Admin", "Mozo", "User"];

const rolBadgeClass = (rol: string) => {
  switch (rol) {
    case "Admin":
      return "bg-purple-100 text-purple-800";
    case "Mozo":
      return "bg-blue-100 text-blue-800";
    default:
      return "bg-gray-100 text-gray-700";
  }
};

const UsersManager: React.FC = () => {
  const { showToast } = useToast();
  const [users, setUsers] = useState<UserDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [form, setForm] = useState<CreateUserForm>({ usuario: "", password: "", rol: "Mozo" });
  const [formErrors, setFormErrors] = useState<string[]>([]);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await apiClient.get<UserDto[]>("/api/auth/users");
      setUsers(res.data);
    } catch {
      showToast("Error al cargar los usuarios", "error");
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors([]);
    setIsCreating(true);
    try {
      await apiClient.post("/api/auth/register", {
        Usuario: form.usuario,
        Password: form.password,
        Rol: form.rol,
      });
      showToast(`Usuario "${form.usuario}" creado correctamente`, "success");
      setForm({ usuario: "", password: "", rol: "Mozo" });
      setShowForm(false);
      fetchUsers();
    } catch (err: any) {
      const data = err?.response?.data;
      if (data?.errors && Array.isArray(data.errors)) {
        setFormErrors(data.errors);
      } else {
        setFormErrors([data?.message ?? "Error al crear el usuario"]);
      }
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = async (user: UserDto) => {
    if (!window.confirm(`¿Eliminar al usuario "${user.usuario}"?`)) return;
    setDeletingId(user.id);
    try {
      await apiClient.delete(`/api/auth/users/${user.id}`);
      showToast(`Usuario "${user.usuario}" eliminado`, "success");
      setUsers((prev) => prev.filter((u) => u.id !== user.id));
    } catch (err: any) {
      showToast(err?.response?.data?.message ?? "Error al eliminar el usuario", "error");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Gestión de Usuarios</h1>
        <button
          onClick={() => { setShowForm(!showForm); setFormErrors([]); }}
          className="bg-primary hover:bg-amber-600 text-white font-semibold px-4 py-2 rounded-lg transition-colors"
        >
          {showForm ? "Cancelar" : "+ Nuevo usuario"}
        </button>
      </div>

      {/* Formulario de creación */}
      {showForm && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Crear nuevo usuario</h2>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Usuario</label>
              <input
                type="text"
                value={form.usuario}
                onChange={(e) => setForm({ ...form, usuario: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Nombre de usuario"
                required
                disabled={isCreating}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Mínimo 8 caracteres con mayúsculas, números y símbolos"
                required
                disabled={isCreating}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Rol</label>
              <select
                value={form.rol}
                onChange={(e) => setForm({ ...form, rol: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                disabled={isCreating}
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
            {formErrors.length > 0 && (
              <ul className="text-red-600 text-sm space-y-1 list-disc list-inside">
                {formErrors.map((e, i) => <li key={i}>{e}</li>)}
              </ul>
            )}
            <button
              type="submit"
              disabled={isCreating}
              className="w-full bg-primary hover:bg-amber-600 disabled:bg-gray-400 text-white font-semibold py-2 rounded-lg transition-colors"
            >
              {isCreating ? "Creando..." : "Crear usuario"}
            </button>
          </form>
        </div>
      )}

      {/* Tabla de usuarios */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500">Cargando usuarios...</div>
        ) : users.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No hay usuarios registrados.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">#</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Usuario</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Rol</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-400">{user.id}</td>
                  <td className="px-4 py-3 font-medium text-gray-800">{user.usuario}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${rolBadgeClass(user.rol)}`}>
                      {user.rol}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleDelete(user)}
                      disabled={deletingId === user.id}
                      className="text-red-500 hover:text-red-700 text-xs font-medium disabled:opacity-40 transition-colors"
                    >
                      {deletingId === user.id ? "Eliminando..." : "Eliminar"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default UsersManager;
