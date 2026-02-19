import React, { useState, useEffect, useCallback } from "react";
import apiClient from "../../services/api/apiClient";
import { useToast } from "../../contexts/ToastContext";

interface UserDto {
  id: number;
  usuario: string;
  rol: string;
  phone?: string;
  telegramChatId?: string;
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

// ─── Modal Telegram ───────────────────────────────────────────────────────────

interface TelegramModalProps {
  user: UserDto;
  onClose: () => void;
  onSaved: (updated: UserDto) => void;
}

const TelegramModal: React.FC<TelegramModalProps> = ({ user, onClose, onSaved }) => {
  const { showToast } = useToast();
  const [chatId, setChatId] = useState(user.telegramChatId ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [showInstructions, setShowInstructions] = useState(!user.telegramChatId);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await apiClient.put(`/api/auth/users/${user.id}/contact`, {
        telegramChatId: chatId.trim() || null,
      });
      showToast(`Telegram de ${user.usuario} actualizado`, "success");
      onSaved({ ...user, telegramChatId: chatId.trim() || undefined });
      onClose();
    } catch (err: any) {
      showToast(err?.response?.data?.message ?? "Error al guardar", "error");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full" onClick={e => e.stopPropagation()}>
        <div className="bg-gradient-to-r from-blue-600 to-blue-500 rounded-t-2xl p-5 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-xs font-medium uppercase tracking-wider">Notificaciones Telegram</p>
              <h2 className="text-xl font-bold mt-0.5">{user.usuario}</h2>
            </div>
            <div className="bg-white/20 rounded-xl p-2.5">
              {/* Telegram icon */}
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
              </svg>
            </div>
          </div>
        </div>

        <form onSubmit={handleSave} className="p-5 space-y-4">
          {/* Instrucciones Telegram */}
          <div className="border border-blue-200 rounded-xl overflow-hidden">
            <button
              type="button"
              onClick={() => setShowInstructions(!showInstructions)}
              className="w-full flex items-center justify-between px-4 py-3 bg-blue-50 text-sm font-semibold text-blue-800 hover:bg-blue-100 transition-colors"
            >
              <span>¿Cómo obtener el Chat ID?</span>
              <svg className={`w-4 h-4 transition-transform ${showInstructions ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {showInstructions && (
              <div className="px-4 py-3 bg-white text-sm text-gray-600 space-y-2 border-t border-blue-100">
                <p className="font-medium text-gray-700">El mozo debe hacer esto una sola vez:</p>
                <ol className="list-decimal list-inside space-y-1.5">
                  <li>Abrir Telegram en el celular</li>
                  <li>Buscar el bot del restaurante y presionar <strong>START</strong></li>
                  <li>El bot responde con el <strong>Chat ID</strong> — copiar el número acá abajo</li>
                </ol>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Telegram Chat ID <span className="text-gray-400 text-xs">(número entero)</span>
            </label>
            <input
              type="text"
              value={chatId}
              onChange={e => setChatId(e.target.value)}
              placeholder="Ej: 123456789"
              maxLength={50}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isSaving}
            />
          </div>

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-gray-300 text-gray-600 font-medium py-2 rounded-lg hover:bg-gray-50 transition-colors text-sm"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-2 rounded-lg transition-colors text-sm"
            >
              {isSaving ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Componente principal ─────────────────────────────────────────────────────

const UsersManager: React.FC = () => {
  const { showToast } = useToast();
  const [users, setUsers] = useState<UserDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [form, setForm] = useState<CreateUserForm>({ usuario: "", password: "", rol: "Mozo" });
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [telegramUser, setTelegramUser] = useState<UserDto | null>(null);

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
      {telegramUser && (
        <TelegramModal
          user={telegramUser}
          onClose={() => setTelegramUser(null)}
          onSaved={(updated) => setUsers(prev => prev.map(u => u.id === updated.id ? updated : u))}
        />
      )}

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
                    <div className="flex items-center justify-end gap-2">
                      {user.rol === "Mozo" && (
                        <button
                          onClick={() => setTelegramUser(user)}
                          title={user.telegramChatId ? `Telegram Chat ID: ${user.telegramChatId}` : "Configurar Telegram"}
                          className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-lg transition-colors ${
                            user.telegramChatId
                              ? "bg-blue-100 text-blue-700 hover:bg-blue-200"
                              : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                          }`}
                        >
                          {/* Telegram icon */}
                          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                          </svg>
                          {user.telegramChatId ? "Activo" : "Configurar"}
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(user)}
                        disabled={deletingId === user.id}
                        className="text-red-500 hover:text-red-700 text-xs font-medium disabled:opacity-40 transition-colors"
                      >
                        {deletingId === user.id ? "Eliminando..." : "Eliminar"}
                      </button>
                    </div>
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
