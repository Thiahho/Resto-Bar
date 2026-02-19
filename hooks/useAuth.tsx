import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
} from "react";
import apiClient from "../services/api/apiClient";

interface AuthContextType {
  isAuthenticated: boolean;
  token: string | null;
  userId: number | null;
  userRole: string | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Función para obtener el token inicial de sessionStorage (lazy initialization)
const getInitialToken = (): string | null => {
  if (typeof window !== "undefined") {
    return sessionStorage.getItem("authToken");
  }
  return null;
};

const getInitialRole = (): string | null => {
  if (typeof window !== "undefined") {
    return sessionStorage.getItem("userRole");
  }
  return null;
};

const getInitialUserId = (): number | null => {
  if (typeof window !== "undefined") {
    const id = sessionStorage.getItem("userId");
    return id ? parseInt(id, 10) : null;
  }
  return null;
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  // Usar lazy initialization para evitar re-render innecesario
  const [token, setToken] = useState<string | null>(getInitialToken);
  const [userId, setUserId] = useState<number | null>(getInitialUserId);
  const [userRole, setUserRole] = useState<string | null>(getInitialRole);

  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      const response = await apiClient.post("/api/auth/login", {
        Usuario: username,
        Password: password
      });

      if (response.data.token) {
        const newToken = response.data.token;
        const newUserId = response.data.id;
        sessionStorage.setItem("authToken", newToken);
        sessionStorage.setItem("userId", newUserId?.toString() ?? "");
        sessionStorage.setItem("userRole", response.data.rol ?? "");
        setToken(newToken);
        setUserId(newUserId ?? null);
        setUserRole(response.data.rol ?? null);
        return true;
      }
      return false;
    } catch (error) {
      // console.error("Login failed:", error);
      return false;
    }
  };

  const logout = () => {
    sessionStorage.removeItem("authToken");
    sessionStorage.removeItem("userId");
    sessionStorage.removeItem("userRole");
    setToken(null);
    setUserId(null);
    setUserRole(null);
  };

  return (
    <AuthContext.Provider
      value={{ isAuthenticated: !!token, token, userId, userRole, login, logout, isLoading: false }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
