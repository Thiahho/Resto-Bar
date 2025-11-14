import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
} from "react";
import apiClient from "../services/api/apiClient";

interface AuthContextType {
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Esto mantiene la sesión activa solo durante la sesión del navegador
    const storedToken = sessionStorage.getItem("authToken");
    if (storedToken) {
      setToken(storedToken);
    }
    setIsLoading(false);
  }, []);

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
      console.error("Login failed:", error);
      return false;
    }
  };

  const logout = () => {
    sessionStorage.removeItem("authToken");
    setToken(null);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        Loading authentication...
      </div>
    );
  }

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
