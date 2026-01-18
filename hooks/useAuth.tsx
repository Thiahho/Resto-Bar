import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
} from "react";
import apiClient from "../services/api/apiClient";

interface AuthContextType {
  isAuthenticated: boolean;
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

export const AuthProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  // Usar lazy initialization para evitar re-render innecesario
  const [token, setToken] = useState<string | null>(getInitialToken);

  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      const response = await apiClient.post("/api/auth/login", {
        Usuario: username,
        Password: password
      });

      if (response.data.token) {
        const newToken = response.data.token;
        sessionStorage.setItem("authToken", newToken);
        setToken(newToken);
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
    setToken(null);
  };

  return (
    <AuthContext.Provider
      value={{ isAuthenticated: !!token, login, logout, isLoading: false }}
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
