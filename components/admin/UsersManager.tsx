import React, { useState, useEffect, useCallback } from "react";
import apiClient from "../../services/api/apiClient";
import { useToast } from "../../contexts/ToastContext";

interface UserDto {
  id: number;
  usuario: string;
  rol: string;
  phone?: string;
  whatsAppApiKey?: string;
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

// ─── Modal WhatsApp ───────────────────────────────────────────────────────────

interface WhatsAppModalProps {
  user: UserDto;
  onClose: () => void;
  onSaved: (updated: UserDto) => void;
}

const WhatsAppModal: React.FC<WhatsAppModalProps> = ({ user, onClose, onSaved }) => {
  const { showToast } = useToast();
  const [phone, setPhone] = useState(user.phone ?? "");
  const [apiKey, setApiKey] = useState(user.whatsAppApiKey ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [showInstructions, setShowInstructions] = useState(!user.whatsAppApiKey);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await apiClient.put(`/api/auth/users/${user.id}/contact`, {
        phone: phone.trim() || null,
        whatsAppApiKey: apiKey.trim() || null,
      });
      showToast(`WhatsApp de ${user.usuario} actualizado`, "success");
      onSaved({ ...user, phone: phone.trim() || undefined, whatsAppApiKey: apiKey.trim() || undefined });
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
        <div className="bg-gradient-to-r from-green-600 to-green-500 rounded-t-2xl p-5 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-xs font-medium uppercase tracking-wider">Notificaciones WhatsApp</p>
              <h2 className="text-xl font-bold mt-0.5">{user.usuario}</h2>
            </div>
            <div className="bg-white/20 rounded-xl p-2.5">
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
            </div>
          </div>
        </div>

        <form onSubmit={handleSave} className="p-5 space-y-4">
          {/* Instrucciones CallMeBot */}
          <div className="border border-green-200 rounded-xl overflow-hidden">
            <button
              type="button"
              onClick={() => setShowInstructions(!showInstructions)}
              className="w-full flex items-center justify-between px-4 py-3 bg-green-50 text-sm font-semibold text-green-800 hover:bg-green-100 transition-colors"
            >
              <span>¿Cómo activar las notificaciones?</span>
              <svg className={`w-4 h-4 transition-transform ${showInstructions ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {showInstructions && (
              <div className="px-4 py-3 bg-white text-sm text-gray-600 space-y-2 border-t border-green-100">
                <p className="font-medium text-gray-700">El mozo debe hacer esto una sola vez:</p>
                <ol className="list-decimal list-inside space-y-1.5">
                  <li>Abrir WhatsApp en el celular</li>
                  <li>
                    Enviar el siguiente mensaje al número{" "}
                    <a
                      href="https://wa.me/34644597787?text=I%20allow%20callmebot%20to%20send%20me%20messages"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold text-green-700 underline"
                    >
                      +34 623 78 95 80
                    </a>
                    :
                    <div className="mt-1 bg-gray-100 rounded-lg px-3 py-1.5 font-mono text-xs text-gray-700 select-all">
                      I allow callmebot to send me messages
                    </div>
                  </li>
                  <li>CallMeBot responde con la <strong>API Key</strong> — copiarla acá abajo</li>
                </ol>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Teléfono WhatsApp <span className="text-gray-400 text-xs">(sin + ni espacios)</span>
            </label>
            <input
              type="text"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="Ej: 5491123456789"
              maxLength={30}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              disabled={isSaving}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">API Key de CallMeBot</label>
            <input
              type="text"
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              placeholder="La key que envía CallMeBot"
              maxLength={100}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
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
              className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-semibold py-2 rounded-lg transition-colors text-sm"
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
  const [whatsAppUser, setWhatsAppUser] = useState<UserDto | null>(null);

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
      {whatsAppUser && (
        <WhatsAppModal
          user={whatsAppUser}
          onClose={() => setWhatsAppUser(null)}
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
                          onClick={() => setWhatsAppUser(user)}
                          title={user.phone ? `WhatsApp: ${user.phone}` : "Configurar WhatsApp"}
                          className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-lg transition-colors ${
                            user.phone && user.whatsAppApiKey
                              ? "bg-green-100 text-green-700 hover:bg-green-200"
                              : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                          }`}
                        >
                          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                          </svg>
                          {user.phone ? "Activo" : "Configurar"}
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
