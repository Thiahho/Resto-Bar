import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";

const LoginPage: React.FC = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    const success = await login(username, password);
    if (success) {
      navigate("/admin");
    } else {
      setError("Invalid credentials. Please try again.");
    }
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
        <div className="flex items-center justify-between mb-6">
          <Link
            to="/"
            className="text-gray-600 hover:text-gray-800 transition-colors"
            title="Volver al catálogo"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
          </Link>
          <h2 className="text-3xl font-bold text-center text-secondary flex-1">
            Acceso de administrador
          </h2>
          <div className="w-6"></div>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label
              className="block text-text-light text-sm font-bold mb-2"
              htmlFor="username"
            >
              Usurario
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-text-main leading-tight focus:outline-none focus:shadow-outline focus:ring-2 focus:ring-primary"
              placeholder="Ingrese Usuario"
              disabled={isLoading}
              required
            />
          </div>
          <div className="mb-4">
            <label
              className="block text-text-light text-sm font-bold mb-2"
              htmlFor="password"
            >
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-text-main leading-tight focus:outline-none focus:shadow-outline focus:ring-2 focus:ring-primary"
              placeholder="******************"
              disabled={isLoading}
              required
            />
          </div>
          {error && <p className="text-red-500 text-xs italic mb-4">{error}</p>}
          <div className="flex items-center justify-between">
            <button
              type="submit"
              className="w-full bg-primary hover:bg-amber-600 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline transition-colors disabled:bg-gray-400"
              disabled={isLoading}
            >
              {isLoading ? "Ingresando..." : "Iniciar sesión"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
